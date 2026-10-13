import type { SenderInspection } from '@/core/features/sender-verification/types';
import type { ReadinessItem, ReadinessState } from './types';

/** What a sender needs before the first real send, stated as Mango finds it. Only provider,
 * DNS and receiving-mailbox evidence is observed; configuration alone never counts. */
export function sendingReadiness(inspection: SenderInspection | undefined, physicalAddress: string): ReadinessItem[] {
  const seen = (state: string | undefined): ReadinessState => !inspection || state === 'unknown' ? 'unavailable' : state === 'passed' ? 'observed' : 'not-observed';
  const authentication = inspection?.ready && inspection.authentication;
  return [
    { key: 'domain', label: 'Sending domain verified with the provider', state: seen(inspection?.provider.state),
      detail: 'Mango asks the mail provider whether the From domain is verified for this account.' },
    { key: 'dns', label: 'SPF and DKIM records and a DMARC record', state: seen(inspection?.dns.state),
      detail: "Mango reads the provider's SPF and DKIM records and the domain's DMARC record in public DNS." },
    { key: 'receipt', label: 'Trusted receipt of a test message', state: !inspection || inspection.observation.state === 'unknown' ? 'unavailable'
        : ['passed', 'failed'].includes(inspection.observation.state) ? 'observed' : 'not-observed',
      detail: 'The configured receiving mailbox reports a test message Mango sent through the provider.' },
    { key: 'authentication', label: 'SPF, DKIM and DMARC passed, aligned with the From domain', state: !inspection || inspection.observation.state === 'unknown' ? 'unavailable'
        : authentication && authentication.spf && authentication.dkim && authentication.dmarc && authentication.aligned ? 'observed' : 'not-observed',
      detail: 'Read from the receiving mailbox’s own authentication results for that test message, not from settings.' },
    { key: 'one-click', label: 'One-click unsubscribe', state: 'built-in',
      detail: 'Mango adds List-Unsubscribe and List-Unsubscribe-Post to every campaign email and unsubscribes before answering. Whether the provider’s DKIM signature covers these headers is not observed.' },
    { key: 'footer', label: 'Visible unsubscribe link and postal address', state: 'built-in',
      detail: physicalAddress ? 'Approval blocks any campaign without both; the saved postal address is used.' : 'Approval blocks any campaign without both. Save a postal address above.' },
    { key: 'jurisdiction', label: 'Sending jurisdiction', state: 'owner',
      detail: 'Mango does not record which country’s rules apply to your list. Name it before the first real send.' },
  ];
}
