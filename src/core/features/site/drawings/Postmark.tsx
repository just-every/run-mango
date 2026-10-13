/** Wavy cancellation lines, as a franking machine leaves them. */
export function Waves({ className }: { className: string }) {
  return (
    <svg className={`waves ${className}`} viewBox="0 0 70 34" preserveAspectRatio="none" focusable="false">
      <path d="M1 4C7 1 11 7 17 4S27 1 33 4 43 7 49 4 59 1 69 4M1 13C7 10 11 16 17 13S27 10 33 13 43 16 49 13 59 10 69 13M1 22C7 19 11 25 17 22S27 19 33 22 43 25 49 22 59 19 69 22M1 31C7 28 11 34 17 31S27 28 33 31 43 34 49 31 59 28 69 31" />
    </svg>
  );
}

/** What a postmark says: one word set round the top of its ring with a tick inside, or a short label across the ring. */
export type PostmarkText = { rim: string } | { label: string };

/** The rim word's baseline radius and the turn between its letters (the ring is drawn on a 60 x 60 grid). */
const rimRadius = 18.3;
const letterTurn = 22.5;

/** The word round the top of the ring, letter by letter, a tick in the middle and three dots along the bottom. */
function Rim({ word }: { word: string }) {
  const letters = [...word];
  return (
    <g className="postmark-rim">
      {letters.map((letter, index) => (
        <text key={`${index}-${letter}`} x="30" y={30 - rimRadius} textAnchor="middle" transform={`rotate(${(index - (letters.length - 1) / 2) * letterTurn} 30 30)`}>{letter}</text>
      ))}
      <path className="postmark-tick" d="M24 30.4 27.9 34.2 36 25.8" />
      {[155, 180, 205].map((angle) => <circle key={angle} className="postmark-dot" cx="30" cy="8.4" r="1.15" transform={`rotate(${angle} 30 30)`} />)}
    </g>
  );
}

/** A round postmark: a double ring carrying its word or label, trailing wavy lines (to the right, or with `--mirror` to the left). */
export function Postmark({ className, ...text }: PostmarkText & { className: string }) {
  const rim = 'rim' in text ? text.rim : null;
  return (
    <div className={`postmark ${className}`}>
      <svg className="postmark-ring" viewBox="0 0 60 60" focusable="false">
        <circle cx="30" cy="30" r="28" />
        <circle cx="30" cy="30" r={rim ? 14.4 : 22.5} className="postmark-inner" />
        {rim ? <Rim word={rim} /> : null}
      </svg>
      {'label' in text ? <span className="postmark-label">{text.label}</span> : null}
      <Waves className="postmark-waves" />
    </div>
  );
}
