import type {Database} from '@/core/platform/db/client';
import {campaignPerformance} from './campaign-performance-query';
import {listGrowth} from './list-growth';
import {costReport,type CostReport} from './cost-report';
import {readSenderRates} from './sender-rates-report';
import type {OverviewPeriod} from './overview-period';

function totals(report:CostReport) {
  const currencies=new Map<string|null,{currency:string|null;reportedCostMicros:number|null;unpricedFacts:number}>();
  for(const row of report.byDay){const value=currencies.get(row.currency)??{currency:row.currency,reportedCostMicros:null,unpricedFacts:0};
    if(row.reportedCostMicros!==null)value.reportedCostMicros=(value.reportedCostMicros??0)+row.reportedCostMicros;
    value.unpricedFacts+=row.unpricedFacts;currencies.set(row.currency,value);}
  return [...currencies.values()].sort((a,b)=>(a.currency??'').localeCompare(b.currency??''));
}
async function periodReport(database:Database,period:OverviewPeriod) {
  const from=Date.parse(`${period.from}T00:00:00Z`),until=Date.parse(`${period.to}T00:00:00Z`)+86400000;
  const [campaigns,growth,costs,health]=await Promise.all([
    campaignPerformance(database,{...period,currency:'USD',sort:'netRevenue',direction:'desc'}),
    listGrowth(database,period.from,period.to),costReport(database,{from,until}),readSenderRates(database,new Date(from),new Date(until)),
  ]);
  const top=new Map<string,{campaignId:string;name:string;netAmountMinor:bigint;conversions:number}>();
  let usd=0n,clicks=0,conversions=0;
  for(const row of campaigns.rows){const amount=BigInt(row.revenueByCurrency.find(value=>value.currency==='USD')?.netAmountMinor??0);
    usd+=amount;clicks+=row.totalClicks;conversions+=row.conversions;
    const value=top.get(row.campaignId)??{campaignId:row.campaignId,name:row.name,netAmountMinor:0n,conversions:0};
    value.netAmountMinor+=amount;value.conversions+=row.conversions;top.set(row.campaignId,value);}
  const sources=new Map<string,{source:string;method:string;channel:string;net:number}>();
  for(const row of growth.rows){const key=JSON.stringify([row.source,row.method,row.channel]),value=sources.get(key)??{source:row.source,method:row.method,channel:row.channel,net:0};value.net+=row.net;sources.set(key,value);}
  return {...period,attributionPolicy:campaigns.attributionPolicy,campaignRevenueUsdMinor:usd.toString(),clicks,conversions,
    growth:{coveredFrom:growth.coveredFrom,net:growth.channels.some(row=>row.opening===null)?null:growth.channels.reduce((n,row)=>n+row.net,0),sources:[...sources.values()]},
    costs:totals(costs),health,topCampaigns:[...top.values()].sort((a,b)=>a.netAmountMinor>b.netAmountMinor?-1:a.netAmountMinor<b.netAmountMinor?1:a.campaignId.localeCompare(b.campaignId)).slice(0,5).map(row=>({...row,netAmountMinor:row.netAmountMinor.toString()}))};
}
/** Composes the same reads as the detailed panels; never infers a result or a flow. */
export async function overviewReport(database:Database,period:OverviewPeriod) {
  const start=Date.parse(`${period.from}T00:00:00Z`),days=(Date.parse(`${period.to}T00:00:00Z`)-start)/86400000+1;
  const previousPeriod={from:new Date(start-days*86400000).toISOString().slice(0,10),to:new Date(start-86400000).toISOString().slice(0,10)};
  const [current,previous]=await Promise.all([periodReport(database,period),periodReport(database,previousPeriod)]);
  return {days,current,previous,flows:null,incrementalRevenue:null,
    note:'Campaign revenue and engagement use the performance table’s scheduled-step UTC period and all recorded outcomes for those steps. Costs, membership changes and provider evidence use their own occurrence times in the selected UTC days. Only USD attribution is totaled; other currencies are not converted. Financial corrections use the latest recorded state. Prior periods have the same number of UTC days.'};
}
export type OverviewReport=Awaited<ReturnType<typeof overviewReport>>;
