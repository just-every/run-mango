import { portableHash } from './portable-hashes';
import type { AudienceSnapshot } from './import-types';

/** Export identities use a portable namespace; installation salts never leave
 * through the ledger. Import custody belongs to the receiving installation. */
export async function portableAudienceSnapshot(native: AudienceSnapshot): Promise<AudienceSnapshot> {
  const snapshot = structuredClone(native);
  for (const identity of snapshot.identities) {
    const portable = portableHash(identity.destination);
    for (const table of ['contact_suppressions', 'surviving_opt_outs']) {
      for (const row of snapshot.tables[table]) if (row.destination_hash === identity.hash) row.destination_hash = portable;
    }
    identity.hash = portable;
  }
  snapshot.hashes = snapshot.identities.map(identity => identity.hash);
  snapshot.tables.mango_audience_hashes = snapshot.identities.map(identity => {
    const addresses = identity.channel === 'email' ? snapshot.tables.contact_email_addresses : snapshot.tables.contact_phones;
    const address = addresses.find(row => (identity.channel === 'email' ? row.email : row.phone_e164) === identity.destination)!;
    return { id: `${address.id}_hash`, contact_id: address.contact_id, channel: identity.channel, destination_hash: identity.hash,
      owned_opt_out_id: snapshot.tables.surviving_opt_outs.find(row => row.destination_hash === identity.hash)?.id ?? null,
      owned_suppression_ids: JSON.stringify(snapshot.tables.contact_suppressions.filter(row => row.destination_hash === identity.hash).map(row => row.id)) };
  }).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return snapshot;
}
