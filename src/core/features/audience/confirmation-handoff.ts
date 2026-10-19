import {recipientOptOutSql,recipientSuppressionSql} from './public-resubscribe-policy';
import type {Database} from '@/core/platform/db/client';

/** One authoritative check after message preparation. The existing unique
 * confirmation and signup claims prevent automatic replay of uncertain sends. */
export function createConfirmationHandoff(database: Database) {
  return async (id: string, destinationHash: string, channel: 'email' | 'sms', publicCapture: boolean) => {
    const email = channel === 'email', address = email ? 'contact_email_addresses' : 'contact_phones';
    const destination = email ? 'email' : 'phone_e164', status = email ? 'email_status' : 'sms_status';
    const statusAt = email ? 'email_status_at' : 'sms_status_at';
    const restriction = (column: string, time: string) => publicCapture
      ? `${column} != 'subscribed' AND (${column} != 'unsubscribed' OR ${time}<e.occurred_at) AND (${column} != 'suppressed' OR EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=? AND channel=? AND ${recipientSuppressionSql}))`
      : `${column} != 'suppressed' AND (${column} != 'unsubscribed' OR ${time}<e.occurred_at)`;
    const now = Date.now();
    const db=database.$client;
    const claimed = await db.batch([db.prepare(`INSERT INTO consent_handoff_claims(id,contact_id,created_at) SELECT consent_confirmations.id,consent_confirmations.contact_id,? FROM consent_confirmations WHERE id=?
      AND confirmed_at IS NULL AND EXISTS(
        SELECT 1 FROM consent_evidence e JOIN ${address} a ON a.${destination}=e.destination AND a.contact_id=e.contact_id
        JOIN contacts c ON c.id=e.contact_id
        WHERE e.id=consent_confirmations.consent_evidence_id AND e.contact_id=consent_confirmations.contact_id
          AND e.channel=? AND e.confirmed_at IS NULL AND c.merge_lock IS NULL
          AND ${restriction(`c.${status}`, `c.${statusAt}`)}
          AND ${restriction('a.channel_status', 'a.channel_status_at')}
          AND NOT EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=? AND channel=? ${publicCapture ? `AND (NOT (${recipientSuppressionSql}) OR occurred_at>=e.occurred_at)` : ''})
          AND NOT EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=? AND channel=? ${publicCapture ? `AND (NOT (${recipientOptOutSql}) OR occurred_at>=e.occurred_at)` : 'AND occurred_at>=e.occurred_at'})
      ) ON CONFLICT(id) DO NOTHING RETURNING id`).bind(now, id, channel, ...(publicCapture ? [destinationHash,channel,destinationHash,channel] : []), destinationHash, channel, destinationHash, channel),
      db.prepare(`INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at)
        SELECT id||'_attempted',contact_id,'confirmation-attempted','Confirmation handoff authorized; provider outcome is recorded separately.',?,?,?
        FROM consent_handoff_claims WHERE id=? AND created_at=? ON CONFLICT(id) DO NOTHING`).bind(now,now,now,id,now),
    ]);
    return claimed[0].results.length===1;
  };
}
