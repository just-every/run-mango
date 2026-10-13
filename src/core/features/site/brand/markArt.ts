// Mango's mark: a ripe mango tilted on its side with one leaf at the stem. Plain data, so the header and footer
// (MangoMark.tsx) and the favicon generator (scripts/generate-icons.mjs) draw exactly the same shapes.

export const markViewBox = '0 0 48 48';

/** The mark's shapes, back to front. */
export const markShapes = [
  // Fruit: a tilted side-view mango with a gently convex, near-straight back along the upper left, a full round belly on the lower right, and a soft rounded tip at the lower left.
  { d: 'M30.0 10.2C37.6 10.6 41.8 18.0 40.6 26.6 39.0 36.8 30.4 44.6 21.6 44.4 13.6 44.2 6.0 41.6 6.0 35.6 6.0 29.6 11.4 19.0 17.8 13.0 20.8 10.6 25.0 10.0 30.0 10.2Z', fill: '#f6b828' },
  // Ripe blush along the underside.
  { d: 'M40.6 26.6C39.0 36.8 30.4 44.6 21.6 44.4 30.6 42.2 37.4 35.8 39.6 24.8Z', fill: '#ea9f22' },
  // Soft highlight on the shoulder.
  { d: 'M17.4 19.0C19.4 16.4 21.8 14.8 24.0 14.2 22.6 17.6 19.8 20.8 17.2 23.6 16.0 24.6 16.2 20.4 17.4 19.0Z', fill: '#ffdb6e' },
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
