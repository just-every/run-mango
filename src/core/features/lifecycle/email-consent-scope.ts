import type { CampaignRevisionSnapshot, FrozenCandidate } from './types';

/** Match one complete recorded scope; never combine the sender and category of different consents. */
export function emailConsentScope(candidates: FrozenCandidate[], revision: CampaignRevisionSnapshot['revision']) {
  const mismatches = candidates.flatMap(candidate => {
    const email = candidate.channels.email;
    if (!email) return [];
    const consents = email.consents.filter(consent => consent.destination.toLowerCase() === email.destination.toLowerCase());
    return consents.some(consent => consent.brandOrLegalSender === revision.senderName && consent.category === revision.messageCategory)
      ? [] : [consents];
  });
  if (!mismatches.length) return { passed: true, detail: `Every email destination has confirmed consent for category ${JSON.stringify(revision.messageCategory)} and sender ${JSON.stringify(revision.senderName)}.` };

  const scopes = [...new Set(mismatches.flatMap(consents => consents.map(consent =>
    `category ${JSON.stringify(consent.category)} for sender ${JSON.stringify(consent.brandOrLegalSender)}`)))];
  const shown = scopes.slice(0, 5).join('; ');
  const missing = mismatches.filter(consents => !consents.length).length;
  return {
    passed: false,
    detail: `Consent mismatch: the saved draft requires category ${JSON.stringify(revision.messageCategory)} for sender ${JSON.stringify(revision.senderName)}. ${mismatches.length} email destination(s) do not match. ${shown ? `Their recorded consent covers ${shown}${scopes.length > 5 ? `; and ${scopes.length - 5} other scopes` : ''}. ` : ''}${missing ? `${missing} have no confirmed consent for their current email address. ` : ''}Sender and category must match exactly, including case. Change the draft’s Consent message category to a recorded category only if it describes this email; otherwise narrow the audience or obtain confirmed consent for the intended sender and category. Do not relabel original consent to make approval pass.`,
  };
}
