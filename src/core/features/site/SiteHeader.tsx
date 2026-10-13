import { Brand } from './Brand';
import { siteCopy } from './copy';
import { SectionLink, SiteLink } from './SiteLink';
import { sitePaths } from './links';

/** The page the frame holds: the landing, a docs page, or another public page (the 404), which marks no link current. */
export type SitePage = 'home' | 'docs' | 'other';

/**
 * The shared header: the lockup, then How it works, Docs and the page's one link named exactly "Sign in". On a docs page
 * the Docs link is marked as the current section (`aria-current="page"` on the docs home itself).
 */
export function SiteHeader({ current }: { current: SitePage }) {
  const { nav } = siteCopy;
  return (
    <header className="site-header">
      <Brand />
      <nav className="site-nav" aria-label={nav.label}>
        <SectionLink id="how" onLanding={current === 'home'}>{nav.how}</SectionLink>
        <SiteLink to={sitePaths.docs} aria-current={current === 'docs' ? 'true' : undefined}>{nav.docs}</SiteLink>
        <span className="site-nav-slash" aria-hidden="true">/</span>
        <SiteLink to={sitePaths.signIn}>{nav.signIn}</SiteLink>
      </nav>
    </header>
  );
}
