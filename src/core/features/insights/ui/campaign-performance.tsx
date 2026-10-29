import './report-tables.css';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useResource } from '@/core/app/client/lib/use-resource';
import { CampaignEngagement } from './campaign-engagement';
import { AttributionPolicyNote } from './attribution-policy-note';
import { performanceRate, performanceRevenue, type CampaignPerformanceFilter, type CampaignPerformanceReport, type CampaignPerformanceSort } from '../campaign-performance-model';

const columns: { key: CampaignPerformanceSort; label: string }[] = [
  { key: 'name', label: 'Campaign / revision' }, { key: 'channel', label: 'Channel' }, { key: 'topic', label: 'Topic' },
  { key: 'scheduledAt', label: 'Scheduled (UTC)' }, { key: 'recipients', label: 'Recipients' }, { key: 'delivered', label: 'Delivered' },
  { key: 'totalClicks', label: 'Human clicks' }, { key: 'uniqueClicks', label: 'Unique clicks' }, { key: 'clickRate', label: 'Click rate' },
  { key: 'unsubscribes', label: 'Unsubscribes' }, { key: 'complaints', label: 'Complaints' }, { key: 'conversions', label: 'Conversions' },
  { key: 'netRevenue', label: 'Net revenue' }, { key: 'revenuePerRecipient', label: 'Revenue / recipient' },
];

export function CampaignPerformance({ settingsVersion }: { settingsVersion: number }) {
  const [filter, setFilter] = useState<CampaignPerformanceFilter>({ sort: 'scheduledAt', direction: 'desc' });
  const [detail, setDetail] = useState<{ campaignId: string; revisionId: string }>();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) if (value) query.set(key, value);
  const url = `/api/insights/campaign-performance?${query}`;
  const { data, error, loading, reload } = useResource<CampaignPerformanceReport>(url);
  const refreshedVersion = useRef(settingsVersion);
  useEffect(() => {
    if (refreshedVersion.current === settingsVersion) return;
    refreshedVersion.current = settingsVersion;
    void reload();
  }, [settingsVersion, reload]);
  const update = (value: Partial<CampaignPerformanceFilter>) => { setFilter(current => ({ ...current, ...value })); setDetail(undefined); };
  const visibleColumns = [...columns, ...(data?.openEstimatesEnabled ? [{ key: 'openRateEstimate' as const, label: 'Open-rate estimate' }] : [])];
  return <>
    <section className="panel data-table-panel" aria-labelledby="campaign-performance-title">
      <h2 id="campaign-performance-title">Campaign performance</h2>
      <p>One row for each saved version and channel. Revenue is attributed to the campaign, minus refunds and cancellations, in each currency.</p>
      <div className="draft-fields">
        <label>Performance channel<select aria-label="Performance channel" value={filter.channel ?? ''} onChange={event => update({ channel: event.target.value as CampaignPerformanceFilter['channel'] || undefined })}><option value="">All channels</option><option value="email">Email</option><option value="sms">SMS</option></select></label>
        <label>Performance topic<select aria-label="Performance topic" value={filter.topic ?? ''} onChange={event => update({ topic: event.target.value || undefined })}><option value="">All topics</option>{(data?.topics ?? (filter.topic ? [filter.topic] : [])).map(topic => <option key={topic} value={topic}>{topic}</option>)}</select></label>
        <label>Scheduled from (UTC)<input type="date" aria-label="Scheduled from (UTC)" value={filter.from ?? ''} max={filter.to} onChange={event => update({ from: event.target.value || undefined })}/></label>
        <label>Scheduled through (UTC)<input type="date" aria-label="Scheduled through (UTC)" value={filter.to ?? ''} min={filter.from} onChange={event => update({ to: event.target.value || undefined })}/></label>
        <label>Revenue sort currency<select aria-label="Revenue sort currency" value={filter.currency ?? ''} onChange={event => update({ currency: event.target.value || undefined, ...(!event.target.value && ['netRevenue', 'revenuePerRecipient'].includes(filter.sort ?? '') ? { sort: 'scheduledAt' as const } : {}) })}><option value="">Choose a recorded currency</option>{[...new Set([...(data?.currencies ?? []), ...(filter.currency ? [filter.currency] : [])])].map(currency => <option key={currency}>{currency}</option>)}</select></label>
        <label>Sort campaign performance<select aria-label="Sort campaign performance" value={filter.sort} onChange={event=>update({sort:event.target.value as CampaignPerformanceSort})}>{visibleColumns.map(column=><option key={column.key} value={column.key} disabled={['netRevenue','revenuePerRecipient'].includes(column.key)&&!filter.currency}>{column.label}</option>)}</select></label>
        <label>Sort direction<select aria-label="Sort direction" value={filter.direction} onChange={event=>update({direction:event.target.value as 'asc'|'desc'})}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
      </div>
      {error ? <><p role="alert">Campaign performance could not be loaded. Check the filters and refresh.</p><button type="button" className="secondary-action" onClick={() => void reload()}>Refresh performance</button></> : loading || !data ? <p role="status">Loading campaign performance…</p> : <>
        <div className="detail-actions"><a className="text-link" href={`${url}&format=csv`}>Export campaign performance CSV</a><button type="button" className="secondary-action" onClick={() => void reload()}>Refresh performance</button></div>
        <details><summary>How performance is counted</summary><p>{data.note}</p></details>
        {data.rows.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label="Campaign performance records">
          <table className="responsive-table report-table" aria-label="Campaign performance"><thead><tr>
            {visibleColumns.map(column => <th scope="col" key={column.key} aria-sort={filter.sort === column.key ? filter.direction === 'asc' ? 'ascending' : 'descending' : 'none'}>{column.label}{filter.sort === column.key ? filter.direction === 'asc' ? ' ↑' : ' ↓' : ''}</th>)}
            <th scope="col">Links</th>
          </tr></thead><tbody>{data.rows.map(row => <tr key={`${row.revisionId}:${row.channel}`}>
            <th scope="row"><Link to="/app/campaigns/$id" params={{ id: row.campaignId }}>{row.name}</Link><small style={{ display: 'block' }}>Revision {row.revision} · {row.state}{row.activeRevision ? ' · current' : ' · historical'}</small></th>
            <td data-label="Channel">{row.channel}</td><td data-label="Topic">{row.topic}</td>
            <td data-label="Scheduled (UTC)"><time dateTime={row.scheduledAt}>{row.scheduledAt.slice(0, 10)}</time>{row.lastScheduledAt !== row.scheduledAt ? <> – <time dateTime={row.lastScheduledAt}>{row.lastScheduledAt.slice(0, 10)}</time></> : null}</td>
            <td data-label="Recipients">{row.recipients}</td><td data-label="Delivered">{row.delivered}</td><td data-label="Human clicks">{row.totalClicks}</td><td data-label="Unique clicks">{row.uniqueClicks}</td><td data-label="Click rate">{performanceRate(row.clickRate)}</td>
            <td data-label="Unsubscribes">{row.unsubscribes}</td><td data-label="Complaints">{row.complaints}</td><td data-label="Conversions">{row.conversions}</td>
            <td data-label="Net revenue"><div><span className="attribution-amount">{performanceRevenue(row)}</span><AttributionPolicyNote policy={data.attributionPolicy} channel={row.channel} /></div></td>
            <td data-label="Revenue / recipient"><div><span className="attribution-amount">{performanceRevenue(row, true)}</span><AttributionPolicyNote policy={data.attributionPolicy} channel={row.channel} /></div></td>
            {data.openEstimatesEnabled ? <td data-label="Open-rate estimate">{performanceRate(row.openRateEstimate ?? null)}</td> : null}
            <td data-label="Links"><button type="button" className="text-link" aria-expanded={detail?.revisionId === row.revisionId} onClick={() => setDetail({ campaignId: row.campaignId, revisionId: row.revisionId })}>View links · revision {row.revision}</button></td>
          </tr>)}</tbody></table>
        </div> : <p>No campaign steps match these filters.</p>}
        <p>Flow and flow-message performance is not available.</p>
      </>}
    </section>
    {detail ? <div><div className="detail-actions"><button type="button" className="secondary-action" onClick={() => setDetail(undefined)}>Close link details</button></div><p>Link details include all channels and scheduled dates for this exact saved revision.</p><CampaignEngagement key={detail.revisionId} campaignId={detail.campaignId} revisionId={detail.revisionId}/></div> : null}
  </>;
}
