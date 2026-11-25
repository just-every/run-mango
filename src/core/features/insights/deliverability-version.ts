import type {Database} from '@/core/platform/db/client';

const bucketMs=3_600_000;
/** An ETag for the deliverability report that costs a handful of D1 rows: the newest key of each source the report reads.
 * An open Insights tab asks every 20 seconds; unchanged data answers 304 instead of re-aggregating the reporting window.
 * The clock bucket lets figures that change only because time passed (events leaving the window, sender checks
 * expiring) catch up within the hour. */
export async function deliverabilityVersion(database:Database,windowDays:number,now:Date) {
  const row=await database.$client.prepare(
    `SELECT
      (SELECT COALESCE(MAX(rowid),0) FROM delivery_facts) facts,
      (SELECT COALESCE(MAX(rowid),0) FROM link_click_facts) clicks,
      (SELECT COALESCE(MAX(first_attempt_at),0) FROM recipient_steps) attempts,
      (SELECT COALESCE(MAX(used_at),0) FROM public_action_tokens WHERE purpose='unsubscribe') unsubscribes,
      (SELECT COALESCE(MAX(rowid),0) FROM campaign_revisions) revisions,
      (SELECT COUNT(*) FROM delivery_outcome_providers) outcomes,
      (SELECT COALESCE(MAX(updated_at),0) FROM sender_settings) settings,
      (SELECT COALESCE(MAX(updated_at),0)||'.'||COALESCE(MAX(generation),0) FROM sender_verification_state) verification,
      (SELECT COALESCE(MAX(rowid),0) FROM sender_verification_inspections) inspections,
      (SELECT state||'.'||generation||'.'||COALESCE(delivery_proved_at,0)||'.'||length(COALESCE(last_error,'')) FROM sending_connection WHERE id=1) connection`,
  ).first<Record<string,unknown>>();
  return `"${[windowDays,Math.floor(now.getTime()/bucketMs),...Object.values(row??{})].join('-')}"`;
}
/** True when the client's If-None-Match names this version (a proxy may have weakened the validator). */
export function presented(header:string|undefined,version:string) {
  return (header??'').split(',').some(value=>value.trim().replace(/^W\//,'')===version);
}
