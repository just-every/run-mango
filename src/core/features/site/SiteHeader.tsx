import { ButtonLink } from './ButtonLink';
import { Brand } from './Brand';
import { siteCopy } from './copy';
import { OperatorLink } from './OperatorLink';
import { SiteLink } from './SiteLink';
import { sitePaths, sourceUrl } from './links';
import { useRunSite } from './run-site';

/** The page the frame holds: the landing, a docs page, or another public page (the 404), which marks no link current. */
export type SitePage = 'home' | 'docs' | 'other';

/**
 * The shared header: the lockup alone on the left, the links and the primary action on the right. On a docs page the
 * Docs link is marked as the current section (`aria-current="page"` on the docs home itself). An installed Mango's
 * action is the page's one link named exactly "Sign in" ("Open app" once the browser holds an open session), after a
 * slash. The run site has no sign-in: Docs and GitHub sit beside the primary button, Run Mango.
 */
export function SiteHeader({ current }: { current: SitePage }) {
  const { nav } = siteCopy;
  const runSite = useRunSite();
  return (
    <header className="site-header">
      <Brand />
      <nav className="site-nav" aria-label={nav.label}>
        <SiteLink to={sitePaths.docs} aria-current={current === 'docs' ? 'true' : undefined}>{nav.docs}</SiteLink>
        {runSite ? <>
          <a href={sourceUrl}>{nav.source}</a>
          <ButtonLink to={sitePaths.run} tone="sun">{nav.run}</ButtonLink>
        </> : <>
          <span className="site-nav-slash" aria-hidden="true">/</span>
          <OperatorLink signIn={nav.signIn} openApp={nav.openApp} />
        </>}
      </nav>
    </header>
  );
}
