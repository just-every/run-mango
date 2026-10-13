import { canonicalJson } from '@/vendor/base/import-kit/src/d1/index';
import type { ImportPlan } from '@/vendor/base/import-kit/src/types';
import type { NativeRow } from './import-types';
import type { NormalizedImportRow } from './import-normalize';
import { claimPortableRestrictions, portableHash } from './portable-hashes';

// An opt-out or suppression whose address no contact holds (its contact was undone, abandoned or
// erased, or it arrived for an address Mango never held) travels in the export as an opt-out-only
// ledger line, by the address's portable identity. A Mango-preset import writes it back outside
// the undo plan, as an opt-out no undo lifts, and the address takes it the moment it arrives.

const columns = {
  surviving_opt_outs: ['id', 'destination_hash', 'channel', 'reason', 'occurred_at', 'created_at', 'updated_at'],
  contact_suppressions: ['id', 'contact_id', 'channel', 'destination_hash', 'cause', 'occurred_at', 'provider_event_id', 'created_at', 'updated_at'],
} as const;
type Table = keyof typeof columns;
const tables = Object.keys(columns) as Table[];
export type OptOutLine = { hash: string } & Record<Table, NativeRow[]>;

/** Every opt-out and suppression no exported contact carries, one line per address. */
export async function optOutLines(db: D1Database, carried: Set<string>) {
  const lines = new Map<string, OptOutLine>();
  for (const table of tables) {
    const rows = (await db.prepare(`SELECT r.*,m.portable_hash AS portable_hash FROM ${table} r LEFT JOIN audience_portable_hashes m ON m.destination_hash=r.destination_hash ORDER BY r.id`).all<NativeRow>()).results;
    for (const row of rows) {
      // A row written before its address's portable identity was recorded cannot leave by it.
      if (carried.has(`${table}:${row.id}`) || !row.portable_hash) continue;
      const hash = String(row.portable_hash);
      if (!lines.has(hash)) lines.set(hash, { hash, surviving_opt_outs: [], contact_suppressions: [] });
      lines.get(hash)![table].push({ ...Object.fromEntries(columns[table].map(column => [column, row[column]])), destination_hash: hash, ...(table === 'contact_suppressions' ? { contact_id: null } : {}) });
    }
  }
  return [...lines.values()].sort((a, b) => a.hash.localeCompare(b.hash));
}

const channelStatus = (line: OptOutLine, channel: string) => line.contact_suppressions.some(row => row.channel === channel) ? 'suppressed' : line.surviving_opt_outs.some(row => row.channel === channel) ? 'unsubscribed' : '';
export const optOutStatus = (line: OptOutLine) => line.contact_suppressions.length ? 'suppressed' : 'unsubscribed';

/** The export row: no address, the statuses it blocks, and its ledger. */
export const optOutCsvRow = (line: OptOutLine) => ['', '', '', channelStatus(line, 'email'), channelStatus(line, 'sms'), '', '', '', '', '', '', canonicalJson({ opt_outs: line })];

/** The validated line of an opt-out-only ledger, or undefined for a contact's ledger. */
export function optOutLedger(value: unknown): OptOutLine | undefined {
  if (!value || typeof value !== 'object' || !('opt_outs' in value)) return undefined;
  const line = (value as { opt_outs: OptOutLine }).opt_outs;
  if (Object.keys(value).length !== 1 || !line || typeof line !== 'object' || Object.keys(line).sort().join(',') !== 'contact_suppressions,hash,surviving_opt_outs') throw new Error('Invalid opt-out ledger.');
  if (typeof line.hash !== 'string' || !/^[a-f0-9]{64}$/.test(line.hash)) throw new Error('Invalid opt-out ledger identity.');
  if (tables.some(table => !Array.isArray(line[table])) || !tables.some(table => line[table].length)) throw new Error('An opt-out ledger requires its opt-outs or suppressions.');
  for (const table of tables) {
    const ids = new Set<string>();
    for (const row of line[table]) {
      if (!row || typeof row !== 'object' || Object.keys(row).sort().join(',') !== [...columns[table]].sort().join(',')) throw new Error(`Invalid ${table} columns.`);
      if (typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw new Error('Invalid or duplicate ledger identity.');
      ids.add(row.id);
      if (row.destination_hash !== line.hash || !['email', 'sms'].includes(String(row.channel))) throw new Error('Opt-out is outside its ledger identity.');
      if (['occurred_at', 'created_at', 'updated_at'].some(key => !Number.isSafeInteger(row[key]) || Number(row[key]) < 0)) throw new Error('Invalid ledger timestamp.');
      const named = table === 'surviving_opt_outs' ? row.reason : row.cause;
      if (typeof named !== 'string' || !named) throw new Error('An opt-out ledger names each reason.');
      if (table === 'contact_suppressions' && (row.contact_id !== null || !(row.provider_event_id === null || typeof row.provider_event_id === 'string'))) throw new Error('Invalid contact_suppressions columns.');
    }
  }
  return line;
}

export const optOutRows = (plan: ImportPlan) => plan.entries.flatMap(entry => {
  const row = entry.source.payload as unknown as NormalizedImportRow;
  return row.optOuts && !entry.rejection ? [row] : [];
});

/** Writes each restored line's rows by the portable identity (mapped to itself), then gives the
 * addresses already here their restrictions. Replays change nothing. */
export async function restoreOptOutLines(db: D1Database, salt: string, plan: ImportPlan) {
  const lines = optOutRows(plan).map(row => row.optOuts!);
  if (!lines.length) return;
  // Set-based writes, so a large export restores within D1's statements per request.
  for (const table of tables) {
    const rows = lines.flatMap(line => line[table]);
    for (let start = 0; start < rows.length; start += 2000) await db.prepare(`INSERT INTO ${table}(${columns[table].join(',')}) SELECT ${columns[table].map(column => `json_extract(value,'$.${column}')`).join(',')} FROM json_each(?) WHERE 1 ON CONFLICT DO NOTHING`)
      .bind(JSON.stringify(rows.slice(start, start + 2000))).run();
  }
  for (let start = 0; start < lines.length; start += 5000) await db.prepare('INSERT INTO audience_portable_hashes(destination_hash,portable_hash) SELECT value,value FROM json_each(?) WHERE 1 ON CONFLICT DO NOTHING')
    .bind(JSON.stringify(lines.slice(start, start + 5000).map(line => line.hash))).run();
  const restored = new Set(lines.map(line => line.hash));
  const addresses = (await db.prepare('SELECT email AS destination FROM contact_email_addresses UNION SELECT email FROM contacts WHERE email IS NOT NULL UNION SELECT phone_e164 FROM contact_phones').all<{ destination: string }>()).results;
  await claimPortableRestrictions(db, salt, addresses.map(row => row.destination).filter(destination => restored.has(portableHash(destination))));
}
