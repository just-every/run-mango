import {actorType,actorId as nativeActorId} from '../agent-door/custody';
import {eq} from 'drizzle-orm';
import {campaignRevisions} from './campaign-schema';
import {savedEmailSize} from './saved-email-size';
import type {EmailSizeOptions} from './email-size';
import {defaultAnalyticsPolicy} from '@/core/features/settings/analytics-policy';
import { createProposalRepository } from '@/core/features/proposals/repository';
import { parseStructuredRules } from '../lifecycle/rules';
import { summarizeAudienceRules } from './audience-summary';
import type { Database } from '@/core/platform/db/client';
import type { DraftComposition } from './draft-composition';
import { ulid } from '@/core/shared/ids';
import { managedFooter, htmlToText } from './authoring-content';
import { createCampaignRepository } from './repository';
import { persistedProposalClaims, unavailableProposalClaims } from './persisted-proposal-claims';

/** The link claim and every insert share one transaction. Racing callers reuse its winner. */
export async function adoptProposal(database: Database, proposalId: string, operatorId: string, sender: DraftComposition, sizeOptions: EmailSizeOptions = {}) {
  const db = database.$client, campaignId = ulid(), revisionId = ulid(), now = Date.now();
  await createProposalRepository(database).expireDue(new Date(now));
  const proposal = await db.prepare('SELECT state, send_by_at, campaign_id, inclusion_rule_json, exclusion_rules_json FROM proposals WHERE id = ?')
    .bind(proposalId).first<{state:string;send_by_at:number;campaign_id:string|null;inclusion_rule_json:string;exclusion_rules_json:string}>();
  if (!proposal) return {kind:'not_found' as const};
  if(proposal.state!=='proposed'||proposal.send_by_at<=now)return {kind:'unavailable' as const,detail:'Only an unexpired proposed suggestion can become a draft.'};
  const rules = parseStructuredRules(proposal.inclusion_rule_json, proposal.exclusion_rules_json);
  if (!proposal.campaign_id && !rules.ok) return {kind:'unavailable' as const, detail:'Review the suggestion’s invalid audience conditions before creating a draft.'};
  const repository=createCampaignRepository(database);
  const [saved, savedSteps, evidence]=await Promise.all([repository.getProposal(proposalId,new Date(now)),repository.listProposalSteps(proposalId),repository.proposalEvidence(proposalId)]);
  const claims=saved&&persistedProposalClaims(saved,savedSteps.length,evidence.evidenceItems);
  if(!claims)return {kind:'unavailable' as const,detail:unavailableProposalClaims};
  const linked = proposal.campaign_id ? await repository.getCampaign(proposal.campaign_id) : undefined;
  const revision = linked?.activeRevisionId ? await database.query.campaignRevisions.findFirst({where:eq(campaignRevisions.id,linked.activeRevisionId)}) : undefined;
  if (revision || !proposal.campaign_id) await savedEmailSize(database,revision ?? {emailSubject:'',emailBody:managedFooter,emailText:htmlToText(managedFooter),preheader:'',smsBody:'',physicalAddress:sender.physicalAddress??''},sizeOptions);
  const audienceRule = summarizeAudienceRules(proposal.inclusion_rule_json, proposal.exclusion_rules_json);
  const sourceTypesJson = JSON.stringify(rules.ok ? rules.sourceTypes : []);
  const guard = `EXISTS (SELECT 1 FROM proposals WHERE id = ? AND campaign_id = ?)`;
  await db.batch([
    db.prepare(`UPDATE proposals SET campaign_id = ?, updated_at = ? WHERE id = ? AND campaign_id IS NULL AND state = 'proposed' AND send_by_at > ? AND inclusion_rule_json = ? AND exclusion_rules_json = ?`).bind(campaignId,now,proposalId,Date.now(),proposal.inclusion_rule_json,proposal.exclusion_rules_json),
    db.prepare(`INSERT INTO campaigns (id, proposal_id, state, active_revision_id, created_at, updated_at) SELECT ?, ?, 'draft', ?, ?, ? WHERE ${guard}`).bind(campaignId,proposalId,revisionId,now,now,proposalId,campaignId),
    db.prepare(`INSERT INTO campaign_revisions (id,campaign_id,version,state,name,email_subject,email_body,email_text,preheader,sms_body,sender_name,from_email,reply_to_email,sms_sender,physical_address,message_category,audience_rule,inclusion_rule_json,exclusion_rules_json,source_types_json,tracking_enabled,created_at,updated_at,dormancy_policy_json,utm_policy_json)
      SELECT ?, ?, 1, 'draft', title, '', ?, ?, '', '', ?, ?, ?, '', ?, 'newsletter', ?, inclusion_rule_json, exclusion_rules_json, ?, 0, ?, ?, COALESCE((SELECT policy_json FROM audience_exclusion_settings WHERE id=1),'{"enabled":true,"windowDays":365,"includeOpenOnly":false}'), COALESCE((SELECT policy_json FROM analytics_settings WHERE id=1),?) FROM proposals WHERE id = ? AND campaign_id = ?`).bind(revisionId,campaignId,managedFooter,htmlToText(managedFooter),sender.senderName,sender.fromEmail,sender.replyToEmail,sender.physicalAddress,audienceRule,sourceTypesJson,now,now,JSON.stringify(defaultAnalyticsPolicy),proposalId,campaignId),
    ...savedSteps.map((step,index)=>db.prepare(`INSERT INTO campaign_steps (id,revision_id,sequence,channel,timezone,scheduled_at,send_by_at,why_this_time,created_at,updated_at)
      SELECT ?, ?, sequence, channel, timezone, scheduled_at, send_by_at, ?, ?, ? FROM proposal_steps WHERE id = ? AND proposal_id = ? AND ${guard}`).bind(ulid(),revisionId,claims.timing[index],now,now,step.id,proposalId,proposalId,campaignId)),
    db.prepare(`INSERT INTO campaign_state_transitions (id,campaign_id,from_state,to_state,actor_type,actor_id,reason,occurred_at,created_at) SELECT ?, ?, 'draft', 'draft', '${actorType()}', ?, 'proposal-adopted', ?, ? WHERE ${guard}`).bind(ulid(),campaignId,nativeActorId(operatorId),now,now,proposalId,campaignId),
  ]);
  const row = await db.prepare('SELECT campaign_id, state FROM proposals WHERE id = ?').bind(proposalId).first<{state:string;campaign_id:string|null}>();
  if (!row) return {kind:'not_found' as const};
  if (row.state!=='proposed'||!row.campaign_id) return {kind:'unavailable' as const, detail:'Only an unexpired proposed suggestion can become a draft.'};
  const campaign=await db.prepare('SELECT id FROM campaigns WHERE id=? AND active_revision_id IS NOT NULL').bind(row.campaign_id).first();
  if(!campaign)return {kind:'unavailable' as const,detail:'The linked campaign is missing its revision. Restore its data before review.'};
  return {kind:'draft' as const, campaignId:row.campaign_id};
}
