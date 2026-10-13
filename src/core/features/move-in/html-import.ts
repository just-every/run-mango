import { allowedEmailAttribute, emailTags, escapeHtml, inspectEmailHtml, safeEmailUrl, voidEmailTags } from '@/core/features/campaigns/email-html-policy';
import { foreignMergeTags } from '@/core/features/campaigns/message-content';

// Imported HTML is reduced to Mango's restricted email grammar. Every removal is
// counted in a visible list, anything the policy still rejects is flagged, and
// merge tags from another tool stay in the text so the personalisation check blocks approval.
export type ImportedHtml = { html: string; removed: string[]; flagged: string[]; mergeTags: string[] };

// Text between tags keeps its entities; a stray angle bracket becomes one.
const text = (segment: string) => segment.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const dropped = ['script', 'style', 'noscript', 'iframe', 'object', 'embed', 'svg', 'form', 'select', 'textarea', 'button', 'template', 'title', 'head', 'video', 'audio', 'canvas', 'map'];

export function importHtml(source: string): ImportedHtml {
  const removed = new Map<string, number>();
  const note = (message: string) => removed.set(message, (removed.get(message) ?? 0) + 1);
  let html = source;
  const body = /<body\b[^>]*>([\s\S]*?)(?:<\/body\s*>|$)/i.exec(html);
  if (body) { if (/<head\b/i.test(html)) note('Document head (styles, title and meta tags)'); html = body[1]; }
  html = html.replace(/<!--[\s\S]*?(?:-->|$)/g, () => { note('HTML comment'); return ''; }).replace(/<!doctype[^>]*>/gi, '');
  for (const tag of dropped) {
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?(?:<\\/${tag}\\s*>|$)`, 'gi'), () => { note(`<${tag}> element and its content`); return ''; });
  }
  const out: string[] = []; const anchors: Array<'kept' | 'dropped'> = []; let offset = 0;
  for (const match of html.matchAll(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9:-]*)\b((?:[^<>"']|"[^"]*"|'[^']*')*)>/g)) {
    out.push(text(html.slice(offset, match.index))); offset = match.index + match[0].length;
    const closing = Boolean(match[1]), tag = match[2].toLowerCase();
    if (!emailTags.has(tag)) { if (!closing) note(`<${tag}> tag (its text is kept)`); continue; }
    if (closing) {
      if (tag === 'a') { const state = anchors.pop(); if (state === 'dropped' || state === undefined) continue; }
      if (!voidEmailTags.has(tag)) out.push(`</${tag}>`);
      continue;
    }
    const attributes: string[] = []; const values = new Map<string, string>();
    for (const attribute of match[3].matchAll(/([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      const name = attribute[1].toLowerCase(), value = (attribute[2] ?? attribute[3] ?? attribute[4] ?? '').trim();
      if (values.has(name)) continue;
      values.set(name, value);
      if (allowedEmailAttribute(tag, name, value.replaceAll('&amp;', '&').replaceAll('&', '&amp;'))) attributes.push(`${name}="${escapeHtml(value.replaceAll('&amp;', '&'))}"`);
      else if (!(tag === 'a' && name === 'href') && !(tag === 'img' && name === 'src')) note(`${name} attribute`);
    }
    if (tag === 'a') {
      const href = values.get('href') ?? '';
      if (!safeEmailUrl(href.replaceAll('&amp;', '&').replaceAll('&', '&amp;'), true)) {
        anchors.push('dropped');
        // A link whose address is another tool's merge tag stays visible as text.
        if (foreignMergeTags(href).length) out.push(`(${escapeHtml(href)}) `);
        note(href ? 'Link with an address that is not HTTPS (its text is kept)' : 'Link without an address (its text is kept)');
        continue;
      }
      anchors.push('kept');
    }
    if (tag === 'img' && (!safeEmailUrl(values.get('src') ?? '') || !values.has('width') || !values.has('height') || !attributes.some(item => item.startsWith('width=')) || !attributes.some(item => item.startsWith('height=')))) {
      note('Image without an HTTPS address and explicit width and height');
      if (foreignMergeTags(values.get('src') ?? '').length) out.push(escapeHtml(values.get('src')!));
      continue;
    }
    out.push(`<${tag}${attributes.length ? ' ' + attributes.join(' ') : ''}>`);
  }
  out.push(text(html.slice(offset)));
  const cleaned = out.join('').replace(/[ \t]*\r?\n[\s]*/g, '\n').replace(/\n{2,}/g, '\n').trim();
  return {
    html: cleaned,
    removed: [...removed].map(([message, count]) => count > 1 ? `${message} (${count})` : message),
    flagged: inspectEmailHtml(cleaned).issues,
    mergeTags: foreignMergeTags(cleaned),
  };
}
