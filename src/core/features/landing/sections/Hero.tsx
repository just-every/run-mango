import { ButtonLink } from '../../site/ButtonLink';
import { sitePaths } from '../../site/links';
import { copy } from '../copy';
import { HeroArt } from '../drawings/hero/HeroArt';

const { hero } = copy;

/** The approved sentence with each replaced product's name in bold; the visible words are the sentence unchanged. */
function ReplacesLine() {
  const names = new RegExp(`(${hero.replacedProducts.join('|')})`);
  return (
    <>
      {hero.replaces.split(names).map((part, index) => (
        index % 2 === 1 ? <strong key={part}>{part}</strong> : part
      ))}
    </>
  );
}

/** The page's one h1, the lead, the two calls to action and the paper scene. */
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">{hero.title}</h1>
        <p className="hero-lead">{hero.lead}</p>
        <p className="hero-replaces"><ReplacesLine /></p>
        <div className="hero-actions">
          <ButtonLink to={sitePaths.install} tone="sun">{hero.primary}</ButtonLink>
          <ButtonLink to={sitePaths.docs} tone="line">{hero.secondary}</ButtonLink>
        </div>
        <p className="hero-note">
          {hero.note.map((part, index) => (
            <span key={part}>{index > 0 ? <span className="hero-note-dot" aria-hidden="true"> · </span> : null}{part}</span>
          ))}
        </p>
      </div>
      <HeroArt />
    </section>
  );
}
