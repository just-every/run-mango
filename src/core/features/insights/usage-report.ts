import type { Database } from '@/core/platform/db/client';
import { costGroups } from './cost-report';

export async function usageReport(database:Database,now=new Date()) {
  const instant=now.getTime();
  if(!Number.isFinite(instant))throw new Error('Usage requires a valid observation time.');
  const from=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1),until=Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1);
  const elapsedMs=instant-from,monthMs=until-from;
  const [counts,month]=await Promise.all([
    database.$client.prepare(`SELECT 'email' channel,email_status state,COUNT(*) contacts FROM contacts GROUP BY email_status
      UNION ALL SELECT 'sms',sms_status,COUNT(*) FROM contacts GROUP BY sms_status ORDER BY channel,state`).all<{channel:'email'|'sms';state:string;contacts:number}>(),
    costGroups(database,'day',undefined,{from,until:instant}),
  ]);
  const currencies=new Map<string|null,{currency:string|null;reportedCostMicros:number|null;unpricedFacts:number;facts:number}>();
  for(const row of month) {
    const value=currencies.get(row.currency)??{currency:row.currency,reportedCostMicros:null,unpricedFacts:0,facts:0};
    if(row.reportedCostMicros!==null)value.reportedCostMicros=(value.reportedCostMicros??0)+row.reportedCostMicros;
    value.unpricedFacts+=row.unpricedFacts;value.facts+=row.facts;currencies.set(row.currency,value);
  }
  return {asOf:now.toISOString(),monthStart:new Date(from).toISOString(),monthEnd:new Date(until).toISOString(),elapsedMs,monthMs,
    totalContacts:counts.results.filter(row=>row.channel==='email').reduce((n,row)=>n+row.contacts,0),consent:counts.results,
    projection:[...currencies.values()].sort((a,b)=>(a.currency??'').localeCompare(b.currency??'')).map(row=>({...row,
      projectedCostMicros:row.reportedCostMicros!==null&&row.currency&&elapsedMs>0?
        (BigInt(row.reportedCostMicros)*BigInt(monthMs)/BigInt(elapsedMs)).toString():null})),
  };
}
export type UsageReport=Awaited<ReturnType<typeof usageReport>>;
