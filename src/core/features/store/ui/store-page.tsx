import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import { capabilityName, capabilityNextStep, plainServiceText, providerName } from '@/core/app/client/ui/product-copy';
import { useEffect, useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import { titleCase } from '@/core/app/client/lib/format';
import type { Provider, SourceSync } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { LoadState, StatusPill } from '@/core/app/client/ui/layout';
import { StoreOperations, type OperationRun } from './store-operations';

type SyncRun = {id: string; provider: string; sourceType: string; operation: 'sync' | OperationRun['operation']; state: string; pages: number; records: number; lastError: string | null; updatedAt: string; completedAt: string | null};
type StoreStatus = { channels?: Array<{id:string; shop:string; coverage_start:number; retention_start:number; healthy_at:number; last_observation_at:number|null; last_error:string|null}>; providers: Provider[]; sourceSyncs: SourceSync[]; sourceCapabilities: Array<{sourceType: string; available: boolean; detail: string}>; syncRuns: SyncRun[] };

export function StorePage() {
  const formatDate = useDateFormatter();
  const { data, error, loading, reload } = useResource<StoreStatus>('/api/store');
  const [busy, setBusy] = useState<string>();
  const [noticeKind, setNoticeKind] = useState<'success'|'error'>('error');
  const [notice, setNotice] = useState<string>();
  useEffect(() => {
    if (!data?.syncRuns.some(run => run.state === 'queued' || run.state === 'running')) return;
    const timer = window.setInterval(() => {void reload()}, 2000);
    return () => window.clearInterval(timer);
  }, [data?.syncRuns, reload]);
  const synchronize = async (sourceType: string, runId?: string) => {
    setBusy(sourceType); setNoticeKind('error');
    try {
    const response = await requestJson<{status?: string; error?: string; detail?: string}>('/api/store/sync', {method: 'POST', body: JSON.stringify({sourceType, runId})});
    setNoticeKind(response.status === 202 ? 'success' : 'error');
    setNotice(response.status === 202 ? 'Sync queued. Progress updates here.' : response.data.detail ?? response.data.error ?? response.data.status ?? 'Sync could not be queued.');
    await reload();
    } catch {setNotice('The sync request could not be confirmed. Refresh status before retrying.')}
    finally {setBusy(undefined)}
  };
  if (loading && !data) return <LoadState />;
  if (!data) return <LoadState error={error} />;
  const canRun = (sourceType: string) => data.sourceCapabilities.find(item => item.sourceType === sourceType)?.available === true;
  const runnable = data.sourceSyncs.filter(source => canRun(source.sourceType));
  const off = data.sourceSyncs.filter(source => !canRun(source.sourceType)).map(source => titleCase(source.sourceType).toLowerCase());
  return (
    <div className="page-flow store-page">
      <header className="page-head">
        <div className="page-head__text">
          <h1>Store</h1>
        </div>
      </header>
      <section className="panel store-sync" aria-labelledby="source-sync-title">
        <div className="section-heading">
          <div><p className="eyebrow">Source freshness</p><h2 id="source-sync-title">Imported commerce records</h2></div>
          <button className="secondary-action" type="button" onClick={() => void reload()}>Refresh sync status</button>
        </div>
        {error ? <p className="inline-error" role="alert">{error} Displayed status may be out of date.</p> : null}
        {notice ? <p className={noticeKind === 'success' ? 'action-notice' : 'inline-error'} role={noticeKind === 'success' ? 'status' : 'alert'}>{plainServiceText(notice)}</p> : null}
        {runnable.length ? (
          <div className="source-status__grid store-sources">
            {runnable.map(source => {
              const run = data.syncRuns.find(item => item.sourceType === source.sourceType && item.operation === 'sync');
              const stale = !source.lastSuccessfulAt || Date.parse(source.lastSuccessfulAt) < Date.now() - 86400000;
              const resumable = run && ['queued', 'running', 'failed'].includes(run.state);
              return <article key={source.id} className="store-source" aria-label={`${titleCase(source.sourceType)} sync`}>
                <div className="store-source__head">
                  <strong>{titleCase(source.sourceType)}</strong>
                  <span role="status"><StatusPill value={source.lastError || stale ? 'needs-sync' : 'fresh'} /></span>
                </div>
                <p className="store-source__meta">{source.lastSuccessfulAt ? `Last completed ${formatDate(source.lastSuccessfulAt)}` : 'No successful sync'}</p>
                {source.lastError && source.lastError !== run?.lastError ? <small className="store-source__error">{source.lastError}</small> : null}
                {run ? <div className="store-source__run">
                  <p className="store-source__state">Latest run: <StatusPill value={run.state} /></p>
                  <p>{run.pages} {run.pages === 1 ? 'page' : 'pages'} · {run.records} {run.records === 1 ? 'record' : 'records'}</p>
                  <small>{providerName(run.provider)}</small>
                  {run.lastError ? <p className="store-source__error">{plainServiceText(run.lastError)}</p> : null}
                </div> : null}
                <div className="store-source__actions">
                  <button className="secondary-action" type="button" disabled={busy === source.sourceType}
                    onClick={() => void synchronize(source.sourceType, resumable ? run.id : undefined)}>
                    {busy === source.sourceType ? 'Requesting…' : resumable ? 'Resume sync' : 'Sync now'}
                  </button>
                  {run?.state === 'failed' && run.pages > 0 ? <button className="secondary-action" type="button" disabled={busy === source.sourceType} onClick={() => void synchronize(source.sourceType)}>Restart from first page</button> : null}
                </div>
              </article>;
            })}
          </div>
        ) : <p className="notice-note" role="status">No store has been connected yet.</p>}
        {off.length ? <p className="muted-copy">Not available in this setup: {off.join(', ')}. <a href="/docs/going-live#turn-on-cart-and-browsing-events">How to turn on</a></p> : null}
      </section>
      <StoreOperations operations={data.syncRuns.filter((run): run is SyncRun & OperationRun => run.operation !== 'sync')} />
      {data.channels?.map(channel => <section className="panel" key={channel.id}>
        <h2>Observed store activity</h2>
        <p>{channel.shop} · {channel.last_error || channel.healthy_at < Date.now()-3600000 ? 'Connection needs attention' : 'Installation verified'}</p>
        <p>Accepted observations retained since {formatDate(new Date(channel.retention_start).toISOString())}. Last connection check {formatDate(new Date(channel.healthy_at).toISOString())}.</p>
        <p>{channel.last_observation_at ? `Last observation ${formatDate(new Date(channel.last_observation_at).toISOString())}` : 'No observations received.'}</p>
        {channel.last_error ? <p className="inline-error">{channel.last_error}</p> : null}
        <p>These are observed events. Missing browser or webhook events cannot prove that someone did not browse, abandoned a cart, or did not purchase. Anonymous observations remain unlinked.</p>
      </section>)}
      <ProviderStatus providers={data.providers} />
    </div>
  );
}

export function ProviderStatus({ providers }: { providers: Provider[] }) {
  return (
    <section className="panel provider-status" aria-labelledby="provider-status-title">
      <div className="section-heading"><div><p className="eyebrow">Capabilities</p><h2 id="provider-status-title">Sending and service connections</h2></div></div>
      {providers.length ? (
        <div className="provider-status__rows">
          {providers.map((provider) => (
            <article key={provider.id}>
              <div><strong>{capabilityName(provider.adapter)}</strong><p>{plainServiceText(provider.detail)}</p>{!provider.configured ? <p className="provider-status__next">{capabilityNextStep(provider.adapter)}</p> : null}</div>
              <StatusPill value={provider.status} />
            </article>
          ))}
        </div>
      ) : (
        <p className="notice-warning">No provider capabilities have been declared by the server. Sending and proposal generation are unavailable.</p>
      )}
    </section>
  );
}
