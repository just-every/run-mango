import { ButtonLink } from '../../site/ButtonLink';
import { sitePaths } from '../../site/links';
import { useRunSite } from '../../site/run-site';
import { copy } from '../copy';
import { PrimaryAction } from '../parts/PrimaryAction';
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
  const runSite = useRunSite();
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">{hero.title}</h1>
        <p className="hero-lead">{hero.lead}</p>
        <p className="hero-replaces"><ReplacesLine /></p>
        <div className="hero-actions">
          <PrimaryAction />
          {runSite ? <a href="https://demo.run-mango.com/" className="site-button site-button--line"><span>Try the demo</span></a> : null}
          <ButtonLink to={sitePaths.docs} tone="line">{hero.secondary}</ButtonLink>
        </div>
      </div>
      <HeroArt />
    </section>
  );
}
