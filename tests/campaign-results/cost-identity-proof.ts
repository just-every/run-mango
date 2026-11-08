import { expect, type Page } from '@playwright/test';
import type { CostGroup, CostReport } from '../../src/core/features/insights/cost-report';

type Identity = {
  campaignId: string | null; provider: string; operation: string; modelOrChannel: string;
  billableUnits: number | null; unitKind: string; reportedCostMicros: number | null;
  currency: string | null; outcome: string;
};
export type ExpectedCost = Identity & {id: string; day: string};

// Identity and usage expectations come from the called boundary, never the stored fact.
// Keep its native identifier and UTC bucket to reconcile later authenticated projections.
export function rememberCost(fact: any, expected: Identity): ExpectedCost {
  expect(fact).toMatchObject({campaign_id:expected.campaignId,provider:expected.provider,operation:expected.operation,
    model_or_channel:expected.modelOrChannel,billable_units:expected.billableUnits??0,units_known:expected.billableUnits===null?0:1,
    unit_kind:expected.unitKind,reported_cost_micros:expected.reportedCostMicros,currency:expected.currency,outcome:expected.outcome});
  return {...expected,id:fact.id,day:new Date(fact.occurred_at).toISOString().slice(0,10)};
}

export function assertCostIdentities(facts: any[], expected: ExpectedCost[], report: CostReport) {
  for(const item of expected) {
    const matches=facts.filter(fact=>fact.id===item.id);
    expect(matches).toHaveLength(1);
    rememberCost(matches[0],item);
  }
  for(const [dimension,rows] of [['campaign',report.byCampaign],['day',report.byDay]] as const) {
    const groups=new Map<string,ExpectedCost[]>();
    const key=(item:ExpectedCost)=>JSON.stringify([dimension==='campaign'?item.campaignId:item.day,
      item.provider,item.operation,item.modelOrChannel,item.unitKind,item.currency]);
    for(const item of expected) groups.set(key(item),[...(groups.get(key(item))??[]),item]);
    for(const items of groups.values()) {
      const item=items[0];
      const matches=rows.filter(row=>(dimension==='campaign'?row.campaignId===item.campaignId:row.day===item.day)
        &&row.provider===item.provider&&row.operation===item.operation&&row.modelOrChannel===item.modelOrChannel
        &&row.unitKind===item.unitKind&&row.currency===item.currency);
      expect(matches,`${dimension}: ${item.operation} from ${item.provider} using ${item.modelOrChannel}`).toHaveLength(1);
      const known=items.filter(row=>row.billableUnits!==null),priced=items.filter(row=>row.reportedCostMicros!==null);
      expect(matches[0]).toMatchObject({facts:items.length,
        billableUnits:known.length?known.reduce((sum,row)=>sum+row.billableUnits!,0):null,
        unknownUsageFacts:items.length-known.length,unpricedFacts:items.length-priced.length,
        reportedCostMicros:priced.length?priced.reduce((sum,row)=>sum+row.reportedCostMicros!,0):null,
        uncertainFacts:items.filter(row=>row.outcome==='unknown').length,preparedFacts:0} satisfies Partial<CostGroup>);
    }
  }
}

export async function assertVisibleCostIdentities(page: Page, expected: ExpectedCost[]) {
  for(const item of expected) {
    const campaign=item.campaignId?`Costs for campaign ${item.campaignId}`:'Costs without an assigned campaign';
    for(const region of [campaign,`Costs on ${item.day} UTC`]) {
      await expect(page.getByRole('region',{name:region,exact:true}).getByRole('row')
        .filter({has:page.getByRole('cell',{name:item.operation,exact:true})})
        .getByRole('rowheader',{name:`${item.provider} / ${item.modelOrChannel}`,exact:true})).toBeVisible();
    }
  }
}
