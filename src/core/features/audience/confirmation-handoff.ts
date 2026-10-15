import type {Database} from '@/core/platform/db/client';

/** One authoritative check after message preparation. The existing unique
 * confirmation and signup claims prevent automatic replay of uncertain sends. */
export function createConfirmationHandoff(database: Database) {
  return async (id: string, destinationHash: string, channel: 'email' | 'sms', publicCapture: boolean) => {
    const email = channel === 'email', address = email ? 'contact_email_addresses' : 'contact_phones';
    const destination = email ? 'email' : 'phone_e164', status = email ? 'email_status' : 'sms_status';
    const statusAt = email ? 'email_status_at' : 'sms_status_at';
    const restriction = (column: string, time: string) => publicCapture
      ? `${column} NOT IN ('subscribed','unsubscribed','suppressed')`
      : `${column} != 'suppressed' AND (${column} != 'unsubscribed' OR ${time}<e.occurred_at)`;
    const now = Date.now();
    const claimed = await database.$client.prepare(`INSERT INTO consent_handoff_claims(id,contact_id,created_at) SELECT consent_confirmations.id,consent_confirmations.contact_id,? FROM consent_confirmations WHERE id=?
      AND confirmed_at IS NULL AND EXISTS(
        SELECT 1 FROM consent_evidence e JOIN ${address} a ON a.${destination}=e.destination AND a.contact_id=e.contact_id
        JOIN contacts c ON c.id=e.contact_id
        WHERE e.id=consent_confirmations.consent_evidence_id AND e.contact_id=consent_confirmations.contact_id
          AND e.channel=? AND e.confirmed_at IS NULL AND c.merge_lock IS NULL
          AND ${restriction(`c.${status}`, `c.${statusAt}`)}
          AND ${restriction('a.channel_status', 'a.channel_status_at')}
          AND NOT EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=? AND channel=?)
          AND NOT EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=? AND channel=? ${publicCapture ? '' : 'AND occurred_at>=e.occurred_at'})
      ) ON CONFLICT(id) DO NOTHING RETURNING id`).bind(now, id, channel, destinationHash, channel, destinationHash, channel).first();
    return Boolean(claimed);
  };
}
