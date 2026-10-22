import type {Database} from '@/core/platform/db/client';
import { attributionPolicy } from './attribution-policy';
import { attributionProjection } from './attribution-projection';
function exact(value: bigint): number | string {return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();}
type Row = Record<string, string | number | null>;
export async function commerceReport(database: Database, campaignId: string) {
  const policy = await attributionPolicy(database.$client), projection = attributionProjection(policy);
  const query = (sql: string) => database.$client.prepare(`WITH ${projection.sql} ${sql}`).bind(...projection.bindings, campaignId);
  const [facts, refunds, reversals] = await Promise.all([
    query(`SELECT a.*,r.channel,o.financial_status,o.cancelled_at,o.cancellation_reason,o.purchased_at,
      s.payload source_payload,s.updated_at source_observed_at
      FROM attribution_projection a LEFT JOIN commerce_orders o ON o.source_record_id=a.order_source_record_id
      LEFT JOIN source_records s ON s.id=a.order_source_record_id LEFT JOIN recipient_steps r ON r.id=a.recipient_step_id
      WHERE a.campaign_id=? ORDER BY a.attributed_at,a.order_source_record_id`).all<Row>(),
    query(`SELECT f.* FROM commerce_refunds f JOIN commerce_orders o ON o.provider_order_id=f.provider_order_id
      JOIN attribution_projection a ON a.order_source_record_id=o.source_record_id WHERE a.campaign_id=? ORDER BY f.occurred_at,f.provider_refund_id`).all<Row>(),
    query(`SELECT s.id,s.occurred_at,json_extract(s.payload,'$.conversionSourceRecordId') conversion_id,
        json_extract(s.payload,'$.eventId') event_id,json_extract(s.payload,'$.kind') kind,
        json_extract(s.payload,'$.valueMinor') amount_minor,json_extract(s.payload,'$.currency') currency
      FROM source_records s JOIN attribution_projection a ON a.order_source_record_id=json_extract(s.payload,'$.conversionSourceRecordId')
      WHERE a.campaign_id=? AND s.source_type='conversion-event' AND json_extract(s.payload,'$.schema')='native-conversion-v1'
        AND json_extract(s.payload,'$.kind') IN ('refund','cancellation') ORDER BY s.occurred_at,s.id`).all<Row>(),
  ]);
  const groups = new Map<string, {orders: number; gross: bigint; reversed: bigint}>();
  for (const row of facts.results) {
    const currency = String(row.currency), group = groups.get(currency) ?? {orders: 0, gross: 0n, reversed: 0n};
    group.orders++; group.gross += BigInt(row.gross_amount_minor!); group.reversed += BigInt(row.refund_amount_minor!); groups.set(currency, group);
  }
  return {method: 'most-recent-non-automated-click-within-channel-window', attributionPolicy: policy,
    orders: facts.results.length, conversions: facts.results.length, status: policy.metric === 'placed-order' ? 'observed-store-events' : 'observed-custom-events',
    revenueByCurrency: [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([currency, g]) => ({currency, orders: g.orders,
      grossAmountMinor: exact(g.gross), reversedAmountMinor: exact(g.reversed), amountMinor: exact(g.gross - g.reversed)})),
    events: facts.results.map(row => {
      const payload = row.source_payload ? JSON.parse(String(row.source_payload)) as {schema?: string; eventId?: string; returns?: Array<{id: string; status: string}>} : null;
      const custom = payload?.schema === 'native-conversion-v1';
      const changes = reversals.results.filter(r => r.conversion_id === row.order_source_record_id);
      const cancellation = changes.find(r => r.kind === 'cancellation');
      return {orderSourceRecordId: row.order_source_record_id, providerOrderId: row.provider_order_id, providerEventId: custom ? payload?.eventId : null,
        source: custom ? 'Native integration' : row.provider_order_id ? 'Shopify' : 'Historical attribution',
        financialStatus: custom ? cancellation ? 'CANCELLED' : Number(row.refund_amount_minor) >= Number(row.gross_amount_minor) && Number(row.gross_amount_minor) > 0 ? 'REFUNDED' : Number(row.refund_amount_minor) > 0 ? 'PARTIALLY_REFUNDED' : 'CONVERTED' : row.financial_status,
        purchasedAt: row.purchased_at ?? row.attributed_at, cancelledAt: row.cancelled_at ?? cancellation?.occurred_at ?? null,
        cancellationReason: row.cancellation_reason, clickFactId: row.click_fact_id, recipientStepId: row.recipient_step_id,
        metric: policy.metric, metricLabel: policy.metricLabel, channel: row.channel, clickWindowDays: Number(row.attribution_window_days),
        historicalEvidenceOnly: Boolean(row.historical_evidence_only), currency: row.currency, grossAmountMinor: row.gross_amount_minor,
        reversedAmountMinor: row.refund_amount_minor, observedAt: row.source_observed_at ?? row.updated_at, returns: payload?.returns ?? [],
        reversals: changes.map(r => ({sourceRecordId: r.id, eventId: r.event_id, kind: r.kind, amountMinor: r.amount_minor, currency: r.currency, occurredAt: r.occurred_at})),
        refunds: refunds.results.filter(f => f.provider_order_id === row.provider_order_id).map(f => ({providerRefundId: f.provider_refund_id,
          sourceRecordId: f.source_record_id, amountMinor: f.amount_minor, originalAmountMinor: f.original_amount_minor,
          financialState: f.financial_state, currency: f.currency, occurredAt: f.occurred_at})),
      };
    })};
}
export type CommerceReport = Awaited<ReturnType<typeof commerceReport>>;
