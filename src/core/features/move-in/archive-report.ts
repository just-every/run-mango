import type { NormalizedImportRow } from '@/core/features/audience/import-normalize';
import { readAudiencePlan } from '@/core/features/audience/import-plans';
import type { ImportPlan } from '@/vendor/base/import-kit/src/types';
import type { ArchiveSummary } from './archive-review';
import type { ArchiveRecord, UndoSummary } from './archive-service';

// The reconciliation report: every source row reaches exactly one outcome, per file
// rows = created + updated + duplicate + rejected + skipped, and nothing kept raw is lost.
const cell = (value: unknown) => String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
const table = (headers: string[], rows: unknown[][]) => [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map(row => `| ${row.map(cell).join(' | ')} |`)].join('\n');
const time = (value: number | null) => value ? new Date(value).toISOString() : '';

type ContentRow = { campaign_id?: string | null; kind: string; source_path: string; source_row: number | null; title: string; state: string; outcome: string | null; removed_json?: string; flagged_json?: string; merge_tags_json?: string };

export async function archiveReport(db: D1Database, archive: ArchiveRecord, content: ContentRow[]) {
  const summary = JSON.parse(archive.summary_json) as ArchiveSummary;
  const undo = archive.undo_json ? JSON.parse(archive.undo_json) as UndoSummary : undefined;
  let plan: ImportPlan | undefined, planNote = '';
  if (archive.audience_plan) {
    const stored = await db.prepare('SELECT fingerprint,plan_json FROM audience_import_plans WHERE fingerprint=?').bind(archive.audience_plan).first<{ fingerprint: string; plan_json: string }>();
    if (stored) plan = await readAudiencePlan(db, stored); else planNote = 'The reviewed audience plan was withdrawn by a contact deletion, so row-level audience outcomes are no longer available.';
  }
  const held = content.filter(item=>item.state==='held');
  const lines = [`# Move-in reconciliation: ${cell(archive.name)}`, '',
    `- Archive SHA-256: \`${archive.sha256}\` (${archive.size} bytes, ${summary.archive.entries} files)`,
    `- State: ${archive.state}; started ${time(archive.created_at)}${archive.applied_at ? `; imported ${time(archive.applied_at)}` : ''}${archive.undone_at ? `; undone ${time(archive.undone_at)}` : ''}`,
    '- Source: documented format, tested on synthetic files shaped from the published help page, not on a real export.', '',
    '## Audience files', '', 'Each source row has one outcome: rows = created + updated + duplicates + rejected + skipped.', '',
    table(['File', 'Treated as', 'Source rows', 'Created', 'Updated', 'Duplicates (same file)', 'Duplicates (other files)', 'Rejected', 'Skipped', 'Adds up', 'Unknown consent', 'Unsubscribed', 'Cleaned (suppressed)', 'Subscribed'],
      summary.audience.map(file => [file.path, file.status, file.rows, file.created, file.updated, file.duplicatesWithin, file.duplicatesAcross, file.rejected, file.skipped,
        file.rows === file.created + file.updated + file.duplicatesWithin + file.duplicatesAcross + file.rejected + file.skipped ? 'yes' : 'NO',
        file.unknownConsent, file.outcomes.unsubscribed, file.outcomes.suppressed, file.outcomes.subscribed])),
    '', '## Emails and templates', '', 'Imported history and library templates carry no schedule, approval or delivery authority, and no report figures.', '',
    table(['File', 'Kind', 'Source rows', 'Created', 'Held conversions', 'Duplicates', 'Rejected', 'Skipped', 'Adds up'],
      summary.content.map(file => [file.path, file.kind === 'emails' ? 'imported history' : 'library templates', file.rows, file.created - (file.kind==='templates'?held.length:0), file.kind==='templates'?held.length:0, file.duplicates, file.rejected, file.skipped,
        file.rows === file.created + file.duplicates + file.rejected + file.skipped ? 'yes' : 'NO'])),
    '', '## Kept as raw source, not imported', '', 'These stay in the archive Mango keeps; nothing in them becomes a contact, a send fact or a report figure.', '',
    table(['Kind', 'Files', 'Bytes'], summary.kept.map(kind => [kind.label, kind.files, kind.bytes])),
    '', '## Unresolved consent', '',
    ((count: number) => `${count} ${count === 1 ? 'row lacked' : 'rows lacked'} original opt-in and confirmation times or the full consent scope, and ${count === 1 ? 'was' : 'were'} imported as non-subscribed.`)(summary.audience.reduce((sum, file) => sum + file.unknownConsent, 0)), ''];
  if (plan) {
    const rows = plan.entries.map(entry => ({ row: entry.source.payload as unknown as NormalizedImportRow, entry }));
    const unresolved = rows.filter(({ row }) => row.warnings.includes('Original consent scope, opt-in time and confirmation time are required before this contact can receive marketing.'));
    if (unresolved.length) lines.push(table(['File', 'Row', 'Email'], unresolved.map(({ row }) => [row.file, row.row, row.email])), '');
    const winners = new Map(rows.filter(({ entry, row }) => entry.effects.length || row.skipped || row.held).map(({ row }) => [row.email, row.file]));
    lines.push('## Every audience row', '', table(['File', 'Row', 'Email', 'Outcome'], rows.sort((a, b) => a.row.file < b.row.file ? -1 : a.row.file > b.row.file ? 1 : a.row.row - b.row.row).map(({ row, entry }) => [row.file, row.row, row.email,
      entry.rejection ? `rejected: ${entry.rejection}` : row.skipped ? `skipped: ${row.skipped}` : row.held ? `updated as ${row.status}: ${row.held.reason}` : entry.effects.length ? `${entry.effects[0].expectedRevision === undefined ? 'created' : 'updated'} as ${row.status}`
        : `duplicate of a row in ${winners.get(row.email) === row.file ? 'this file' : winners.get(row.email) ?? 'another file'}`])), '');
  } else if (planNote) lines.push(planNote, '');
  lines.push('## Consent evidence', '', table(['File','Evidence kind','Rows'],summary.audience.flatMap(file=>Object.entries(file.evidenceKinds??{}).map(([kind,total])=>[file.path,kind,total]))), '',table(['File','Reason','Rows'],summary.audience.flatMap(file=>Object.entries(file.reasons??{}).map(([reason,total])=>[file.path,reason,total]))),'');
  if(summary.engagement)lines.push('## Imported engagement', '', `${summary.engagement.imported} engagement rows imported; ${summary.engagement.dropped} dropped of ${summary.engagement.rows} source rows. Opens are estimates and never engagement.`, '', table(['Drop reason','Rows'],Object.entries(summary.engagement.reasons)), '');
  const rejected = [...summary.audience.flatMap(file => file.rejectedRows.map(item => [file.path, item.row, item.reason])), ...summary.content.flatMap(file => file.rejectedRows.map(item => [file.path, item.row, item.reason]))];
  if (rejected.length) lines.push('## Rejected rows', '', table(['File', 'Row', 'Reason'], rejected), '');
  if (content.length) lines.push('## History and templates', '', table(['Kind', 'Source', 'Title', 'State', 'Outcome'], content.map(item => [item.kind === 'history' ? 'imported history' : item.campaign_id ? 'imported draft' : 'library template',
    item.source_row ? `${item.source_path} row ${item.source_row}` : item.source_path, item.title, item.state, item.outcome ?? ''])), '');
  if (content.length) {
    lines.push('## Template conversion reports', '');
    for (const item of content) lines.push(`### ${cell(item.source_path)}`, '', ...[item.removed_json, item.flagged_json, item.merge_tags_json].flatMap(value => value ? (JSON.parse(value) as string[]).map(note => `- ${cell(note)}`) : []), '');
    const hosts = new Map<string, number>();
    for (const item of content) for (const note of JSON.parse(item.removed_json ?? '[]') as string[]) {
      const match = /^Outside host (\S+): (\d+) uses$/.exec(note);
      if (match) hosts.set(match[1], (hosts.get(match[1]) ?? 0) + Number(match[2]));
    }
    lines.push('## Outside hosts across templates and campaigns', '', table(['Host', 'Uses'], [...hosts]), '');
  }
  if (undo) {
    lines.push('## Undo', '', `${undo.contacts.removed} imported contacts were removed. Opt-out and suppression records are never removed by undo.`, '');
    if (undo.contacts.kept.length) {
      const emails = new Map((await db.prepare('SELECT id,email FROM contacts WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(undo.contacts.kept.map(item => item.contactId))).all<{ id: string; email: string | null }>()).results.map(row => [row.id, row.email]));
      lines.push(table(['Contact kept', 'Reason'], undo.contacts.kept.map(item => [emails.get(item.contactId) ?? item.contactId, item.reason])), '');
    }
  }
  return lines.join('\n') + '\n';
}
