/** Installation maintenance, on the same clock as delivery and erasure. Only
 * identified onsite projections expire; financial and catalog facts do not. */
export async function expireOnsiteEvents(db: D1Database, now: number) {
  const onsite = `contact_id IS NOT NULL AND json_extract(payload,'$.identity') IN
    ('shopify-signed-logged-in-customer','woocommerce-signed-logged-in-customer')`;
  const cutoff = now - 90 * 86400000;
  await db.batch([
    db.prepare(`DELETE FROM source_activities WHERE source_record_id IN
      (SELECT id FROM source_records WHERE ${onsite} AND occurred_at<=?)`).bind(cutoff),
    db.prepare(`DELETE FROM source_records WHERE ${onsite} AND occurred_at<=?`).bind(cutoff),
    // The replay queue has a shorter life than the identified timeline. Its
    // existing deletion trigger invalidates cursors across the removed range.
    db.prepare('DELETE FROM commerce_observations WHERE received_at<=?').bind(now - 30 * 86400000),
    db.prepare('UPDATE commerce_channels SET retention_start=max(retention_start,?)').bind(now - 30 * 86400000),
  ]);
}
