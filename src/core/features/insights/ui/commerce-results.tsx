import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import type {CommerceReport} from '../commerce-report';
import {useResource} from '@/core/app/client/lib/use-resource';
function money(value:number|string,currency:string) {
  const exponent=new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits!;
  const digits=String(value).padStart(exponent+1,'0');
  return `${currency} ${exponent?`${digits.slice(0,-exponent)}.${digits.slice(-exponent)}`:digits}`;
}
export function CommerceResults({campaignId}:{campaignId:string}) {
  const formatDate = useDateFormatter();
  const {data,error}=useResource<{attribution:CommerceReport;engagement:{observedClicks:number;automatedRequestsRetainedButExcluded:number}}>(`/api/campaigns/${campaignId}/results`);
  if(!data)return error?<p role="status">Commerce results unavailable: {error}</p>:null;
  const report=data.attribution;
  return <section className="panel" aria-labelledby="commerce-results-title">
    <h2 id="commerce-results-title">Clicks and store orders</h2>
    <p>{data.engagement.observedClicks} observed clicks · {data.engagement.automatedRequestsRetainedButExcluded} automated requests retained and excluded.</p>
    <p>The latest human tracked click in the seven days before purchase wins once per order. These are observed Shopify events, separate from forecasts. Refunds and cancellations reverse attributed receipts.</p>
    {report.revenueByCurrency.length?<div className="table-scroll" tabIndex={0} role="region" aria-label="Attributed store orders by currency"><table className="responsive-table insights-table" aria-label="Attributed store orders by currency"><thead><tr><th scope="col">Currency</th><th scope="col">Orders</th><th scope="col">Gross received</th><th scope="col">Reversed</th><th scope="col">Net</th></tr></thead><tbody>{report.revenueByCurrency.map(row=><tr key={row.currency}><th scope="row">{row.currency}</th><td data-label="Orders">{row.orders}</td><td data-label="Gross received">{money(row.grossAmountMinor,row.currency)}</td><td data-label="Reversed">{money(row.reversedAmountMinor,row.currency)}</td><td data-label="Net">{money(row.amountMinor,row.currency)}</td></tr>)}</tbody></table></div>:<p>No qualifying store order has been attributed.</p>}
    {report.events.map(event=><details key={String(event.orderSourceRecordId)}><summary>{event.source} order {event.providerOrderId??event.orderSourceRecordId} · {event.financialStatus??'Historical attribution'}</summary>
      <p>Purchased {formatDate(new Date(Number(event.purchasedAt)).toISOString())} · observed {formatDate(new Date(Number(event.observedAt)).toISOString())}</p>
      <p>Source record: {event.orderSourceRecordId}. Winning click: {event.clickFactId}.</p>
      {event.cancelledAt?<p>Cancelled {formatDate(new Date(Number(event.cancelledAt)).toISOString())}{event.cancellationReason?` · ${event.cancellationReason}`:''}</p>:null}
      {event.returns.map(returned=><p key={returned.id}>Return {returned.id}: {returned.status}</p>)}
      {event.refunds.map(refund=><p key={String(refund.providerRefundId)}>Refund {refund.providerRefundId} ({refund.financialState}): {money(Number(refund.amountMinor),String(refund.currency))} · {formatDate(new Date(Number(refund.occurredAt)).toISOString())} · source {refund.sourceRecordId}</p>)}
    </details>)}
  </section>;
}
