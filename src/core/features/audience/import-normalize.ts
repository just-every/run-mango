import { csvRows, parseCsv } from './csv';
import { canonicalEmail, canonicalPhone } from './identity';
import { presetStatuses, type ImportInput, type AudienceSnapshot } from './import-types';
import { resolveHeaderMapping, isStatusHeader, isSmsStatusHeader } from './import-mapping';
import { maxContactImportRows } from './import-limits';
import { optOutLedger, optOutStatus, type OptOutLine } from './import-opt-out-lines';

export type NormalizedImportRow = {
  file: string; row: number; email: string; phone: string; smsStatus: string; displayName: string; status: string; reason?: string; skipped?: string; warnings: string[];
  values: Record<string, string>; ledger?: AudienceSnapshot;
  /** A contact another import still attributes: only this row's opt-out or suppression is applied to it.
   * contactId is null while an unfinished import has planned the contact but not written it. */
  held?: { contactId: string | null; reason: string };
  /** An opt-out-only ledger line: written outside the undo plan when the import starts. */
  optOuts?: OptOutLine;
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
      const row: NormalizedImportRow = {file:file.name,row:index+2,email:'',phone:'',smsStatus:'non-subscribed',displayName:'',status:file.preset==='mango'?(values.email_status || 'non-subscribed'):presetStatuses[file.preset],warnings:[],values};
      try {
        if (original.__parse_error) throw new Error(original.__parse_error);
        // An opt-out whose address no contact holds carries only its portable identity (import-opt-out-lines).
        const optOuts = file.preset === 'mango' && values.ledger_json ? optOutLedger(JSON.parse(values.ledger_json)) : undefined;
        if (optOuts) { row.optOuts = optOuts; row.status = optOutStatus(optOuts); values.source_status = row.status; }
        else {
          if(file.preset==='mango' && values.ledger_json)row.ledger=JSON.parse(values.ledger_json);
          row.email = canonicalEmail(values.email) ?? '';
          row.phone = canonicalPhone(values.phone) ?? '';
          if (!row.email && !row.phone && !row.ledger?.tables.contact_phones?.length) throw new Error('An email address or E.164 phone number is required.');
          const smsStatus = (values.sms_status || 'non-subscribed').trim().toLowerCase().replace(/[_\s]+/g, '-');
          row.smsStatus = statusAliases[smsStatus] ?? smsStatus;
          if (!Object.hasOwn(restrictiveRank, row.smsStatus)) throw new Error('Unknown source SMS status.');
          // Explicit mapping cannot conceal another SMS column's restriction.
          for(const [,raw] of Object.entries(original).filter(([header,value])=>Boolean(value)&&isSmsStatusHeader(header))){
            const normalized=raw.trim().toLowerCase().replace(/[_\s]+/g,'-'),status=statusAliases[normalized]??normalized;
            if(!Object.hasOwn(restrictiveRank,status))throw new Error('Unknown source SMS status.');
            if(restrictiveRank[status]>restrictiveRank[row.smsStatus])row.smsStatus=status;
          }
          if (row.phone && row.smsStatus === 'subscribed' && file.preset !== 'mango') {
            const required = ['sms_brand','sms_program','sms_category','sms_frequency','sms_jurisdiction','sms_consent_text','sms_consent_version','sms_capture_method','sms_capture_source'];
            const occurred = timestamp(values.sms_occurred_at), confirmed = timestamp(values.sms_confirmed_at);
            if (!occurred || !confirmed || required.some(key => !values[key]?.trim())) {
              row.smsStatus = 'non-subscribed'; row.warnings.push('SMS requires independent original scope, programme, capture source and confirmed consent; email consent does not apply.');
            } else if (confirmed < occurred || occurred > Date.now() || confirmed > Date.now()) throw new Error('Invalid original SMS consent chronology.');
          }
          if(values.sms_location_recorded_at)timestamp(values.sms_location_recorded_at);
          if(values.sms_time_zone)new Intl.DateTimeFormat('en', {timeZone:values.sms_time_zone});
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
