import { Brand } from './Brand';
import { siteCopy } from './copy';
import { OperatorLink } from './OperatorLink';
import { SectionLink, SiteLink } from './SiteLink';
import { sitePaths } from './links';
import { useRunSite } from './run-site';

/** The page the frame holds: the landing, a docs page, or another public page (the 404), which marks no link current. */
export type SitePage = 'home' | 'docs' | 'other';

/**
 * The shared header: the lockup, then How it works, Docs and the page's one link named exactly "Sign in" ("Open app" once
 * the browser holds an open session). On a docs page
 * the Docs link is marked as the current section (`aria-current="page"` on the docs home itself). The run site has no sign-in,
 * so it leaves that link and its slash out and links Contract (/contract) in their place.
 */
export function SiteHeader({ current }: { current: SitePage }) {
  const { nav } = siteCopy;
  const runSite = useRunSite();
  return (
    <header className="site-header">
      <Brand />
      <nav className="site-nav" aria-label={nav.label}>
        <SectionLink id="how" onLanding={current === 'home'}>{nav.how}</SectionLink>
        <SiteLink to={sitePaths.docs} aria-current={current === 'docs' ? 'true' : undefined}>{nav.docs}</SiteLink>
        {runSite ? <SiteLink to={sitePaths.contract}>{nav.contract}</SiteLink> : <>
          <span className="site-nav-slash" aria-hidden="true">/</span>
          <OperatorLink signIn={nav.signIn} openApp={nav.openApp} />
        </>}
      </nav>
    </header>
  );
}
