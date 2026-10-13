import { ButtonLink } from '../site/ButtonLink';
import { Art } from '../site/drawings/Art';
import { Envelope } from '../site/drawings/Envelope';
import { sitePaths } from '../site/links';
import { docsCopy } from './copy';
import { DocsTitleStroke } from './DocsTitleStroke';
import './styles';

const { missing } = docsCopy;

/**
 * DOCS-001. What an unknown, miscased or nested docs address shows, with the 404 status, inside the shared public header
 * and footer: a short note and the way back to the docs home and the landing.
 */
export function DocsMissing() {
  return (
    <div className="docs-missing">
      <div className="docs-missing-copy">
        <p className="docs-missing-eyebrow">{missing.eyebrow}</p>
        <h1 className="docs-missing-title">{missing.heading}</h1>
        <DocsTitleStroke />
        <p className="docs-missing-text">{missing.text}</p>
        <div className="docs-missing-actions">
          <ButtonLink to={sitePaths.docs} tone="sun">{missing.docs}</ButtonLink>
          <ButtonLink to={sitePaths.home} tone="line">{missing.home}</ButtonLink>
        </div>
      </div>
      <Art label={missing.art} className="docs-missing-art">
        <Envelope className="dm-envelope" seed={31} postmark={{ label: missing.postmark }} />
      </Art>
    </div>
  );
}
