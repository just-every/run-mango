import { csvRows } from '@/core/features/audience/csv';
import { isNestedArchive } from './zip-reader';

// What each archive entry becomes, decided from folder names, file names and CSV
// headers only. Anything unrecognised is kept as raw source and never imported.
export type AudienceStatus = 'subscribed' | 'unsubscribed' | 'cleaned' | 'non-subscribed';
export type RawKind = 'reports' | 'sms' | 'events' | 'appointments' | 'ecommerce' | 'gallery' | 'nested-archive' | 'unmatched-content' | 'other';
export type ArchivePart =
  | { kind: 'audience'; status: AudienceStatus }
  | { kind: 'emails' }
  | { kind: 'campaign-html' } | { kind: 'campaign-text' }
  | { kind: 'template' }
  | { kind: 'raw'; raw: RawKind };

export const rawLabels: Record<RawKind, string> = {
  reports: 'Reports (opens, clicks, geography, activity)', sms: 'SMS contacts', events: 'Custom events', appointments: 'Appointments',
  ecommerce: 'Ecommerce products and orders', gallery: 'Gallery images and files', 'nested-archive': 'Archives inside the archive (not opened)',
  'unmatched-content': 'Email content with no matching row in the emails CSV', other: 'Other files',
};

const segmentsOf = (path: string) => path.toLowerCase().split('/');
const extension = (path: string) => /\.([a-z0-9]+)$/i.exec(path)?.[1].toLowerCase() ?? '';
const headerKey = (value: string) => value.trim().toLowerCase().replace(/[_\s-]+/g, '');
export const emailHeaders = ['emailaddress', 'email'];
export const historyHeaders = {
  title: ['title', 'campaigntitle', 'campaignname', 'name'],
  subject: ['subject', 'subjectline', 'emailsubject'],
  sentAt: ['sendtime', 'senddate', 'sentat', 'sent', 'datesent', 'sendtimeutc'],
} as const;
/** The header row only; a malformed body is reported later by the import that reads it. */
export function csvHeaders(text: string) {
  const line = /^[^\r\n]*/.exec(text.replace(/^\uFEFF/, ''))![0];
  try { return csvRows(line)[0] ?? []; } catch { return []; }
}
export const findHeader = (headers: string[], aliases: readonly string[]) => aliases.map(alias => headers.find(header => headerKey(header) === alias)).find(Boolean);

function audienceStatus(file: string): AudienceStatus | undefined {
  const name = file.toLowerCase().replace(/\.csv$/, '');
  if (/non[-_ ]?subscribed|transactional/.test(name)) return 'non-subscribed';
  if (/unsubscribed/.test(name)) return 'unsubscribed';
  if (/cleaned/.test(name)) return 'cleaned';
  if (/subscribed/.test(name)) return 'subscribed';
  return undefined;
}

/** Folder words decide raw kinds before any CSV is read, so an SMS file is never an email audience. */
function rawKind(path: string): RawKind | undefined {
  const segments = segmentsOf(path), folders = segments.slice(0, -1), file = segments.at(-1)!;
  const has = (...words: string[]) => folders.some(segment => words.some(word => segment === word || segment.split(/[^a-z0-9]+/).includes(word)));
  if (isNestedArchive(path)) return 'nested-archive';
  if (has('sms') || /(^|[^a-z])sms([^a-z]|$)/.test(file)) return 'sms';
  if (has('reports', 'report', 'aggregate_activity', 'granular_activity', 'geo_data')) return 'reports';
  if (has('gallery')) return 'gallery';
  if (has('ecommerce', 'orders', 'products')) return 'ecommerce';
  if (has('events') || /^events?([^a-z]|$)/.test(file)) return 'events';
  if (has('appointments') || /^appointments?([^a-z]|$)/.test(file)) return 'appointments';
  return undefined;
}

/** Which entries are read as text: everything that may become an import or needs its header read. */
export function keepsText(path: string) {
  if (rawKind(path)) return false;
  return ['csv', 'html', 'htm', 'txt'].includes(extension(path));
}

export function classify(path: string, text: string | undefined): ArchivePart {
  const raw = rawKind(path);
  if (raw) return { kind: 'raw', raw };
  const segments = segmentsOf(path), ext = extension(path);
  if (segments.includes('campaigns_content')) {
    if (ext === 'html' || ext === 'htm') return { kind: 'campaign-html' };
    if (ext === 'txt') return { kind: 'campaign-text' };
  }
  if (segments.slice(0, -1).includes('templates') && (ext === 'html' || ext === 'htm')) return { kind: 'template' };
  if (ext === 'csv' && text !== undefined) {
    const headers = csvHeaders(text);
    const status = audienceStatus(segments.at(-1)!);
    if (status && findHeader(headers, emailHeaders)) return { kind: 'audience', status };
    if (!findHeader(headers, emailHeaders) && findHeader(headers, historyHeaders.subject)) return { kind: 'emails' };
  }
  return { kind: 'raw', raw: 'other' };
}
