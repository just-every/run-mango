import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import { titleCase } from '@/core/app/client/lib/format';
import { plainServiceText } from '@/core/app/client/ui/product-copy';
import { StatusPill } from '@/core/app/client/ui/layout';

export type OperationRun = {id: string; provider: string; sourceType: string; operation: 'webhook' | 'generation'; state: string; lastError: string | null; updatedAt: string};
const labels = {webhook: 'Webhook ingestion', generation: 'Suggestion generation'} as const;

/** Failed webhook ingestion and generation keep the adapter's error visible. */
export function StoreOperations({operations}: {operations: OperationRun[]}) {
  const formatDate = useDateFormatter();
  if (!operations.length) return null;
  return <section className="panel store-operations" aria-labelledby="store-operations-title">
    <div className="section-heading"><div><p className="eyebrow">Adapter failures</p><h2 id="store-operations-title">Failed operations</h2></div></div>
    <p className="muted-copy">A recovered webhook was ingested once when the provider retried it. Nothing is sent as a side effect.</p>
    <div className="source-status__grid store-sources">
      {operations.map(run => <article key={run.id} className="store-source" aria-label={`${labels[run.operation]}: ${titleCase(run.sourceType)}`}>
        <div className="store-source__head"><strong>{labels[run.operation]}</strong><span><StatusPill value={run.state === 'completed' ? 'recovered' : run.state} /></span></div>
        <p className="store-source__meta">{titleCase(run.sourceType)} · {plainServiceText(run.provider)} · <time dateTime={run.updatedAt}>{formatDate(run.updatedAt)}</time></p>
        {run.lastError ? <p className="store-source__error">{plainServiceText(run.lastError)}</p> : null}
      </article>)}
    </div>
  </section>;
}
