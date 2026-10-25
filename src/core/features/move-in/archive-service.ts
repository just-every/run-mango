import { describeConversion } from './conversion-report';
import {planAttestations,incumbentFiles,attestationStatements} from './incumbent-attestation';
import type {AttestationInput} from './incumbent-policy';
import {engagementContacts,reviewEngagement,writeEngagement} from './archive-engagement';
import { Buffer } from 'node:buffer';
import type { Platform } from '@/core/shared/platform';
import { ulid } from '@/core/shared/ids';
import { audienceImportContext, createAudienceImportService } from '@/core/features/audience/import-service';
import { audiencePreviewBudget } from '@/core/features/audience/import-query-budget';
import { createAudienceImportTarget } from '@/core/features/audience/import-target';
import { readAudiencePlan } from '@/core/features/audience/import-plans';
import { createAudienceStream } from '@/core/features/audience/import-stream';
import { applyStartRestrictions } from '@/core/features/audience/import-start';
import { readD1ImportStream, readD1ImportUndoReport, resumeD1ImportStream, undoD1ImportStream, type D1ImportContext } from '@/vendor/base/import-kit/src/d1/index';
import { custodyChunkBytes } from './archive-limits';
import { reviewContent } from './archive-content';
import { audienceCounts, presetFor, readArchiveParts, reviewArchive, type ArchiveConsent, type ArchiveSummary } from './archive-review';
import { csvRows } from '@/core/features/audience/csv';
import type { ImportFile } from '@/core/features/audience/import-types';
import { undoContent, writeContent } from './archive-drafts';
import { ArchiveRefused, sha256Hex } from './zip-reader';

export class ArchiveReviewStale extends Error {}
export type ArchiveRecord = {
  id: string; principal_id: string; name: string; sha256: string; size: number; consent_digest: string; consent_json: string; attestations_json:string; fingerprint: string;
  state: 'applying' | 'applied' | 'undoing' | 'undone'; audience_plan: string | null; audience_stream: string | null; summary_json: string;
  content_total: number; content_done: number; engagement_done: number; undo_json: string | null; created_at: number; updated_at: number; applied_at: number | null; undone_at: number | null;
};
export type UndoSummary = { contacts: { removed: number; kept: Array<{ contactId: string; reason: string }> } };
const contentPage = 20;

/** Archive jobs use preserved undo and keep contacts that existed before them or were mailed since. */
async function archiveContext(platform: Platform, operatorId: string, request: Request, principalId = operatorId): Promise<D1ImportContext> {
  const base = await audienceImportContext(platform, operatorId, request);
  return { ...base, authorization: { ...base.authorization, principalId }, reversalPolicy: 'preserve-conflicts', storage: { ...base.storage, targets: createAudienceImportTarget(platform.config.contactHashSalt, { archive: true }) } };
}

export function createArchiveService(platform: Platform) {
  const db = platform.database.$client;
  const audience = createAudienceImportService(platform);
  const record = (id: string) => db.prepare('SELECT * FROM move_in_archives WHERE id=?').bind(id).first<ArchiveRecord>();
  const touch = (id: string, assignments: string, ...values: unknown[]) => db.prepare(`UPDATE move_in_archives SET ${assignments},updated_at=? WHERE id=?`).bind(...values, Date.now(), id).run();

  async function custody(archive: ArchiveRecord) {
    const chunks = (await db.prepare('SELECT base64 FROM move_in_archive_chunks WHERE archive_id=? ORDER BY ordinal').bind(archive.id).all<{ base64: string }>()).results;
    const bytes = new Uint8Array(Buffer.from(chunks.map(chunk => chunk.base64).join(''), 'base64'));
    if (!chunks.length || await sha256Hex(bytes) !== archive.sha256) throw new Error('The original archive is no longer held, so this step cannot continue. A contact deletion may have withdrawn it.');
    return bytes;
  }

  async function undoSummary(streamId: string, context: D1ImportContext): Promise<UndoSummary> {
    const pages = (await db.prepare('SELECT job_id FROM ik_d1_stream_pages WHERE stream_id=? ORDER BY ordinal').bind(streamId).all<{ job_id: string }>()).results;
    const summary: UndoSummary = { contacts: { removed: 0, kept: [] } };
    for (const { job_id } of pages) {
      for (let offset: number | null = 0; offset !== null;) {
        const report = await readD1ImportUndoReport(job_id, context, { offset, limit: 1000 });
        for (const disposition of report.dispositions) {
          if (disposition.disposition === 'reversed') { summary.contacts.removed++; continue; }
          const protectedBy = disposition.protectedBy.map(edge => (edge.evidence as { reason?: string } | null)?.reason);
          const status = (disposition.evidence as { emailStatus?: string } | null)?.emailStatus;
          summary.contacts.kept.push({ contactId: disposition.targetId, reason: protectedBy.includes('existed-before-import') ? 'Existed before this import; left as it is now.'
            : protectedBy.includes('mailed-after-import') ? 'Mail was scheduled or sent to this contact after the import.'
            : status === 'unsubscribed' ? 'Unsubscribed after the import.' : status === 'suppressed' ? 'Suppressed after the import.' : 'Edited after the import.' });
        }
        offset = report.nextOffset;
      }
    }
    return summary;
  }

  /** The archive's readable, non-empty audience files with their status presets. */
  const audienceFiles = (entries: Awaited<ReturnType<typeof readArchiveParts>>['entries']) => entries.flatMap(({ entry, part }) => part.kind === 'audience' && (() => { try { return csvRows(entry.text!).length > 1; } catch { return false; } })()
    ? [{ name: entry.path, csv: entry.text!, preset: presetFor[part.status] }] : []);
  /** Save the reviewed audience plan and create its stream; the applied plan's counts replace Preview's. */
  async function startAudience(archive: ArchiveRecord, files: ImportFile[], context: D1ImportContext) {
    const consent = JSON.parse(archive.consent_json) as ArchiveConsent;
    if (!files.length) return;
    const attestations=await planAttestations(files,archive.sha256,consent,JSON.parse(archive.attestations_json),db);
    const preview = await audience.preview({ files, consent, origin: `archive:${archive.id}` }, context, { archive: true,incumbentSources:incumbentFiles(files,attestations) });
    const stored = (await db.prepare('SELECT fingerprint,plan_json FROM audience_import_plans WHERE fingerprint=?').bind(preview.fingerprint).first<{ fingerprint: string; plan_json: string }>())!;
    const plan = await readAudiencePlan(db, stored);
    await applyStartRestrictions(db, platform.config.contactHashSalt, plan);
    const summary = JSON.parse(archive.summary_json) as ArchiveSummary;
    summary.audience = summary.audience.map(file => files.some(item => item.name === file.path) ? audienceCounts(file.path, file.status, plan) : file);
    await touch(archive.id, 'audience_plan=?,summary_json=?', plan.fingerprint, JSON.stringify(summary));
    const stream = await createAudienceStream(plan, context);
    await touch(archive.id, 'audience_stream=?', stream.id);
  }
  const audiencePending = (archive: ArchiveRecord) => !archive.audience_stream && (JSON.parse(archive.summary_json) as ArchiveSummary).audience.some(file => file.rows > file.rejected);

  return {
    async review(name: string, bytes: Uint8Array<ArrayBuffer>, consent: ArchiveConsent, operatorId: string, request: Request, choices:AttestationInput[] = []) {
      const context = await archiveContext(platform, operatorId, request);
      const review = await reviewArchive(name, bytes, consent, { service: audience, context, db: audiencePreviewBudget(db).db },choices);
      review.records = await Promise.all(review.records.map(record => describeConversion(platform, record)));
      review.summary.records = review.records.map(({html: _html, text: _text, contentPaths: _paths, ...record}) => record);
      const applied = await db.prepare("SELECT id,applied_at FROM move_in_archives WHERE sha256=? AND consent_digest=? AND state IN ('applying','applied','undoing')").bind(review.summary.archive.sha256, review.consentDigest).first<{ id: string; applied_at: number | null }>();
      return { fingerprint: review.fingerprint, summary: review.summary, alreadyImported: applied ?? null };
    },

    /** Custody, the record and the audience job; content and contacts then advance through `continue`. */
    async apply(name: string, bytes: Uint8Array<ArrayBuffer>, consent: ArchiveConsent, fingerprint: string, operatorId: string, request: Request, choices:AttestationInput[] = [], role="owner") {
      const context = await archiveContext(platform, operatorId, request);
      const sha = await sha256Hex(bytes);
      const review = await reviewArchive(name, bytes, consent, { service: audience, context, db: audiencePreviewBudget(db).db },choices);
      review.records = await Promise.all(review.records.map(record => describeConversion(platform, record)));
      review.summary.records = review.records.map(({html: _html, text: _text, contentPaths: _paths, ...record}) => record);
      const live = await db.prepare("SELECT * FROM move_in_archives WHERE sha256=? AND consent_digest=? AND state IN ('applying','applied','undoing')").bind(sha, review.consentDigest).first<ArchiveRecord>();
      if (live) return { archive: live, repeated: true };
      if (!review.audienceInput && !review.records.length) throw new ArchiveRefused('nothing-to-import', 'This archive holds no audience file, email or template that Mango imports, so nothing was saved.');
      if (review.fingerprint !== fingerprint) throw new ArchiveReviewStale('The archive, its consent evidence or the audience changed since Preview. Preview the archive again.');
      const id = ulid(), now = Date.now(), base64 = Buffer.from(bytes).toString('base64'), step = Math.ceil(custodyChunkBytes / 3) * 4;
      await db.prepare("DELETE FROM move_in_archive_chunks WHERE archive_id NOT IN (SELECT id FROM move_in_archives)").run();
      for (let ordinal = 0, offset = 0; offset < base64.length; ordinal += 4) {
        const statements = [];
        for (let index = 0; index < 4 && offset < base64.length; index++, offset += step) statements.push(db.prepare('INSERT INTO move_in_archive_chunks(archive_id,ordinal,base64) VALUES(?,?,?)').bind(id, ordinal + index, base64.slice(offset, offset + step)));
        await db.batch(statements);
      }
      const entries = review.entries.map(({ entry, part }, ordinal) => ({ ordinal, path: entry.path, size: entry.size, compressed: entry.compressedSize, sha256: entry.sha256,
        part: part.kind === 'raw' ? `raw:${part.raw}` : part.kind === 'audience' ? `audience:${part.status}` : part.kind,
        disposition: part.kind === 'raw' || review.summary.unmatchedContent.includes(entry.path) ? 'kept as raw source, not imported' : 'imported' }));
      const statements = [db.prepare(`INSERT INTO move_in_archives(id,principal_id,name,sha256,size,consent_digest,consent_json,attestations_json,fingerprint,state,summary_json,content_total,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,'applying',?,?,?,?)`).bind(id, operatorId, name, sha, bytes.byteLength, review.consentDigest, JSON.stringify(consent), JSON.stringify(choices),fingerprint, JSON.stringify(review.summary), review.records.length, now, now)];
      for (let start = 0; start < entries.length; start += 250) statements.push(db.prepare(`INSERT INTO move_in_archive_entries(archive_id,ordinal,path,size,compressed_size,sha256,part,disposition)
        SELECT ?,json_extract(value,'$.ordinal'),json_extract(value,'$.path'),json_extract(value,'$.size'),json_extract(value,'$.compressed'),json_extract(value,'$.sha256'),json_extract(value,'$.part'),json_extract(value,'$.disposition') FROM json_each(?)`)
        .bind(id, JSON.stringify(entries.slice(start, start + 250))));
      const covered:Record<string,number>={};
      for(const entry of review.audiencePlan?.entries??[]){const row=entry.source.payload as unknown as {incumbent?:{id:string}};if(row.incumbent)covered[row.incumbent.id]=(covered[row.incumbent.id]??0)+1;}
      statements.push(...attestationStatements(db,review.attestations,id,{id:operatorId,role},request,platform.config.local===true,covered,now));
      await db.batch(statements);
      // A failure from here leaves the record applying; `continue` starts the audience again from custody.
      // Release the reviewed plan first: the audience is reviewed once more as its plan is saved.
      const files = review.audienceInput?.files ?? [];
      review.audiencePlan = undefined; review.entries.length = 0; review.records.length = 0;
      if (files.length) await startAudience((await record(id))!, files, context);
      return { archive: (await record(id))!, repeated: false };
    },

    /** One bounded step: a page of contacts, or a page of content, then completion. */
    async continue(id: string, operatorId: string, request: Request) {
      const archive = await record(id);
      if (!archive) return undefined;
      const context = await archiveContext(platform, operatorId, request, archive.principal_id);
      if (archive.state === 'applying') {
        if (audiencePending(archive)) { await startAudience(archive, audienceFiles((await readArchiveParts(await custody(archive))).entries), context); return record(id); }
        if (archive.audience_stream) {
          const job = await readD1ImportStream(archive.audience_stream, context);
          if (['queued', 'applying', 'failed'].includes(job.state)) { await resumeD1ImportStream(archive.audience_stream, context); return record(id); }
        }
        if (archive.content_done < archive.content_total) {
          const { entries } = await readArchiveParts(await custody(archive));
          const records = reviewContent(entries).records.slice(archive.content_done, archive.content_done + contentPage);
          for (const item of records) await writeContent(platform, archive.id, item, operatorId);
          await touch(id, 'content_done=?', archive.content_done + records.length);
          return record(id);
        }
        const {entries}=await readArchiveParts(await custody(archive));
        const stored=archive.audience_plan?await db.prepare('SELECT fingerprint,plan_json FROM audience_import_plans WHERE fingerprint=?').bind(archive.audience_plan).first<{fingerprint:string;plan_json:string}>():null;
        const addresses=engagementContacts(stored?await readAudiencePlan(db,stored):undefined);
        const engagement=reviewEngagement(entries,reviewContent(entries).records,addresses);
        if(!await writeEngagement(db,id,engagement,addresses,archive.engagement_done))return record(id);
        const summary=JSON.parse(archive.summary_json) as ArchiveSummary;
        summary.engagement=engagement.summary;
        await touch(id, "state='applied',applied_at=?,summary_json=?", Date.now(),JSON.stringify(summary));
      } else if (archive.state === 'undoing') {
        await db.batch([db.prepare('DELETE FROM imported_engagement_facts WHERE archive_id=?').bind(id),db.prepare('DELETE FROM move_in_contact_history WHERE archive_id=?').bind(id)]);
        if (archive.audience_stream) {
          const job = await readD1ImportStream(archive.audience_stream, context);
          if (job.state !== 'undone') { await undoD1ImportStream(archive.audience_stream, context); return record(id); }
        }
        const content = (await db.prepare("SELECT id,kind,campaign_id,revision_id,revision_updated_at FROM move_in_content WHERE archive_id=? AND state='imported' ORDER BY ordinal LIMIT ?")
          .bind(id, contentPage).all<{ id: string; kind: string; campaign_id: string | null; revision_id: string | null; revision_updated_at: number | null }>()).results;
        if (content.length) { for (const item of content) await undoContent(db, item); return record(id); }
        const summary: UndoSummary = archive.audience_stream ? await undoSummary(archive.audience_stream, context) : { contacts: { removed: 0, kept: [] } };
        await touch(id, "state='undone',undone_at=?,undo_json=?", Date.now(), JSON.stringify(summary));
      }
      return record(id);
    },

    async undo(id: string, operatorId: string, request: Request) {
      const archive = await record(id);
      if (!archive) return undefined;
      if (archive.state === 'applying') throw new Error('Finish this import before undoing it.');
      if (archive.state === 'applied') await db.prepare("UPDATE move_in_archives SET state='undoing',updated_at=? WHERE id=? AND state='applied'").bind(Date.now(), id).run();
      return this.continue(id, operatorId, request);
    },

    read: record,
    async list() {
      return (await db.prepare('SELECT * FROM move_in_archives ORDER BY created_at DESC LIMIT 50').all<ArchiveRecord>()).results;
    },
    async entries(id: string) {
      return (await db.prepare('SELECT ordinal,path,size,compressed_size,sha256,part,disposition FROM move_in_archive_entries WHERE archive_id=? ORDER BY ordinal').bind(id).all()).results;
    },
    async content(id: string) {
      return (await db.prepare(`SELECT id,ordinal,kind,source_path,source_row,title,subject,sent_at_source,removed_json,flagged_json,merge_tags_json,campaign_id,CASE WHEN kind='draft' AND campaign_id IS NULL AND state='imported' AND outcome IS NOT NULL THEN 'held' ELSE state END AS state,outcome FROM move_in_content WHERE archive_id=? ORDER BY ordinal`).bind(id).all()).results;
    },
    summary: (archive: ArchiveRecord) => JSON.parse(archive.summary_json) as ArchiveSummary,
  };
}
