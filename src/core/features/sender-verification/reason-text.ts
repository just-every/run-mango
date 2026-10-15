/** Plain sentences for sender-check reason codes, shown to operators instead of the codes. */
const exact: Record<string, string> = {
  'authentication-observed': 'A receiving mailbox reported SPF, DKIM and DMARC passing for a test message.',
  'owner-confirmed': 'You confirmed a test message reached your inbox, and the domain’s SPF, DKIM and DMARC records check out.',
  'observation-missing': 'No inbox check yet. In Settings, send a check to your own inbox and press Confirm in that email.',
  'observation-stale': 'The inbox check has expired. Send a new check from Settings.',
  'observation-revoked': 'The inbox check was withdrawn. Send a new check from Settings.',
  'observation-time-invalid': 'The inbox check has an impossible time. Send a new check from Settings.',
  'configuration-stale': 'The DNS check has expired. Open Settings and press Check again.',
  'authentication-failed': 'SPF or DKIM is not aligned with your From domain, so DMARC cannot pass. Fix the records your mail provider gave you, then send a new check from Settings.',
  'configured-from-mismatch': 'This campaign’s From address differs from the sender saved in Settings.',
  'verification-not-configured': 'No mail provider is configured, so Mango cannot send email.',
  'sendgrid-sender-observation-unavailable': 'No mail provider is configured, so Mango cannot send email.',
  'inspection-superseded': 'Sender evidence changed during the check. Check again.',
  'domain-unverified': 'Your mail provider has not verified the From domain yet. Finish domain authentication with the provider.',
  'domain-sending-disabled': 'Your mail provider has disabled sending for the From domain.',
  'domain-record-unverified': 'Your mail provider reports a DNS record for the From domain as not verified yet.',
  'domain-records-missing': 'Your mail provider lists no DNS records for the From domain.',
  'provider-domain-unavailable': 'Mango could not reach your mail provider to check the From domain. Try again shortly.',
  'dns-unavailable': 'Mango could not read public DNS for the From domain. Try again shortly.',
  'dns-records-missing': 'The From domain needs both an SPF record and a DKIM key from your mail provider.',
  'dmarc-policy-missing': 'The From domain has no DMARC record. Add one, for example: _dmarc TXT "v=DMARC1; p=none".',
  'verification-unavailable': 'Mango could not reach your mail provider or public DNS just now. Wait a minute and try again; an unused check link still works.',
  'challenge-missing': 'This check link is not valid.',
  'challenge-expired': 'This check link has expired. Send a new check from Settings.',
  'challenge-not-sent': 'This check was not handed to the mail provider. Send a new check from Settings.',
  'challenge-superseded': 'The sender settings or DNS changed after this check was sent. Send a new check from Settings.',
  'probe-handoff-unresolved': 'The mail provider has not confirmed it accepted the check. Wait a minute, then send a new check.',
  'invalid-from': 'The saved From address is not a valid email address.',
};
const families: Array<[RegExp, string]> = [
  [/^(?:spf|dkim|dmarc|dns)-/, 'The From domain’s SPF, DKIM or DMARC records do not match what your mail provider expects. Compare them with the provider’s domain authentication page.'],
  [/^(?:domain|provider)-/, 'Your mail provider’s domain authentication for the From domain is incomplete. Finish it with the provider, then check again.'],
  [/^receiver-/, 'The configured receipt connector could not confirm the test message. Send a check to your own inbox from Settings instead.'],
];
export function senderReasonText(reason: string) {
  return exact[reason] ?? families.find(([pattern]) => pattern.test(reason))?.[1] ?? 'The sender check could not be completed. Open Settings and check again.';
}
