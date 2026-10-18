import type { ApprovalCheck } from '../lifecycle/repository';
import { parseEmailHtml, type EmailNode } from './email-html-parse';
import type { MessageRevision } from './message-content';
import { withTokenFallbacks } from './authoring-tokens';

type AdvisoryRevision = Pick<MessageRevision, 'emailSubject' | 'preheader' | 'emailBody' | 'emailText'>;
const compact = (text: string) => withTokenFallbacks(text).replace(/[\s\p{Cf}]+/gu, ' ').trim();
const excerpt = (text: string) => compact(text).slice(0, 100);
const textOf = (nodes: EmailNode[]): string => nodes.map(node => node.kind === 'text' ? node.text : node.kind === 'element' ? node.tag === 'br' ? ' ' : textOf(node.children) : '').join('');
const genericLink = /^(?:click(?: here)?|here|read more|learn more|more|link|this link|go|tap here)[.!…\s]*$/i;
const spamPhrases = /\b(?:act now|limited time(?: offer)?|risk[ -]free|100% free|cash bonus|you(?:'ve| have) won|guaranteed income|no obligation)\b/gi;
const contentBlocks = new Set(['p', 'div', 'li', 'blockquote', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const hasBlock = (nodes: EmailNode[]): boolean => nodes.some(node => node.kind === 'element' && (contentBlocks.has(node.tag) || hasBlock(node.children)));

/** Editorial guidance only. HTML safety, contrast and required content are separate blocking checks. */
export function emailContentAdvisories(revision: AdvisoryRevision): ApprovalCheck[] {
  const findings = new Map<string, string[]>();
  const add = (kind: string, detail: string) => findings.set(kind, [...(findings.get(kind) ?? []), detail]);
  const spam = (text: string, location: string) => {
    const phrases = [...new Set(compact(text).match(spamPhrases)?.map(phrase => phrase.toLowerCase()) ?? [])];
    if (phrases.length) add('message.email-spam-wording', `${location}: ${phrases.map(phrase => `“${phrase}”`).join(', ')}.`);
  };
  let heading = 0;
  const visit = (nodes: EmailNode[], parent: string) => {
    const counts = new Map<string, number>();
    for (const node of nodes) {
      if (node.kind === 'text') { if (parent === 'HTML body') spam(node.text, parent); continue; }
      if (node.kind !== 'element') continue;
      const number = (counts.get(node.tag) ?? 0) + 1;
      counts.set(node.tag, number);
      const location = `${parent} > ${node.tag}[${number}]`;
      if (node.tag === 'img' && !node.attributes.has('alt')) {
        add('message.email-image-alt', `${location} (${excerpt(node.attributes.get('src') ?? 'image')}): missing alt attribute. Describe the image, or use alt="" for a decorative image.`);
      }
      if (/^h[1-6]$/.test(node.tag)) {
        const level = Number(node.tag[1]);
        if (level > heading + 1) add('message.email-heading-order', `${location} (“${excerpt(textOf(node.children))}”): ${heading ? `H${heading} is followed by H${level}` : `the first heading is H${level}`}. Use headings without skipping levels.`);
        heading = level;
      }
      if (node.tag === 'a') {
        const label = compact(textOf(node.children));
        if (genericLink.test(label) || /^https?:\/\//i.test(label)) add('message.email-link-text', `${location}: “${excerpt(label)}” does not describe the destination (${excerpt(node.attributes.get('href') ?? '')}). Use meaningful link text.`);
      }
      if (contentBlocks.has(node.tag) && !hasBlock(node.children)) spam(textOf(node.children), location);
      visit(node.children, location);
    }
  };
  const {nodes} = parseEmailHtml(revision.emailBody);
  if (!hasBlock(nodes)) spam(textOf(nodes), 'HTML body');
  visit(nodes, 'HTML body');
  spam(revision.emailSubject, 'Email subject');
  spam(revision.preheader, 'Preheader');
  spam(revision.emailText, 'Plain-text body');
  return [...findings].map(([kind, details]) => ({kind, status: 'advisory', blocking: false,
    detail: `${details.join(' ')}${kind === 'message.email-spam-wording' ? ' Promotional wording can contribute to spam filtering; this is a wording review, not a prediction of inbox placement.' : ''}`}));
}
