// The pencil outline round every paper card: one soft stroke round a small-radius rectangle whose edges bow a hair and
// whose corners land a little off, closing exactly where it began, so no stretch of the line is drawn twice. A pure
// function of the box and a seed, so the server and the browser draw the same line.

/** A repeatable number in [-1, 1] for a seed and a slot. */
function wobble(seed: number, slot: number): number {
  const x = Math.sin(seed * 12.9898 + slot * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

const pt = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;

/** The outline of a w x h card (in the card's own nominal pixels) with corner radius r. */
export function pencilPath(w: number, h: number, seed: number, r = 6): string {
  const j = (slot: number, amount: number) => wobble(seed, slot) * amount;
  const start = pt(r + 3 + j(1, 2), j(2, 0.7));
  return [
    `M${start}`,
    `Q${pt(w / 2, j(3, 1.3))} ${pt(w - r, j(4, 0.7))}`,
    `Q${pt(w + j(5, 0.6), j(6, 0.6))} ${pt(w + j(7, 0.7), r)}`,
    `Q${pt(w + j(8, 1.3), h / 2)} ${pt(w + j(9, 0.7), h - r)}`,
    `Q${pt(w + j(10, 0.6), h + j(11, 0.6))} ${pt(w - r, h + j(12, 0.7))}`,
    `Q${pt(w / 2, h + j(13, 1.3))} ${pt(r, h + j(14, 0.7))}`,
    `Q${pt(j(15, 0.6), h + j(16, 0.6))} ${pt(j(17, 0.7), h - r)}`,
    `Q${pt(j(18, 1.3), h / 2)} ${pt(j(19, 0.7), r)}`,
    `Q${pt(j(20, 0.6), j(21, 0.6))} ${start}`,
  ].join(' ');
}
