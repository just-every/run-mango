import type { Platform } from '@/core/shared/platform';
import { loadLinkHosts } from '../settings/link-hosts';
import { allowedLinkHost } from '../settings/link-hosts-validation';
import { parseEmailHtml, type EmailNode } from '../campaigns/email-html-parse';
import { normalizeAuthoredContent } from '../campaigns/authoring-content';
import { savedEmailSize } from '../campaigns/saved-email-size';
import { formatEmailSize } from '../campaigns/email-size';
import { inspectEmailHtml } from '../campaigns/email-html-policy';
import { invalidPersonalisation } from '../campaigns/message-content';
import type { ContentRecord } from './archive-content';

export function conversionHosts(html: string) {
  const hosts = new Map<string, number>();
  const walk = (nodes: EmailNode[]) => { for (const node of nodes) if (node.kind === 'element') {
    const address = node.attributes.get(node.tag === 'a' ? 'href' : node.tag === 'img' ? 'src' : '');
    if (address) try { const url = new URL(address); if (url.protocol === 'https:') hosts.set(url.hostname, (hosts.get(url.hostname) ?? 0) + 1); } catch { /* managed links have no external host */ }
    walk(node.children);
  } };
  walk(parseEmailHtml(html).nodes);
  return hosts;
}
/** Diagnostics use the same save-size and policy implementations as review.
 * They convey no consent, approval or permission to load an outside image. */
export async function describeConversion(platform: Platform, record: ContentRecord) {
  const hosts = await loadLinkHosts(platform);
  const changes = [...record.removed];
  for (const [host, count] of conversionHosts(record.html)) if (!allowedLinkHost(host, hosts)) changes.push(`Outside host ${host}: ${count} uses`);
  const composition = normalizeAuthoredContent({ name: record.title, emailSubject: record.subject, emailBody: record.html, physicalAddress: platform.config.mailSender.physicalAddress });
  const size = await savedEmailSize(platform.database, { emailSubject: '', emailBody: '', emailText: '', preheader: '', physicalAddress: '', smsBody: '', ...composition }, { publicBaseUrl: platform.config.publicBaseUrl.toString(), openTrackingEnabled: true }, false);
  changes.push(`Sent size: ${formatEmailSize(size)}${size.exceedsLimit ? ' Held conversion; trim before saving as a template.' : ''}`);
  const issues = [...inspectEmailHtml(record.html).issues, ...invalidPersonalisation(record.html)];
  changes.push(`MSG-012 checker: ${inspectEmailHtml(record.html).issues.length ? 'fail' : 'pass'}; personalization: ${invalidPersonalisation(record.html).length ? 'blocked' : 'pass'}`);
  return { ...record, removed: changes, flagged: [...new Set([...record.flagged, ...issues])] };
}
