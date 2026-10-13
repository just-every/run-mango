import { allowedEmailAttribute, emailTags, escapeHtml, voidEmailTags } from '../email-html-policy';
/** Parse only into inert template content; rebuild every allowed element before use. */
export function sanitizeEmailPreview(source: string, loadImages = false) {
  const template = document.createElement('template');
  template.innerHTML = source;
  let imagesBlocked = 0;
  const serialize = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? '');
    if (!(node instanceof Element)) return '';
    const tag = node.localName;
    if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml' || !emailTags.has(tag)) return '';
    // The renderer's trusted hidden preheader is represented separately in the UI.
    if (node.hasAttribute('aria-hidden')) return '';
    if (tag === 'img') {
      if (!['src', 'width', 'height'].every(name => node.hasAttribute(name) && allowedEmailAttribute(tag, name, node.getAttribute(name)!))) return '';
      if (!loadImages) { imagesBlocked++; return `<span>[Image blocked: ${escapeHtml(node.getAttribute('alt') ?? 'no description')}]</span>`; }
    }
    const attributes = [...node.attributes].filter(attribute => allowedEmailAttribute(tag, attribute.name, attribute.value));
    // Links remain visible but cannot navigate, issue unsubscribe or tracking requests.
    const attrs = attributes.filter(attribute => attribute.name !== 'href').map(attribute => ` ${attribute.name}="${escapeHtml(attribute.value)}"`).join('');
    const link = tag === 'a' && node.hasAttribute('href') ? ` title="${escapeHtml(node.getAttribute('href') ?? '')}"` : '';
    return `<${tag}${attrs}${link}>${voidEmailTags.has(tag) ? '' : [...node.childNodes].map(serialize).join('') + `</${tag}>`}`;
  };
  return {html: [...template.content.childNodes].map(serialize).join(''), imagesBlocked};
}
export function previewDocument(html: string, loadImages: boolean) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${loadImages ? 'https:' : "'none'"}; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><style>body{margin:0;padding:20px;font:16px/1.5 system-ui,sans-serif;color:#242821;overflow-wrap:anywhere}img,table{max-width:100%;height:auto}a{color:#355b39;text-decoration:underline}pre{white-space:pre-wrap}</style></head><body>${html}</body></html>`;
}
