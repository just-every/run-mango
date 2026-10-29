import { productConfig } from '@/ext/config';
import { Brand } from './Brand';
import { siteCopy } from './copy';
import { OperatorLink } from './OperatorLink';
import { creditUrl, sitePaths } from './links';
import { SiteLink } from './SiteLink';
import { useRunSite } from './run-site';

/**
 * The shared footer: the lockup, Docs and operator sign-in (the run site's Contract instead), never a link to a section of
 * the page being viewed, then the deployment owner's name and
 * one-line summary. The credit shows only while the owner keeps `showPoweredByCredit` on. The run site has no sign-in.
 */
export function SiteFooter() {
  const { footer } = siteCopy;
  const runSite = useRunSite();
  return (
    <footer className="site-footer">
      <div className="site-footer-row">
        <Brand />
        <nav aria-label={footer.label}>
          <ul className="site-footer-links">
            <li><SiteLink to={sitePaths.docs}>{footer.docs}</SiteLink></li>
            {runSite ? <li><SiteLink to={sitePaths.contract}>{footer.contract}</SiteLink></li> : <li><OperatorLink signIn={footer.signIn} openApp={footer.openApp} /></li>}
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
