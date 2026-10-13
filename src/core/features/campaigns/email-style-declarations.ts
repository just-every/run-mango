/** Inline `style` values admitted in operator email HTML (MSG-009, MSG-012).
 * A strict tokenizer: only a small character set, `property: value` pairs and listed
 * properties with listed value shapes. Anything else is rejected, never repaired.
 * Which elements may carry a property is decided in email-placement.ts. */
export const maxStyleLength = 600;
const hex = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/;
/** A length written as `0` or in pixels, as a number; undefined for anything else. */
export const pixelValue = (value: string) => value === '0' ? 0 : /^\d{1,4}(?:\.\d{1,2})?px$/.test(value) ? Number(value.slice(0, -2)) : undefined;
const pixels = (low: number, high: number) => (value: string) => {
  const amount = pixelValue(value);
  return amount !== undefined && amount >= low && amount <= high;
};
const percent = (value: string) => { const match = /^(\d{1,3})%$/.exec(value); return Boolean(match) && Number(match![1]) >= 1 && Number(match![1]) <= 100; };
const oneOf = (...words: string[]) => (value: string) => words.includes(value);
const sides = (part: (value: string) => boolean) => (value: string) => { const parts = value.split(' '); return parts.length <= 4 && parts.every(part); };
const spacing = sides(pixels(0, 80));
const margin = sides(value => value === 'auto' || pixels(0, 80)(value));
const size = (value: string) => value === 'auto' || pixels(1, 1200)(value) || percent(value);
const border = (value: string) => value === 'none' || value === '0' || /^[0-8]px (?:solid|dashed|dotted) #(?:[0-9a-f]{3}|[0-9a-f]{6})$/.test(value);
// Ordinary text faces only: an installed symbol or redaction font (Wingdings, block fonts) would
// show recipients different glyphs from the text the approver read.
const textFonts = new Set(['arial', 'helvetica', 'helvetica neue', 'verdana', 'tahoma', 'trebuchet ms', 'segoe ui', 'calibri', 'candara',
  'optima', 'gill sans', 'lucida grande', 'lucida sans unicode', 'roboto', 'open sans', 'inter', 'lato', 'source sans pro', 'system-ui',
  'georgia', 'times new roman', 'times', 'garamond', 'eb garamond', 'baskerville', 'book antiqua', 'palatino', 'palatino linotype',
  'cambria', 'constantia', 'hoefler text', 'merriweather', 'playfair display', 'libre baskerville', 'newsreader',
  'courier new', 'courier', 'consolas', 'menlo', 'monaco', 'lucida console', 'serif', 'sans-serif', 'monospace']);
const unquote = (name: string) => /^'[^']*'$|^"[^"]*"$/.test(name) ? name.slice(1, -1) : name;
const fontFamily = (value: string) => {
  const names = value.split(',').map(name => unquote(name.trim()));
  return names.length <= 6 && names.every(name => textFonts.has(name)) && ['serif', 'sans-serif', 'monospace'].includes(names.at(-1)!);
};
const properties: Record<string, (value: string) => boolean> = {
  'color': value => hex.test(value),
  'background-color': value => hex.test(value) || value === 'transparent',
  'font-family': fontFamily,
  'font-size': pixels(10, 72),
  'font-weight': value => /^(?:normal|bold|[1-9]00)$/.test(value),
  'font-style': oneOf('normal', 'italic'),
  // Unitless from 1, so a line is never shorter than its text; a pixel line height below the text size is refused in
  // email-presentation.ts, since its glyphs would spill out of the cell holding them.
  'line-height': value => value === 'normal' || /^(?:[12](?:\.\d{1,2})?|3)$/.test(value) || pixels(10, 120)(value),
  'letter-spacing': value => value === 'normal' || value === '0' || /^-?(?:\d(?:\.\d{1,2})?|10)px$/.test(value) && Number(value.slice(0, -2)) >= -2,
  'text-align': oneOf('left', 'center', 'right', 'justify'),
  'text-decoration': oneOf('none', 'underline', 'line-through'),
  'text-transform': oneOf('none', 'uppercase', 'lowercase', 'capitalize'),
  'vertical-align': oneOf('top', 'middle', 'bottom', 'baseline'),
  'width': size, 'min-width': size, 'max-width': size, 'height': size,
  'padding': spacing, 'padding-top': spacing, 'padding-right': spacing, 'padding-bottom': spacing, 'padding-left': spacing,
  'margin': margin, 'margin-top': margin, 'margin-right': margin, 'margin-bottom': margin, 'margin-left': margin,
  'border': border, 'border-top': border, 'border-right': border, 'border-bottom': border, 'border-left': border,
  'border-radius': sides(pixels(0, 40)),
  'border-collapse': oneOf('collapse', 'separate'),
  // Automatic layout only: in a fixed-layout table a cell keeps its width and its text runs out of it.
  'table-layout': oneOf('auto'),
  'white-space': oneOf('normal', 'nowrap'),
  'word-break': oneOf('normal', 'break-word'),
  'overflow-wrap': oneOf('normal', 'break-word', 'anywhere'),
};

export type StyleDeclarations = ReadonlyMap<string, string>;
/** Parses one authored `style` value. Property names must be written in lower case; values are compared
 * in lower case, as CSS keywords and hex colours are. */
export function inspectInlineStyle(source: string): {declarations: StyleDeclarations; issues: string[]} {
  const issues: string[] = [];
  const declarations = new Map<string, string>();
  if (source.length > maxStyleLength) issues.push(`A style attribute is longer than ${maxStyleLength} characters.`);
  // No comment, escape, entity, function, at-rule, block, !important or non-ASCII character can pass this set.
  if (!/^[a-z0-9 \t\n\r#%.,:;'"-]*$/i.test(source) || source.includes('--')) {
    issues.push('A style attribute contains a character or sequence outside the allowed set (no comments, escapes, entities, functions, at-rules, custom properties or !important).');
    return {declarations, issues};
  }
  for (const part of source.split(';').map(item => item.trim()).filter(Boolean)) {
    const match = /^([a-z-]+)\s*:\s*(\S(?:.*\S)?)$/s.exec(part);
    if (!match) { issues.push(`Malformed style declaration "${part}" (property names are lower case).`); continue; }
    const name = match[1], value = match[2].replace(/\s+/g, ' ').toLowerCase();
    if (declarations.has(name)) issues.push(`Style property ${name} is declared twice.`);
    declarations.set(name, value);
    if (!Object.hasOwn(properties, name)) issues.push(`Style property ${name} is not allowed.`);
    else if (!properties[name](value)) issues.push(`Style value "${value}" is not allowed for ${name}.`);
  }
  return {declarations, issues};
}

