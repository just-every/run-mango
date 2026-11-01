import { Link } from '@tanstack/react-router';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import { titleCase } from '@/core/app/client/lib/format';
import type { SourceSync } from '@/core/app/client/lib/types';
import { StatusPill } from '@/core/app/client/ui/layout';
import { Can } from '@/core/features/auth/ui/permissions';

export type SourceCapabilities = Array<{ sourceType: string; available: boolean }>;

export function SourceFreshness({sources, capabilities = []}: {sources: SourceSync[]; capabilities?: SourceCapabilities}) {
  const formatDate = useDateFormatter();
  // A type with no capability row is treated as available: the Desk never claims what was not recorded.
  const unavailable = new Set(capabilities.filter(capability => !capability.available).map(capability => capability.sourceType));
  return <section className="source-status panel" aria-labelledby="source-status-title">
    <div className="section-heading">
      <h2 id="source-status-title">Store data</h2>
      <Can permission="integration.manage"><Link className="text-link" to="/app/store">Manage sync</Link></Can>
    </div>
    <div className="source-status__rows">
      {sources.map(source => {
        const stale = !source.lastSuccessfulAt || Date.parse(source.lastSuccessfulAt) < Date.now() - 86400000;
        const missing = unavailable.has(source.sourceType);
        return <article key={source.id} className={missing ? 'source-status__row--unavailable' : undefined} aria-label={`${titleCase(source.sourceType)} source`}>
          <strong>{titleCase(source.sourceType)}</strong>
          {missing ? <span className="source-status__unavailable">Not available in this setup</span> : <StatusPill value={source.lastError || stale ? 'needs-sync' : 'fresh'} />}
          <span>{source.lastSuccessfulAt ? <>Last successful sync <time dateTime={source.lastSuccessfulAt}>{formatDate(source.lastSuccessfulAt)}</time></> : 'No successful sync'}</span>
          {source.lastError ? <small>{source.lastError}{source.updatedAt ? <> Updated <time dateTime={source.updatedAt}>{formatDate(source.updatedAt)}</time>.</> : null}</small> : null}
        </article>;
      })}
    </div>
    {unavailable.has('cart') || unavailable.has('browsing-event')
      ? <p className="source-status__note"><a className="text-link" href="/docs/going-live#turn-on-cart-and-browsing-events">How to turn on cart and browsing events</a></p> : null}
  </section>;
}
