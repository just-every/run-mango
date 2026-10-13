import { csvRows, parseCsv } from './csv';
import { canonicalEmail, canonicalPhone } from './identity';
import { presetStatuses, type ImportInput, type AudienceSnapshot } from './import-types';
import { resolveHeaderMapping, isStatusHeader } from './import-mapping';
import { maxContactImportRows } from './import-limits';

export type NormalizedImportRow = {
  file: string; row: number; email: string; displayName: string; status: string; reason?: string; skipped?: string; warnings: string[];
  values: Record<string, string>; ledger?: AudienceSnapshot;
  /** A contact another import still attributes: only this row's opt-out or suppression is applied to it.
   * contactId is null while an unfinished import has planned the contact but not written it. */
  held?: { contactId: string | null; reason: string };
};
export function timestamp(value: string | undefined) {
  if (!value?.trim()) return null;
  value=value.trim();
  // Treat timezone-less CSV timestamps as UTC, never in the server timezone.
  const normalized = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value) ? value.replace(' ', 'T') + 'Z' : value;
  const time = Date.parse(normalized);
  if (!Number.isFinite(time)) throw new Error(`Invalid timestamp: ${value}`);
  return time;
}
export function normalizeImport(input: ImportInput) {
  if (!Array.isArray(input.files) || !input.files.length || input.files.length > 10) throw new Error('Choose between one and ten CSV files.');
  if(new Set(input.files.map(file=>file.name)).size!==input.files.length)throw new Error('Choose distinct filenames for each CSV export.');
  const rows: NormalizedImportRow[] = []; const columns: Array<{name:string;headers:string[];mapping:Record<string,string>}> = [];
  if (input.files.reduce((sum, file) => sum + new TextEncoder().encode(file.csv).length, 0) > 10_000_000) throw new Error('Audience import is limited to 10 MB.');
  for (const file of input.files) {
    if (!(file.preset in presetStatuses)) throw new Error(`Unknown CSV preset: ${file.preset}`);
    const headers = csvRows(file.csv)[0] ?? [];
    const mapping = file.preset === 'mango' ? {} : resolveHeaderMapping(headers, file.mapping);
    columns.push({name:file.name,headers,mapping});
    for (const [index, original] of parseCsv(file.csv).entries()) {
      const values = { ...original };
      for (const [field, header] of Object.entries(mapping)) values[field] = original[header.trim().toLowerCase()] ?? '';
      const row: NormalizedImportRow = {file:file.name,row:index+2,email:'',displayName:'',status:file.preset==='mango'?(values.email_status || 'non-subscribed'):presetStatuses[file.preset],warnings:[],values};
      try {
        if (original.__parse_error) throw new Error(original.__parse_error);
        if(file.preset==='mango' && values.ledger_json)row.ledger=JSON.parse(values.ledger_json);
        row.email = canonicalEmail(values.email) ?? '';
        if(values.phone)canonicalPhone(values.phone);
        if (!row.email && !row.ledger?.tables.contact_phones?.length) throw new Error('An email address is required.');
        // A row with no name leaves the contact's name as it is (import-snapshot).
        row.displayName = values.display_name || [values.first_name,values.last_name].filter(Boolean).join(' ');
        const sourceStatuses = [values.email_status, values.status,
          ...Object.entries(original).filter(([header]) => isStatusHeader(header)).map(([, value]) => value),
        ].filter(Boolean).map(value => value.trim().toLowerCase().replace(/[_\s]+/g, '-'));
        // A mapping never hides another source column's opt-out or suppression.
        for (const rawStatus of sourceStatuses) {
          const mapped = statusAliases[rawStatus] ?? rawStatus;
          if (!Object.hasOwn(restrictiveRank, mapped)) throw new Error(`Unknown source email status: ${rawStatus}`);
          if (restrictiveRank[mapped] > restrictiveRank[row.status]) row.status = mapped;
        }
        values.source_status=sourceStatuses.join('; ') || file.preset.replace('csv-','');
        if (file.preset === 'mango') {
          if (!values.ledger_json) throw new Error('Mango exports require the lossless ledger_json column.');
          row.ledger = JSON.parse(values.ledger_json);
          // An observation without a name carries no name key, as Mango reads it (import-read).
          for (const observation of row.ledger?.tables?.audience_import_observations ?? []) if (observation.source_display_name === null) delete observation.source_display_name;
        } else if (row.status === 'subscribed') {
          const evidence = ['brandOrLegalSender','messageCategory','frequencyDisclosure','destinationJurisdiction','consentText','consentVersion'];
          if (!timestamp(values.occurred_at) || !timestamp(values.confirmed_at) || evidence.some(field => !input.consent?.[field]?.trim())) {
            row.status = 'non-subscribed'; row.warnings.push('Original consent scope, opt-in time and confirmation time are required before this contact can receive marketing.');
          } else if (timestamp(values.confirmed_at)! < timestamp(values.occurred_at)!) throw new Error('Confirmation precedes opt-in.');
        }
      } catch (error) { row.reason = error instanceof Error ? error.message : 'Invalid CSV row.'; }
      rows.push(row);
      if (rows.length > maxContactImportRows) throw new Error(`Audience import is limited to ${maxContactImportRows} rows per review.`);
    }
  }
  return { rows, columns };
}
export const restrictiveRank: Record<string,number> = {subscribed:0,pending:1,'non-subscribed':2,unsubscribed:3,suppressed:4};

const statusAliases: Record<string, string> = {
  cleaned: 'suppressed', bounced: 'suppressed', 'hard-bounce': 'suppressed',
  complained: 'suppressed', blocked: 'suppressed', transactional: 'non-subscribed',
  confirmed: 'subscribed', unconfirmed: 'pending', 'pending-confirmation': 'pending',
};
