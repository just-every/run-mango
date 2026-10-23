import type {Database} from '@/core/platform/db/client';
import {campaignPerformance} from './campaign-performance-query';
import {costReport} from './cost-report';
import {reportDefinition,reportTitle,builtInReports,type ReportDefinition,type SavedReportData,type ReportRow} from './saved-report-model';
import type {OverviewPeriod} from './overview-period';
export async function findSavedReport(database:Database,id:string):Promise<ReportDefinition|undefined> {
  const builtIn=builtInReports.find(report=>report.id===id);if(builtIn)return {metric:builtIn.metric,dimension:builtIn.dimension};
  const value=await database.$client.prepare('SELECT metric,dimension FROM insight_saved_reports WHERE id=?').bind(id).first();
  const parsed=reportDefinition.safeParse(value);return parsed.success?parsed.data:undefined;
}
/** All consumers, including scheduled mail, use this contact-free projection of existing reads. */
export async function readSavedReport(database:Database,definition:ReportDefinition,period:OverviewPeriod):Promise<SavedReportData> {
  const rows:ReportRow[]=[],start=Date.parse(period.from+'T00:00:00Z'),until=Date.parse(period.to+'T00:00:00Z')+86400000;
  if(until-start>31*86400000||until<=start)throw new Error('Report period must contain 1–31 UTC days.');
  if(definition.metric==='providerCost'||definition.metric==='billableUnits') {
    const report=await costReport(database,{from:start,until}),groups=new Map<string,ReportRow>();
    for(const fact of report.byDay){const dimension=definition.dimension==='provider'?fact.provider:fact.modelOrChannel,cost=definition.metric==='providerCost',currency=cost?fact.currency:null,unit=cost?'micros':fact.unitKind;
      const key=JSON.stringify([fact.day,dimension,currency,unit]),row=groups.get(key)??{day:fact.day!,dimension,metric:definition.metric,value:null,currency,unit,unpricedFacts:0};
      const value=cost?fact.reportedCostMicros:fact.billableUnits;
      if(value!==null)row.value=((row.value===null?0n:BigInt(row.value))+BigInt(value)).toString();
      row.unpricedFacts+=cost?fact.unpricedFacts:fact.unknownUsageFacts;groups.set(key,row);}
    rows.push(...[...groups.values()].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
  } else {
    for(let at=start;at<until;at+=86400000){const day=new Date(at).toISOString().slice(0,10),report=await campaignPerformance(database,{from:day,to:day});
      const channels=new Map<string,{clicks:number;conversions:number;revenue:bigint}>();
      for(const fact of report.rows){const value=channels.get(fact.channel)??{clicks:0,conversions:0,revenue:0n};value.clicks+=fact.totalClicks;value.conversions+=fact.conversions;value.revenue+=BigInt(fact.revenueByCurrency.find(row=>row.currency==='USD')?.netAmountMinor??0);channels.set(fact.channel,value);}
      for(const [dimension,value]of channels)for(const metric of definition.metric==='campaignEngagement'?['humanClicks','conversions','attributedRevenueUsd']: [definition.metric])rows.push({day,dimension,metric,value:String(metric==='humanClicks'?value.clicks:metric==='conversions'?value.conversions:value.revenue),currency:metric==='attributedRevenueUsd'?'USD':null,unit:metric==='attributedRevenueUsd'?'minor units':'count',unpricedFacts:0});
    }
  }
  return {title:reportTitle(definition),...period,dayBoundary:'UTC',rows,note:'Aggregate figures only; no contact identities or per-contact rows. Provider prices and units retain their currencies and units; unpriced or unknown facts are counted, never zero-filled. Campaign UTC days select scheduled steps and all recorded outcomes for those steps, as the campaign performance report does. USD attribution is not holdout lift and no currency conversion is applied.'};
}
