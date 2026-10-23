import {z} from 'zod';
import {overviewQuery,overviewPeriod} from './overview-period';
export const reportMetric=z.enum(['providerCost','billableUnits','humanClicks','conversions','attributedRevenueUsd','campaignEngagement']);
export const reportDefinition=z.object({metric:reportMetric,dimension:z.enum(['provider','channel'])}).strict().refine(value=>['providerCost','billableUnits'].includes(value.metric)||value.dimension==='channel',{message:'Campaign metrics use the channel dimension.'});
export type ReportDefinition=z.infer<typeof reportDefinition>;
export const reportTitle=(definition:ReportDefinition)=>`${({providerCost:'Provider cost',billableUnits:'Provider billable units',humanClicks:'Human clicks',conversions:'Attributed conversions',attributedRevenueUsd:'Attributed USD revenue',campaignEngagement:'Campaign engagement'})[definition.metric]} by ${definition.dimension}`;
export const builtInReports=[{id:'builtin-costs',metric:'providerCost',dimension:'provider'},{id:'builtin-performance',metric:'campaignEngagement',dimension:'channel'}] as const;
export type ReportRow={day:string;dimension:string;metric:string;value:string|null;currency:string|null;unit:string;unpricedFacts:number};
export type SavedReportData={title:string;from:string;to:string;dayBoundary:'UTC';rows:ReportRow[];note:string};
export function savedReportPeriod(input:Record<string,string>,now=new Date()) {
  const parsed=overviewQuery.parse(input),to=parsed.to??new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())-86400000).toISOString().slice(0,10);
  const period=overviewPeriod({to,from:parsed.from??new Date(Date.parse(to+'T00:00:00Z')-6*86400000).toISOString().slice(0,10)});
  if((Date.parse(period.to)-Date.parse(period.from))/86400000>=31)throw new Error('Choose at most 31 UTC days.');
  return period;
}
export function nextReportTime(cadence:'weekly'|'monthly',after:number) {
  const date=new Date(after),today=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),9);
  if(cadence==='monthly')return Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1,9);
  const monday=today+((8-date.getUTCDay())%7)*86400000;
  return monday>after?monday:monday+7*86400000;
}
export function reportSchedulePeriod(cadence:'weekly'|'monthly',due:number) {
  const date=new Date(due),end=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate());
  const start=cadence==='weekly'?end-7*86400000:Date.UTC(date.getUTCFullYear(),date.getUTCMonth()-1,1);
  return {from:new Date(start).toISOString().slice(0,10),to:new Date(end-86400000).toISOString().slice(0,10)};
}
export function followingReportTime(cadence:'weekly'|'monthly',due:number){const d=new Date(due);return cadence==='weekly'?due+7*86400000:Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1,9);}
