import { recordPortableHash } from '@/core/features/audience/portable-hashes';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Platform } from '@/core/shared/platform';
import { sha256 } from '@/core/shared/ids';
import { canonicalPhone } from '@/core/features/audience/identity';
import { decodeProviderReference } from '@/core/shared/provider-reference';
import { programme } from './policy';
import { queueSmsService } from './service-delivery';
const inbound=z.object({type:z.enum(['inbound','unsubscribe']),to:z.string().regex(/^\+?61\d{9}$/),sender:z.string().regex(/^\+?61\d{9}$/),message:z.string().max(4000),received_at:z.string().regex(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/),original_message_id:z.string().max(200),original_custom_ref:z.string().max(1000)}).strict();
const stop=new Set(['STOP','STOPALL','END','QUIT','CANCEL','UNSUBSCRIBE','OPTOUT','REVOKE']);
export function createSmsInboundRoutes(platform:Platform){
 const routes=new Hono();
 routes.post('/webhooks/sms/mobile-message',async(context,next)=>{
  const module=platform.config.modules.sms;
  if(!module.enabled||!platform.sms)return context.json({error:'sms_unavailable'},503);
  if(Number(context.req.header('content-length')??0)>16384)return context.json({error:'invalid_sms_webhook'},400);
  let verified,payload;
  try{const request=context.req.raw.clone(),reader=request.body?.getReader(),chunks:Uint8Array[]=[];let size=0;if(!reader)throw new Error();try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>16384){await reader.cancel();throw new Error();}chunks.push(part.value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}verified=await platform.sms.verifyWebhook(new Request(context.req.url,{method:'POST',headers:context.req.raw.headers,body:bytes}));payload=JSON.parse(verified.rawBody);}catch{return context.json({error:'invalid_sms_signature'},401);}
  if(payload && typeof payload==='object' && !['inbound','unsubscribe'].includes(payload.type))return next();
  const parsed=inbound.safeParse(payload);if(!parsed.success)return context.json({error:'invalid_sms_webhook'},400);
  const value=parsed.data,policy=programme(platform),sender=canonicalPhone(`+${value.to.replace(/^\+/,'')}`)!,destination=canonicalPhone(`+${value.sender.replace(/^\+/,'')}`)!;
  if(sender!==canonicalPhone(`+${module.config.confirmationSender.replace(/^\+/,'')}`))return context.json({error:'sms_sender_mismatch'},400);
  const occurred=Date.parse(value.received_at.replace(' ','T')+'Z');
  if(!Number.isFinite(occurred)||occurred>Date.now()+300000||new Date(occurred).toISOString().slice(0,19)!==value.received_at.replace(' ','T'))return context.json({error:'invalid_sms_event_time'},400);
  const keyword=value.message.trim().toUpperCase().split(/[^A-Z]+/)[0];
  const action=value.type==='unsubscribe'||stop.has(keyword)?'opt-out':['HELP','INFO'].includes(keyword)?'help':['START','UNSTOP'].includes(keyword)?'fresh-consent':'none';
  const reference=decodeProviderReference(value.original_custom_ref);
  if(!reference&&action!=='opt-out')return context.json({error:'sms_reply_unlinked'},400);
  const db=platform.database.$client,hash=await sha256(`${platform.config.contactHashSalt}:${destination}`);
  const contact=await db.prepare('SELECT c.id FROM contacts c JOIN contact_phones p ON p.contact_id=c.id WHERE p.phone_e164=? AND c.merge_lock IS NULL').bind(destination).first<{id:string}>();
  if(!contact&&action!=='opt-out')return context.json({error:'sms_reply_unlinked'},400);
  const linked=contact&&reference? await db.prepare(`SELECT id FROM sms_service_messages WHERE id=? AND provider_message_id=? AND contact_id=? AND destination_hash=? AND sender=?
   UNION ALL SELECT r.id FROM recipient_steps r JOIN campaign_revisions v ON v.id=r.revision_id WHERE (r.idempotency_key=? OR r.id=?) AND r.provider_message_id=? AND r.contact_id=? AND r.destination=? AND r.channel='sms' AND v.sms_sender=? LIMIT 1`)
   .bind(reference,value.original_message_id,contact.id,hash,module.config.confirmationSender,reference,reference,value.original_message_id,contact.id,destination,module.config.confirmationSender).first():null;
  if(!linked&&action!=='opt-out')return context.json({error:'sms_reply_unlinked'},400);
  // No event ID exists in the documented inbound envelope; canonical immutable
  // fields plus account secret binding give stable identity across JSON reformatting.
  const id=`sms-inbound:${await sha256(`${await sha256(module.config.webhookSecret)}:${JSON.stringify([sender,destination,value.message,value.received_at,value.type,value.original_message_id,value.original_custom_ref])}`)}`;
  const now=Date.now();
  const restrict=()=>[
   recordPortableHash(db,hash,destination),
   db.prepare("INSERT INTO surviving_opt_outs(id,destination_hash,channel,reason,occurred_at,created_at,updated_at) VALUES(?,?,'sms',?,?,?,?) ON CONFLICT DO NOTHING").bind(`${id}:optout`,hash,id,occurred,now,now),
   db.prepare("UPDATE contacts SET sms_status='unsubscribed',sms_status_at=max(coalesce(sms_status_at,0),?),updated_at=? WHERE id IN (SELECT contact_id FROM contact_phones WHERE phone_e164=?) AND sms_status<>'suppressed'").bind(occurred,now,destination),
   db.prepare("UPDATE contact_phones SET channel_status='unsubscribed',channel_status_at=max(channel_status_at,?),updated_at=? WHERE phone_e164=? AND channel_status<>'suppressed'").bind(occurred,now,destination),
  ];
  // The provider documents empty original fields for a sender without a prior
  // outbound message. Its authenticated originating phone may always opt out.
  // Unknown phones retain only portable restrictions, without creating a person.
  if(action==='opt-out')await db.batch(restrict());
  if(!contact)return context.body(null,204);
  const statements=[db.prepare('INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(`${id}:history`,contact.id,'sms-compliance-reply',`SMS ${action} received for ${policy.programme}.`,occurred,now,now),db.prepare('INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN EXISTS(SELECT 1 FROM contacts c JOIN contact_phones p ON p.contact_id=c.id WHERE c.id=? AND p.phone_e164=? AND c.merge_lock IS NULL) THEN 1 ELSE 0 END').bind(contact.id,destination),db.prepare('INSERT INTO sms_inbound_receipts(id,contact_id,destination_hash,action,occurred_at,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,contact.id,hash,action,occurred,now),
   db.prepare(`INSERT INTO sms_compliance_replies(id,provider_event_id,contact_id,channel,canonical_action,keyword,sender,program,jurisdiction,occurred_at,created_at,updated_at) VALUES(?,?,?,'sms',?,?,?,?,?,?,?,?) ON CONFLICT(provider_event_id) DO NOTHING`).bind(id,id,contact.id,action,stop.has(keyword)||['HELP','INFO','START','UNSTOP'].includes(keyword)?keyword:'OTHER',sender,policy.programme,policy.jurisdiction,occurred,now,now)];
  await db.batch(statements); // restriction is durable before any acknowledgement or response
  if(action==='none'||policy.providerAlreadyReplies)return context.body(null,204);
  const text=action==='opt-out'?`${policy.brand} - ${policy.programme}: you are unsubscribed. No further marketing SMS. Help: ${policy.support}.`
   :action==='help'?`${policy.brand} - ${policy.programme}. ${policy.frequency}. Help: ${policy.support}. Reply STOP to unsubscribe.`
   :`${policy.brand} - ${policy.programme}. To request fresh consent for ${policy.category} (${policy.frequency}), review and confirm at ${new URL('/subscribe?channel=sms',platform.config.publicBaseUrl)}. Reply STOP to unsubscribe.`;
  await queueSmsService(platform,{purpose:'sms-compliance',recipientStepId:id,idempotencyKey:id,handoffStartedAt:new Date(),to:destination,sender:module.config.confirmationSender,content:{text},callbackUrl:new URL('/webhooks/sms/mobile-message',platform.config.publicBaseUrl).toString()},{contactId:contact.id,expiresAt:new Date(now+86400000)});
  return context.body(null,204);
 });
 return routes;
}
