/** MSG-012 hidden-text floor: authored text must reach this contrast against the background of its nearest painted
 * table cell, or the outer wrapper and the page's white outside any (email-presentation.ts). Designs compiled by
 * Mango aim higher, at 4.5:1. */
export const minimumTextContrast = 3;

function channels(color: string) {
  const digits = color.length === 4 ? [...color.slice(1)].map(digit => digit + digit).join('') : color.slice(1);
  return [0, 2, 4].map(index => parseInt(digits.slice(index, index + 2), 16) / 255);
}
function luminance(color: string) {
  const [red, green, blue] = channels(color).map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
/** WCAG contrast ratio of two `#rgb`/`#rrggbb` colours; NaN when either is not a hex colour. */
export function contrastRatio(foreground: string, background: string) {
  if (![foreground, background].every(color => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color))) return Number.NaN;
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}
