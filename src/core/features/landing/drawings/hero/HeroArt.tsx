import { copy } from '../../copy';
import { Art } from '../../../site/drawings/Art';
import { Arrow } from '../decor/Arrow';
import { Envelope } from '../../../site/drawings/Envelope';
import { Stamp } from '../../../site/paper/Stamp';
import { sample } from '../sample';
import { ApprovedCard, AudienceCard, DeliveredCard, EditorCard, SubscriberCard } from './HeroCards';

/**
 * The hero's paper scene, after the approved design: a draft in the editor, the approved letter locked, the stamped
 * envelope postmarked APPROVED, a confirmed subscriber, the audience and the delivery count, joined by pen arrows. Every piece is placed in hero-art.css, as a share of the scene's box; a phone leaves out the
 * audience and the arrows (hero-phone.css), so it has its own description.
 */
export function HeroArt() {
  return (
    <Art label={copy.hero.art.wide} phoneLabel={copy.hero.art.phone} className="hero-art">
      <EditorCard />
      <Stamp className="h-editor-stamp" />
      <Arrow name="arc" className="h-arrow h-arrow--approve" />
      <ApprovedCard />
      <Envelope className="h-card h-envelope" seed={21} postmark={{ rim: sample.hero.postmark }} />
      <SubscriberCard />
      <Arrow name="down" className="h-arrow h-arrow--audience" />
      <Arrow name="drop" className="h-arrow h-arrow--delivered" />
      <AudienceCard />
      <DeliveredCard />
    </Art>
  );
}
