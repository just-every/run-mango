import { productConfig } from '@/ext/config';
import { MangoMark } from './brand/MangoMark';
import { sitePaths } from './links';
import { SiteLink } from './SiteLink';

/** The lockup: Mango's mark and the product name, linking home. */
export function Brand() {
  return (
    <SiteLink to={sitePaths.home} className="site-brand">
      <MangoMark className="site-brand-mark" />
      <span className="site-brand-name">{productConfig.productName}</span>
    </SiteLink>
  );
}
