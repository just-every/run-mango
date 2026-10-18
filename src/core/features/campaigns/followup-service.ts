import type { EmailSizeOptions } from './email-size';
import type { Database } from '@/core/platform/db/client';
import type { DraftComposition } from './draft-composition';
import { createDraft } from './create-draft';
import { campaignFollowups } from './followup-schema';
import { draftStepSettings } from './reuse-schema';
import { openTrackingSettings } from '@/core/features/insights/open-tracking';
import { ulid } from '@/core/shared/ids';
type Snapshot={composition:DraftComposition;stepSettings:{channel:'email'|'sms';timezone:string;whyThisTime:string}[]};
export function createFollowupService(database:Database,snapshot:(id:string)=>Promise<Snapshot|undefined>,sizeOptions:EmailSizeOptions = {}) {
  const db=database.$client;
  async function source(id:string) {
    const row=await db.prepare(`SELECT c.id,c.active_revision_id revisionId,v.name,v.email_subject subject,
      MAX(COALESCE(r.handed_off_at,r.provider_accepted_at,r.handoff_started_at)) lastSentAt,
      COUNT(DISTINCT r.id) recipients
      FROM campaigns c JOIN campaign_revisions v ON v.id=c.active_revision_id
      JOIN recipient_steps r ON r.campaign_id=c.id AND r.revision_id=v.id AND r.channel='email'
      WHERE c.id=? AND c.state='completed' AND (r.handed_off_at IS NOT NULL OR r.provider_accepted_at IS NOT NULL OR r.provider_message_id IS NOT NULL)
      GROUP BY c.id`).bind(id).first<{id:string;revisionId:string;name:string;subject:string;lastSentAt:number;recipients:number}>();
    if(!row||row.lastSentAt===null)return null;
    const untracked=await db.prepare(`SELECT 1 FROM recipient_steps r WHERE r.campaign_id=? AND r.revision_id=? AND r.channel='email' AND (r.handed_off_at IS NOT NULL OR r.provider_accepted_at IS NOT NULL OR r.provider_message_id IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM open_tracking_tokens t WHERE t.recipient_step_id=r.id) LIMIT 1`).bind(id,row.revisionId).first();
    return {...row,openEstimatesEnabled:(await openTrackingSettings(db)).enabled&&!untracked};
  }
  return {source,async parent(id:string){return db.prepare(`SELECT f.source_campaign_id sourceCampaignId,v.name,f.metric,f.cutoff_at cutoffAt,f.delay_hours delayHours FROM campaigns c JOIN campaign_revisions current ON current.id=c.active_revision_id JOIN json_each(current.inclusion_rule_json,'$.predicates') p ON json_extract(p.value,'$.sourceType')='campaign' AND json_extract(p.value,'$.field')='followup' JOIN campaign_followups f ON f.id=json_extract(p.value,'$.value') JOIN campaign_revisions v ON v.id=f.source_revision_id WHERE c.id=?`).bind(id).first();},async create(id:string,input:{subject:string;delayHours:number;metric:'click'|'open-estimate'},operatorId:string) {
    const original=await source(id);if(!original)return {kind:'unavailable' as const};
    if(input.metric==='open-estimate'&&!original.openEstimatesEnabled)return {kind:'estimates-disabled' as const};
    const now=Date.now(),cutoffAt=original.lastSentAt+input.delayHours*3600000;
    if(now<cutoffAt)return {kind:'too-early' as const,availableAt:new Date(cutoffAt).toISOString()};
    const saved=await snapshot(original.revisionId);if(!saved)return {kind:'unavailable' as const};
    const cohort=ulid();
    const draft=await createDraft(database,{...saved.composition,name:`Follow-up: ${original.name}`.slice(0,160),emailSubject:input.subject,
      inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'campaign',field:'followup',comparator:'eq',value:cohort}]}),steps:[]},operatorId,({campaignId,revisionId})=>[
        database.insert(campaignFollowups).values({id:cohort,campaignId,sourceCampaignId:id,sourceRevisionId:original.revisionId,metric:input.metric,cutoffAt,delayHours:input.delayHours,createdAt:now}),
        database.insert(draftStepSettings).values({revisionId,settingsJson:JSON.stringify(saved.stepSettings.filter(step=>step.channel==='email'))}),
      ],sizeOptions);
    return {kind:'draft' as const,...draft,sourceCampaignId:id,cutoffAt:new Date(cutoffAt).toISOString()};
  }};
}
