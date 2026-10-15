import type { ImportPlan } from '@/vendor/base/import-kit/src/types';
import { sha256, ulid } from '@/core/shared/ids';
import { recordPortableHash } from './portable-hashes';
import type { ImportState } from './import-state';
import type { NormalizedImportRow } from './import-normalize';

// A contact another import still attributes cannot take a reviewed effect, so its row's
// unsubscribe or suppression is written here instead, outside the reversible plan: no undo
// rolls it back, and nothing else Mango holds for the contact changes. Like an opt-out
// recorded after a snapshot was read (import-restrictions), it adds its own opt-out row and
// raises the statuses it covers, so the holding import can still be abandoned or undone
// (import-recorded) and its rollback keeps the raised status. A contact an unfinished import
// has planned but not written gets only the opt-out record; that import then writes the
// contact unsubscribed or suppressed.

/** The row's restrictive status, or a stronger block Mango already holds for the address. */
export function heldStatus(state: ImportState, contactId: string | null, status: string, hash: string, channel: 'email'|'sms' = 'email') {
  const current = contactId ? state.snapshots.get(contactId)?.tables.contacts[0]?.[`${channel}_status`] : undefined;
  return current === 'suppressed' || state.suppressions.some(item => item.destination_hash === hash && item.channel === channel) ? 'suppressed' : status;
}

export const heldRows = (plan: ImportPlan) => plan.entries.flatMap(entry => {
  const row = entry.source.payload as unknown as NormalizedImportRow;
  return row.held && !entry.rejection ? [row] : [];
});

/** Writes each held row's opt-out (and suppression); replays change nothing. */
export async function applyHeldRestrictions(db: D1Database, salt: string, plan: ImportPlan, now = Date.now()) {
  const rows = heldRows(plan);
  for (let start = 0; start < rows.length; start += 50) {
    const statements: D1PreparedStatement[] = [];
    for (const row of rows.slice(start, start + 50)) {
      for(const entry of [{channel:'email',destination:row.email,status:row.status,table:'contact_email_addresses',column:'email'},{channel:'sms',destination:row.phone,status:row.smsStatus,table:'contact_phones',column:'phone_e164'}]){
        if(!entry.destination||!['unsubscribed','suppressed'].includes(entry.status))continue;
        const {contactId}=row.held!,{channel,destination,status,table,column}=entry,hash=await sha256(`${salt}:${destination}`);
        const weaker=JSON.stringify(status==='suppressed'?['subscribed','pending','non-subscribed','unsubscribed']:['subscribed','pending','non-subscribed']);
        statements.push(
          db.prepare(`UPDATE contacts SET ${channel}_status=? WHERE id=? AND ${channel}_status IN (SELECT value FROM json_each(?)) AND EXISTS(SELECT 1 FROM ${table} a WHERE a.contact_id=contacts.id AND a.${column}=?)`).bind(status,contactId,weaker,destination),
          db.prepare(`UPDATE ${table} SET channel_status=? WHERE contact_id=? AND ${column}=? AND channel_status IN (SELECT value FROM json_each(?))`).bind(status,contactId,destination,weaker),
          db.prepare('INSERT INTO surviving_opt_outs(id,destination_hash,channel,reason,occurred_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(destination_hash,channel,reason) DO NOTHING').bind(ulid(now),hash,channel,`import-${status}:${plan.fingerprint.slice(0,16)}`,now,now,now),
          recordPortableHash(db,hash,destination));
        if(status==='suppressed')statements.push(db.prepare(`INSERT INTO contact_suppressions(id,contact_id,channel,destination_hash,cause,occurred_at,provider_event_id,created_at,updated_at) SELECT ?,(SELECT contact_id FROM ${table} WHERE contact_id=? AND ${column}=?),?,?,'import-source-suppression',?,NULL,?,? WHERE NOT EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=? AND channel=?)`).bind(ulid(now),contactId,destination,channel,hash,now,now,now,hash,channel));
      }
    }
    await db.batch(statements);
  }
}
