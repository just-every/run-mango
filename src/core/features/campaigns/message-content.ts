import {analyticsUrl,type AnalyticsContext} from '@/core/features/settings/analytics-policy';
import {rewriteTextLinks,textLinkDestinations} from './message-links';
import { escapeHtml } from './email-html-policy';
import { parsePersonalisationToken as parseToken } from './authoring-tokens';
export type MessageRevision = {
  utmPolicyJson?:string|null; name?:string; id?:string;
  emailSubject: string; emailBody: string; emailText: string; preheader: string; smsBody: string; physicalAddress: string;
};
export const messageRendererVersion = 'mango-message-v2';
function personalisationValue(values: Record<string, string | null | undefined>, key: string | undefined) {
  return key && Object.hasOwn(values, key) && typeof values[key] === 'string' ? values[key] : undefined;
}
/** Unique authored keys whose values use a fallback in this channel's content. */
export function messageFallbackKeys(revision: MessageRevision, channel: 'email' | 'sms', values: Record<string, string | null | undefined>): string[] {
  const templates = channel === 'email' ? [revision.emailSubject, revision.preheader, revision.emailBody, revision.emailText] : [revision.smsBody];
  const keys = new Set<string>();
  for (const template of templates) {
    for (const match of template.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
      const parsed = parseToken(match[1]);
      if (parsed?.key && !personalisationValue(values, parsed.key)) keys.add(parsed.key);
    }
  }
  return [...keys];
}
/** Merge tags written for another email tool (`*|NAME|*`). Mango never guesses their meaning. */
export function foreignMergeTags(template: string) {
  return [...new Set(template.match(/\*\|[^|*\s][^|]{0,80}?\|\*/g) ?? [])];
}
export function invalidPersonalisation(template: string) {
  const invalid: string[] = foreignMergeTags(template).map(tag => `Unrecognised merge tag ${tag}`);
  const remainder = template.replace(/\{\{([\s\S]*?)\}\}/g, (match, token: string) => {
    if (!parseToken(token)) invalid.push(match);
    return '';
  });
  if (remainder.includes('{{') || remainder.includes('}}')) invalid.push('Unbalanced personalisation delimiter');
  return invalid;
}
/** Pure rendering: no capabilities, writes, contacts or network are acquired here. */
export function renderMessageContent(revision: MessageRevision, options: {
  analytics?:AnalyticsContext; values?: Record<string, string | null | undefined>; unsubscribeUrl: string; rewrittenLinks?: ReadonlyMap<string, string>;
}) {
  const values = options.values ?? {};
  const render = (template: string, html = false) => {
    const encode = html ? escapeHtml : (value: string) => value;
    // One pass prevents contact values and fallbacks from introducing new managed tokens.
    return template.replace(/\{\{([\s\S]*?)\}\}/g, (match, token: string) => {
      const parsed = parseToken(token);
      if (!parsed) return match;
      const value = personalisationValue(values, parsed.key);
      return encode(parsed.managed === 'unsubscribe_url' ? options.unsubscribeUrl : parsed.managed === 'physical_address' ? revision.physicalAddress : value || parsed.fallback!);
    });
  };
  const replaceTextLinks = (text:string,channel:'email'|'sms') => {const links=new Map(textLinkDestinations(text).map(url=>[url,analyticsUrl(url,options.analytics,channel)]));for(const [url,target] of options.rewrittenLinks??[])links.set(url,target);return rewriteTextLinks(text,links);};
  const html = render(revision.emailBody, true).replace(/\bhref\s*=\s*(["'])(.*?)\1/gi, (attribute, quote: string, url: string) => {
    const decoded=url.replaceAll('&amp;', '&');
    const replacement = options.rewrittenLinks?.get(decoded)??analyticsUrl(decoded,options.analytics,'email');
    return replacement ? `href=${quote}${escapeHtml(replacement)}${quote}` : attribute;
  });
  const preheader = render(revision.preheader);
  return {
    subject: render(revision.emailSubject), preheader,
    html: `<div aria-hidden="true" style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>${html}`,
    text: replaceTextLinks(render(revision.emailText),'email'), sms: replaceTextLinks(render(revision.smsBody),'sms'),
  };
}
