import { PublicPage } from '../site/PublicPage';
import { Bands } from './sections/Bands';
import { Closing } from './sections/Closing';
import { Hero } from './sections/Hero';
import { How } from './sections/How';
import './styles';

/**
 * HOME-002. The public landing page at `/`: a static description of Mango's default newsletter profile in the shared
 * header and footer, which carry the owner's name, summary and optional credit from src/ext/config.ts. It reads no
 * operator, contact or campaign record and no session, sets no cookie, and loads only same-origin resources.
 */
export function Landing() {
  return (
    <PublicPage current="home" className="mango-landing">
      <Hero />
      <How />
      <Bands />
      <Closing />
    </PublicPage>
  );
}
