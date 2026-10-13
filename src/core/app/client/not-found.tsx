import { Link } from '@tanstack/react-router';
import { ButtonLink } from '@/core/features/site/ButtonLink';
import { Art } from '@/core/features/site/drawings/Art';
import { Envelope } from '@/core/features/site/drawings/Envelope';
import { EmptyState } from './ui/empty-state';
import { sitePaths } from '@/core/features/site/links';
import { PublicPage } from '@/core/features/site/PublicPage';

const art = 'An envelope with a Mango stamp, postmarked 404';

/**
 * Any address no page answers (served with the 404 status), inside the public header and footer: a short note, the
 * ways back to the home page and the docs, and the envelope postmarked 404, as the docs' own missing page has.
 */
export function PublicNotFound() {
  return (
    <PublicPage current="other">
      <div className="site-missing">
        <div className="site-missing-copy">
          <p className="site-missing-eyebrow">Error 404</p>
          <h1 className="site-missing-title">Page not found</h1>
          <p className="site-missing-text">The address may have a typo, or the page may have moved. The home page and the docs lead to everything here.</p>
          <div className="site-missing-actions">
            <ButtonLink to={sitePaths.home} tone="sun">Back to the home page</ButtonLink>
            <ButtonLink to={sitePaths.docs} tone="line">Go to the docs</ButtonLink>
          </div>
        </div>
        <Art label={art} className="site-missing-art">
          <Envelope className="missing-envelope" seed={31} postmark={{ label: '404' }} />
        </Art>
      </div>
    </PublicPage>
  );
}

/** An /app address no operator page answers, inside the operator's own frame, with the way back to the Decision Desk. */
export function AppNotFound() {
  return (
    <EmptyState id="app-missing-title" title="Page not found" level={1} className="app-missing"
      art={<Art label={art} className="empty-art"><Envelope className="missing-envelope" seed={37} postmark={{ label: '404' }} /></Art>}
      action={<Link className="secondary-action" to="/app">Back to the Decision Desk</Link>}>
      <p>This address is not part of the operator app. The Decision Desk shows what is waiting for you.</p>
    </EmptyState>
  );
}
