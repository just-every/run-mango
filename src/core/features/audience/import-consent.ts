import type { AudienceSnapshot, NativeRow } from './import-types';

/** The person's latest consent for this address that they confirmed through Mango (a
 * confirmation link), when it is newer than every opt-out recorded for the address. Consent
 * evidence an import carried has no Mango confirmation, so an import can never use it to
 * outrank an opt-out, and an unsubscribe the person made after that consent is newer. */
export function newerConfirmedConsent(before: AudienceSnapshot | undefined, email: string, optOuts: NativeRow[]) {
  if (!before || !optOuts.length) return undefined;
  const confirmed = new Set(before.tables.consent_confirmations.filter(row => row.channel === 'email' && row.confirmed_at !== null).map(row => row.consent_evidence_id));
  const latest = before.tables.consent_evidence
    .filter(row => row.channel === 'email' && row.destination === email && row.confirmed_at !== null && confirmed.has(row.id))
    .sort((a, b) => Number(b.occurred_at) - Number(a.occurred_at))[0];
  return latest && Number(latest.occurred_at) > Math.max(...optOuts.map(row => Number(row.occurred_at))) ? latest : undefined;
}

export const keptForConsent = (consent: NativeRow) => `Kept: newer consent on ${new Date(Number(consent.occurred_at)).toISOString().slice(0, 10)}. The earlier opt-out is not applied again.`;
