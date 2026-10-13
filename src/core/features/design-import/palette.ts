import { contrastRatio } from '../campaigns/email-contrast';

/** Colours and type faces a design may carry into email. Values are matched against closed shapes and
 * re-written by Mango; nothing from the LayerDoc is copied into CSS as it arrived. */
export const compiledTextContrast = 4.5;
const fullHex = (value: string) => value.length === 4 ? `#${[...value.slice(1)].map(digit => digit + digit).join('')}` : value;

/** A `#rgb`/`#rrggbb` colour in lower case, or undefined for anything else. */
export function hexColour(value: unknown) {
  return typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()) ? fullHex(value.trim().toLowerCase()) : undefined;
}

const channels = (hex: string) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
const toHex = (values: number[]) => `#${values.map(value => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0')).join('')}`;
const lightness = (hex: string) => contrastRatio(hex, '#000000');

/** The design's colour, moved toward black (on light grounds) or white (on dark ones) until it reads at
 * the compiled 4.5:1 target against `background`. */
export function readable(colour: string, background: string) {
  if (contrastRatio(colour, background) >= compiledTextContrast) return colour;
  const target = lightness(background) > lightness('#767676') ? 0 : 255;
  const start = channels(colour);
  for (let step = 1; step <= 20; step++) {
    const mixed = toHex(start.map(value => value + (target - value) * step / 20));
    if (contrastRatio(mixed, background) >= compiledTextContrast) return mixed;
  }
  return target ? '#ffffff' : '#000000';
}

const serifFaces = /baskerville|caslon|garamond|playfair|lora|merriweather|georgia|times|libre|serif|newsreader|bodoni|didot|crimson|cormorant/i;
/** Email-safe stacks only: web fonts would need a stylesheet, which Mango's grammar refuses. */
export function fontStack(family: unknown) {
  return typeof family === 'string' && serifFaces.test(family) && !/sans/i.test(family) ? "Georgia, 'Times New Roman', serif" : 'Helvetica, Arial, sans-serif';
}
