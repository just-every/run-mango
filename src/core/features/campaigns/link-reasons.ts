import { allowedLinkHost } from '@/core/features/settings/link-hosts-validation';
import { contactLink, safeEmailLink } from './contact-links';

const contactSchemes = new Set(['mailto:', 'tel:', 'sms:']);

/** Why an address cannot be sent, naming the scheme or fault. `undefined` means it is an HTTPS or contact link,
 * or a link to a demo's own page at `demoOrigin` (demo-links.ts). Host allowance (MSG-014) is judged separately by `blockedLink`. */
export function linkProblem(value: string, kind: 'link' | 'image' = 'link', demoOrigin?: string): string | undefined {
  if (kind === 'link' && (value === '{{unsubscribe_url}}' || contactLink(value))) return;
  let url: URL;
  try { url = new URL(value); } catch { return 'is malformed (not a complete address)'; }
  if (kind === 'link' && contactSchemes.has(url.protocol)) return `is not a valid ${url.protocol} contact link`;
  if (url.protocol !== 'https:' && !(kind === 'link' && url.origin === demoOrigin)) return kind === 'image'
    ? `uses the ${url.protocol} scheme; image sources must use HTTPS`
    : `uses the ${url.protocol} scheme; only HTTPS and mailto:, tel: or sms: contact links are allowed`;
  if (!safeEmailLink(value, false, demoOrigin)) return 'is not a safe HTTPS address (credentials, spaces or unsafe characters)';
}

/** A destination that cannot be sent, with the scheme, fault or host that blocks it. `host` is set only when
 * the sole fault is an HTTPS host outside the allowed list, the one case an approver can fix by allowing it. */
export function blockedLink(value: string, allowedHosts: readonly string[], demoOrigin?: string): {reason: string; host?: string} | undefined {
  const problem = linkProblem(value, 'link', demoOrigin);
  if (problem) return {reason: problem};
  if (value === '{{unsubscribe_url}}' || contactLink(value)) return;
  const {hostname} = new URL(value);
  if (!allowedLinkHost(hostname, allowedHosts)) return {reason: `uses host ${hostname}, which is not on the allowed list`, host: hostname};
}

/** An HTTPS image source on a host outside the allowed list. This deployment's own `/media/` images are checked against their stored record instead. */
export function blockedImage(value: string, allowedHosts: readonly string[], ownOrigin: URL): {reason: string; host: string} | undefined {
  const url = new URL(value);
  if (url.origin === ownOrigin.origin && /^\/media\/[0-9a-f]{64}(?:\.[a-z]{3,4})?$/.test(url.pathname)) return;
  if (!allowedLinkHost(url.hostname, allowedHosts)) return {reason: `uses host ${url.hostname}, which is not on the allowed list`, host: url.hostname};
}
