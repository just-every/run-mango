import { allowedEmailAttribute, emailTags, escapeHtml, voidEmailTags } from '../email-html-policy';
import { parseEmailHtml, type EmailElement, type EmailNode } from '../email-html-parse';
import { createPresentationCheck, isPresentationAttribute } from '../email-presentation';
/** Parse with the parser approval and delivery use (email-html-parse.ts), so the preview shows the tree a mail
 * client builds, then rebuild every allowed element from that tree; nothing is copied through as markup.
 * Presentation (inline styles and presentational attributes) is kept only when the saved body passed
 * the approval checker (`approvable`) and the same presentation checker passes on this tree.
 * Otherwise the preview is shown unstyled, so hidden or deceptive presentation never hides text here. */
export function sanitizeEmailPreview(source: string, loadImages = false, approvable = false, mediaOrigin?: string) {
  const {nodes} = parseEmailHtml(source);
  const kept = (node: EmailElement) => {
    // The renderer's trusted hidden preheader is represented separately in the UI.
    if (!node.html || !emailTags.has(node.tag) || node.attributes.has('aria-hidden')) return false;
    return node.tag !== 'img' || ['src', 'width', 'height'].every(name => node.attributes.has(name) && allowedEmailAttribute(node.tag, name, node.attributes.get(name)!, mediaOrigin));
  };
  const presentation = createPresentationCheck();
  const inspect = (node: EmailNode): void => {
    if (node.kind === 'text') { presentation.text(node.text); return; }
    if (node.kind !== 'element' || !kept(node)) return;
    for (const [name, value] of node.attributes) presentation.attribute(node.tag, name, value);
    presentation.open(node);
    node.children.forEach(inspect);
    presentation.close(node.tag);
  };
  nodes.forEach(inspect);
  const styled = approvable && presentation.finish().length === 0;
  let imagesBlocked = 0;
  const serialize = (node: EmailNode): string => {
    if (node.kind === 'text') return escapeHtml(node.text);
    if (node.kind !== 'element' || !kept(node)) return '';
    const {tag, attributes} = node;
    if (tag === 'img' && !loadImages) { imagesBlocked++; return `<span>[Image blocked: ${escapeHtml(attributes.get('alt') ?? 'no description')}]</span>`; }
    const allowed = [...attributes].filter(([name, value]) => isPresentationAttribute(tag, name) ? styled : allowedEmailAttribute(tag, name, value, mediaOrigin));
    // Links remain visible but cannot navigate, issue unsubscribe or tracking requests.
    const attrs = allowed.filter(([name]) => name !== 'href').map(([name, value]) => ` ${name}="${escapeHtml(value)}"`).join('');
    const link = tag === 'a' && attributes.has('href') ? ` title="${escapeHtml(attributes.get('href')!)}"` : '';
    return `<${tag}${attrs}${link}>${voidEmailTags.has(tag) ? '' : node.children.map(serialize).join('') + `</${tag}>`}`;
  };
  return {html: nodes.map(serialize).join(''), imagesBlocked};
}
/** Images load only after the operator opts in (BASE-INPUT-002): then from HTTPS hosts and from this
 * deployment's own origin, which serves its campaign images over http on a computer (CAMP-012). */
export function previewDocument(html: string, loadImages: boolean, mediaOrigin?: string) {
  const images = loadImages ? ['https:', ...(mediaOrigin && /^https?:\/\/[a-z0-9.[\]:-]+$/i.test(mediaOrigin) ? [mediaOrigin] : [])].join(' ') : "'none'";
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${images}; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><style>body{margin:0;padding:20px;font:16px/1.5 system-ui,sans-serif;color:#242821;overflow-wrap:anywhere}img,table{max-width:100%;height:auto}a{color:#355b39;text-decoration:underline}pre{white-space:pre-wrap}</style></head><body>${html}</body></html>`;
}
