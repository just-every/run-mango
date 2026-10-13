import { domainName, mailbox } from './identity';
import { VerificationError } from './types';

/** Privileged installation configuration, never an operator/request-supplied URL.
 * The installer trusts this public DNS host and its Cloudflare receipt semantics.
 * DNS is not pinned: an untrusted/rebinding host is not a supported installation.
 */
export function receiptConfiguration(receiptUrl: string, configuredRecipient?: string) {
  try {
    const base = new URL(receiptUrl);
    const host = base.hostname;
    if (receiptUrl !== receiptUrl.trim() || /[\x00-\x20\x7f]/.test(receiptUrl)
      || base.protocol !== 'https:' || base.port || base.username || base.password
      || receiptUrl.includes('#') || base.pathname !== '/receipts'
      || domainName(host) !== host || /^[0-9.]+$/.test(host)
      || /(?:^|\.)(?:localhost|local|internal|lan|home|arpa)$/.test(host)
      || [...base.searchParams.keys()].length !== 1 || !base.searchParams.has('token')
      || !base.searchParams.get('token')?.trim() || base.searchParams.get('token')!.length > 4096
      || !configuredRecipient || configuredRecipient !== configuredRecipient.trim()) {
      throw new Error('invalid');
    }
    const recipient = mailbox(configuredRecipient);
    return { base, recipient, id: `cloudflare-receipt:v1:${base.origin}:${recipient}` };
  } catch {
    // URL and mailbox parsing errors may include input; never surface them.
    throw new VerificationError('receiver-configuration-invalid');
  }
}
