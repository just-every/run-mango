import { Link } from '@tanstack/react-router';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import { titleCase } from '@/core/app/client/lib/format';
import type { SourceSync } from '@/core/app/client/lib/types';
import { StatusPill } from '@/core/app/client/ui/layout';

export function SourceFreshness({sources}: {sources: SourceSync[]}) {
  const formatDate = useDateFormatter();
  return <section className="source-status panel" aria-labelledby="source-status-title">
    <div className="section-heading">
      <h2 id="source-status-title">Store data</h2>
      <Link className="text-link" to="/app/store">Manage sync</Link>
    </div>
    <p className="muted-copy">Sources older than 24 hours, or with a later failed sync, block campaigns that use them. Only a completed sync refreshes the data.</p>
    <div className="source-status__grid">
      {sources.map(source => {
        const stale = !source.lastSuccessfulAt || Date.parse(source.lastSuccessfulAt) < Date.now() - 86400000;
        return <article key={source.id} aria-label={`${titleCase(source.sourceType)} source`}>
          <strong>{titleCase(source.sourceType)}</strong>
          <StatusPill value={source.lastError || stale ? 'needs-sync' : 'fresh'} />
          <span>{source.lastSuccessfulAt ? <>Last successful sync <time dateTime={source.lastSuccessfulAt}>{formatDate(source.lastSuccessfulAt)}</time></> : 'No successful sync'}</span>
          {source.lastError ? <small>{source.lastError}{source.updatedAt ? <> Updated <time dateTime={source.updatedAt}>{formatDate(source.updatedAt)}</time>.</> : null}</small> : null}
        </article>;
      })}
    </div>
  </section>;
}
