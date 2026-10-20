import { activityStatement } from '@/core/features/auth/activity-record';

const hourMs = 3_600_000;

export type SignupRefusalReason = 'network-rate-limit' | 'existing-restriction' | 'kiosk-allowance' | 'daily-allowance' | 'global-allowance' | 'delivery-deferred' | 'delivery-failed';

/** Counts one refused public signup under its hour, form and reason. The address is never stored. */
export async function countSignupRefusal(db: D1Database, form: 'hosted' | 'kiosk', reason: SignupRefusalReason, now = Date.now()) {
  await db.prepare(`INSERT INTO signup_refusal_hours(hour,form,reason,refusals) VALUES(?,?,?,1)
    ON CONFLICT(hour,form,reason) DO UPDATE SET refusals=refusals+1`).bind(Math.floor(now / hourMs), form, reason).run();
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
