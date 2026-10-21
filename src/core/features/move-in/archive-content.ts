import { parseCsv } from '@/core/features/audience/csv';
import { htmlToText } from '@/core/features/campaigns/authoring-content';
import { foreignMergeTags } from '@/core/features/campaigns/message-content';
import { csvHeaders, findHeader, historyHeaders, type ArchivePart } from './archive-parts';
import type { ArchiveEntry } from './zip-reader';
import { importHtml } from './html-import';

// Emails CSV rows with their content files become imported history; template files
// become draft starters. Both carry only what the source states, never authority.
export type ContentRecord = {
  sourceCampaignId?: string; ordinal: number; kind: 'history' | 'draft'; sourcePath: string; sourceRow: number | null;
  title: string; subject: string; sentAt: string; html: string; text: string;
  removed: string[]; flagged: string[]; mergeTags: string[]; contentPaths: string[];
};
export type ContentFileSummary = {
  path: string; kind: 'emails' | 'templates'; rows: number; created: number; duplicates: number; skipped: number;
  rejected: number; rejectedRows: Array<{ row: number; reason: string }>; error?: string;
};
export const contentLimits = { history: 500, drafts: 100 } as const;

const stem = (path: string) => path.split('/').at(-1)!.replace(/\.[a-z0-9]+$/i, '').trim().toLowerCase();
const nonEmptyLines = (text: string) => text.split(/\r?\n/).filter(line => line.trim()).length;
const decode = (text: string) => htmlToText(`<p>${text}</p>`);

export function reviewContent(parts: Array<{ entry: ArchiveEntry; part: ArchivePart }>) {
  const content = new Map<string, { html?: ArchiveEntry; text?: ArchiveEntry }>();
  for (const { entry, part } of parts) {
    if (part.kind !== 'campaign-html' && part.kind !== 'campaign-text') continue;
    const slot = content.get(stem(entry.path)) ?? {};
    // The first file of each kind in path order wins; a second is listed as unmatched.
    if (part.kind === 'campaign-html' && !slot.html) slot.html = entry;
    else if (part.kind === 'campaign-text' && !slot.text) slot.text = entry;
    content.set(stem(entry.path), slot);
  }
  const used = new Set<string>(), records: ContentRecord[] = [], files: ContentFileSummary[] = [];
  for (const { entry } of parts.filter(item => item.part.kind === 'emails')) {
    const summary: ContentFileSummary = { path: entry.path, kind: 'emails', rows: 0, created: 0, duplicates: 0, skipped: 0, rejected: 0, rejectedRows: [] };
    files.push(summary);
    let rows: Array<Record<string, string>>;
    try { rows = parseCsv(entry.text!); }
    catch (error) {
      summary.rows = summary.rejected = Math.max(0, nonEmptyLines(entry.text!) - 1);
      summary.error = `This file could not be read as CSV: ${error instanceof Error ? error.message : 'unreadable'}`;
      continue;
    }
    const headers = csvHeaders(entry.text!).map(header => header.trim().toLowerCase());
    const column = (aliases: readonly string[]) => findHeader(headers, aliases);
    const titleKey = column(historyHeaders.title), subjectKey = column(historyHeaders.subject), sentKey = column(historyHeaders.sentAt);
    const seen = new Set<string>();
    summary.rows = rows.length;
    for (const [index, row] of rows.entries()) {
      const line = index + 2;
      if (row.__parse_error) { summary.rejected++; summary.rejectedRows.push({ row: line, reason: row.__parse_error }); continue; }
      const cells = new Set(Object.values(row).map(value => value.trim().toLowerCase()).filter(Boolean));
      const key = [...content.keys()].sort().find(name => cells.has(name));
      const title = (titleKey ? row[titleKey] : '')?.trim() ?? '', subject = (subjectKey ? row[subjectKey] : '')?.trim() ?? '', sentAt = (sentKey ? row[sentKey] : '')?.trim() ?? '';
      if (!title && !subject && !key) { summary.rejected++; summary.rejectedRows.push({ row: line, reason: 'The row has no title, subject or matching content file.' }); continue; }
      const identity = JSON.stringify([title, subject, sentAt, key ?? null]);
      if (seen.has(identity)) { summary.duplicates++; continue; }
      seen.add(identity);
      const files = key ? content.get(key)! : {};
      if (key) used.add(key);
      const imported = files.html ? importHtml(files.html.text!) : { html: '', removed: [], flagged: [], mergeTags: [] };
      const text = files.text?.text?.trim() ?? (imported.html ? htmlToText(imported.html) : '');
      const campaignKey=column(['campaignid','uniqueid','id']);
      records.push({ sourceCampaignId:campaignKey?row[campaignKey]?.trim():undefined, ordinal: 0, kind: 'history', sourcePath: entry.path, sourceRow: line, title: title || subject || key || `Row ${line}`, subject, sentAt,
        html: imported.html, text, removed: imported.removed, flagged: imported.flagged,
        mergeTags: [...new Set([...imported.mergeTags, ...foreignMergeTags(`${subject}\n${text}`)])],
        contentPaths: [files.html?.path, files.text?.path].filter((path): path is string => Boolean(path)) });
      summary.created++;
    }
  }
  const templates: ContentFileSummary = { path: 'templates', kind: 'templates', rows: 0, created: 0, duplicates: 0, skipped: 0, rejected: 0, rejectedRows: [] };
  for (const { entry } of parts.filter(item => item.part.kind === 'template')) {
    templates.rows++;
    const imported = importHtml(entry.text!);
    if (!htmlToText(imported.html).trim()) { templates.rejected++; templates.rejectedRows.push({ row: templates.rows, reason: `${entry.path}: no content remains after removing unsupported markup.` }); continue; }
    const named = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(entry.text!)?.[1];
    records.push({ ordinal: 0, kind: 'draft', sourcePath: entry.path, sourceRow: null, title: (named ? decode(named) : '') || entry.path.split('/').at(-1)!.replace(/\.[a-z0-9]+$/i, ''),
      subject: '', sentAt: '', html: imported.html, text: htmlToText(imported.html), removed: imported.removed, flagged: imported.flagged, mergeTags: imported.mergeTags, contentPaths: [entry.path] });
    templates.created++;
  }
  if (templates.rows) files.push(templates);
  records.forEach((record, index) => { record.ordinal = index; });
  const unmatched = [...content].filter(([key]) => !used.has(key)).flatMap(([, slot]) => [slot.html, slot.text]).filter((entry): entry is ArchiveEntry => Boolean(entry)).map(entry => entry.path);
  const matchedPaths = new Set(records.flatMap(record => record.contentPaths));
  // Second files sharing one name are never attached to a row.
  for (const { entry, part } of parts) if ((part.kind === 'campaign-html' || part.kind === 'campaign-text') && !matchedPaths.has(entry.path) && !unmatched.includes(entry.path)) unmatched.push(entry.path);
  return { records, files, unmatched };
}
