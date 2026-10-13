import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { sitePaths, type LandingSectionId, type SiteTarget } from './links';

type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

/**
 * A client-side link to one of Mango's own public pages. Only the page itself counts as current (exact matching), so the
 * docs home link is not marked `aria-current="page"` on every docs page.
 */
export function SiteLink({ to, hash, children, ...rest }: AnchorProps & { to: SiteTarget; hash?: string; children: ReactNode }) {
  if (to.to === '/docs/$slug') {
    return <Link to="/docs/$slug" params={{ slug: to.slug }} hash={hash} activeOptions={{ exact: true }} {...rest}>{children}</Link>;
  }
  return <Link to={to.to} hash={hash} activeOptions={{ exact: true }} {...rest}>{children}</Link>;
}

/** A link to one of the landing's sections: a plain in-page anchor on the landing, a link home with the anchor elsewhere. */
export function SectionLink({ id, onLanding, children, ...rest }: AnchorProps & { id: LandingSectionId; onLanding: boolean; children: ReactNode }) {
  if (onLanding) return <a href={`#${id}`} {...rest}>{children}</a>;
  return <SiteLink to={sitePaths.home} hash={id} {...rest}>{children}</SiteLink>;
}
