import { Fragment } from 'react';

/** A hyphenated compound ("opt-out", "sign-in"), a clock time with its am or pm ("4:45 pm"), or a word and the
 * separator dot or dash after it ("review ·", "review —"), so no line starts with the dot or dash. Compounds are letters
 * only, so a long URL or token keeps its own break opportunities. */
const keepTogether = /(\p{L}+(?:-\p{L}+)+|\d{1,2}:\d{2}\s+[ap]m\b|\S+\s+[·–—](?=\s|$))/iu;

/**
 * Text whose short units never split across lines: hyphenated compounds, a time and its am or pm, a word and the
 * separator dot or dash after it. Each sits in a nowrap span (.nowrap, site/styles/tokens.css), so the characters, and what
 * tests and search read, stay exactly the text. Safe for data (dates, names) as well as copy.
 */
export function KeepTogether({ text }: { text: string }) {
  return <>{text.split(keepTogether).map((part, index) => (index % 2 === 1
    ? <span key={index} className="nowrap">{part}</span>
    : <Fragment key={index}>{part}</Fragment>))}</>;
}

/**
 * Fixed body copy set so its lines break well: KeepTogether's units, and the last two words together so no line ends
 * the paragraph holding one word. Only for copy whose words are short (the landing, the standalone pages' own text),
 * since the last two words never wrap.
 */
export function BodyText({ text }: { text: string }) {
  const tail = /\S+\s+\S+$/.exec(text);
  const head = tail ? text.slice(0, tail.index) : text;
  return <><KeepTogether text={head} />{tail ? <span className="nowrap">{tail[0]}</span> : null}</>;
}
