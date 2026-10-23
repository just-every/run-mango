import type {AttestationInput} from '../../move-in/incumbent-policy';
import type { ImportConsent } from './audience-import-types';

// An account export travels as multipart form data; JSON requests cannot carry the archive.
export type ArchiveFileSummary = {
  path: string; status: string; rows: number; created: number; updated: number; duplicatesWithin: number; duplicatesAcross: number;
  rejected: number; skipped: number; unknownConsent: number; rejectedRows: Array<{ row: number; reason: string }>;
  outcomes: Record<'subscribed' | 'pending' | 'non-subscribed' | 'unsubscribed' | 'suppressed', number>; error?: string;
};
export type ArchiveContentSummary = { path: string; kind: 'emails' | 'templates'; rows: number; created: number; duplicates: number; skipped: number; rejected: number; rejectedRows: Array<{ row: number; reason: string }>; error?: string };
export type ArchiveSummary = {
  archive: { name: string; size: number; sha256: string; entries: number; folders: number };
  attestationSources?:Array<{id:string;sourceKey:string;sourceName:string;accepted:boolean;reason?:string}>;
  audience: ArchiveFileSummary[]; content: ArchiveContentSummary[];
  records: Array<{ ordinal: number; kind: 'history' | 'draft'; sourcePath: string; sourceRow: number | null; title: string; subject: string; sentAt: string; removed: string[]; flagged: string[]; mergeTags: string[] }>;
  engagement?:{rows:number;imported:number;dropped:number;reasons:Record<string,number>};
  kept: Array<{ kind: string; label: string; files: number; bytes: number }>; unmatchedContent: string[];
};
export type ArchivePreview = { fingerprint: string; summary: ArchiveSummary; alreadyImported: { id: string; applied_at: number | null } | null };
export type ArchiveImport = {
  id: string; name: string; sha256: string; size: number; state: 'applying' | 'applied' | 'undoing' | 'undone'; createdAt: number; appliedAt: number | null; undoneAt: number | null;
  summary: ArchiveSummary; undo: { contacts: { removed: number; kept: Array<{ contactId: string; reason: string }> } } | null;
  progress: { contentDone: number; contentTotal: number; audience: { state: string; checkpoint: number; total: number } | null };
};
export type ArchiveContentRow = { id: string; kind: 'history' | 'draft'; source_path: string; source_row: number | null; title: string; subject: string; sent_at_source: string;
  removed_json: string; flagged_json: string; merge_tags_json: string; campaign_id: string | null; state: 'imported' | 'removed' | 'kept' | 'held'; outcome: string | null };
export type ArchiveError = { error?: string; detail?: string; code?: string };

export async function postArchive<T>(path: string, archive: File, consent: ImportConsent, fingerprint?: string,attestations:AttestationInput[] = []) {
  const form = new FormData();
  form.set('archive', archive);
  form.set('consent', JSON.stringify(consent));
  form.set('attestations',JSON.stringify(attestations));
  if (fingerprint) form.set('fingerprint', fingerprint);
  const response = await fetch(path, { method: 'POST', body: form, headers: { Accept: 'application/json' } });
  if (response.status === 401) window.dispatchEvent(new Event('mango-session-lost'));
  return { status: response.status, data: (await response.json().catch(() => ({}))) as T & ArchiveError };
}

export const archiveActive = (archive: ArchiveImport) => archive.state === 'applying' || archive.state === 'undoing';
