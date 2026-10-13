import { allowedEmailAttribute, emailTags, escapeHtml } from '../email-html-policy';
import { protectAuthoringTokens } from '../authoring-tokens';

export function authoredHtmlTemplate(html: string) {
  const tokens = protectAuthoringTokens(html);
  const template = document.createElement('template');
  template.innerHTML = tokens.restore(tokens.html, escapeHtml);
  return template;
}
/** Editor retains allowed authored structure and hrefs; unsafe input remains visible in HTML mode. */
export function editorHtml(html: string) {
  const tokens = protectAuthoringTokens(html);
  const template = document.createElement('template'); template.innerHTML = tokens.html;
  const clean = (root: DocumentFragment | Element) => {
    for (const element of [...root.children]) {
      if (!emailTags.has(element.localName) || element.namespaceURI !== 'http://www.w3.org/1999/xhtml') { element.remove(); continue; }
      for (const attribute of [...element.attributes]) {
        // DOM attributes are already entity-decoded; the policy examines authored values.
        const value = tokens.restore(attribute.value).replaceAll('&', '&amp;');
        if (!allowedEmailAttribute(element.localName, attribute.name, value)) element.removeAttribute(attribute.name);
      }
      clean(element);
    }
  };
  clean(template.content); return tokens.restore(template.innerHTML, escapeHtml);
}

/** Serialize tokens from semantic DOM text, while leaving the surrounding HTML escaped.
 * A toolbar may split a token across inline elements. Replace its entire text range
 * on a detached clone so inline formatting cannot become part of its fallback value.
 */
export function authoredEditorHtml(editor: HTMLElement) {
  const copy = editor.cloneNode(true) as HTMLElement;
  const walker = document.createTreeWalker(copy instanceof HTMLTemplateElement ? copy.content : copy, NodeFilter.SHOW_TEXT);
  const nodes: {node: Text; start: number; end: number}[] = [];
  let text = '', node: Node | null;
  while ((node = walker.nextNode())) {
    const start = text.length;
    text += node.textContent;
    nodes.push({node: node as Text, start, end: text.length});
  }
  let prefix = '\uE000mango-editor';
  while (copy.innerHTML.includes(prefix)) prefix += 'x';
  const tokens = [...text.matchAll(/\{\{[\s\S]*?\}\}/g)];
  for (let index = tokens.length - 1; index >= 0; index--) {
    const match = tokens[index], start = match.index!, end = start + match[0].length;
    const first = nodes.find(entry => entry.end > start)!;
    const last = nodes.find(entry => entry.end >= end)!;
    const range = document.createRange();
    range.setStart(first.node, start - first.start);
    range.setEnd(last.node, end - last.start);
    range.deleteContents();
    range.insertNode(document.createTextNode(`${prefix}${index}\uE001`));
  }
  return tokens.reduce((html, token, index) => html.replaceAll(`${prefix}${index}\uE001`, () => token[0]), copy.innerHTML);
}
