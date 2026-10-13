import { productConfig } from '@/ext/config';
import { Brand } from './Brand';
import { siteCopy } from './copy';
import { creditUrl, landingSectionIds, sitePaths } from './links';
import type { SitePage } from './SiteHeader';
import { SectionLink, SiteLink } from './SiteLink';

/**
 * The shared footer: the lockup, the landing's sections, Docs and operator sign-in, then the deployment owner's name and
 * one-line summary. The credit shows only while the owner keeps `showPoweredByCredit` on.
 */
export function SiteFooter({ current }: { current: SitePage }) {
  const { footer, sections } = siteCopy;
  return (
    <footer className="site-footer">
      <div className="site-footer-row">
        <Brand />
        <nav aria-label={footer.label}>
          <ul className="site-footer-links">
            {landingSectionIds.map((id) => (
              <li key={id}><SectionLink id={id} onLanding={current === 'home'}>{sections[id]}</SectionLink></li>
            ))}
            <li><SiteLink to={sitePaths.docs}>{footer.docs}</SiteLink></li>
            <li><SiteLink to={sitePaths.signIn}>{footer.signIn}</SiteLink></li>
          </ul>
        </nav>
      </div>
      <div className="site-footer-meta">
        <p className="site-footer-owner">
          <strong>{productConfig.organizationName}</strong>
          <span className="site-footer-dash"> — </span>
          <span>{productConfig.landingSummary}</span>
        </p>
        {productConfig.showPoweredByCredit ? (
          <p className="site-footer-credit">{footer.poweredBy} {productConfig.productName} · <a href={creditUrl}>{footer.creditLabel}</a></p>
        ) : null}
      </div>
    </footer>
  );
}
