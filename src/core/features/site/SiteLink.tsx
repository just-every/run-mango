import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { identity } from '@/identity';
import { sitePaths, type LandingSectionId, type SiteTarget } from './links';
import { useRunSite } from './run-site';

type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

const href = (to: SiteTarget) => to.to === '/docs/$slug' ? `/docs/${to.slug}` : to.to;

/**
 * A link to one of Mango's own public pages. Only the page itself counts as current (exact matching), so the docs home
 * link is not marked `aria-current="page"` on every docs page. The run site's static pages and the home page (an
 * installed Mango's Lobby, which the Worker serves rather than the router) are plain document links.
 */
export function SiteLink({ to, hash, children, ...rest }: AnchorProps & { to: SiteTarget; hash?: string; children: ReactNode }) {
  if (useRunSite() || to.to === '/' || to.to === '/run' || to.to === '/contract') return <a href={hash ? `${href(to)}#${hash}` : href(to)} {...rest}>{children}</a>;
  if (to.to === '/docs/$slug') {
    return <Link to="/docs/$slug" params={{ slug: to.slug }} hash={hash} activeOptions={{ exact: true }} {...rest}>{children}</Link>;
  }
  return <Link to={to.to} hash={hash} activeOptions={{ exact: true }} {...rest}>{children}</Link>;
}

/**
 * A link to one of the landing's sections: a plain in-page anchor on the landing, the landing's anchor elsewhere on the
 * run site, and on an installed Mango (whose home page is the Lobby) the section on the run site.
 */
export function SectionLink({ id, onLanding, children, ...rest }: AnchorProps & { id: LandingSectionId; onLanding: boolean; children: ReactNode }) {
  const runSite = useRunSite();
  if (onLanding) return <a href={`#${id}`} {...rest}>{children}</a>;
  if (!runSite) return <a href={`${identity.runSite}/#${id}`} {...rest}>{children}</a>;
  return <SiteLink to={sitePaths.home} hash={id} {...rest}>{children}</SiteLink>;
}
