import { pixelValue, type StyleDeclarations } from './email-style-declarations';

/** Where presentation may stand in operator email HTML (MSG-009, MSG-012, tightened 13 October 2026).
 * Only table cells and the email's outer wrapper paint a background, no element declares a display
 * (email-style-declarations.ts admits none), and the rules below keep anything from carrying text out of the cell
 * that holds it or painting over it. So every text run is drawn inside its nearest table cell, on that cell's
 * background or, where the cell paints none, on the nearest painted cell around it; outside any painted cell it is
 * drawn on the wrapper or on the page's white. Readability is then one contrast check against those colours
 * (email-presentation.ts). Each rule below is one step of that argument, with the reason the tightened grammar
 * still needs it. */

export const cellTags = new Set(['td', 'th']);
const sized = new Set(['table', 'td', 'th', 'img']);
const tableParts = new Set(['table', 'tr', 'td', 'th']);
/** Elements laid out inside a line: their top and bottom borders take no room there. Images are boxes of their own. */
const inlineTags = new Set(['span', 'strong', 'b', 'em', 'i', 'u', 's', 'a']);
const sides = ['top', 'right', 'bottom', 'left'] as const;
type Side = typeof sides[number];

/** One side of a `padding` or `margin` as written, by its longhand or its shorthand; `auto` counts as 0, since an
 * auto margin only takes up room that is left over. Where both are written, `pick` chooses between them. */
function spacing(declared: StyleDeclarations, property: 'padding' | 'margin', side: Side, pick: (a: number, b: number) => number) {
  const values: number[] = [];
  const longhand = declared.get(`${property}-${side}`), shorthand = declared.get(property);
  if (longhand !== undefined) values.push(longhand === 'auto' ? 0 : pixelValue(longhand) ?? 0);
  if (shorthand !== undefined) {
    const parts = shorthand.split(' ');
    const part = [parts[0], parts[1] ?? parts[0], parts[2] ?? parts[0], parts[3] ?? parts[1] ?? parts[0]][sides.indexOf(side)];
    values.push(part === 'auto' ? 0 : pixelValue(part) ?? 0);
  }
  return values.length ? values.reduce(pick) : undefined;
}
const borderWidth = (value: string | undefined) => value === undefined || value === 'none' ? 0 : pixelValue(value.split(' ')[0]) ?? 0;
const percentage = (value: string | undefined) => Boolean(value?.endsWith('%'));

export type Placement = {
  tag: string;
  attributes: ReadonlyMap<string, string>;
  declared: StyleDeclarations;
  /** Whether the element may be the email's outer wrapper: a div at the top level of the body, before any other
   * top-level div has set a background. */
  wrapper: boolean;
  /** Whether the element is inside a table cell. */
  inCell: boolean;
  /** Whether the element holds nothing: no element and no text but white space. */
  empty: boolean;
  /** For a cell: its table's `cellpadding`, the padding of a cell whose style sets none. */
  cellpadding?: string;
};

/** The colour this element paints behind its content, if any: a cell's or the wrapper's declared colour, or a cell's
 * bgcolor where no style overrides it (`background-color: transparent` paints nothing, whatever bgcolor says). */
export function paintedBackground({tag, attributes, declared, wrapper}: Pick<Placement, 'tag' | 'attributes' | 'declared' | 'wrapper'>) {
  if (!cellTags.has(tag) && !wrapper) return undefined;
  const declaredColour = declared.get('background-color');
  if (declaredColour !== undefined) return declaredColour === 'transparent' ? undefined : declaredColour;
  return cellTags.has(tag) ? attributes.get('bgcolor')?.toLowerCase() : undefined;
}

export function placementIssues({tag, attributes, declared, wrapper, inCell, empty, cellpadding}: Placement) {
  const issues: string[] = [];
  // A table cell's background fills the cell's box, and the cell grows to hold everything in it. Any other element's
  // background covers only part of what it holds (an inline's line boxes, not the blocks inside it). The one exception
  // is the outer wrapper, a top-level div whose colour fills the page behind the email; email-presentation.ts also
  // judges its text on the page's white, where overflow and floats can carry it out of a block.
  if (declared.has('background-color') && !cellTags.has(tag) && !wrapper) issues.push(`A background can be set only on a table cell (td or th) or on the email's outer wrapper, one div at the top level of the body; not on <${tag}>${tag === 'div' ? ' inside the email or a second wrapper' : ''}.`);
  // Tables and cells grow to fit what they hold (automatic table layout; table-layout is not in the grammar) and
  // images hold no text. A width on any other box can be narrower than its text, which then runs out of its cell.
  // A cell's maximum width is a real limit in browsers, so max-width stays on tables, which never shrink below
  // their content, and images.
  for (const name of ['width', 'min-width']) {
    if (declared.has(name) && !sized.has(tag)) issues.push(`${name} can be set only on a table, a table cell or an image; on <${tag}> it can make the box narrower than its text.`);
  }
  if (declared.has('max-width') && tag !== 'table' && tag !== 'img') issues.push(`max-width can be set only on a table or an image; on <${tag}> it can make the box narrower than its text.`);
  // A table, row or cell keeps its own display, so a height is only its least height. Any other box with a height lets
  // what it holds run out below it: text onto whatever follows the cell, an image over the text that follows. An empty
  // box (a rule drawn as a border) holds nothing that can run out.
  if (declared.has('height') && !tableParts.has(tag) && tag !== 'img' && !empty) issues.push(`height can be set only on a table, a row, a cell, an image or an empty box; what <${tag}> holds can run out below it.`);
  // A percentage width is a share of the room around the box; its own side margins, padding and borders come on top
  // of that share and push it out of its cell. A cell's spacing stays inside its column, so cells are exempt.
  if ((tag === 'table' || tag === 'img') && [declared.get('width'), declared.get('min-width'), attributes.get('width')].some(percentage)) {
    const spaced = (['left', 'right'] as const).some(side => (spacing(declared, 'margin', side, Math.max) ?? 0) > 0 || (spacing(declared, 'padding', side, Math.max) ?? 0) > 0
      || borderWidth(declared.get('border')) > 0 || borderWidth(declared.get(`border-${side}`)) > 0);
    if (spaced) issues.push(`<${tag}> with a percentage width cannot also set a left or right margin, padding or border, which would push it out of the cell around it.`);
  }
  // An inline element's top and bottom borders take no room in its line, so its top border paints over the line above.
  if (inlineTags.has(tag) && [...declared.keys()].some(name => name === 'border' || name.startsWith('border-') && !['border-radius', 'border-collapse'].includes(name))) {
    issues.push(`Borders cannot be set on <${tag}>: an inline element's border takes no room in its line and can paint over the text above it.`);
  }
  // A rounded corner leaves the corner of the cell unpainted, showing what is behind it; padding at least the radius
  // on two opposite sides keeps everything the cell holds out of its corners.
  const radius = Math.max(0, ...(declared.get('border-radius') ?? '0').split(' ').map(value => pixelValue(value) ?? 0));
  // The wrapper's corners show the page, on which its text is judged anyway.
  if (radius > 0 && cellTags.has(tag) && paintedBackground({tag, attributes, declared, wrapper})) {
    const fallback = cellpadding !== undefined ? Number(cellpadding) : 1;
    const padding = (side: Side) => spacing(declared, 'padding', side, Math.min) ?? fallback;
    if (Math.min(padding('left'), padding('right')) < radius && Math.min(padding('top'), padding('bottom')) < radius) {
      issues.push(`A table cell that paints a background can round its corners by at most its padding on the left and right (or the top and bottom): ${radius}px is more, so text could sit in an unpainted corner.`);
    }
  }
  // Right-to-left content wider than its box runs out on the left, past the left edge of the email, where no reader
  // can scroll. A cell grows to hold its content, so right-to-left text is set on a cell or inside one.
  if (attributes.get('dir') === 'rtl' && !inCell && !cellTags.has(tag)) issues.push('dir="rtl" can be set only on a table cell (td or th) or inside one, where the cell grows to hold right-to-left text instead of letting it run past the left edge of the email.');
  return issues;
}
