import {recipientOptOutSql} from './public-resubscribe-policy';

/** Manual evidence may renew an active subscription, but cannot lift a restriction.
 * A historical recipient opt-out is superseded only by a later subscribed state.
 * Use the same predicate before capture and inside its write transaction. */
export function manualEmailEligibility(destination: string, destinationHash: string) {
  return {
    sql: `NOT EXISTS(SELECT 1 FROM contacts WHERE (email=? OR id IN (SELECT contact_id FROM contact_email_addresses WHERE email=?))
        AND (merge_lock IS NOT NULL OR email_status IN ('unsubscribed','suppressed')))
      AND NOT EXISTS(SELECT 1 FROM contact_email_addresses WHERE email=? AND channel_status IN ('unsubscribed','suppressed'))
      AND NOT EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=? AND channel='email')
      AND NOT EXISTS(SELECT 1 FROM surviving_opt_outs o WHERE destination_hash=? AND channel='email'
        AND (NOT (${recipientOptOutSql}) OR NOT EXISTS(SELECT 1 FROM contact_email_addresses a
          WHERE a.email=? AND a.channel_status='subscribed' AND a.channel_status_at>o.occurred_at)))`,
    values: [destination, destination, destination, destinationHash, destinationHash, destination],
  };
}
