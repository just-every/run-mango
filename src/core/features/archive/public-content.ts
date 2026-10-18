import { authoredBody } from '../campaigns/authoring-content';
import { emailTags, escapeHtml, voidEmailTags } from '../campaigns/email-html-policy';
import { parseEmailHtml, type EmailNode } from '../campaigns/email-html-parse';
import { safeEmailLink } from '../campaigns/contact-links';

/** Public issues never resolve contact data or use authored personalisation fallbacks. */
export const neutralText = (value: string) => value.replace(/\{\{[\s\S]*?\}\}|\*\|[^|]*\|\*/g, 'Reader');
const privatePath = /^\/(?:l|o|unsubscribe|consent|sender-check|auth|__dev)(?:\/|$)/i;
function publicLink(value: string, origin: string) {
  if (value.includes('{{') || !safeEmailLink(value)) return undefined;
  try {
    const url = new URL(value);
    if (privatePath.test(url.pathname)) return undefined;
    for (const key of [...url.searchParams.keys()]) if (/^(?:utm_|mgo_c$)/i.test(key)) url.searchParams.delete(key);
    return url.protocol === 'https:' ? url.toString() : value;
  } catch { return undefined; }
}
/** Rebuild a neutral, unstyled reading copy. No scripts, remote images, pixels or private-action links. */
export function publicBody(source: string, origin: string) {
  const render = (node: EmailNode): string => {
    if (node.kind === 'text') return escapeHtml(neutralText(node.text));
    if (node.kind !== 'element' || !node.html || !emailTags.has(node.tag)) return '';
    const { tag, attributes } = node;
    if (tag === 'a' && attributes.get('href')?.includes('unsubscribe_url')) return '';
    if (tag === 'img') {
      const raw = attributes.get('src') ?? '';
      try {
        const url = new URL(raw);
        if (url.origin !== origin || !/^\/media\/[a-f0-9]{64}(?:\.(?:png|jpe?g|gif|webp))?$/.test(url.pathname) || url.search || url.hash) return '';
        return `<img src="${escapeHtml(url.toString())}" alt="${escapeHtml(neutralText(attributes.get('alt') ?? ''))}">`;
      } catch { return ''; }
    }
    const children = node.children.map(render).join('');
    if (tag === 'a') {
      const href = publicLink(attributes.get('href') ?? '', origin);
      return href ? `<a href="${escapeHtml(href)}" rel="noreferrer">${children}</a>` : children;
    }
    const spans = ['td', 'th'].includes(tag) ? ['colspan', 'rowspan'].filter(name => /^[1-9]\d?$/.test(attributes.get(name) ?? '')).map(name => ` ${name}="${attributes.get(name)}"`).join('') : '';
    return `<${tag}${spans}>${voidEmailTags.has(tag) ? '' : `${children}</${tag}>`}`;
  };
  return parseEmailHtml(authoredBody(source).replaceAll('{{physical_address}}', '')).nodes.map(render).join('');
}
