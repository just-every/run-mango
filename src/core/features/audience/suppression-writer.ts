import type { Database } from '@/core/platform/db/client';
import { recordPortableHash } from './portable-hashes';

type Suppression = {id: string; destination: string; destinationHash: string; channel: 'email' | 'sms'; cause: string; occurredAt: Date; providerEventId?: string};

/** Suppression evidence, the surviving destination block for this cause, visible status and
 * history commit together. Other reasons' blocks, opt-outs among them, are never touched. Replays repair older partial writes idempotently. */
export function createSuppressionWriter(database: Database) {
  const client = database.$client;
  return async (input: Suppression) => {
    const {id, destination, destinationHash, channel, cause, providerEventId} = input;
    const time = input.occurredAt.getTime();
    const addressTable = channel === 'email' ? 'contact_email_addresses' : 'contact_phones';
    const addressColumn = channel === 'email' ? 'email' : 'phone_e164';
    const contactStatus = channel === 'email' ? 'email_status' : 'sms_status';
    const contactStatusAt = channel === 'email' ? 'email_status_at' : 'sms_status_at';
    const owner = channel === 'email'
      ? `COALESCE((SELECT contact_id FROM contact_email_addresses WHERE email = ?), (SELECT id FROM contacts WHERE email = ?))`
      : `(SELECT contact_id FROM contact_phones WHERE phone_e164 = ?)`;
    const ownerValues = channel === 'email' ? [destination, destination] : [destination];
    const identity = providerEventId ? 'provider_event_id = ?' : 'id = ?';
    const identityValue = providerEventId ?? id;
    const guard = `EXISTS (SELECT 1 FROM contact_suppressions WHERE ${identity} AND destination_hash = ? AND channel = ? AND cause = ? AND occurred_at = ?)`;
    const guardValues = [identityValue, destinationHash, channel, cause, time];
    const result = await client.batch([
      client.prepare(`INSERT INTO contact_suppressions
        (id, contact_id, channel, destination_hash, cause, occurred_at, provider_event_id, created_at, updated_at)
        VALUES (?, ${owner}, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`)
        .bind(id, ...ownerValues, channel, destinationHash, cause, time, providerEventId ?? null, time, time),
      client.prepare(`INSERT INTO surviving_opt_outs (id, destination_hash, channel, reason, occurred_at, created_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${guard}
        ON CONFLICT(destination_hash, channel, reason) DO UPDATE SET occurred_at = excluded.occurred_at,
          updated_at = excluded.updated_at WHERE surviving_opt_outs.occurred_at <= excluded.occurred_at`)
        .bind(`${id}_block`, destinationHash, channel, cause, time, time, time, ...guardValues),
      recordPortableHash(client, destinationHash, destination),
      client.prepare(`UPDATE ${addressTable} SET channel_status = 'suppressed',
        channel_status_at = MAX(COALESCE(channel_status_at, 0), ?), updated_at = MAX(updated_at, ?)
        WHERE ${addressColumn} = ? AND ${guard}`).bind(time, time, destination, ...guardValues),
      client.prepare(`UPDATE contacts SET ${contactStatus} = 'suppressed',
        ${contactStatusAt} = MAX(COALESCE(${contactStatusAt}, 0), ?), updated_at = MAX(updated_at, ?)
        WHERE id = ${owner} AND ${guard}`).bind(time, time, ...ownerValues, ...guardValues),
      client.prepare(`INSERT INTO contact_history (id, contact_id, kind, detail, occurred_at, created_at, updated_at)
        SELECT ?, id, 'suppression', ?, ?, ?, ? FROM contacts WHERE id = ${owner} AND ${guard} ON CONFLICT(id) DO NOTHING`)
        .bind(providerEventId ?? `${id}_history`, cause, time, time, time, ...ownerValues, ...guardValues),
    ]);
    if (!await client.prepare(`SELECT 1 AS present WHERE ${guard}`).bind(...guardValues).first()) {
      throw new Error('Provider suppression identity was reused for different evidence.');
    }
    return {kind: result[0].meta.changes ? 'recorded' as const : 'duplicate' as const};
  };
}
