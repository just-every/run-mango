import { createContext, useContext, type ReactNode } from 'react';
import { SiteFooter } from './SiteFooter';
import { SiteHeader, type SitePage } from './SiteHeader';
import { SkipLink } from './SkipLink';
import './styles';

const InsideFrame = createContext(false);

/**
 * The frame every Mango public page shares: the `.mango-site` root (palette, faces, resets), the skip link, the header,
 * the page's `<main id="main">` and the footer. `className` adds the page's own root class (`mango-landing`, ...).
 * The frame is drawn once: a PublicPage inside another one (the docs 404, which the router renders either inside the
 * docs layout or in its place) renders only its children.
 */
export function PublicPage({ current, className, children }: { current: SitePage; className?: string; children: ReactNode }) {
  if (useContext(InsideFrame)) return children;
  return (
    <InsideFrame.Provider value>
      <div className={className ? `mango-site ${className}` : 'mango-site'}>
        <SkipLink />
        <SiteHeader current={current} />
        <main id="main" tabIndex={-1}>{children}</main>
        <SiteFooter current={current} />
      </div>
    </InsideFrame.Provider>
  );
}
