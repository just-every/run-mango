import {mobileOverrides,mobileClass,type MobileBlock} from './email-mobile';
import { inspectInlineStyle } from './email-style-declarations';
import { contrastRatio, minimumTextContrast } from './email-contrast';
import { parseEmailHtml, type EmailElement, type EmailNode } from './email-html-parse';
import { cellTags, paintedBackground, placementIssues } from './email-placement';
import { overlappingCells } from './email-table-slots';

/** The presentation part of MSG-009 and the hidden-content rules of MSG-012. One checker serves
 * approval, test send and delivery (through inspectEmailHtml) and the preview, both walking the tree of email-html-parse.ts. */
const hex = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const oneOf = (...words: string[]) => (value: string) => words.includes(value);
const width = (value: string) => /^(?:[1-9]\d{0,3}|(?:100|[1-9]\d?)%)$/.test(value);
const direction = oneOf('ltr', 'rtl');
const cell = {align: oneOf('left', 'center', 'right'), valign: oneOf('top', 'middle', 'bottom'), bgcolor: (value: string) => hex.test(value), width, dir: direction};
const attributeRules: Record<string, Record<string, (value: string) => boolean>> = {
  // No bgcolor: only cells paint. No align="right": a table floated right runs out past the left edge when it is wider than its room.
  table: {role: oneOf('presentation'), width, cellpadding: value => /^\d{1,2}$/.test(value), cellspacing: value => /^\d{1,2}$/.test(value),
    border: oneOf('0'), align: oneOf('left', 'center')},
  td: cell, th: cell,
  div: {lang: value => /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value), dir: direction},
  img: {border: oneOf('0')},
};
const presentationNames = new Set(['class', 'style', 'bgcolor', 'role', 'cellpadding', 'cellspacing', 'border', 'align', 'valign', 'lang', 'dir']);
/** Images and presentation are edited as HTML: rich editing keeps only the unstyled grammar (CAMP-021). */
export function requiresHtmlEditing(html: string) {
  const presented = (nodes: EmailNode[]): boolean => nodes.some(node => node.kind === 'element'
    && (node.tag === 'img' || [...node.attributes.keys()].some(name => presentationNames.has(name)) || presented(node.children)));
  return presented(parseEmailHtml(html).nodes);
}
/** Attributes added by the MSG-009 amendment; the earlier grammar never admitted any of them. */
export function isPresentationAttribute(tag: string, name: string) {
  return name === 'style' || Object.hasOwn(attributeRules[tag] ?? {}, name);
}

const defaultTextColor = '#000000', pageBackground = '#ffffff';
/** Browsers' own colour for a link with an address (visited links are darker, so they read wherever it does); one
 * without an address inherits its parent's colour. */
const defaultLinkColor = '#0000ee';
// Browser default heading sizes, relative to the surrounding text.
const headingScale: Record<string, number> = {h1: 2, h2: 1.5, h3: 1.17, h4: 1, h5: 0.83, h6: 0.67};
const minimumFontPixels = 10;
const voidTags = new Set(['br', 'hr', 'img']);

/** What text inside an element is drawn with: every colour it may take, every background it may be drawn on, and
 * its size. `colors` holds more than one colour where clients differ: a body without a doctype renders in quirks mode,
 * where a table does not inherit `color` and starts again from default black. `backgrounds` is the nearest painted
 * cell's colour; on the outer wrapper it is the wrapper's colour and the page's white, since a long line or a floated
 * table can carry text out of a block (a cell grows to hold them); outside both, the page's white.
 * `lineHeight` is an inherited pixel line height; a unitless one scales with the text and is left out. */
type Open = {hidden?:boolean;colors: string[]; backgrounds: string[]; fontSize: number; lineHeight?: number; inCell: boolean; cellpadding?: string};
const root: Open = {colors: [defaultTextColor], backgrounds: [pageBackground], fontSize: 16, inCell: false};

/** Walks one parsed body (email-html-parse.ts) in tree order: callers report each element with its attributes
 * and then open it, close it after its children, and report each text run; `finish` returns every issue.
 * Text is judged against the background of its nearest painted cell, or outside any against the outer wrapper and the
 * page: the only places the tightened grammar lets it be drawn (email-placement.ts). inspectEmailHtml adds that styled
 * markup must be written the way parsers build it. */
export function createPresentationCheck(settings:readonly MobileBlock[]=[],view:'mobile'|'desktop'='desktop') {
  const issues = new Set<string>(), structure = new Set<string>();
  const stack: Open[] = [root];
  let presented = false, wrapped = false;
  const parentOf = () => stack.at(-1)!;
  return {
    /** Whether any attribute so far was presentation (the MSG-009 amendment); structure rules apply only then. */
    get presented() { return presented; },
    /** Validates one attribute this checker owns; returns false for attributes it does not own. */
    attribute(tag: string, name: string, value: string) {
      if(name==='class'&&settings.some(row=>mobileClass(row.block)===value)){presented=true;return true;}
      if (!isPresentationAttribute(tag, name)) return false;
      presented = true;
      if (name === 'style') for (const issue of inspectInlineStyle(value).issues) issues.add(issue);
      else if (!attributeRules[tag][name](value)) issues.add(`Attribute ${name} on <${tag}> has a value outside the allowed set.`);
      return true;
    },
    open(node: EmailElement) {
      const {tag, attributes} = node, parent = parentOf();
      const responsive=mobileOverrides(settings,attributes.get('class'),view);
      const declared = new Map([...inspectInlineStyle(attributes.get('style') ?? '').declarations,...responsive.values]);
      // The outer wrapper: the first div at the top level of the body that sets a background.
      const wrapper = tag === 'div' && parent === root && !wrapped;
      if (wrapper && declared.has('background-color')) wrapped = true;
      const empty = node.children.every(child => child.kind === 'text' && /^[ \t\n\r\f]*$/.test(child.text));
      for (const issue of placementIssues({tag, attributes, declared, wrapper, empty, inCell: parent.inCell, cellpadding: parent.cellpadding})) issues.add(issue);
      if (tag === 'table' && overlappingCells(node)) structure.add('Styled table cells cannot overlap where a row span meets a column span: the cell drawn later paints over the other\'s text.');
      if (tag === 'img' && ['width', 'height'].some(name => /px$/.test(declared.get(name) ?? '') && parseFloat(declared.get(name)!) < 2)) issues.add('Images require a displayed width and height of at least 2 pixels.');
      if (voidTags.has(tag)) return;
      const color = declared.get('color'), painted = paintedBackground({tag, attributes, declared, wrapper}), lineHeight = declared.get('line-height');
      stack.push({
        hidden:parent.hidden||responsive.hidden,
        colors: color ? [color] : tag === 'a' && attributes.has('href') ? [defaultLinkColor] : tag === 'table' ? [...new Set([...parent.colors, defaultTextColor])] : parent.colors,
        backgrounds: painted ? (cellTags.has(tag) ? [painted] : [...new Set([painted, pageBackground])]) : parent.backgrounds,
        // Quirks mode also starts a table again from the default 16px: the smaller of the two counts here.
        fontSize: declared.has('font-size') ? parseFloat(declared.get('font-size')!) : tag === 'table' ? Math.min(parent.fontSize, 16) : parent.fontSize * (headingScale[tag] ?? 1),
        lineHeight: lineHeight === undefined ? parent.lineHeight : /px$/.test(lineHeight) ? parseFloat(lineHeight) : undefined,
        inCell: parent.inCell || cellTags.has(tag),
        // A cell takes its table's cellpadding; a nested table without one does not inherit it.
        cellpadding: tag === 'table' ? attributes.get('cellpadding') : parent.cellpadding,
      });
    },
    close(tag: string) {
      if (!voidTags.has(tag)) stack.pop();
    },
    text(run: string) {
      if (parentOf().hidden||/^[ \t\n\r\f]*$/.test(run)) return;
      // The override characters reverse the letters readers see, as unicode-bidi:bidi-override would, while screen readers,
      // search and the plain-text part read them in their written order. Embeddings and isolates (U+202A to U+202C,
      // U+2066 to U+2069) only set direction, as dir does, and pasted right-to-left names carry them, so they stay.
      if (/[\u202d\u202e]/.test(run)) issues.add('Text carries a direction override character (U+202D or U+202E) that reverses the letters readers see; remove it, and use dir on a table cell for right-to-left text.');
      const {colors, backgrounds, fontSize, lineHeight} = parentOf();
      // The tree is the one mail clients build, so this holds for unstyled markup too: a heading nested in a heading shrinks.
      if (fontSize < minimumFontPixels) issues.add(`Text cannot be smaller than ${minimumFontPixels}px; a heading inside small text shrinks further.`);
      if (lineHeight !== undefined && lineHeight < fontSize) issues.add('A pixel line height cannot be smaller than the text size, where lines would spill out of their cell.');
      for (const color of colors) for (const background of backgrounds) {
        const ratio = contrastRatio(color, background);
        const hint = color === defaultTextColor && colors.length > 1 ? ' (a table in a mail client without a doctype does not inherit colour, so set color on the cell or its text)'
          : backgrounds.length > 1 && background === pageBackground ? ' (text on the outer wrapper must also read on the white page around it, where a long line or a floated table can carry it; set its background on a table cell instead)' : '';
        if (ratio < minimumTextContrast) issues.add(`Text colour ${color} on ${background} has contrast ${ratio.toFixed(2)}:1, below ${minimumTextContrast}:1${hint}.`);
      }
    },
    finish() {
      return [...issues, ...(presented ? structure : [])];
    },
  };
}
