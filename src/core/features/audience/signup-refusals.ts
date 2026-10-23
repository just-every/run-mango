import { activityStatement } from '@/core/features/auth/activity-record';

const hourMs = 3_600_000;

export type SignupRefusalReason = 'network-rate-limit' | 'existing-restriction' | 'kiosk-allowance' | 'daily-allowance' | 'global-allowance' | 'delivery-deferred' | 'delivery-failed';

/** Counts one refused public signup under its hour, form and reason. The address is never stored. */
export async function countSignupRefusal(db: D1Database, form: 'hosted' | 'kiosk', reason: SignupRefusalReason, now = Date.now()) {
  const second=Math.floor(now/1000);
  await db.batch([
    db.prepare(`INSERT INTO signup_refusal_hours(hour,form,reason,refusals) VALUES(?,?,?,1)
      ON CONFLICT(hour,form,reason) DO UPDATE SET refusals=refusals+1`).bind(Math.floor(now / hourMs), form, reason),
    // Anonymous, expiring rate-limit state supplies a rolling hour without
    // changing the durable hourly report or writing an address to either.
    db.prepare(`INSERT INTO oa_limits(key,window,count) VALUES(?,?,1)
      ON CONFLICT(key) DO UPDATE SET count=count+1`).bind(`signup-refusal-alert:${form}:${reason}:${second}`,second),
    db.prepare("DELETE FROM oa_limits WHERE key LIKE 'signup-refusal-alert:%' AND window<=?").bind(second-3600),
  ]);
}

/** Every closed hour with refusals becomes exactly one activity entry (a replay is a no-op by its key). */
export async function summariseSignupRefusals(db: D1Database, now = Date.now()) {
  const rows = (await db.prepare('SELECT hour,form,reason,refusals FROM signup_refusal_hours WHERE hour<? ORDER BY hour,form,reason')
    .bind(Math.floor(now / hourMs)).all<{hour: number; form: string; reason: string; refusals: number}>()).results;
  const hours = new Map<number, Record<string, Record<string, number>>>();
  for (const row of rows) {
    const forms = hours.get(row.hour) ?? {};
    (forms[row.form] ??= {})[row.reason] = row.refusals;
    hours.set(row.hour, forms);
  }
  if (!hours.size) return;
  await db.batch([...hours].map(([hour, byForm]) => activityStatement(db, {
    key: `signup-refusals:${hour}`, action: 'signup.refusals-summarised', entityType: 'signup-form', entityId: 'newsletter', actorId: 'system', actorType: 'system',
    at: (hour + 1) * hourMs,
    detail: {hourStart: new Date(hour * hourMs).toISOString(), total: Object.values(byForm).flatMap(Object.values).reduce((sum, count) => sum + count, 0), byForm},
  })));
}

export async function readSignupRefusals(db:D1Database, now=Date.now()) {
  const hours=(await db.prepare('SELECT hour,form,reason,refusals FROM signup_refusal_hours ORDER BY hour DESC,form,reason LIMIT 500').all<{hour:number;form:string;reason:string;refusals:number}>()).results;
  const recent=(await db.prepare("SELECT key,count FROM oa_limits WHERE key LIKE 'signup-refusal-alert:%' AND window>? AND window<=?").bind(Math.floor(now/1000)-3600,Math.floor(now/1000)).all<{key:string;count:number}>()).results;
  const allowances=new Set(['network-rate-limit','kiosk-allowance','global-allowance','daily-allowance']);
  const refusedLastHour=recent.filter(row=>allowances.has(row.key.split(':')[2])).reduce((sum,row)=>sum+row.count,0);
  return {hours,refusedLastHour};
}
