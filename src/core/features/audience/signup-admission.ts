import {databaseNow,type CapacityLevels} from './signup-capacity';
import type {SignupRefusalReason} from './signup-refusals';

type Counter={key:string;seconds:number;limit:number;reason:SignupRefusalReason};
type Input={id:string;destinationHash:string;networkKey:string;kiosk:boolean;challenged:boolean;confirmation:boolean;destinationCounterKey?:string;levels:CapacityLevels};

/** The unique request claim and all accepted counters are one D1 transaction.
 * Duplicate losers never reserve capacity; no provider work precedes this claim. */
function counterPlan(input:Input) {
  const {levels:l,networkKey:k}=input;
  const counters:Counter[]=input.kiosk?[
    {key:`signup-kiosk:${k}`,seconds:3600,limit:l.kioskNetwork,reason:'kiosk-allowance'},
    {key:'signup-kiosk-global',seconds:3600,limit:l.kioskGlobal,reason:'global-allowance'},
  ]:[
    {key:`signup:${k}`,seconds:3600,limit:input.challenged?l.networkChallenged:l.networkUnchallenged,reason:'network-rate-limit'},
    {key:input.challenged?'signup-challenged-global':'signup-global',seconds:3600,limit:input.challenged?l.globalHour:l.unchallengedHour,reason:'global-allowance'},
    {key:input.challenged?'signup-challenged-minute':'signup-global-minute',seconds:60,limit:input.challenged?l.globalMinute:l.unchallengedMinute,reason:'global-allowance'},
  ];
  if(input.confirmation)counters.push({key:input.destinationCounterKey??`signup-email:${input.destinationHash}`,seconds:86400,limit:3,reason:'daily-allowance'});
  return counters;
}

export async function signupCapacityRefusal(db:D1Database,input:Input){
  const counters=counterPlan(input).filter(c=>c.reason!=='daily-allowance');
  const now=(await db.prepare(`SELECT ${databaseNow} AS now`).first<{now:number}>())!.now;
  for(const counter of counters){
    const row=await db.prepare('SELECT window,count FROM oa_limits WHERE key=?').bind(counter.key).first<{window:number;count:number}>();
    const window=Math.floor(now/(counter.seconds*1000));
    if(row&&(row.window>window||row.window===window&&row.count>=counter.limit))return {reason:counter.reason,retryAfter:counter.seconds-Math.floor(now/1000)%counter.seconds};
  }
}

export async function admitSignup(db:D1Database,input:Input) {
  const counters=counterPlan(input);
  const window=(seconds:number)=>`CAST((${databaseNow})/${seconds*1000} AS INTEGER)`;
  const available=counters.map(c=>`NOT EXISTS(SELECT 1 FROM oa_limits WHERE key=? AND (window>${window(c.seconds)} OR (window=${window(c.seconds)} AND count>=?)))`).join(' AND ');
  const values=counters.flatMap(c=>[c.key,c.limit]);
  const results=await db.batch([
    // Capture the rejection observation before reservation changes the counts.
    db.prepare(`SELECT EXISTS(SELECT 1 FROM audience_signup_requests WHERE id=?) AS duplicate,${databaseNow} AS now,${counters.map((c,i)=>`EXISTS(SELECT 1 FROM oa_limits WHERE key=? AND (window>${window(c.seconds)} OR (window=${window(c.seconds)} AND count>=?))) AS blocked${i}`).join(',')}`).bind(input.id,...values),
    db.prepare(`INSERT INTO audience_signup_requests(id,destination_hash,status,created_at)
      SELECT ?,?,'reserved',${databaseNow} WHERE ${available} ON CONFLICT(id) DO NOTHING RETURNING created_at`)
      .bind(input.id,input.destinationHash,...values),
    ...counters.map(c=>db.prepare(`INSERT INTO oa_limits(key,window,count)
      SELECT ?,CAST(created_at/${c.seconds*1000} AS INTEGER),1 FROM audience_signup_requests WHERE id=? AND status='reserved'
      ON CONFLICT(key) DO UPDATE SET window=excluded.window,count=CASE WHEN oa_limits.window=excluded.window THEN oa_limits.count+1 ELSE 1 END`)
      .bind(c.key,input.id)),
    db.prepare("UPDATE audience_signup_requests SET status='sending' WHERE id=? AND status='reserved'").bind(input.id),
  ]);
  if(results[1].results.length)return {kind:'accepted' as const,now:Number((results[1].results[0] as {created_at:number}).created_at),counters};
  const observation=results[0].results[0] as Record<string,number>;
  if(observation.duplicate)return {kind:'duplicate' as const};
  const blocked=counters.find((_,i)=>observation[`blocked${i}`]);
  if(!blocked)throw new Error('Signup admission changed without a duplicate or capacity refusal.');
  return {kind:'refused' as const,reason:blocked.reason,retryAfter:blocked.seconds-Math.floor(observation.now/1000)%blocked.seconds};
}

/** Only a pre-handoff capture loser is refundable, exactly once, in its own windows. */
export async function refundSignup(db:D1Database,id:string,now:number,counters:Counter[]) {
  await db.batch([
    ...counters.map(c=>db.prepare(`UPDATE oa_limits SET count=MAX(0,count-1) WHERE key=? AND window=?
      AND EXISTS(SELECT 1 FROM audience_signup_requests WHERE id=? AND status='sending')
      AND NOT EXISTS(SELECT 1 FROM consent_handoff_claims WHERE id=?)`)
      .bind(c.key,Math.floor(now/(c.seconds*1000)),id,`${id}_confirmation`)),
    db.prepare("UPDATE audience_signup_requests SET status='duplicate' WHERE id=? AND status='sending' AND NOT EXISTS(SELECT 1 FROM consent_handoff_claims WHERE id=?)").bind(id,`${id}_confirmation`),
  ]);
}
