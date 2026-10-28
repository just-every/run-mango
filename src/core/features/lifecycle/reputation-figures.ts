import {COMPLAINT_RATE_LIMIT,HARD_BOUNCE_RATE_LIMIT,REPUTATION_MIN_DELIVERIES,REPUTATION_WARNING_FRACTION} from './reputation-guard';
export type ReputationCounts={delivered:number;complained:number;hardBounced:number;attempted:number;complaintRate:number|null;hardBounceRate:number|null;windowStart:string};
export const reputationRate=(rate:number|null)=>rate===null?'unmeasured':`${(rate*100).toFixed(2)}%`;
export function reputationRateState(rate:number|null,limit:number):'unknown'|'pass'|'warn'|'fail' {
  if(rate===null)return 'unknown';
  if(rate>=limit)return 'fail';
  return rate>=limit*REPUTATION_WARNING_FRACTION?'warn':'pass';
}
/** One rendering of the measured figures for the dashboard and approval block. */
export function reputationFigures(row:ReputationCounts,windowDays:number) {
  return `Window ${windowDays}d since ${row.windowStart}: complaints ${row.complained}/${row.delivered} (${reputationRate(row.complaintRate)}); hard bounces ${row.hardBounced}/${row.attempted} (${reputationRate(row.hardBounceRate)}).`;
}
export const reputationRule=`MSG-011: complaint limit ${reputationRate(COMPLAINT_RATE_LIMIT)}, hard-bounce limit ${reputationRate(HARD_BOUNCE_RATE_LIMIT)}; local block requires at least ${REPUTATION_MIN_DELIVERIES.toLocaleString('en-US')} marketing deliveries. A stricter provider rule applies at any volume.`;
