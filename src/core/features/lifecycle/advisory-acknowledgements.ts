import { emailContentAdvisories } from '@/core/features/campaigns/email-advisories';
import { emailSizeAdvisory } from '@/core/features/campaigns/email-size-advisory';
import { savedEmailSize } from '@/core/features/campaigns/saved-email-size';
import type { EmailSizeOptions } from '@/core/features/campaigns/email-size';
import type { Database } from '@/core/platform/db/client';
import { ulid } from '@/core/shared/ids';
import { digestJson } from './digest';
import { advisorySnapshot } from './advisory-snapshot';
import { emailSubjectAdvisory, isAcknowledgableFinding } from './advisory-policy';

export type AdvisorySizeOptions=EmailSizeOptions&{resolveAudience?:(revision:{inclusionRuleJson:string;exclusionRulesJson:string;dormancyPolicyJson?:string})=>Promise<readonly string[]|undefined>};

type Finding = {id: string; kind: string; status: string; detail: string; blocking: boolean};
type Acknowledgement = {operatorId: string; acknowledgedAt: string};
const operationKey = (identity: string) => `advisory-acknowledgement:${identity}`;
const identityFor = (revisionDigest: string, check: Finding) => digestJson({revisionDigest,
  kind: check.kind, status: check.status, detail: check.detail, blocking: check.blocking});

async function recorded(database: Database, identity: string): Promise<Acknowledgement | undefined> {
  const row = await database.$client.prepare(`SELECT actor_id, occurred_at FROM lifecycle_audit_entries
    WHERE operation_key = ? AND action = 'acknowledge-advisory'`).bind(operationKey(identity))
    .first<{actor_id: string; occurred_at: number}>();
  return row ? {operatorId: row.actor_id, acknowledgedAt: new Date(row.occurred_at).toISOString()} : undefined;
}

async function currentFindings(database: Database, snapshot: NonNullable<Awaited<ReturnType<typeof advisorySnapshot>>>, sizeOptions: AdvisorySizeOptions, includeSize: boolean) {
  const row=snapshot.revision;
  const revision={id:String(row.id),name:String(row.name??''),utmPolicyJson:typeof row.utm_policy_json==='string'?row.utm_policy_json:null,inclusionRuleJson:String(row.inclusion_rule_json??''),exclusionRulesJson:String(row.exclusion_rules_json??'[]'),dormancyPolicyJson:typeof row.dormancy_policy_json==='string'?row.dormancy_policy_json:undefined,emailSubject:String(row.email_subject),emailBody:String(row.email_body),emailText:String(row.email_text),preheader:String(row.preheader??''),physicalAddress:String(row.physical_address),smsBody:String(row.sms_body),trackingEnabled:Boolean(row.tracking_enabled)};
  const findings=[emailSubjectAdvisory(revision.emailSubject),...emailContentAdvisories(revision)];
  if(includeSize){
    const {resolveAudience,...measurement}=sizeOptions;
    const audienceContactIds=resolveAudience?await resolveAudience(revision):measurement.audienceContactIds;
    const current=resolveAudience&&audienceContactIds===undefined?{...revision,inclusionRuleJson:undefined}:revision;
    findings.push(emailSizeAdvisory(await savedEmailSize(database,current,{...measurement,audienceContactIds},false)));
  }
  return findings.filter((finding):finding is NonNullable<typeof finding>=>Boolean(finding));
}
const matchesCurrent = (check:Finding, findings:Awaited<ReturnType<typeof currentFindings>>) => isAcknowledgableFinding(check) && findings.some(current=>current.kind===check.kind&&current.detail===check.detail);

export async function enrichAdvisoryAcknowledgements<T extends Finding>(database: Database, revisionId: string, checks: T[], sizeOptions:AdvisorySizeOptions = {}) {
  const snapshot = await advisorySnapshot(database, revisionId);
  const findings=snapshot?await currentFindings(database,snapshot,sizeOptions,checks.some(check=>check.kind==='message.email-size-advisory')):[];
  return Promise.all(checks.map(async check => {
    if (!snapshot || !snapshot.hasEmail || !matchesCurrent(check, findings)) return {...check, findingIdentity: undefined, acknowledgement: undefined};
    const findingIdentity = await identityFor(snapshot.digest, check);
    return {...check, findingIdentity, acknowledgement: await recorded(database, findingIdentity)};
  }));
}

export function createAdvisoryAcknowledgementRepository(database: Database,sizeOptions:AdvisorySizeOptions = {}) {
  return {
    async acknowledgeAdvisory(input: {campaignId: string; revisionId: string; checkId: string; findingIdentity: string; operatorId: string}) {
      const snapshot = await advisorySnapshot(database, input.revisionId);
      if (!snapshot || snapshot.revision.campaign_id !== input.campaignId) return {kind: 'not_found' as const};
      const row = await database.$client.prepare(`SELECT id, kind, status, detail, blocking FROM campaign_checks WHERE id = ? AND revision_id = ?`)
        .bind(input.checkId, input.revisionId).first<{id: string; kind: string; status: string; detail: string; blocking: number}>();
      if (!row) return {kind: 'conflict' as const};
      const check = {...row, blocking: Boolean(row.blocking)};
      const findings=await currentFindings(database,snapshot,sizeOptions,check.kind==='message.email-size-advisory');
      if (!snapshot.hasEmail || !matchesCurrent(check,findings)) return {kind: 'not_advisory' as const};
      const identity = await identityFor(snapshot.digest, check);
      if (identity !== input.findingIdentity) return {kind: 'conflict' as const};
      const now = Date.now();
      const result = await database.$client.prepare(`INSERT INTO lifecycle_audit_entries
        (id, operation_key, entity_type, entity_id, action, actor_type, actor_id, detail_json, occurred_at, created_at)
        SELECT ?, ?, 'campaign-revision', ?, 'acknowledge-advisory', 'operator', ?, ?, ?, ?
        WHERE ${snapshot.guard} AND EXISTS (SELECT 1 FROM campaigns WHERE id = ? AND active_revision_id = ?)
          AND EXISTS (SELECT 1 FROM campaign_checks WHERE id = ? AND revision_id = ? AND kind = ? AND status = 'advisory' AND blocking = 0 AND detail = ?)
        ON CONFLICT(operation_key) DO NOTHING`).bind(ulid(now), operationKey(identity), input.revisionId, input.operatorId,
          JSON.stringify({campaignId: input.campaignId, revisionId: input.revisionId, revisionDigest: snapshot.digest,
            findingIdentity: identity, kind: check.kind, detail: check.detail}), now, now,
          ...snapshot.values, input.campaignId, input.revisionId, check.id, input.revisionId, check.kind, check.detail).run();
      // Recheck on a no-op: a stale active revision must not masquerade as an idempotent success.
      if (!result.meta.changes) {
        const current = await database.$client.prepare(`SELECT 1 FROM campaigns WHERE id = ? AND active_revision_id = ? AND ${snapshot.guard}
          AND EXISTS (SELECT 1 FROM campaign_checks WHERE id = ? AND revision_id = ? AND kind = ? AND status = 'advisory' AND blocking = 0 AND detail = ?)` )
          .bind(input.campaignId, input.revisionId, ...snapshot.values, check.id, input.revisionId, check.kind, check.detail).first();
        if (!current) return {kind: 'conflict' as const};
      }
      const acknowledgement = await recorded(database, identity);
      return acknowledgement ? {kind: 'acknowledged' as const, acknowledgement} : {kind: 'conflict' as const};
    },
  };
}
