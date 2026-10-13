import { protectAuthoringTokens } from './authoring-tokens';
import { escapeHtml, inspectEmailHtml } from './email-html-policy';
import type { DraftComposition } from './draft-composition';

// Exact managed fragment: no arbitrary authored markup is stripped or rewritten.
export const managedFooter = '<hr><p>{{physical_address}}</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>';
export function authoredBody(html: string) { return html.split(managedFooter).join(''); }
export function htmlToText(html: string) {
  const protectedTokens=protectAuthoringTokens(html);
  return protectedTokens.restore(protectedTokens.html.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_all, url, label) => `${label} (${url})`)
    .replace(/<(?:br|hr)\s*\/?>|<\/(?:p|div|li|h[1-6]|blockquote|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '').replace(/&(?:amp|lt|gt|quot|apos|#39|nbsp);/g, entity => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'",'&nbsp;':' '}[entity]!))
    .replace(/&#(\d+);|&#x([\da-f]+);/gi, (_all, dec, hex) => { const code = parseInt(dec ?? hex, dec ? 10 : 16); return code <= 0x10ffff ? String.fromCodePoint(code) : ''; })
    .replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim());
}
export function authoredLinks(html:string) {
  const protectedTokens=protectAuthoringTokens(html,true);
  return [...new Map(inspectEmailHtml(protectedTokens.html).anchors.filter(anchor=>anchor.href !== '{{unsubscribe_url}}' && anchor.href).map(anchor=>[anchor.href.replaceAll('&amp;','&'),{label:protectedTokens.restore(anchor.label),destinationUrl:anchor.href.replaceAll('&amp;','&')}])).values()];
}
export function normalizeAuthoredContent(composition: DraftComposition): DraftComposition {
  if (composition.emailBody === undefined) return composition;
  let body = authoredBody(composition.emailBody);
  const original = inspectEmailHtml(protectAuthoringTokens(body,true).html);
  for (const link of composition.links ?? []) {
    if (!original.destinations.includes(link.destinationUrl)) body += `<p><a href="${escapeHtml(link.destinationUrl)}">${escapeHtml(link.label)}</a></p>`;
  }
  const policy = inspectEmailHtml(protectAuthoringTokens(body,true).html);
  // Preserve old valid managed footers; add only missing compliance elements.
  const hasUnsubscribe = policy.anchors.some(anchor => anchor.href === '{{unsubscribe_url}}' && anchor.label);
  const footer = !hasUnsubscribe && !body.includes('{{physical_address}}') ? managedFooter
    : `${body.includes('{{physical_address}}') ? '' : '<p>{{physical_address}}</p>'}${hasUnsubscribe ? '' : '<p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>'}`;
  const emailBody = body + footer;
  const links = authoredLinks(body);
  return {...composition, emailBody, emailText: htmlToText(emailBody), links};
}
