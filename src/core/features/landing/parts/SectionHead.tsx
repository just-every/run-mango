import { Fragment } from 'react';

/**
 * A section's h2, the same size in every section (layout.css), and its sub. A sub of two sentences keeps each sentence
 * whole on its line where they do not fit on one, rather than breaking the first one midway.
 */
export function SectionHead({ id, title, sub }: { id: string; title: string; sub: string }) {
  const sentences = sub.split(/(?<=\.) +/);
  return (
    <div className="sec-head">
      <h2 id={`${id}-title`} className="sec-title">{title}</h2>
      <p className="sec-sub">
        {sentences.length > 1
          ? sentences.map((sentence, index) => (
            <Fragment key={sentence}>{index > 0 ? ' ' : null}<span className="sec-sub-part">{sentence}</span></Fragment>
          ))
          : sub}
      </p>
    </div>
  );
}
