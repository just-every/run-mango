import { csvRows } from '@/core/features/audience/csv';
import type { NormalizedImportRow } from '@/core/features/audience/import-normalize';
import type { createAudienceImportService } from '@/core/features/audience/import-service';
import type { ImportFile } from '@/core/features/audience/import-types';
import { canonicalJson, type D1ImportContext } from '@/vendor/base/import-kit/src/d1/index';
import type { ImportPlan } from '@/vendor/base/import-kit/src/types';
import { sha256 } from '@/core/shared/ids';
import { archiveLimits } from './archive-limits';
import { classify, keepsText, rawLabels, type ArchivePart, type AudienceStatus, type RawKind } from './archive-parts';
import { contentLimits, reviewContent, type ContentFileSummary, type ContentRecord } from './archive-content';
import { ArchiveRefused, readZip, type ArchiveEntry } from './zip-reader';

export type ArchiveConsent = Record<'brandOrLegalSender' | 'messageCategory' | 'frequencyDisclosure' | 'destinationJurisdiction' | 'consentText' | 'consentVersion', string>;
export type AudienceFileSummary = {
  path: string; status: AudienceStatus; rows: number; created: number; updated: number; duplicatesWithin: number; duplicatesAcross: number;
  rejected: number; skipped: number; unknownConsent: number; rejectedRows: Array<{ row: number; reason: string }>;
  outcomes: Record<'subscribed' | 'pending' | 'non-subscribed' | 'unsubscribed' | 'suppressed', number>; error?: string;
};
export type KeptRaw = { kind: RawKind; label: string; files: number; bytes: number };
/** Everything Preview shows; it holds counts and row numbers, never addresses. */
export type ArchiveSummary = {
  archive: { name: string; size: number; sha256: string; entries: number; folders: number };
  audience: AudienceFileSummary[]; content: ContentFileSummary[];
  records: Array<Pick<ContentRecord, 'ordinal' | 'kind' | 'sourcePath' | 'sourceRow' | 'title' | 'subject' | 'sentAt' | 'removed' | 'flagged' | 'mergeTags'>>;
  kept: KeptRaw[]; unmatchedContent: string[];
};
export type ArchiveReview = { summary: ArchiveSummary; fingerprint: string; consentDigest: string; entries: Array<{ entry: ArchiveEntry; part: ArchivePart }>;
  audienceInput?: { files: ImportFile[]; consent: ArchiveConsent }; audiencePlan?: ImportPlan; records: ContentRecord[] };

export const presetFor: Record<AudienceStatus, string> = { subscribed: 'csv-subscribed', unsubscribed: 'csv-unsubscribed', cleaned: 'csv-cleaned', 'non-subscribed': 'csv-non-subscribed' };
export const missingEvidence = 'Original consent scope, opt-in time and confirmation time are required before this contact can receive marketing.';
export const consentFields = ['brandOrLegalSender', 'messageCategory', 'frequencyDisclosure', 'destinationJurisdiction', 'consentText', 'consentVersion'] as const;

export function normalizeConsent(input: unknown): ArchiveConsent {
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  return Object.fromEntries(consentFields.map(field => [field, typeof value[field] === 'string' ? (value[field] as string).trim().slice(0, 4000) : ''])) as ArchiveConsent;
}

/** Expanded, classified entries in path order; refusals carry a named reason. */
export async function readArchiveParts(bytes: Uint8Array<ArrayBuffer>) {
  const read = await readZip(bytes, keepsText);
  return { read, entries: read.entries.map(entry => ({ entry, part: classify(entry.path, entry.text) })) };
}

export function audienceCounts(path: string, status: AudienceStatus, plan: ImportPlan): AudienceFileSummary {
  const summary: AudienceFileSummary = { path, status, rows: 0, created: 0, updated: 0, duplicatesWithin: 0, duplicatesAcross: 0, rejected: 0, skipped: 0, unknownConsent: 0, rejectedRows: [],
    outcomes: { subscribed: 0, pending: 0, 'non-subscribed': 0, unsubscribed: 0, suppressed: 0 } };
  const winners = new Map<string, string>();
  for (const entry of plan.entries) { const row = entry.source.payload as unknown as NormalizedImportRow; if (entry.effects.length || row.skipped || row.held) winners.set(row.email, row.file); }
  for (const entry of plan.entries) {
    const row = entry.source.payload as unknown as NormalizedImportRow;
    if (row.file !== path) continue;
    summary.rows++;
    if (row.warnings.includes(missingEvidence)) summary.unknownConsent++;
    if (entry.rejection) { summary.rejected++; summary.rejectedRows.push({ row: row.row, reason: entry.rejection }); continue; }
    const effect = entry.effects[0];
    if (row.skipped) { summary.skipped++; continue; }
    if (row.held) { summary.updated++; summary.outcomes[row.status as keyof AudienceFileSummary['outcomes']]++; continue; }
    if (!effect) { if (winners.get(row.email) === path) summary.duplicatesWithin++; else summary.duplicatesAcross++; continue; }
    if (effect.expectedRevision === undefined) summary.created++; else summary.updated++;
    summary.outcomes[row.status as keyof AudienceFileSummary['outcomes']]++;
  }
  summary.rejectedRows.sort((a, b) => a.row - b.row);
  return summary;
}

export async function reviewArchive(name: string, bytes: Uint8Array<ArrayBuffer>, consent: ArchiveConsent,
  audience: { service: ReturnType<typeof createAudienceImportService>; context: D1ImportContext; db: D1Database }): Promise<ArchiveReview> {
  const { read, entries } = await readArchiveParts(bytes);
  const summaries: AudienceFileSummary[] = [], files: ImportFile[] = [], statusOf = new Map<string, AudienceStatus>();
  for (const { entry, part } of entries) {
    if (part.kind !== 'audience') continue;
    statusOf.set(entry.path, part.status);
    let rows: number;
    try { rows = csvRows(entry.text!).length - 1; }
    catch (error) {
      const lines = entry.text!.split(/\r?\n/).filter(line => line.trim()).length - 1;
      summaries.push({ path: entry.path, status: part.status, rows: lines, created: 0, updated: 0, duplicatesWithin: 0, duplicatesAcross: 0, rejected: lines, skipped: 0, unknownConsent: 0,
        rejectedRows: [], outcomes: { subscribed: 0, pending: 0, 'non-subscribed': 0, unsubscribed: 0, suppressed: 0 }, error: `This file could not be read as CSV: ${error instanceof Error ? error.message : 'unreadable'}` });
      continue;
    }
    if (rows < 1) { summaries.push(audienceCounts(entry.path, part.status, { entries: [] } as unknown as ImportPlan)); continue; }
    files.push({ name: entry.path, csv: entry.text!, preset: presetFor[part.status] });
  }
  const audienceRows = summaries.reduce((sum, file) => sum + file.rows, 0) + files.reduce((sum, file) => sum + csvRows(file.csv).length - 1, 0);
  if (audienceRows > archiveLimits.audienceRows) throw new ArchiveRefused('too-many-entries', `This archive holds ${audienceRows} audience rows; Mango reviews up to ${archiveLimits.audienceRows} from one archive. Import the audience CSV files individually under Import contacts.`);
  if (files.length > 10) throw new ArchiveRefused('too-many-entries', `This archive holds ${files.length} audience files with contacts; Mango reviews at most 10 together. Import the audience CSV files individually.`);
  let audiencePlan: ImportPlan | undefined;
  if (files.length) {
    audiencePlan = (await audience.service.review({ files, consent }, audience.context, audience.db, { archive: true })).plan;
    for (const file of files) summaries.push(audienceCounts(file.name, statusOf.get(file.name)!, audiencePlan));
  }
  summaries.sort((a, b) => a.path < b.path ? -1 : 1);
  const content = reviewContent(entries);
  const history = content.records.filter(record => record.kind === 'history').length, drafts = content.records.length - history;
  if (history > contentLimits.history || drafts > contentLimits.drafts) {
    throw new ArchiveRefused('too-many-entries', `This archive holds ${history} emails and ${drafts} templates; one archive may bring in at most ${contentLimits.history} emails and ${contentLimits.drafts} templates. Export a shorter time frame.`);
  }
  const kept = new Map<RawKind, KeptRaw>();
  for (const { entry, part } of entries) {
    const kind = part.kind === 'raw' ? part.raw : content.unmatched.includes(entry.path) ? 'unmatched-content' : undefined;
    if (!kind) continue;
    const slot = kept.get(kind) ?? { kind, label: rawLabels[kind], files: 0, bytes: 0 };
    slot.files++; slot.bytes += entry.size; kept.set(kind, slot);
  }
  const consentDigest = await sha256(canonicalJson(consent));
  const summary: ArchiveSummary = {
    archive: { name, size: read.size, sha256: read.sha256, entries: read.entries.length, folders: read.folders },
    audience: summaries, content: content.files,
    records: content.records.map(({ html: _html, text: _text, contentPaths: _paths, ...record }) => record),
    kept: [...kept.values()].sort((a, b) => a.kind < b.kind ? -1 : 1), unmatchedContent: content.unmatched,
  };
  // A plan's own fingerprint carries review timestamps; the decisions it makes do not. An audience
  // change between Preview and Import (a contact created, edited or opted out) changes these.
  const decisions = audiencePlan?.entries.map(entry => { const row = entry.source.payload as unknown as NormalizedImportRow, effect = entry.effects[0];
    return [row.file, row.row, row.status, entry.rejection ?? null, row.skipped ?? null, row.held ? `held:${row.held.contactId}` : effect ? (effect.expectedRevision === undefined ? 'new' : `${effect.targetId}@${effect.expectedRevision}`) : 'duplicate']; }) ?? [];
  const fingerprint = await sha256(canonicalJson({ archive: read.sha256, consent: consentDigest, audience: decisions, limits: archiveLimits }));
  return { summary, fingerprint, consentDigest, entries, ...(files.length ? { audienceInput: { files, consent } } : {}), audiencePlan, records: content.records };
}
