import type { ImportPlan } from '@/vendor/base/import-kit/src/types';
import { sha256, ulid } from '@/core/shared/ids';
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
export function heldStatus(state: ImportState, contactId: string | null, status: string, hash: string) {
  const current = contactId ? state.snapshots.get(contactId)?.tables.contacts[0]?.email_status : undefined;
  return current === 'suppressed' || state.suppressions.some(item => item.destination_hash === hash && item.channel === 'email') ? 'suppressed' : status;
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
      const { contactId } = row.held!, status = row.status, hash = await sha256(`${salt}:${row.email}`);
      const weaker = JSON.stringify(status === 'suppressed' ? ['subscribed', 'pending', 'non-subscribed', 'unsubscribed'] : ['subscribed', 'pending', 'non-subscribed']);
      statements.push(
        db.prepare('UPDATE contacts SET email_status=? WHERE id=? AND email_status IN (SELECT value FROM json_each(?))').bind(status, contactId, weaker),
        db.prepare('UPDATE contact_email_addresses SET channel_status=? WHERE contact_id=? AND email=? AND channel_status IN (SELECT value FROM json_each(?))')
          .bind(status, contactId, row.email, weaker),
        // Its own opt-out, named for this import, so a replay adds nothing and no before image carries it.
        db.prepare(`INSERT INTO surviving_opt_outs(id,destination_hash,channel,reason,occurred_at,created_at,updated_at) VALUES(?,?,'email',?,?,?,?)
          ON CONFLICT(destination_hash,channel,reason) DO NOTHING`).bind(ulid(now), hash, `import-${status}:${plan.fingerprint.slice(0, 16)}`, now, now, now));
      if (status === 'suppressed') statements.push(db.prepare(`INSERT INTO contact_suppressions(id,contact_id,channel,destination_hash,cause,occurred_at,provider_event_id,created_at,updated_at)
        SELECT ?,(SELECT id FROM contacts WHERE id=?),'email',?,'import-cleaned-or-bounced',?,NULL,?,? WHERE NOT EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=? AND channel='email')`)
        .bind(ulid(now), contactId, hash, now, now, now, hash));
    }
    await db.batch(statements);
  }
}
