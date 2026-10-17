import {createDatabase} from '../../src/core/platform/db/client';
import {consentEvidence,contactEmailAddresses} from '../../src/core/features/audience/schema';
import type {Platform} from '../../src/core/shared/platform';
import {seedCampaign,recipient} from './fixtures';
export async function seedFollowup(db:D1Database,platform:Platform) {
  const now=Date.now(),sent=now-72*3600000,id='studio-followup-source';
  await seedCampaign(db,id,'completed');await seedCampaign(db,'studio-recent-send','completed');
  await db.prepare('UPDATE campaign_revisions SET name=?,email_subject=?,sender_name=?,message_category=? WHERE id=?').bind('The October studio letter','New ceramics from the studio',platform.config.mailSender.displayName,'newsletter',`${id}-revision`).run();
  await db.prepare('UPDATE campaign_steps SET scheduled_at=?,send_by_at=? WHERE revision_id=?').bind(sent,sent+3600000,`${id}-revision`).run();
  const people=['clicker','scanner','reader','unsubscribed','suppressed','frequent'];
  const database=createDatabase(db),recipientIds:Record<string,string>={};
  for(const person of people) {
    const contactId=`followup-${person}`,email=`${contactId}@example.test`,status=person==='unsubscribed'||person==='suppressed'?person:'subscribed';
    await db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,email_status_at,created_at,updated_at) VALUES(?,?,?,?,'never-subscribed',?,?,?) ON CONFLICT(id) DO UPDATE SET email_status=excluded.email_status,updated_at=excluded.updated_at").bind(contactId,email,`Studio ${person}`,status,now-86400000,now-86400000,now).run();
    await db.prepare('DELETE FROM contact_email_addresses WHERE id=?').bind(contactId+'-address').run();
    await database.insert(contactEmailAddresses).values({id:contactId+'-address',contactId,email,channelStatus:status,channelStatusAt:new Date(now-86400000),createdAt:new Date(now),updatedAt:new Date(now)});
    await db.prepare('DELETE FROM consent_evidence WHERE id=?').bind(contactId+'-consent').run();
    await database.insert(consentEvidence).values({id:contactId+'-consent',contactId,channel:'email',destination:email,brandOrLegalSender:platform.config.mailSender.displayName,messageCategory:'newsletter',frequencyDisclosure:'Weekly studio letters',destinationJurisdiction:'US',captureMethod:'hosted-signup-form',captureSource:'Studio newsletter',consentText:'Send me studio newsletters.',consentVersion:'v1',occurredAt:new Date(now-86400000),confirmationRequired:true,confirmedAt:new Date(now-86000000),createdAt:new Date(now-86400000),updatedAt:new Date(now-86000000)});
    recipientIds[person]=await recipient(db,id,1,'accepted',null,{contactId,destination:email,handedOffAt:new Date(sent),providerAcceptedAt:new Date(sent),handoffStartedAt:new Date(sent),createdAt:new Date(sent),updatedAt:new Date(sent)});
  }
  await recipient(db,'studio-recent-send',1,'accepted',null,{contactId:'followup-frequent',destination:'followup-frequent@example.test',handedOffAt:new Date(now-3600000),providerAcceptedAt:new Date(now-3600000)});
  for(const person of ['clicker','scanner'])await db.prepare('INSERT INTO link_click_facts(id,recipient_step_id,request_digest,destination_url,occurred_at,automated,created_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),recipientIds[person],person,'https://studio.example.test',sent+3600000,Number(person==='scanner'),now).run();
  return {campaignId:id,sent,expectedCandidateIds:people.filter(p=>p!=='clicker').map(p=>`followup-${p}`),expectedEligibleIds:['followup-scanner','followup-reader']};
}

/** Historical sent-message pixel records use the production token preparer. */
export async function seedFollowupOpens(db:D1Database,platform:Platform) {
  const {appendOpenPixel}=await import('../../src/core/features/insights/open-tracking');
  const recipients=(await db.prepare("SELECT id,contact_id,handoff_started_at FROM recipient_steps WHERE campaign_id='studio-followup-source' AND channel='email'").all<{id:string;contact_id:string;handoff_started_at:number}>()).results;
  for(const row of recipients)await appendOpenPixel(platform,row.id,'<p>A recorded studio letter</p>',new Date(Date.now()+86400000));
  const opened=recipients.find(row=>row.contact_id==='followup-unsubscribed')!;
  await db.prepare('INSERT INTO open_estimate_facts(recipient_step_id,occurred_at) VALUES(?,?)').bind(opened.id,opened.handoff_started_at+3600000).run();
  return {ok:true};
}
