/** Conservative authoring grammar. Browser preview additionally sanitizes parsed DOM.
 * Unknown/malformed syntax is rejected for approval, never repaired for transmission. */
export const emailTags = new Set('p div span br hr strong b em i u s ul ol li blockquote h1 h2 h3 h4 h5 h6 table thead tbody tfoot tr td th a img'.split(' '));
export const voidEmailTags = new Set(['br', 'hr', 'img']);
export function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
export function safeEmailUrl(value: string, managed = false) {
  if (managed && value === '{{unsubscribe_url}}') return true;
  if (/[\u0000-\u0020\u007f{}]/.test(value) || /&(?!amp;)/i.test(value)) return false;
  try { const url = new URL(value.replaceAll('&amp;', '&')); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
export function allowedEmailAttribute(tag: string, name: string, value: string) {
  if (name === 'title' || (tag === 'img' && name === 'alt')) return !value.includes('{{');
  if (tag === 'a' && name === 'href') return safeEmailUrl(value, true);
  if (tag === 'img' && name === 'src') return safeEmailUrl(value);
  if (['width', 'height'].includes(name) && tag === 'img') return /^\d{1,4}$/.test(value) && Number(value) >= 2;
  if (['colspan', 'rowspan'].includes(name) && ['td', 'th'].includes(tag)) return /^[1-9]\d?$/.test(value);
  return false;
}
export function inspectEmailHtml(source: string) {
  const issues = new Set<string>();
  const destinations = new Set<string>();
  const anchors: Array<{href: string; label: string}> = [];
  let anchor: {href: string; start: number} | undefined;
  let offset = 0;
  while (offset < source.length) {
    const start = source.indexOf('<', offset);
    if (start < 0) break;
    const match = /^<\s*(\/?)\s*([a-z][a-z0-9]*)\b([^<>]*?)\s*(\/?)>/i.exec(source.slice(start));
    if (!match) { issues.add('Malformed HTML tag.'); offset = start + 1; continue; }
    offset = start + match[0].length;
    const tag = match[2].toLowerCase();
    if (!emailTags.has(tag)) issues.add(`Tag <${tag}> is not allowed.`);
    if (match[1]) {
      if (match[3].trim() || match[4]) issues.add('Closing tags cannot carry attributes.');
      if (tag === 'a') {
        if (!anchor) issues.add('An anchor closes without an opening tag.');
        else {
          const content = source.slice(anchor.start, start);
          const label = content.replace(/<[^>]*>/g, '').replace(/&(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+);/gi, ' ').replace(/[\s\p{Cf}]+/gu, ' ').trim();
          if (!label) issues.add('Every link requires a visible text label.');
          anchors.push({href: anchor.href, label});
          anchor = undefined;
        }
      } else if (anchor && !['span', 'strong', 'b', 'em', 'i', 'u', 's', 'br'].includes(tag)) issues.add('Links may contain only text and basic inline formatting.');
      continue;
    }
    if (anchor && !['span', 'strong', 'b', 'em', 'i', 'u', 's', 'br'].includes(tag)) issues.add('Links may contain only text and basic inline formatting.');
    if (match[4] && !voidEmailTags.has(tag)) issues.add(`Non-void <${tag}> cannot self-close.`);
    const attributes = new Map<string, string>();
    let remainder = match[3];
    while (remainder.trim()) {
      const attribute = /^\s+([a-z][a-z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(remainder);
      if (!attribute) { issues.add(`Malformed or unquoted attribute on <${tag}>.`); break; }
      remainder = remainder.slice(attribute[0].length);
      const name = attribute[1].toLowerCase(), value = attribute[2] ?? attribute[3];
      if (attributes.has(name)) issues.add(`Duplicate ${name} attribute.`);
      attributes.set(name, value);
      if (!allowedEmailAttribute(tag, name, value)) issues.add(`Attribute ${name} on <${tag}> is not allowed or has an unsafe value.`);
      if (name === 'href' && value !== '{{unsubscribe_url}}' && safeEmailUrl(value)) destinations.add(value.replaceAll('&amp;', '&'));
    }
    if (tag === 'a') {
      if (anchor) issues.add('Nested links are not allowed.');
      anchor = {href: attributes.get('href') ?? '', start: offset};
    }
    if (tag === 'img' && (!attributes.has('src') || !attributes.has('width') || !attributes.has('height'))) issues.add('Images require HTTPS src and explicit width and height of at least 2 pixels.');
  }
  if (anchor) issues.add('Every link requires a closing anchor tag.');
  return {issues: [...issues], destinations: [...destinations], anchors};
}
