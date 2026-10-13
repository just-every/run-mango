import type { ReactNode } from 'react';
import type { SiteTarget } from './links';
import { PenArrow } from './PenArrow';
import { SiteLink } from './SiteLink';

/** A call to action: `sun` is the primary (with its arrow), `line` the outlined secondary. */
export function ButtonLink({ to, tone, children }: { to: SiteTarget; tone: 'sun' | 'line'; children: ReactNode }) {
  return (
    <SiteLink to={to} className={`site-button site-button--${tone}`}>
      <span>{children}</span>
      {tone === 'sun' ? <PenArrow className="site-button-arrow" /> : null}
    </SiteLink>
  );
}
