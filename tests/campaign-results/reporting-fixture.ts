import type { Platform } from '../../src/core/shared/platform';
import { seedCampaign, recipient } from './fixtures';

/** Historical provider facts are fixture data; clicks below enter through /l. */
export async function seedReporting(db:D1Database,platform:Platform) {
  const id='orchard-letter',now=Date.now(),destinations=['https://orchard.example.test/new-work','https://orchard.example.test/studio-notes','https://orchard.example.test/visit'];
  await seedCampaign(db,id,'completed',['email','sms']);
  const revisionId=`${id}-revision`,body=destinations.map((url,index)=>`<p><a href="${url}">${['New work','Studio notes','Visit the studio'][index]}</a></p>`).join('');
  await db.prepare('UPDATE campaign_revisions SET name=?,email_body=?,email_text=?,tracking_enabled=1,created_at=?,updated_at=? WHERE id=?').bind('October studio letter',body,'New work, studio notes and a studio visit',now-7*86400000,now-7*86400000,revisionId).run();
  await db.prepare('UPDATE campaign_steps SET scheduled_at=?,send_by_at=? WHERE revision_id=?').bind(now-7*86400000,now-6*86400000,revisionId).run();
  const people=[['ada','Ada Collins'],['ben','Ben Rivera'],['chris','Chris Nguyen'],['drew','Drew Morgan'],['erin','Erin Patel']];
  for(const[contactId,name]of people)await db.prepare("INSERT OR REPLACE INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES(?,?,?,'subscribed','never-subscribed',?,?)").bind(contactId,`${contactId}@example.test`,name,now,now).run();
  const engaged=await recipient(db,id,1,'delivered',null,{contactId:'ada',destination:'ada@example.test',deliveredAt:new Date(now-7*86400000)});
  const bounced=await recipient(db,id,1,'bounced',null,{contactId:'ben',destination:'ben@example.test'});
  const complained=await recipient(db,id,1,'delivered',null,{contactId:'chris',destination:'chris@example.test',complainedAt:new Date(now-6*86400000)});
  const unsubscribed=await recipient(db,id,1,'accepted',null,{contactId:'drew',destination:'drew@example.test'});
  await recipient(db,id,2,'skipped','quiet-hours-deadline',{contactId:'erin',channel:'sms',destination:'+15555550123'});
  await recipient(db,id,1,'delivered',null,{contactId:'erased-reference',destination:''});
  await db.prepare("INSERT INTO delivery_facts(id,identity_key,recipient_step_id,provider,provider_message_id,provider_event_id,kind,provider_occurred_at,payload_digest,detail_json,created_at) VALUES(?,'report-bounce-1',?,'sendgrid','provider-bounce','bounce-1','bounced',?,'fixture-bounce-digest',?,?)").bind(crypto.randomUUID(),bounced,now-7*86400000,JSON.stringify({hard:true,bounceType:'hard',reason:'550 mailbox does not exist'}),now).run();
  await db.prepare("INSERT INTO public_action_tokens(id,contact_id,channel,recipient_step_id,purpose,token_digest,expires_at,used_at,created_at,updated_at) VALUES('used-message-optout','drew','email',?,'unsubscribe','fixture-consumed-optout',?,?,?,?)").bind(unsubscribed,now+86400000,now-5*86400000,now-7*86400000,now-5*86400000).run();
  const links=[] as {destinationUrl:string;ada:string;chris:string}[];
  for(const[index,destinationUrl]of destinations.entries()) {
    const linkId=`orchard-link-${index+1}`;
    await db.prepare('INSERT INTO campaign_revision_links(id,revision_id,sequence,label,destination_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(linkId,revisionId,index+1,['New work','Studio notes','Visit the studio'][index],destinationUrl,now,now).run();
    const tokens:string[]=[];
    for(const recipientStepId of[engaged,complained]) {
      const expiresAt=new Date(now+86400000),token=await platform.publicTokens.issue({id:crypto.randomUUID(),purpose:'link',expiresAt});
      await db.prepare('INSERT INTO tracked_links(token_digest,recipient_step_id,destination_url,expires_at,created_at,revision_link_id) VALUES(?,?,?,?,?,?)').bind(await platform.publicTokens.digest(token),recipientStepId,destinationUrl,+expiresAt,now,linkId).run();tokens.push(token);
    }
    links.push({destinationUrl,ada:tokens[0],chris:tokens[1]});
  }
  return {campaignId:id,revisionId,links,bounced,complained,unsubscribed};
}
