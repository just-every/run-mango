import type {Database} from '@/core/platform/db/client';
function exact(value:bigint):number|string {return value<=BigInt(Number.MAX_SAFE_INTEGER)?Number(value):value.toString();}
export async function commerceReport(database:Database,campaignId:string) {
  const facts=await database.$client.prepare(`SELECT a.*,o.provider_order_id,o.financial_status,o.cancelled_at,o.cancellation_reason,o.purchased_at,s.payload source_payload,s.updated_at source_observed_at
    FROM attribution_facts a LEFT JOIN commerce_orders o ON o.source_record_id=a.order_source_record_id
    LEFT JOIN source_records s ON s.id=a.order_source_record_id
    WHERE a.campaign_id=? ORDER BY a.attributed_at,a.order_source_record_id`).bind(campaignId).all<Record<string,string|number|null>>();
  const groups=new Map<string,{orders:number;gross:bigint;reversed:bigint}>();
  for(const row of facts.results) {
    const currency=String(row.currency),group=groups.get(currency)??{orders:0,gross:0n,reversed:0n};
    group.orders++;group.gross+=BigInt(row.gross_amount_minor!);group.reversed+=BigInt(row.refund_amount_minor!);groups.set(currency,group);
  }
  const refunds=await database.$client.prepare(`SELECT f.* FROM commerce_refunds f JOIN commerce_orders o ON o.provider_order_id=f.provider_order_id JOIN attribution_facts a ON a.order_source_record_id=o.source_record_id WHERE a.campaign_id=? ORDER BY f.occurred_at,f.provider_refund_id`).bind(campaignId).all<Record<string,string|number|null>>();
  return {method:'most-recent-non-automated-click-within-seven-days',orders:facts.results.length,status:'observed-store-events',
    revenueByCurrency:[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([currency,g])=>({currency,orders:g.orders,grossAmountMinor:exact(g.gross),reversedAmountMinor:exact(g.reversed),amountMinor:exact(g.gross-g.reversed)})),
    events:facts.results.map(row=>({orderSourceRecordId:row.order_source_record_id,providerOrderId:row.provider_order_id,source:row.provider_order_id?'Shopify':'Historical attribution',financialStatus:row.financial_status,purchasedAt:row.purchased_at??row.attributed_at,cancelledAt:row.cancelled_at,cancellationReason:row.cancellation_reason,clickFactId:row.click_fact_id,recipientStepId:row.recipient_step_id,currency:row.currency,grossAmountMinor:row.gross_amount_minor,reversedAmountMinor:row.refund_amount_minor,observedAt:row.source_observed_at??row.updated_at,
      returns:row.source_payload ? (JSON.parse(String(row.source_payload)) as {returns?:Array<{id:string;status:string}>}).returns??[] : [],
      refunds:refunds.results.filter(f=>f.provider_order_id===row.provider_order_id).map(f=>({providerRefundId:f.provider_refund_id,sourceRecordId:f.source_record_id,amountMinor:f.amount_minor,originalAmountMinor:f.original_amount_minor,financialState:f.financial_state,currency:f.currency,occurredAt:f.occurred_at}))}))};
}
export type CommerceReport=Awaited<ReturnType<typeof commerceReport>>;
