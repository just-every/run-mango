import type { Database } from '@/core/platform/db/client';
import { ulid } from '@/core/shared/ids';

export type ExternalCost = {
  key?: string; campaignId?: string; proposalId?: string; recipientStepId?: string;
  provider: string; operation: string; modelOrChannel: string;
  billableUnits: number | null; unitKind?: string;
  reportedCostMicros?: number | null; currency?: string | null;
  outcome?: string; occurredAt: Date;
};

/** Key identifies one external purchase, not each observation of it. Later reports enrich it. */
export async function recordExternalCost(database: Pick<Database, '$client'>, input: ExternalCost) {
  if (input.billableUnits != null && (!Number.isSafeInteger(input.billableUnits) || input.billableUnits < 0)) throw new Error('External cost billable units must be a non-negative safe integer.');
  if (input.reportedCostMicros != null && (!Number.isSafeInteger(input.reportedCostMicros) || input.reportedCostMicros < 0)) throw new Error('External reported cost must be a non-negative safe integer in micros.');
  if (input.currency != null && !/^[A-Z]{3}$/.test(input.currency)) throw new Error('External cost currency must be an ISO 4217 uppercase code.');
  if (input.reportedCostMicros != null && !input.currency) throw new Error('External reported cost requires an ISO 4217 currency.');
  const key = input.key ?? ulid(input.occurredAt.getTime());
  await database.$client.prepare(`INSERT INTO external_cost_facts
    (id,campaign_id,proposal_id,recipient_step_id,provider,operation,model_or_channel,billable_units,units_known,unit_kind,reported_cost_micros,currency,outcome,occurred_at,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
    provider=CASE WHEN excluded.outcome NOT IN ('prepared','unknown') THEN excluded.provider ELSE external_cost_facts.provider END,
    model_or_channel=CASE WHEN excluded.outcome NOT IN ('prepared','unknown') THEN excluded.model_or_channel ELSE external_cost_facts.model_or_channel END,
    campaign_id=COALESCE(excluded.campaign_id,external_cost_facts.campaign_id),
    proposal_id=COALESCE(excluded.proposal_id,external_cost_facts.proposal_id),
    billable_units=CASE WHEN excluded.units_known=1 THEN excluded.billable_units ELSE external_cost_facts.billable_units END,
    units_known=MAX(excluded.units_known,external_cost_facts.units_known),
    unit_kind=CASE WHEN excluded.units_known=1 THEN excluded.unit_kind ELSE external_cost_facts.unit_kind END,
    reported_cost_micros=COALESCE(excluded.reported_cost_micros,external_cost_facts.reported_cost_micros),
    currency=CASE WHEN excluded.reported_cost_micros IS NOT NULL THEN excluded.currency ELSE COALESCE(external_cost_facts.currency,excluded.currency) END,
    outcome=CASE WHEN excluded.outcome='prepared' AND external_cost_facts.outcome<>'not-sent' THEN external_cost_facts.outcome WHEN excluded.outcome='unknown' AND external_cost_facts.outcome NOT IN ('prepared','prepared-shared','unknown','not-sent') THEN external_cost_facts.outcome ELSE excluded.outcome END`)
    .bind(key,input.campaignId??null,input.proposalId??null,input.recipientStepId??null,input.provider,input.operation,input.modelOrChannel,
      input.billableUnits??0,input.billableUnits==null?0:1,input.unitKind??'provider units',input.reportedCostMicros??null,input.currency??null,input.outcome??'reported',input.occurredAt.getTime(),input.occurredAt.getTime()).run();
  return key;
}
