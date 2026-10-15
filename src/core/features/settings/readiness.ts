import type { SenderInspection } from '@/core/features/sender-verification/types';
import type { ReadinessItem, ReadinessState } from './types';

/** What a sender needs before the first real send, stated as Mango finds it. Only provider,
 * DNS and receiving-mailbox evidence is observed; configuration alone never counts. */
export function sendingReadiness(inspection: SenderInspection | undefined, physicalAddress: string): ReadinessItem[] {
  const seen = (state: string | undefined): ReadinessState => !inspection || state === 'unknown' ? 'unavailable' : state === 'passed' ? 'observed' : 'not-observed';
  const authentication = inspection?.ready && inspection.authentication;
  const ownerConfirmed = inspection?.ready && inspection.reason === 'owner-confirmed';
  return [
    { key: 'domain', label: 'Sending domain verified with the provider', state: seen(inspection?.provider.state),
      detail: 'Mango asks the mail provider whether the From domain is verified for this account.' },
    { key: 'dns', label: 'SPF and DKIM records and a DMARC record', state: seen(inspection?.dns.state),
      detail: "Mango reads the provider's SPF and DKIM records and the domain's DMARC record in public DNS." },
    { key: 'receipt', label: 'A test message reached a real inbox', state: !inspection || inspection.observation.state === 'unknown' ? 'unavailable'
        : ['passed', 'failed'].includes(inspection.observation.state) ? 'observed' : 'not-observed',
      detail: ownerConfirmed
        ? 'You confirmed the check Mango sent to your own inbox. It counts for 30 days, or until the provider or DNS records change.'
        : 'Send a check to the address you sign in with (below) and press “Yes, it reached my inbox” in that email. An installed receipt connector can report it instead.' },
    { key: 'authentication', label: 'SPF, DKIM and DMARC pass, aligned with the From domain', state: !inspection || inspection.observation.state === 'unknown' ? 'unavailable'
        : authentication && authentication.spf && authentication.dkim && authentication.dmarc && authentication.aligned ? ownerConfirmed ? 'checked' : 'observed' : 'not-observed',
      detail: ownerConfirmed
        ? 'Checked in public DNS at every approval and send: SPF and DKIM match your provider, a DMARC record exists and aligns with the From domain.'
        : 'Read from the receiving mailbox’s own authentication results when a receipt connector is installed; otherwise checked in public DNS once you confirm the inbox check.' },
    { key: 'one-click', label: 'One-click unsubscribe', state: 'built-in',
      detail: 'Mango adds List-Unsubscribe and List-Unsubscribe-Post to every campaign email and unsubscribes before answering. Whether the provider’s DKIM signature covers these headers is not observed.' },
    { key: 'footer', label: 'Visible unsubscribe link and postal address', state: 'built-in',
      detail: physicalAddress ? 'Approval blocks any campaign without both; the saved postal address is used.' : 'Approval blocks any campaign without both. Save a postal address above.' },
    { key: 'jurisdiction', label: 'Sending jurisdiction', state: 'owner',
      detail: 'Mango does not record which country’s rules apply to your list. Name it before the first real send.' },
  ];
}
