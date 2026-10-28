export const REPUTATION_MIN_DELIVERIES = 1000;
export const COMPLAINT_RATE_LIMIT = 0.003;
export const HARD_BOUNCE_RATE_LIMIT = 0.05;
/** DELIV-003 policy default for “nearing”, pending owner policy judgment. */
export const REPUTATION_WARNING_FRACTION = 5 / 6;

/** Recomputed inside the approval / handoff write transaction, including late facts. */
export function reputationGuard(revision:string,since:number) {
  const domain=`lower(substr(${revision}.from_email,instr(${revision}.from_email,'@')+1))`;
  const belongs=`lower(substr(rv.from_email,instr(rv.from_email,'@')+1))=${domain} AND rr.channel='email'`;
  const facts=(kind:string,extra='')=>`(SELECT COUNT(DISTINCT rr.id) FROM recipient_steps rr JOIN campaign_revisions rv ON rv.id=rr.revision_id
    JOIN delivery_facts ff ON ff.recipient_step_id=rr.id WHERE ${belongs} AND ff.kind='${kind}' AND ff.provider_occurred_at>=${since} ${extra})`;
  const delivered=facts('delivered'),complaints=facts('complained'),bounces=facts('bounced',"AND json_extract(ff.detail_json,'$.hard')=1");
  const attempts=`(SELECT COUNT(*) FROM recipient_steps rr JOIN campaign_revisions rv ON rv.id=rr.revision_id WHERE ${belongs} AND rr.first_attempt_at>=${since})`;
  return `NOT (${delivered}>=${REPUTATION_MIN_DELIVERIES} AND (${complaints}*1000>=${delivered}*3 OR (${bounces}>0 AND ${bounces}*100>=${attempts}*5)))`;
}

/** The preflight form of the same count-based restriction enforced atomically above.
 * Late provider facts can enter a window after their attempts have left it; a
 * missing denominator cannot turn positive hard-bounce evidence into a zero rate.
 */
export function reputationRestricted(counts:{delivered:number;complained:number;hardBounced:number;attempted:number}) {
  return counts.delivered>=REPUTATION_MIN_DELIVERIES && (counts.complained*1000>=counts.delivered*3
    || (counts.hardBounced>0 && counts.hardBounced*100>=counts.attempted*5));
}
