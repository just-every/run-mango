import type { D1Sql } from '@/vendor/base/import-kit/src/d1/index';
import type { AudienceSnapshot } from './import-types';

const channels = {
  email: { status: 'email_status', table: 'contact_email_addresses', destination: 'email' },
  sms: { status: 'sms_status', table: 'contact_phones', destination: 'phone_e164' },
} as const;

/** An opt-out or suppression a snapshot does not carry was recorded after it was read,
 * by the import itself or since, so writing the snapshot (an apply or an undo) leaves
 * each destination it covers unsubscribed or suppressed. */
export function restrictionStatuses(snapshot: AudienceSnapshot): D1Sql[] {
  const contactId = snapshot.tables.contacts[0].id;
  const optOuts = JSON.stringify(snapshot.tables.surviving_opt_outs.map(row => row.id));
  const suppressions = JSON.stringify(snapshot.tables.contact_suppressions.map(row => row.id));
  return snapshot.identities.flatMap(identity => {
    const channel = channels[identity.channel as keyof typeof channels];
    if (!channel) return [];
    const suppressed = { sql: `EXISTS(SELECT 1 FROM contact_suppressions WHERE destination_hash=? AND channel=? AND id NOT IN (SELECT value FROM json_each(?)))`, params: [identity.hash, identity.channel, suppressions] };
    const optedOut = { sql: `EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=? AND channel=? AND id NOT IN (SELECT value FROM json_each(?)))`, params: [identity.hash, identity.channel, optOuts] };
    const level = (column: string) => ({
      sql: `CASE WHEN ${suppressed.sql} THEN 'suppressed' WHEN ${optedOut.sql} AND ${column} NOT IN ('unsubscribed','suppressed') THEN 'unsubscribed' ELSE ${column} END`,
      params: [...suppressed.params, ...optedOut.params],
    });
    const changes = (column: string) => ({ sql: `(${suppressed.sql} AND ${column}<>'suppressed' OR ${optedOut.sql} AND ${column} NOT IN ('unsubscribed','suppressed'))`, params: [...suppressed.params, ...optedOut.params] });
    const contact = level(channel.status), address = level('channel_status');
    return [
      { sql: `UPDATE contacts SET ${channel.status}=${contact.sql} WHERE id=? AND ${changes(channel.status).sql}`, params: [...contact.params, contactId, ...changes(channel.status).params] },
      { sql: `UPDATE ${channel.table} SET channel_status=${address.sql} WHERE contact_id=? AND ${channel.destination}=? AND ${changes('channel_status').sql}`, params: [...address.params, contactId, identity.destination, ...changes('channel_status').params] },
    ];
  });
}
