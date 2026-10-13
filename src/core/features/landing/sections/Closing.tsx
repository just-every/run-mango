import { ButtonLink } from '../../site/ButtonLink';
import { sitePaths } from '../../site/links';
import { copy } from '../copy';

const { closing, hero } = copy;

/** The closing call to action: the heading, one line and the same two buttons as the hero, centred. */
export function Closing() {
  return (
    <section className="band closing" aria-labelledby="closing-title">
      <h2 id="closing-title" className="closing-title">{closing.title}</h2>
      <p className="closing-line">{closing.line}</p>
      <div className="closing-actions">
        <ButtonLink to={sitePaths.install} tone="sun">{hero.primary}</ButtonLink>
        <ButtonLink to={sitePaths.docs} tone="line">{hero.secondary}</ButtonLink>
      </div>
    </section>
  );
}
