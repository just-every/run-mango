// Hand-drawn pen arrows between the drawings: a gently wavering line and a two-stroke head.
const arrows = {
  /** Left to right, dipping a little: card to card along a row. */
  across: { box: '0 0 64 32', line: 'M3 13C14 7.6 30 7 44 12.4 49 14.3 53.6 17.4 57.6 21.8', head: 'M47.8 21.2C51.6 21.8 55 22.4 58.4 22.6 58.6 19.2 58.2 15.6 57.4 12' },
  /** Over the top and down to the right. */
  arc: { box: '0 0 64 36', line: 'M3 9.4C16 2.8 36 2.4 49 10.6 53.2 13.2 56.4 17.6 58 23.4', head: 'M51.8 19.6C54 21.6 56 23.6 58.2 25.4 59.6 22.6 61 19.6 62 16.4' },
  /** Down and round to the left. */
  down: { box: '0 0 44 64', line: 'M34 3C40.8 15.4 38.4 30.6 29 41.6 23.6 47.8 16.2 52.4 8.6 55', head: 'M15.2 49.4C12.8 51.4 10.4 53.4 7.6 55.2 10.2 57.4 13 59.4 16 61' },
  /** Down and round to the right, landing on the card below. */
  drop: { box: '0 0 44 64', line: 'M9 3C3.6 15.6 6.4 29.4 16 39.6 21.6 45.6 28.6 50.4 32.8 58.6', head: 'M25.8 55.3C28.2 56.6 30.6 58 33 59.4 33.2 56.6 33.5 53.8 33.8 51.1' },
} as const;

export type ArrowName = keyof typeof arrows;

export function Arrow({ name, className }: { name: ArrowName; className: string }) {
  const { box, line, head } = arrows[name];
  return (
    <svg className={`pen-arrow ${className}`} viewBox={box} aria-hidden="true" focusable="false">
      <path d={line} />
      <path d={head} />
    </svg>
  );
}
