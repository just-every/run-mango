import {sha256} from '@/core/shared/ids';
import type {WooConnection} from './connection';
import type {PluginEvent} from './plugin-events';

/** A signed withdrawal deletes only this store's onsite history. The durable
 * control and receipt commit with deletion, so concurrent/replayed observations
 * cannot repopulate that history. A withdrawal creates no contact or activity. */
export async function withdrawWooObservations(db: D1Database, connection: WooConnection, event: PluginEvent, email: string, receipt: {ids: string[]; digest: string}) {
  const contact = await db.prepare('SELECT contact_id FROM contact_email_addresses WHERE email=?').bind(email.trim().toLowerCase()).first<{contact_id: string}>();
  if (!contact) return;
  const at = Date.parse(event.occurredAt), provider = 'woocommerce:' + connection.id;
  const source = `contact_id=? AND provider=? AND json_extract(payload,'$.identity')='woocommerce-signed-logged-in-customer' AND occurred_at<=?`;
  await db.batch([
    db.prepare('INSERT INTO commerce_transaction_guard SELECT CASE WHEN EXISTS(SELECT 1 FROM woocommerce_connection WHERE id=? AND generation=?) THEN 1 ELSE 0 END').bind(connection.id, connection.generation),
    db.prepare(`INSERT INTO commerce_receipts(id,digest,received_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET
      digest=CASE WHEN commerce_receipts.digest=excluded.digest THEN excluded.digest ELSE NULL END`).bind(await sha256(receipt.ids[0]), receipt.digest, Date.now()),
    db.prepare(`INSERT INTO woocommerce_privacy_controls(connection_id,contact_id,revoked_at) VALUES(?,?,?)
      ON CONFLICT(connection_id,contact_id) DO UPDATE SET revoked_at=max(revoked_at,excluded.revoked_at)`).bind(connection.id, contact.contact_id, at),
    db.prepare(`DELETE FROM source_activities WHERE source_record_id IN (SELECT id FROM source_records WHERE ${source})`).bind(contact.contact_id, provider, at),
    db.prepare(`DELETE FROM source_records WHERE ${source}`).bind(contact.contact_id, provider, at),
    db.prepare('DELETE FROM commerce_transaction_guard'),
  ]);
}
