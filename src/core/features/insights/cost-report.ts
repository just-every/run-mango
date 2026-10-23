import type { Database } from '@/core/platform/db/client';

export type CostGroup = {
  campaignId: string | null; day: string | null; provider: string; operation: string; modelOrChannel: string;
  unitKind: string; billableUnits: number | null; unknownUsageFacts: number; unpricedFacts: number; uncertainFacts: number; preparedFacts: number;
  facts: number; reportedCostMicros: number | null; currency: string | null;
};
export type CostReport = { dayBoundary: 'UTC'; byCampaign: CostGroup[]; byDay: CostGroup[] };

export type CostPeriod = {from:number;until:number};

export async function costGroups(database: Database, group: 'campaign' | 'day', campaignId?: string, period?:CostPeriod): Promise<CostGroup[]> {
  const rows = await database.$client.prepare(`SELECT ${group === 'campaign' ? 'campaign_id' : 'NULL'} campaign_id,
    ${group === 'day' ? "strftime('%Y-%m-%d',occurred_at/1000,'unixepoch')" : 'NULL'} day,
    provider,operation,model_or_channel,unit_kind,currency,COUNT(*) facts,
    SUM(CASE WHEN units_known=1 THEN billable_units END) billable_units,
    SUM(CASE WHEN units_known=0 THEN 1 ELSE 0 END) unknown_usage_facts,
    SUM(CASE WHEN reported_cost_micros IS NULL THEN 1 ELSE 0 END) unpriced_facts,
    SUM(CASE WHEN outcome IN ('unknown','prepared','prepared-shared') THEN 1 ELSE 0 END) uncertain_facts,
    SUM(CASE WHEN outcome IN ('prepared','prepared-shared') THEN 1 ELSE 0 END) prepared_facts,
    SUM(reported_cost_micros) reported_cost_micros
    FROM external_cost_facts WHERE outcome<>'not-sent' ${campaignId === undefined ? '' : 'AND campaign_id=?'} ${period ? 'AND occurred_at>=? AND occurred_at<?' : ''}
    GROUP BY ${group === 'campaign' ? 'campaign_id' : 'day'},provider,operation,model_or_channel,unit_kind,currency
    ORDER BY ${group === 'campaign' ? 'campaign_id' : 'day DESC'},provider,operation,model_or_channel,currency`)
    .bind(...(campaignId === undefined ? [] : [campaignId]),...(period?[period.from,period.until]:[])).all<Record<string, unknown>>();
  return rows.results.map(row => ({ campaignId: row.campaign_id == null ? null : String(row.campaign_id), day: row.day == null ? null : String(row.day),
    provider: String(row.provider), operation: String(row.operation), modelOrChannel: String(row.model_or_channel), unitKind: String(row.unit_kind),
    billableUnits: row.billable_units == null ? null : Number(row.billable_units), unknownUsageFacts: Number(row.unknown_usage_facts),
    unpricedFacts: Number(row.unpriced_facts), uncertainFacts: Number(row.uncertain_facts), preparedFacts: Number(row.prepared_facts), facts: Number(row.facts),
    reportedCostMicros: row.reported_cost_micros == null ? null : Number(row.reported_cost_micros), currency: row.currency == null ? null : String(row.currency) }));
}
export async function costReport(database: Database,period?:CostPeriod): Promise<CostReport> {
  const [byCampaign, byDay] = await Promise.all([costGroups(database,'campaign',undefined,period),costGroups(database,'day',undefined,period)]);
  return { dayBoundary: 'UTC', byCampaign, byDay };
}
