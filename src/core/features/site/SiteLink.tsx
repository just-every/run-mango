import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import type { SiteTarget } from './links';
import { useRunSite } from './run-site';

type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

const href = (to: SiteTarget) => to.to === '/docs/$slug' ? `/docs/${to.slug}` : to.to;

/**
 * A link to one of Mango's own public pages. Only the page itself counts as current (exact matching), so the docs home
 * link is not marked `aria-current="page"` on every docs page. The run site's static pages and the home page (an
 * installed Mango's Lobby, which the Worker serves rather than the router) are plain document links.
 */
export function SiteLink({ to, children, ...rest }: AnchorProps & { to: SiteTarget; children: ReactNode }) {
  if (useRunSite() || to.to === '/' || to.to === '/run' || to.to === '/contract') return <a href={href(to)} {...rest}>{children}</a>;
  if (to.to === '/docs/$slug') {
    return <Link to="/docs/$slug" params={{ slug: to.slug }} activeOptions={{ exact: true }} {...rest}>{children}</Link>;
  }
  return <Link to={to.to} activeOptions={{ exact: true }} {...rest}>{children}</Link>;
}
