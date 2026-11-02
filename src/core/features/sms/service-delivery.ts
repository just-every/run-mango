import {ToolRefusal} from '@/vendor/base/agent-door/index.ts';
import {agentAction,agentAttribution} from '../agent-door/context';
import {saveWork,admitWork} from '../agent-door/custody';
import {assertAgentHandoff} from '../settings/sender-authority';
import { smsPolicyAuthority, managedSmsText } from './content';
import { ProviderDeferredError } from '@/core/shared/provider-deferred-error';
import { smsSegments } from './segments';
import { ProviderTransportError, type DeliveryRequest, type Platform } from '@/core/shared/platform';
import { sha256 } from '@/core/shared/ids';
import { programme, smsWindow } from './policy';
import { prepareHandoffCost, cancelHandoffCost, settleHandoffCost, settleHandoffFailure } from '@/core/features/insights/cost-handoff';
const deferralCodes=new Set(['message-exceeds-provider-budget','provider-pacing','provider-policy-unavailable','sender-verification-unavailable','provider-hold','provider-outage','sms-configuration-unavailable','sms-policy-changed-review-required','sms-managed-disclosure-missing','sms-location-evidence-missing-or-stale','sms-service-authority-changed','sms-test-destination-not-allowed','sms-approval-policy-changed-review-required','sms-consent-scope-changed','sms-frequency-policy-unavailable','sms-frequency-window','sms-policy-or-deadline-changed','sms-policy-evidence-stale','sms-time-zone-invalid','sms-quiet-window','quiet-hours-deadline']);
type Message={id:string;contact_id:string;destination_hash:string;sender:string;purpose:'consent-confirmation'|'sms-compliance';consent_id:string|null;policy_digest:string;payload_ciphertext:string|null;expires_at:number;state:string};
/** The stored payload is AES-GCM encrypted by the deployment's public-token signer.
 * A durable sending fence is committed before the only possible provider POST. */
export async function queueSmsService(platform:Platform,request:DeliveryRequest,input:{contactId:string;consentId?:string;expiresAt:Date}){
 const binding=await smsPolicyAuthority(platform.config);
 request={...request,smsAuthority:{policyDigest:binding.digest,expiresAt:input.expiresAt.getTime()},content:{...request.content,text:managedSmsText(request.content.text,binding.policy,binding.sender)}};
 if(smsSegments(request.content.text).segments>10)throw new Error('SMS service content exceeds the provider limit of ten segments. Shorten the configured programme disclosures.');
 const attribution=agentAttribution();if(attribution)request.content.text+='\nPrepared by '+attribution.label;
 const db=platform.database.$client,now=Date.now();
 const destinationHash=await sha256(`${platform.config.contactHashSalt}:${request.to}`);
 const ciphertext=await platform.publicTokens.issue({id:JSON.stringify(request),purpose:'sms-service-payload',expiresAt:input.expiresAt});
 await db.prepare(`INSERT INTO sms_service_messages(id,contact_id,destination_hash,sender,purpose,consent_id,policy_digest,payload_ciphertext,state,expires_at,next_at,created_at,updated_at)
 VALUES(?,?,?,?,?,?,?,?,'queued',?,?,?,?) ON CONFLICT(id) DO NOTHING`).bind(request.idempotencyKey,input.contactId,destinationHash,request.sender,request.purpose,input.consentId??null,binding.digest,ciphertext,input.expiresAt.getTime(),now,now,now).run();
 await saveWork(db,'sms-service',request.idempotencyKey,'mango.consent.dispatch',{});
 return deliverSmsService(platform,request.idempotencyKey);
}
export async function deliverSmsService(platform:Platform,id:string,now=new Date()):Promise<string>{
 if(!agentAction.getStore()&&await platform.database.$client.prepare("SELECT 1 FROM mango_agent_work WHERE kind='sms-service' AND target_id=?").bind(id).first()){
  const result=await admitWork(platform.database.$client,platform.agentDoor,'sms-service',id,{id},()=>deliverSmsService(platform,id,now)) as {result?:{state?:string}};
  return result?.result?.state??'deferred';
 }
 const started=Date.now(),db=platform.database.$client,row=await db.prepare('SELECT * FROM sms_service_messages WHERE id=?').bind(id).first<Message>();
 if(!row || row.state!=='queued')return row?.state??'missing';
 const finish=async(state:string,reason:string)=>{await db.prepare("UPDATE sms_service_messages SET state=?,reason=?,payload_ciphertext=NULL,updated_at=? WHERE id=? AND state='queued'").bind(state,reason,now.getTime(),id).run();return state;};
 if(row.expires_at<=now.getTime())return finish('expired','sms-service-deadline');
 let policy;try{policy=programme(platform);}catch{return finish('blocked','sms-configuration-unavailable');}
 const module=platform.config.modules.sms;if(!module.enabled||!platform.sms)return finish('blocked','sms-configuration-unavailable');
 if(row.policy_digest!==(await smsPolicyAuthority(platform.config)).digest)return finish('blocked','sms-programme-policy-changed');
 if(row.sender!==module.config.confirmationSender)return finish('blocked','sms-sender-changed');
 if(!row.payload_ciphertext)return finish('blocked','sms-payload-unavailable');
 let request:DeliveryRequest;
 try{request=JSON.parse((await platform.publicTokens.verify(row.payload_ciphertext,'sms-service-payload')).id);request.handoffStartedAt=now;}catch{return finish('blocked','sms-payload-unavailable');}
 if(request.sender!==row.sender||request.idempotencyKey!==row.id||request.purpose!==row.purpose||await sha256(`${platform.config.contactHashSalt}:${request.to}`)!==row.destination_hash)return finish('blocked','sms-payload-identity-mismatch');
 const phone=await db.prepare("SELECT p.phone_e164,p.time_zone,p.location_source,p.location_recorded_at FROM contact_phones p JOIN contacts c ON c.id=p.contact_id WHERE p.contact_id=? AND p.phone_e164=? AND p.identity_status='active' AND c.merge_lock IS NULL").bind(row.contact_id,request.to).first<{phone_e164:string;time_zone:string|null;location_source:string|null;location_recorded_at:number|null}>();
 if(!phone || await sha256(`${platform.config.contactHashSalt}:${phone.phone_e164}`)!==row.destination_hash)return finish('blocked','sms-destination-changed');
 const window=smsWindow(policy,now,phone.time_zone,phone.location_source,phone.location_recorded_at);
 if(!window.allowed){await db.prepare("UPDATE sms_service_messages SET reason=?,next_at=?,updated_at=? WHERE id=? AND state='queued'").bind(window.reason,now.getTime()+60000,now.getTime(),id).run();return 'deferred';}
 await assertAgentHandoff(platform);
 const validation=await platform.sms.validateSender(row.sender,policy.jurisdiction);
 if(!validation.ready)return finish('blocked','sms-sender-not-approved');
 const adapter=platform.sms,provider=(await adapter.capabilities()).provider??'mobile-message';
 // Concurrent preflights own separate cost reservations; losing the send fence
 // may cancel only this caller's reservation, never the winner's cost.
 const cost={key:`handoff:${provider}:${id}:attempt:${crypto.randomUUID()}`,provider,operation:'confirmation-handoff' as const};
 await prepareHandoffCost(platform.database,adapter,request,cost);
 const handoffNow=new Date(now.getTime()+Date.now()-started);
 if(row.expires_at<=handoffNow.getTime()){await cancelHandoffCost(platform.database,cost.key);return finish('expired','sms-service-deadline');}
 if(!smsWindow(policy,handoffNow,phone.time_zone,phone.location_source,phone.location_recorded_at).allowed){await cancelHandoffCost(platform.database,cost.key);await db.prepare("UPDATE sms_service_messages SET reason='sms-quiet-window',next_at=? WHERE id=? AND state='queued'").bind(handoffNow.getTime()+60000,id).run();return 'deferred';}
 // Same transaction checks destination, restrictions and affirmative evidence at handoff.
 const eligibility=row.purpose==='sms-compliance'?'1':`EXISTS(SELECT 1 FROM consent_evidence e JOIN consent_confirmations f ON f.consent_evidence_id=e.id JOIN contact_phones p ON p.contact_id=e.contact_id AND p.phone_e164=e.destination JOIN contacts c ON c.id=e.contact_id WHERE e.id=sms_service_messages.consent_id AND e.contact_id=sms_service_messages.contact_id AND e.channel='sms' AND e.confirmed_at IS NULL AND f.confirmed_at IS NULL AND f.expires_at>${handoffNow.getTime()} AND c.merge_lock IS NULL AND p.identity_status='active' AND c.sms_status<>'suppressed' AND (c.sms_status<>'unsubscribed' OR coalesce(c.sms_status_at,0)<e.occurred_at) AND p.channel_status<>'suppressed' AND (p.channel_status<>'unsubscribed' OR p.channel_status_at<e.occurred_at) AND NOT EXISTS(SELECT 1 FROM contact_suppressions s WHERE s.destination_hash=sms_service_messages.destination_hash AND s.channel='sms') AND NOT EXISTS(SELECT 1 FROM surviving_opt_outs o WHERE o.destination_hash=sms_service_messages.destination_hash AND o.channel='sms' AND o.occurred_at>=e.occurred_at))`;
 await assertAgentHandoff(platform);
 const claimed=await db.prepare(`UPDATE sms_service_messages SET state='sending',updated_at=? WHERE id=? AND state='queued' AND expires_at>? AND EXISTS(SELECT 1 FROM contact_phones p JOIN contacts c ON c.id=p.contact_id WHERE c.id=sms_service_messages.contact_id AND p.phone_e164=? AND p.identity_status='active' AND c.merge_lock IS NULL) AND ${eligibility} RETURNING id`).bind(handoffNow.getTime(),id,handoffNow.getTime(),request.to).first();
 if(!claimed){await cancelHandoffCost(platform.database,cost.key);return finish('blocked','sms-consent-or-destination-changed');}
 try{
  const result=await adapter.send(request);
  await db.prepare("UPDATE sms_service_messages SET state=?,provider_message_id=?,reason=?,payload_ciphertext=NULL,updated_at=? WHERE id=? AND state='sending'").bind(result.disposition==='accepted'?'accepted':'uncertain',result.providerMessageId||null,result.disposition==='accepted'?null:'sms-handoff-unconfirmed',Date.now(),id).run();
  try{await settleHandoffCost(platform.database,adapter,request,cost,result);}catch{ /* persisted receipt remains authoritative */ }
  return result.disposition;
 }catch(error){
  // The shared transport's typed deferral guarantees it made no provider handoff.
  if(error instanceof ProviderDeferredError){
   await db.prepare("UPDATE sms_service_messages SET state='queued',reason=?,next_at=?,updated_at=? WHERE id=? AND state='sending'").bind(deferralCodes.has(error.code)?error.code:'sms-provider-deferred',error.retryAt.getTime(),Date.now(),id).run();await cancelHandoffCost(platform.database,cost.key);return 'deferred';
  }
  await db.prepare("UPDATE sms_service_messages SET state=?,reason=?,payload_ciphertext=NULL,updated_at=? WHERE id=? AND state='sending'").bind(error instanceof ProviderTransportError?'blocked':'uncertain',error instanceof ProviderTransportError?'sms-provider-rejected':'sms-handoff-unconfirmed',Date.now(),id).run();
  try{await settleHandoffFailure(platform.database,adapter,request,cost,error);}catch{ /* durable prepared cost retains uncertainty */ }
  return error instanceof ProviderTransportError?'blocked':'uncertain';
 }
}
export async function resumeSmsServices(platform:Platform,now=new Date()){
 const db=platform.database.$client;
 await db.prepare("UPDATE sms_service_messages SET state='expired',reason='sms-service-deadline',payload_ciphertext=NULL,updated_at=? WHERE state='queued' AND expires_at<=?").bind(now.getTime(),now.getTime()).run();
 // Crashed handoffs remain fenced and visible, even after the provider's replay window.
 await db.prepare("UPDATE sms_service_messages SET state='uncertain',reason='sms-handoff-unconfirmed',payload_ciphertext=NULL WHERE state='sending' AND updated_at<?").bind(Date.now()-300000).run();
 const rows=await db.prepare("SELECT id FROM sms_service_messages WHERE state='queued' AND next_at<=? ORDER BY next_at LIMIT 10").bind(now.getTime()).all<{id:string}>();
 for(const row of rows.results){try{await deliverSmsService(platform,row.id,now);}catch(error){if(!(error instanceof ToolRefusal))throw error;}}
}
