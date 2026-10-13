import { parseEmailHtml, type EmailElement, type EmailNode } from './email-html-parse';
import { createPresentationCheck } from './email-presentation';
/** Conservative authoring grammar, judged on the tree a mail client builds from the stored body (email-html-parse.ts).
 * Unknown/malformed syntax is rejected for approval, never repaired for transmission.
 * `allowedEmailAttribute` is the earlier, unstyled attribute set that rich editing and move-in keep;
 * operator HTML may also carry the validated presentation of email-presentation.ts (MSG-009, MSG-012).
 * Attribute values are judged decoded, as mail clients read them. */
export const emailTags = new Set('p div span br hr strong b em i u s ul ol li blockquote h1 h2 h3 h4 h5 h6 table thead tbody tfoot tr td th a img'.split(' '));
export const voidEmailTags = new Set(['br', 'hr', 'img']);
const linkContent = new Set(['span', 'strong', 'b', 'em', 'i', 'u', 's', 'br']);
export function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
/** A decoded link or image address: HTTPS, no credentials, and nothing a URL never needs written literally. */
export function safeEmailUrl(value: string, managed = false) {
  if (managed && value === '{{unsubscribe_url}}') return true;
  if (/[\u0000- \u007f- {}"<>]/.test(value)) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
const mediaPath = /^\/media\/[0-9a-f]{64}(?:\.[a-z]{3,4})?$/;
/** A copy running on this computer serves its own campaign images (CAMP-012) over http. A draft may carry
 * exactly those, so the operator can save and preview a designed email there. Approval, test sends and
 * delivery pass no origin and refuse them: recipients' mail needs HTTPS. */
export function localMediaUrl(value: string, mediaOrigin?: string) {
  return Boolean(mediaOrigin?.startsWith('http://')) && value.startsWith(`${mediaOrigin}/`) && mediaPath.test(value.slice(mediaOrigin!.length));
}
const insecureMedia = (value: string) => { try { const url = new URL(value); return url.protocol === 'http:' && mediaPath.test(url.pathname) && !url.search && !url.hash; } catch { return false; } };
/** `mediaOrigin` is this deployment's own origin, passed only where a draft is saved or previewed. */
export function allowedEmailAttribute(tag: string, name: string, value: string, mediaOrigin?: string) {
  if (name === 'title' || (tag === 'img' && name === 'alt')) return !value.includes('{{');
  if (tag === 'a' && name === 'href') return safeEmailUrl(value, true);
  if (tag === 'img' && name === 'src') return safeEmailUrl(value) || localMediaUrl(value, mediaOrigin);
  if (['width', 'height'].includes(name) && tag === 'img') return /^\d{1,4}$/.test(value) && Number(value) >= 2;
  if (['colspan', 'rowspan'].includes(name) && ['td', 'th'].includes(tag)) return /^[1-9]\d?$/.test(value);
  return false;
}
/** Where a value is written with a character reference, a non-HTML5 reader may see other characters.
 * Text attributes may use any; elsewhere only the references the stored form itself writes (`&amp;`, `&quot;`). */
const writtenWithReferences = (name: string, written: string) => !['alt', 'title'].includes(name) && written.replaceAll('&amp;', '').replaceAll('&quot;', '').includes('&');
const textOf = (nodes: EmailNode[]): string => nodes.map(node => node.kind === 'text' ? node.text : node.kind === 'element' ? textOf(node.children) : '').join('');

export function inspectEmailHtml(source: string, mediaOrigin?: string) {
  const parsed = parseEmailHtml(source);
  const issues = new Set<string>([...parsed.malformed, ...parsed.lost]);
  for (const tag of parsed.tags) if (!emailTags.has(tag)) issues.add(`Tag <${tag}> is not allowed.`);
  const destinations = new Set<string>();
  const anchors: Array<{href: string; label: string}> = [];
  const presentation = createPresentationCheck(), localImages = new Set<string>();
  const visit = (node: EmailNode, inLink: boolean) => {
    if (node.kind === 'text') { presentation.text(node.text); return; }
    if (node.kind === 'comment') { issues.add('HTML comments are not allowed, including conditional comments.'); return; }
    element(node, inLink);
  };
  const element = (node: EmailElement, inLink: boolean) => {
    const {tag, attributes} = node;
    if (!node.html || !emailTags.has(tag)) issues.add(`Tag <${tag}> is not allowed${node.html ? '' : ' (SVG and MathML are not email markup)'}.`);
    if (inLink && tag === 'a') issues.add('Nested links are not allowed.');
    else if (inLink && !linkContent.has(tag)) issues.add('Links may contain only text and basic inline formatting.');
    for (const [name, value] of attributes) {
      const written = node.written.get(name);
      if (written !== undefined && writtenWithReferences(name, written)) issues.add(`Attribute ${name} on <${tag}> is written with a character reference; write the character itself.`);
      if (!presentation.attribute(tag, name, value) && !allowedEmailAttribute(tag, name, value, mediaOrigin)) {
        if (tag === 'img' && name === 'src' && insecureMedia(value)) localImages.add(value);
        else issues.add(`Attribute ${name} on <${tag}> is not allowed or has an unsafe value.`);
      }
      if (name === 'href' && value !== '{{unsubscribe_url}}' && safeEmailUrl(value)) destinations.add(value);
    }
    if (tag === 'img' && (!attributes.has('src') || !attributes.has('width') || !attributes.has('height'))) issues.add('Images require HTTPS src and explicit width and height of at least 2 pixels.');
    if (tag === 'a') {
      if (!node.closed) issues.add('Every link requires a closing anchor tag.');
      const label = textOf(node.children).replace(/[\s\p{Cf}]+/gu, ' ').trim();
      if (!label) issues.add('Every link requires a visible text label.');
      anchors.push({href: attributes.get('href') ?? '', label});
    }
    presentation.open(node);
    for (const child of node.children) visit(child, inLink || tag === 'a');
    presentation.close(tag);
  };
  for (const node of parsed.nodes) visit(node, false);
  if (localImages.size) issues.add(`${localImages.size === 1 ? 'An image is' : `${localImages.size} images are`} served over http by a copy of Mango running on a computer (${[...localImages].join(', ')}). Approval, test sends and delivery need images at an HTTPS address, so approve this email from an HTTPS deployment.`);
  // Styled markup is judged by the cell around each text run, so it must be written the way every parser builds it.
  if (presentation.presented && parsed.rewritten) issues.add(`Styled markup must be well-formed: mail clients build ${JSON.stringify(parsed.rewritten.parsed)} from ${JSON.stringify(parsed.rewritten.written)}; write every element closed, in order, where HTML parsers keep it.`);
  for (const issue of presentation.finish()) issues.add(issue);
  return {issues: [...issues], destinations: [...destinations], anchors};
}
