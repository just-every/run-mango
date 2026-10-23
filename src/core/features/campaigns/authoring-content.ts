import {assertMobileAuthority,applyMobileSettings,mobileEnvelope,mobileDocument} from './email-mobile';
import { escapeHtml, inspectEmailHtml } from './email-html-policy';
import { parseEmailHtml, type EmailNode } from './email-html-parse';
import type { DraftComposition } from './draft-composition';

// Exact managed fragment: no arbitrary authored markup is stripped or rewritten.
export const managedFooter = '<hr><p>{{physical_address}}</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>';
/** The body without every managed footer in it, including one that removing another brings together. */
export function authoredBody(html: string) {
  const envelope=mobileEnvelope(html);
  let body = envelope.body;
  while (body.includes(managedFooter)) body = body.split(managedFooter).join('');
  return mobileDocument(body,envelope.style);
}
const lineEnds = new Set(['p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'tr']);
/** The plain-text part, read from the same tree as the HTML part: each link's text with its address, a line break
 * for each line break, rule and closed block. Personalisation tokens stay as written. */
export function htmlToText(html: string) {
  const text = (nodes: EmailNode[]): string => nodes.map(node => {
    if (node.kind !== 'element') return node.kind === 'text' ? node.text : '';
    if (node.tag === 'br' || node.tag === 'hr') return '\n';
    if(node.tag==='img')return node.attributes.get('alt')??'';
    const inner = text(node.children);
    if (node.tag === 'a' && node.attributes.has('href')) return `${inner} (${node.attributes.get('href')})`;
    return lineEnds.has(node.tag) ? `${inner}\n` : inner;
  }).join('');
  return text(parseEmailHtml(html).nodes).replaceAll(' ', ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
export function authoredLinks(html:string) {
  return [...new Map(inspectEmailHtml(html).anchors.filter(anchor=>anchor.href !== '{{unsubscribe_url}}' && anchor.href).map(anchor=>[anchor.href,{label:anchor.label,destinationUrl:anchor.href}])).values()];
}
/** Rounds of parsing and serialising that a body, and then a saved body, may take to reach a form that saves to itself. */
const settleRounds = 16;
/** Thrown when a body does not settle within `settleRounds`; no body is known to need more than two. */
export class UnsettledEmailBodyError extends Error {}
/** The body as the HTML fragment serialisation algorithm writes the tree a spec parser builds from it (CAMP-003):
 * every element closed where parsers keep it, attribute values double-quoted, character references decoded, and
 * whatever parsers drop (a repeated attribute, a tag ignored where it stands) gone, as it is for every recipient.
 * Writing a tree out and parsing it again can build another tree (an element moved out of a table into a MathML
 * text integration point changes namespace, and raw text becomes markup), so it is parsed and written again until
 * the written form parses back to itself. Parse and serialise only: comments, refused tags and refused styles stay
 * for the checker to refuse. */
function canonicalBody(html: string) {
  let current = html;
  for (let round = 0; round < settleRounds; round++) {
    const next = parseEmailHtml(current).canonical;
    if (next === current) return current;
    current = next;
  }
  throw new UnsettledEmailBodyError('This email body reads differently every time it is parsed. Rewrite it as plain email markup.');
}
/** One save of a body: the managed footer comes off, the body settles, missing links and compliance elements are
 * added after it, and the result settles again. */
function savedBody(source: string, links: NonNullable<DraftComposition['links']>) {
  const envelope=mobileEnvelope(source);
  let body = canonicalBody(mobileEnvelope(authoredBody(source)).body);
  if (links.length) {
    const present = inspectEmailHtml(body).destinations;
    const missing = links.filter(link => !present.includes(link.destinationUrl));
    if (missing.length) body = canonicalBody(body + missing.map(link => `<p><a href="${escapeHtml(link.destinationUrl)}">${escapeHtml(link.label)}</a></p>`).join(''));
  }
  // Preserve old valid managed footers; add only missing compliance elements.
  const hasUnsubscribe = inspectEmailHtml(body).anchors.some(anchor => anchor.href === '{{unsubscribe_url}}' && anchor.label);
  const footer = !hasUnsubscribe && !body.includes('{{physical_address}}') ? managedFooter
    : `${body.includes('{{physical_address}}') ? '' : '<p>{{physical_address}}</p>'}${hasUnsubscribe ? '' : '<p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>'}`;
  // Parsers never close a plaintext element, so a footer after one is its text: it is not added again on every save,
  // and approval refuses the tag and the missing footer.
  return mobileDocument(!footer || parseEmailHtml(body).tags.has('plaintext') ? body : canonicalBody(body + footer),envelope.style);
}
/** Saving is a fixed point: the stored body saves to the same bytes, as does the body the editor shows (the stored
 * body without its managed footer). A body whose footer or links a parser moves on the next read is saved again
 * until it stays, so what is stored is what every later save stores. */
export function normalizeAuthoredContent(composition: DraftComposition): DraftComposition {
  if (composition.emailBody === undefined) return composition;
  assertMobileAuthority(composition.emailBody);
  const {emailMobile,...persisted}=composition;
  const source=emailMobile===undefined?composition.emailBody:applyMobileSettings(authoredBody(composition.emailBody),emailMobile);
  let emailBody = savedBody(source, composition.links ?? []);
  for (let round = 0; ; round++) {
    const again = savedBody(emailBody, []);
    if (again === emailBody) break;
    if (round === settleRounds) throw new UnsettledEmailBodyError('This email body reads differently every time it is saved. Rewrite it as plain email markup.');
    emailBody = again;
  }
  assertMobileAuthority(emailBody);
  const links = authoredLinks(emailBody);
  return {...persisted, emailBody, emailText: htmlToText(emailBody), links};
}
