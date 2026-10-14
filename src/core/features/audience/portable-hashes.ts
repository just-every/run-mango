import { sha256 as digest } from '@/vendor/base/import-kit/src/d1/index';
import { sha256 } from '@/core/shared/ids';

/** The export's identity for an address: one namespace for every installation, so a restored
 * opt-out finds the same person; installation salts never leave through the ledger. */
export const portableHash = (destination: string) => digest(`mango-audience-export-v1:${destination}`);

const mapping = 'INSERT INTO audience_portable_hashes(destination_hash,portable_hash) VALUES(?,?) ON CONFLICT DO NOTHING';

/** Every writer of an opt-out or suppression records its address's portable identity, so the
 * export carries the restriction after the address's contact has gone (import-opt-out-lines). */
export const portableHashSql = (hash: string, destination: string) => ({ sql: mapping, params: [hash, portableHash(destination)] });
export const recordPortableHash = (db: D1Database, hash: string, destination: string) => db.prepare(mapping).bind(hash, portableHash(destination));

/** An opt-out or suppression restored from another installation names its address only by the
 * portable identity. When that address is here, or arrives (a contact, a signup, an import), the
 * restriction takes this installation's hash and covers it like one recorded here, raising the
 * statuses it covers and nothing else (as import-restrictions does). Set-based, so a large file
 * stays within D1's statements per request. Returns the addresses claimed. */
export async function claimPortableRestrictions(db: D1Database, salt: string, destinations: string[]) {
  const byPortable = new Map([...new Set(destinations.filter(Boolean))].map(destination => [portableHash(destination), destination]));
  const keys = [...byPortable.keys()], found: string[] = [];
  for (let start = 0; start < keys.length; start += 5000) {
    const chunk = JSON.stringify(keys.slice(start, start + 5000));
    found.push(...(await db.prepare('SELECT destination_hash AS hash FROM surviving_opt_outs WHERE destination_hash IN (SELECT value FROM json_each(?1)) UNION SELECT destination_hash FROM contact_suppressions WHERE destination_hash IN (SELECT value FROM json_each(?1))')
      .bind(chunk).all<{ hash: string }>()).results.map(row => row.hash));
  }
  for (let start = 0; start < found.length; start += 500) {
    const pairs = JSON.stringify(await Promise.all(found.slice(start, start + 500).map(async p => ({ p, s: await sha256(`${salt}:${byPortable.get(p)}`), d: byPortable.get(p) }))));
    await db.batch(claimStatements.map(sql => db.prepare(sql).bind(pairs)));
  }
  return found.map(portable => byPortable.get(portable)!);
}

// ?1 is the JSON list of {p: portable hash, s: this installation's hash, d: the address}.
const pair = (key: string, column: string, value: string) => `(SELECT json_extract(value,'$.${value}') FROM json_each(?1) WHERE json_extract(value,'$.${key}')=${column})`;
const restored = "(SELECT json_extract(value,'$.p') FROM json_each(?1))";
const raise = (table: string, column: string, channel: string, address: string) => {
  const hash = pair('d', address, 's');
  const suppressed = `EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=${hash} AND channel='${channel}')`;
  const optedOut = `EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=${hash} AND channel='${channel}')`;
  return `UPDATE ${table} SET ${column}=CASE WHEN ${suppressed} THEN 'suppressed' WHEN ${optedOut} AND ${column} NOT IN ('unsubscribed','suppressed') THEN 'unsubscribed' ELSE ${column} END
    WHERE ${address} IN (SELECT json_extract(value,'$.d') FROM json_each(?1)) AND (${suppressed} AND ${column}<>'suppressed' OR ${optedOut} AND ${column} NOT IN ('unsubscribed','suppressed'))`;
};
const claimStatements = [
  `UPDATE surviving_opt_outs SET destination_hash=${pair('p', 'surviving_opt_outs.destination_hash', 's')} WHERE destination_hash IN ${restored}
    AND NOT EXISTS(SELECT 1 FROM surviving_opt_outs o WHERE o.destination_hash=${pair('p', 'surviving_opt_outs.destination_hash', 's')} AND o.channel=surviving_opt_outs.channel AND o.reason=surviving_opt_outs.reason)`,
  // An equal opt-out this installation already holds stands for the restored one.
  `DELETE FROM surviving_opt_outs WHERE destination_hash IN ${restored}`,
  `UPDATE contact_suppressions SET destination_hash=${pair('p', 'contact_suppressions.destination_hash', 's')} WHERE destination_hash IN ${restored}`,
  `DELETE FROM audience_portable_hashes WHERE destination_hash IN ${restored}`,
  "INSERT INTO audience_portable_hashes(destination_hash,portable_hash) SELECT json_extract(value,'$.s'),json_extract(value,'$.p') FROM json_each(?1) WHERE 1 ON CONFLICT DO NOTHING",
  raise('contact_email_addresses', 'channel_status', 'email', 'contact_email_addresses.email'),
  raise('contact_phones', 'channel_status', 'sms', 'contact_phones.phone_e164'),
  // A contact's own status follows its primary email and its phones.
  raise('contacts', 'email_status', 'email', 'contacts.email'),
  raise('contacts', 'sms_status', 'sms', '(SELECT p.phone_e164 FROM contact_phones p WHERE p.contact_id=contacts.id AND p.phone_e164 IN (SELECT json_extract(value,\'$.d\') FROM json_each(?1)))'),
];

/** Pure preparation for callers whose restriction claim must share their native
 * business transaction. No database operation executes while preparing. */
export function portableRestrictionStatements(db:D1Database,pairs:Array<{p:string;s:string;d:string}>) {
  const encoded=JSON.stringify(pairs);
  return pairs.length?claimStatements.map(sql=>db.prepare(sql).bind(encoded)):[];
}
