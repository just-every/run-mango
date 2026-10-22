import { Link } from '@tanstack/react-router';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import { useResource } from '@/core/app/client/lib/use-resource';
import type { CommerceReport } from '../commerce-report';
import { performanceMoney } from '../campaign-performance-model';
import { AttributionPolicyNote } from './attribution-policy-note';
import './report-tables.css';

export function CommerceResults({ campaignId }: { campaignId: string }) {
  const formatDate = useDateFormatter();
  const { data, error, loading, reload } = useResource<{ attribution: CommerceReport; engagement: { observedClicks: number; automatedRequestsRetainedButExcluded: number } }>(`/api/campaigns/${campaignId}/results`);
  if (!data) return error ? <p role="alert">Attribution results unavailable. <button type="button" className="secondary-action" onClick={() => void reload()}>Try again</button></p> : <p role="status">Loading attribution results…</p>;
  const report = data.attribution, policy = report.attributionPolicy;
  return <section className="panel" aria-labelledby="commerce-results-title">
    <h2 id="commerce-results-title">Clicks and attributed conversions</h2>
    <p>{data.engagement.observedClicks} observed clicks · {data.engagement.automatedRequestsRetainedButExcluded} automated requests retained and excluded.</p>
    <p>The latest qualifying human tracked click wins once per conversion. Refunds and cancellations reverse attributed receipts. Attribution assigns recorded results and does not measure incremental lift.</p>
    <p>Current report policy<AttributionPolicyNote policy={policy} /></p>
    <div className="detail-actions"><Link className="text-link" to="/app/insights">Change attribution in Insights</Link><button type="button" className="secondary-action" disabled={loading} onClick={() => void reload()}>{loading ? 'Refreshing attribution…' : 'Refresh attribution'}</button></div>
    {error ? <p className="inline-error" role="alert">Attribution could not be refreshed. The last loaded report is shown.</p> : null}
    {report.revenueByCurrency.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label="Attributed conversions by currency">
      <table className="responsive-table report-table insights-table" aria-label="Attributed conversions by currency">
        <thead><tr><th scope="col">Currency</th><th scope="col">Conversions</th><th scope="col">Gross received</th><th scope="col">Reversed</th><th scope="col">Net attributed revenue</th></tr></thead>
        <tbody>{report.revenueByCurrency.map(row => <tr key={row.currency}>
          <th scope="row">{row.currency}</th><td data-label="Conversions">{row.orders}</td>
          <td data-label="Gross received"><div><span className="attribution-amount">{performanceMoney(String(row.grossAmountMinor), row.currency)}</span><AttributionPolicyNote policy={policy} /></div></td>
          <td data-label="Reversed"><div><span className="attribution-amount">{performanceMoney(String(row.reversedAmountMinor), row.currency)}</span><AttributionPolicyNote policy={policy} /></div></td>
          <td data-label="Net attributed revenue"><div><span className="attribution-amount">{performanceMoney(String(row.amountMinor), row.currency)}</span><AttributionPolicyNote policy={policy} /></div></td>
        </tr>)}</tbody>
      </table>
    </div> : <p>No qualifying conversion has been attributed for this metric and these windows.</p>}
    {report.events.map(event => <details key={String(event.orderSourceRecordId)}>
      <summary>{event.source} · {event.metricLabel} {event.providerEventId ?? event.providerOrderId ?? event.orderSourceRecordId} · {event.financialStatus ?? 'Historical attribution'}</summary>
      <p>Converted {formatDate(new Date(Number(event.purchasedAt)).toISOString())} · observed {formatDate(new Date(Number(event.observedAt)).toISOString())}</p>
      <AttributionPolicyNote policy={policy} channel={String(event.channel)} />
      {event.historicalEvidenceOnly ? <p>Historical attribution evidence; the original click is no longer recorded.</p> : null}
      <p>Source record: {event.orderSourceRecordId}. Winning click: {event.clickFactId}.</p>
      {event.cancelledAt ? <p>Cancelled {formatDate(new Date(Number(event.cancelledAt)).toISOString())}{event.cancellationReason ? ` · ${event.cancellationReason}` : ''}</p> : null}
      {event.returns.map(returned => <p key={returned.id}>Return {returned.id}: {returned.status}</p>)}
      {event.refunds.map(refund => <p key={String(refund.providerRefundId)}>
        Refund {refund.providerRefundId} ({refund.financialState}): {performanceMoney(String(refund.amountMinor), String(refund.currency))} · {formatDate(new Date(Number(refund.occurredAt)).toISOString())} · source {refund.sourceRecordId}
        <AttributionPolicyNote policy={policy} channel={String(event.channel)} />
      </p>)}
      {event.reversals.map(reversal => <p key={String(reversal.sourceRecordId)}>
        {reversal.kind === 'cancellation' ? 'Cancellation' : 'Refund'} {reversal.eventId}{reversal.kind === 'refund' ? `: ${performanceMoney(String(reversal.amountMinor), String(reversal.currency))}` : ''} · {formatDate(new Date(Number(reversal.occurredAt)).toISOString())} · source {reversal.sourceRecordId}
        <AttributionPolicyNote policy={policy} channel={String(event.channel)} />
      </p>)}
    </details>)}
  </section>;
}
