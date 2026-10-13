// Mango's mark: a ripe mango tilted on its side with one leaf at the stem. Plain data, so the header and footer
// (MangoMark.tsx) and the favicon generator (scripts/generate-icons.mjs) draw exactly the same shapes.

export const markViewBox = '0 0 48 48';

/** The mark's shapes, back to front. */
export const markShapes = [
  // Fruit: a fat rounded end at the lower left, narrowing to the stem at the upper right, with the gentle inward curve of a mango's back.
  { d: 'M30.2 10.4C37.6 10.9 41.8 18.3 40.2 26.6 38.3 36.6 29.4 44.4 19.4 44.2 10.6 44 5 38.2 6.7 31.2 7.9 26.4 12.3 24.8 16.4 22.3 20.7 19.6 22.4 10 30.2 10.4Z', fill: '#f6b828' },
  // Ripe blush along the underside.
  { d: 'M40.2 26.6C38.3 36.6 29.4 44.4 19.4 44.2 29.2 42.4 36.8 35.6 39.4 24.6Z', fill: '#ea9f22' },
  // Soft highlight on the shoulder.
  { d: 'M13.1 29.4C14.9 27.4 18.2 26.5 20.6 24.4 19.2 27.7 15.8 29.7 13.6 31.9 12.7 32.8 12.3 30.3 13.1 29.4Z', fill: '#ffdb6e' },
  // Stem.
  { d: 'M29.4 11.6C29.6 9.9 30.2 8.5 31.2 7.4L32.3 8.2C31.5 9.2 31 10.4 30.9 11.8Z', fill: '#6b4a22' },
  // Leaf, two-toned along its midrib.
  { d: 'M31.2 8.3C33.4 3.6 39 1.6 45.3 3.1 43.6 8.6 37.6 11.4 31.2 8.3Z', fill: '#3f8a3c' },
  { d: 'M31.2 8.3C36.2 6.4 40.8 4.6 45.3 3.1 43.6 8.6 37.6 11.4 31.2 8.3Z', fill: '#2f6e30' },
] as const;

/** The mark as a standalone SVG document (the favicon). */
export function markSvg(): string {
  const paths = markShapes.map(({ d, fill }) => `  <path fill="${fill}" d="${d}"/>`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${markViewBox}">\n${paths}\n</svg>\n`;
}
