import { parse, serialize, type DefaultTreeAdapterTypes as Tree } from 'parse5';
import { inspectInlineStyle } from '../campaigns/email-style-declarations';
import { contrastRatio } from '../campaigns/email-contrast';
import { placementIssues, paintedBackground } from '../campaigns/email-placement';
import { applyMobileSettings, type MobileBlock } from '../campaigns/email-mobile';

type Element = Tree.Element;
type Rule = { selector: string; declarations: string; location: string; mobile: boolean; specificity: number };
const elements = (node: Tree.ParentNode): Element[] => node.childNodes.flatMap(child => 'tagName' in child ? [child, ...elements(child)] : []);
const attr = (node: Element, name: string) => node.attrs.find(item => item.name === name)?.value;
const put = (node: Element, name: string, value: string) => { node.attrs = node.attrs.filter(item => item.name !== name); if (value) node.attrs.push({ name, value }); };
const written = (values: ReadonlyMap<string, string>) => [...values].map(([key, value]) => `${key}: ${value}`).join('; ');
const matches = (node: Element, selector: string) => {
  const match = /^([a-z][a-z0-9]*)?(?:\.([a-z_][\w-]*))?$/i.exec(selector);
  return Boolean(match && (match[1] || match[2]) && (!match[1] || node.tagName === match[1].toLowerCase()) && (!match[2] || attr(node, 'class')?.split(/\s+/).includes(match[2])));
};

/** Closed CSS subset: unsupported selectors, at-rules and declarations are
 * reported, never promoted into Mango's generated CSS authority. */
function rules(css: string, location: string, note: (message: string) => void, mobile = false): Rule[] {
  const result: Rule[] = [];
  let offset = 0;
  while (offset < css.length) {
    const rest = css.slice(offset);
    const whitespace = /^(?:\s|\/\*[\s\S]*?\*\/)+/.exec(rest);
    if (whitespace) { offset += whitespace[0].length; continue; }
    const brace = css.indexOf('{', offset);
    if (brace < 0) { if (rest.trim()) note(`Dropped CSS ${rest.trim()} at ${location}:${offset + 1}`); break; }
    let depth = 1, end = brace + 1;
    while (end < css.length && depth) { if (css[end] === '{') depth++; if (css[end] === '}') depth--; end++; }
    const selector = css.slice(offset, brace).trim(), at = `${location}:${offset + 1}`;
    if (depth) { note(`Dropped incomplete rule ${selector} at ${at}`); break; }
    const declarations = css.slice(brace + 1, end - 1);
    if (!mobile && /^@media\s+(?:only\s+)?screen\s+and\s+\(max-width:\s*480px\)$/i.test(selector)) result.push(...rules(declarations, at, note, true));
    else if (selector.startsWith('@') || declarations.includes('{')) note(`Dropped rule ${selector} at ${at}`);
    else for (const part of selector.split(',').map(value => value.trim())) {
      if (!/^(?:[a-z][a-z0-9]*)?(?:\.[a-z_][\w-]*)?$/i.test(part) || !part) note(`Dropped selector ${part} at ${at}`);
      else result.push({ selector: part, declarations, location: at, mobile, specificity: part.includes('.') ? 10 : 1 });
    }
    offset = end;
  }
  return result;
}
function declarations(source: string, location: string, note: (message: string) => void) {
  const values = new Map<string, string>();
  for (const part of source.split(';').map(value => value.trim()).filter(Boolean)) {
    const checked = inspectInlineStyle(part);
    if (checked.issues.length) note(`Dropped ${part} at ${location}: ${checked.issues.join(' ')}`);
    else for (const [key, value] of checked.declarations) values.set(key, value);
  }
  return values;
}
/** Search shades along the original RGB hue's lines toward black and white;
 * pick the closest admitted shade. Neutral #999 on white becomes #767676. */
function readable(color: string, backgrounds: string[]) {
  if (!backgrounds.some(background => contrastRatio(color, background) < 3)) return color;
  const digits = color.length === 4 ? [...color.slice(1)].map(digit => digit.repeat(2)).join('') : color.slice(1);
  const channels = [0, 2, 4].map(index => parseInt(digits.slice(index, index + 2), 16));
  let best = color, distance = Infinity;
  for (const target of [0, 255]) for (let step = 1; step <= 255; step++) {
    const rgb = channels.map(value => Math.round(value + (target - value) * step / 255));
    const candidate = '#' + rgb.map(value => value.toString(16).padStart(2, '0')).join('');
    const delta = rgb.reduce((sum, value, index) => sum + (value - channels[index]) ** 2, 0);
    if (delta < distance && backgrounds.every(background => contrastRatio(candidate, background) >= 4.5)) { best = candidate; distance = delta; }
  }
  return best;
}
export function convertTemplateStyles(source: string) {
  const report: string[] = [], note = (message: string) => report.push(message);
  const document = parse(source, { sourceCodeLocationInfo: true });
  const all = elements(document), styles = all.filter(node => node.tagName === 'style');
  const sheet = styles.flatMap((node, index) => rules(node.childNodes.map(child => 'value' in child ? child.value : '').join(''), `style ${index + 1}`, note));
  const body = all.find(node => node.tagName === 'body')!;
  const nodes = elements(body), mobile: MobileBlock[] = [];
  let wrapperUsed = false;
  function visit(node: Element, inherited: { color: string; backgrounds: string[]; inCell: boolean }) {
    const location = `<${node.tagName}> source line ${node.sourceCodeLocation?.startLine ?? '?'}`;
    const selected = sheet.filter(rule => !rule.mobile && matches(node, rule.selector)).sort((a, b) => a.specificity - b.specificity);
    const values = new Map<string, string>();
    for (const rule of selected) for (const [key, value] of declarations(rule.declarations, rule.location, note)) values.set(key, value);
    for (const [key, value] of declarations(attr(node, 'style') ?? '', location, note)) values.set(key, value);
    const wrapper = node.tagName === 'div' && node.parentNode === body && !wrapperUsed;
    if (wrapper && values.has('background-color')) wrapperUsed = true;
    for (const [key, value] of [...values]) {
      const issues = placementIssues({ tag: node.tagName, attributes: new Map(node.attrs.map(item => [item.name, item.value])), declared: new Map([[key, value]]), wrapper, inCell: inherited.inCell, empty: node.childNodes.length === 0 });
      if (issues.length) { values.delete(key); note(`Dropped ${key}: ${value} at ${location}: ${issues.join(' ')}`); }
    }
    const background = paintedBackground({ tag: node.tagName, attributes: new Map(node.attrs.map(item => [item.name, item.value])), declared: values, wrapper });
    const backgrounds = background ? ['td', 'th'].includes(node.tagName) ? [background] : [...new Set([background, '#ffffff'])] : inherited.backgrounds;
    const color = values.get('color') ?? (node.tagName === 'a' && attr(node, 'href') ? '#0000ee' : node.tagName === 'table' ? '#000000' : inherited.color);
    const next = readable(color, backgrounds);
    if (next !== color) { values.set('color', next); note(`Recolored ${color} to ${next} at ${location} against ${backgrounds.join(', ')}`); }
    put(node, 'style', written(values));
    // BUILD-010 settings address top-level blocks; nested media rules remain gaps.
    const responsive = sheet.filter(rule => rule.mobile && matches(node, rule.selector));
    const block = body.childNodes.filter((child): child is Element => 'tagName' in child).indexOf(node);
    for (const rule of responsive) {
      if (block < 0 || block > 127) { note(`Dropped nested mobile rule ${rule.selector} at ${rule.location}`); continue; }
      const setting = mobile.find(row => row.block === block) ?? { block };
      for (const part of rule.declarations.split(';').map(value => value.trim()).filter(Boolean)) {
        const pair = /^([a-z-]+)\s*:\s*(.+)$/.exec(part), key = pair?.[1], value = pair?.[2];
        if (key === 'font-size' && /^(?:1\d|[2-6]\d|7[0-2])px$/.test(value!)) setting.fontSize = parseInt(value!);
        else if (key === 'text-align' && ['left', 'center', 'right'].includes(value!)) setting.alignment = value as MobileBlock['alignment'];
        else if (key === 'padding' && /^(?:[0-9]|[1-5][0-9]|6[0-4])px$/.test(value!)) setting.padding = parseInt(value!);
        else if (key === 'line-height' && /^(?:[12](?:\.\d{1,2})?|3)$/.test(value!)) setting.lineHeight = Number(value);
        else { note(`Dropped mobile ${part} at ${rule.location}`); continue; }
        note(`Mapped mobile ${part} at ${rule.location} to block ${block + 1}`);
      }
      if (Object.keys(setting).length > 1 && !mobile.includes(setting)) mobile.push(setting);
    }
    node.attrs = node.attrs.filter(item => item.name !== 'class');
    for (const child of node.childNodes) if ('tagName' in child) visit(child, { color: next, backgrounds, inCell: inherited.inCell || ['td', 'th'].includes(node.tagName) });
  }
  for (const node of nodes.filter(node => node.parentNode === body)) visit(node, { color: '#000000', backgrounds: ['#ffffff'], inCell: false });
  // Keep style elements out of the sanitizer input after their rules were examined.
  for (const style of styles) if (style.parentNode) style.parentNode.childNodes = style.parentNode.childNodes.filter(child => child !== style);
  return { html: serialize(body), mobile, report };
}
export const importedMobileStyles = (html: string, settings: MobileBlock[]) => settings.length ? applyMobileSettings(html, settings) : html;
