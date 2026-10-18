import { createDatabase } from '../../src/core/platform/db/client';
import { campaigns, campaignRevisions, campaignSteps, campaignAudiences, campaignAudienceChannelCounts } from '../../src/core/features/campaigns/campaign-schema';
import { recipientSteps, stepDispatches } from '../../src/core/features/lifecycle/schema';
export const fixedNow = new Date('2031-10-05T03:00:00.000Z');
const rules = JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'emailStatus',comparator:'eq',value:'subscribed'}]});
export const states = ['draft','scheduled','dispatching','paused','completed','cancelled','failed'];
export async function seedCampaign(binding:D1Database,id:string,state:string,channels=['email'],timezone='Australia/Brisbane') {
  const database=createDatabase(binding), revisionId=`${id}-revision`,now=fixedNow;
  await database.insert(campaigns).values({id,state,activeRevisionId:revisionId,createdAt:now,updatedAt:now});
  await database.insert(campaignRevisions).values({id:revisionId,campaignId:id,version:1,state:state==='draft'?'draft':'approved',name:`Campaign ${id}`,emailSubject:'News',emailBody:'News',emailText:'News',preheader:'News',smsBody:'News STOP',senderName:'Test',fromEmail:'sender@example.test',audienceRule:'Old misleading note',replyToEmail:'reply@example.test',smsSender:'Test',physicalAddress:'1 Test St',messageCategory:'newsletter',inclusionRuleJson:rules,exclusionRulesJson:'[]',sourceTypesJson:'[]',trackingEnabled:false,createdAt:now,updatedAt:now});
  for(let index=0;index<channels.length;index++) await database.insert(campaignSteps).values({id:`${id}-step-${index+1}`,revisionId,sequence:index+1,channel:channels[index],timezone,scheduledAt:new Date(+now+(index+1)*3600000),sendByAt:new Date(+now+8*3600000),whyThisTime:'Saved schedule',createdAt:now,updatedAt:now});
  return {database,revisionId};
}
export async function recipient(binding:D1Database,campaignId:string,step:number,disposition:string,reason:string|null=null,overrides:Record<string,unknown>={}) {
  const id=crypto.randomUUID(),now=fixedNow;
  await createDatabase(binding).insert(recipientSteps).values({id,campaignId,revisionId:`${campaignId}-revision`,stepId:`${campaignId}-step-${step}`,contactId:id,contactIdentityKey:id,channel:'email',destination:`${id}@example.test`,idempotencyKey:id,transportDisposition:disposition,skipReason:reason,attemptCount:0,sendByAt:new Date(+now+8*3600000),createdAt:now,updatedAt:now,...overrides});
  return id;
}
export async function dispatch(binding:D1Database,id:string,step=1) {
  await createDatabase(binding).insert(stepDispatches).values({stepId:`${id}-step-${step}`,revisionId:`${id}-revision`,state:'dispatching',startedAt:new Date(+fixedNow-3600000),createdAt:fixedNow,updatedAt:fixedNow});
}
export async function seedOutcomes(binding:D1Database) {
  await seedCampaign(binding,'scheduled','scheduled',['email','sms','email']);
  await createDatabase(binding).insert(campaignAudiences).values({id:'scheduled-audience',revisionId:'scheduled-revision',asOfAt:fixedNow,candidateCount:3,excludedCount:0,eligibleCount:3,exclusions:'[]',createdAt:fixedNow,updatedAt:fixedNow});
  for(const [channel,count] of [['email',2],['sms',1]] as const) await createDatabase(binding).insert(campaignAudienceChannelCounts).values({id:`scheduled-${channel}-count`,audienceId:'scheduled-audience',channel,recipientStepCount:count,createdAt:fixedNow,updatedAt:fixedNow});
  for(let i=1;i<=3;i++) await recipient(binding,'scheduled',i,'queued');
  await seedCampaign(binding,'sending','dispatching');await dispatch(binding,'sending');
  await recipient(binding,'sending',1,'queued');await recipient(binding,'sending',1,'accepted');await recipient(binding,'sending',1,'handoff-unknown');
  await seedCampaign(binding,'mixed','completed');await dispatch(binding,'mixed');
  for(const disposition of ['handed-off','accepted','delivered','bounced','failed']) await recipient(binding,'mixed',1,disposition,null,{handedOffAt:fixedNow,providerAcceptedAt:fixedNow,lastErrorCode:disposition==='failed'?'rejected':null,lastErrorDetail:disposition==='failed'?'Mailbox rejected the message':null});
  for(const reason of ['deadline-passed','frequency-window','unsubscribed','suppressed','not-eligible','quiet-hours-deadline','destination-changed','channel-not-subscribed','contact-erased','dormant','recent-product-purchase','unresolved-refund','recipient-timezone-unknown-or-stale','recipient-country-unknown','sender-not-registered','destination-changed-after-preparation','schedule-replaced','source-unavailable']) await recipient(binding,'mixed',1,'skipped',reason);
  await seedCampaign(binding,'missed','scheduled');await recipient(binding,'missed',1,'queued',null,{sendByAt:fixedNow});
  await binding.prepare('UPDATE campaign_steps SET send_by_at=?,scheduled_at=? WHERE revision_id=?').bind(+fixedNow,+fixedNow-3600000,'missed-revision').run();
  await seedCampaign(binding,'partial','completed');await dispatch(binding,'partial');await recipient(binding,'partial',1,'delivered');await recipient(binding,'partial',1,'skipped','deadline-passed');
  await seedCampaign(binding,'cancelled','cancelled');await dispatch(binding,'cancelled');await recipient(binding,'cancelled',1,'skipped','campaign-cancelled');await recipient(binding,'cancelled',1,'handoff-unknown');
  await seedCampaign(binding,'failed','failed');await dispatch(binding,'failed');await recipient(binding,'failed',1,'failed',null,{lastErrorCode:'adapter-unavailable',lastErrorDetail:'The email adapter is unavailable.'});
  await seedCampaign(binding,'failed-before','failed',['email','email','email']);
  for(let index=0;index<5;index++) await recipient(binding,'failed-before',1,'failed',null,{sendByAt:fixedNow,lastErrorCode:'adapter-unavailable',lastErrorDetail:'The email adapter is unavailable.'});
  await dispatch(binding,'failed-before',2);await recipient(binding,'failed-before',2,'accepted');
  await dispatch(binding,'failed-before',3);await recipient(binding,'failed-before',3,'handoff-unknown');
  await binding.prepare('UPDATE campaign_steps SET send_by_at=?,scheduled_at=? WHERE revision_id=?').bind(+fixedNow,+fixedNow-3600000,'failed-before-revision').run();
  await seedCampaign(binding,'closed-partial','completed');await dispatch(binding,'closed-partial');await recipient(binding,'closed-partial',1,'accepted');
  for(let index=0;index<4;index++) await recipient(binding,'closed-partial',1,'queued',null,{sendByAt:fixedNow});
  await recipient(binding,'closed-partial',1,'skipped','deadline-passed');
  await seedCampaign(binding,'closed-fence','dispatching');await dispatch(binding,'closed-fence');
  await recipient(binding,'closed-fence',1,'queued',null,{sendByAt:fixedNow,handoffStartedAt:new Date(+fixedNow-1000)});
  await binding.prepare('UPDATE campaign_steps SET send_by_at=?,scheduled_at=? WHERE revision_id IN (?,?)').bind(+fixedNow,+fixedNow-3600000,'closed-partial-revision','closed-fence-revision').run();
  await seedCampaign(binding,'unapproved','draft');
  await seedCampaign(binding,'dst','scheduled',['email'],'Australia/Sydney');await recipient(binding,'dst',1,'queued');
  await binding.prepare('UPDATE campaign_steps SET scheduled_at=? WHERE revision_id=?').bind(Date.parse('2031-10-05T00:00:00Z'),'dst-revision').run();
  // Old approvals and another campaign deliberately have misleading extra counts.
  await recipient(binding,'mixed',1,'delivered',null,{revisionId:'old-revision'});
  await recipient(binding,'sending',1,'delivered',null,{stepId:'mixed-step-1'});
}
export async function clearCampaigns(binding:D1Database) {
  for(const table of ['newsletter_archive','campaign_followups','open_estimate_facts','open_tracking_tokens','attribution_facts','link_click_facts','tracked_links','delivery_facts','public_token_rate_limits','public_action_tokens','campaign_revision_links','campaign_draft_step_settings','campaign_audience_channel_counts','campaign_audiences','recipient_steps','step_dispatches','campaign_steps','campaign_revisions','campaigns']) await binding.prepare(`DELETE FROM ${table}`).run();
}
