import {claimSmsFrequency} from './frequency-claim';
import {marketingFrequencyWindowMs} from '@/core/features/lifecycle/policies';
import {marketingOccurrenceSql} from '@/core/features/lifecycle/marketing-history';
import type { Database } from '@/core/platform/db/client';
import type { AppConfig, DeliveryRequest } from '@/core/shared/platform';
import { ProviderDeferredError } from '@/core/shared/provider-deferred-error';
import { sha256 } from '@/core/shared/ids';
import { smsPolicyAuthority, smsPolicyBinding, smsComplianceBlock } from './content';
import { smsWindow, nextPermittedSmsInstant } from './policy';
const refuse=(code:string):never=>{throw new ProviderDeferredError(new Date(Date.now()+60000),code);};
/** Called after provider sender reads. The returned synchronous guard must run
 * again after the budget reservation, immediately before the provider POST. */
export type SmsTransportGuard=(()=>void)&{accepted():Promise<void>;failed(error:unknown):Promise<void>};
export async function prepareSmsTransportGuard(database:Database,config:AppConfig,request:DeliveryRequest):Promise<SmsTransportGuard>{
 let frequency:Parameters<typeof claimSmsFrequency>[1]|undefined;
 let binding;try{binding=await smsPolicyAuthority(config);}catch{return refuse('sms-configuration-unavailable');}
 const authority=request.smsAuthority;
 if(!authority||!Number.isFinite(authority.expiresAt)||authority.policyDigest!==binding.digest||request.sender!==binding.sender)return refuse('sms-policy-changed-review-required');
 const {policy,sender,json}=binding,db=database.$client,hash=await sha256(`${config.contactHashSalt}:${request.to}`);
 if(!request.content.text.endsWith(smsComplianceBlock(policy,sender)))return refuse('sms-managed-disclosure-missing');
 const phone=await db.prepare(`SELECT p.contact_id,p.time_zone,p.location_source,p.location_recorded_at FROM contact_phones p JOIN contacts c ON c.id=p.contact_id
  WHERE p.phone_e164=? AND p.identity_status='active' AND c.merge_lock IS NULL`).bind(request.to).first<{contact_id:string;time_zone:string|null;location_source:string|null;location_recorded_at:number|null}>();
 if(!phone)return refuse('sms-location-evidence-missing-or-stale');
 if(request.purpose==='consent-confirmation'||request.purpose==='sms-compliance'){
  const service=await db.prepare("SELECT id FROM sms_service_messages WHERE id=? AND contact_id=? AND destination_hash=? AND sender=? AND purpose=? AND policy_digest=? AND state='sending' AND expires_at>?")
   .bind(request.idempotencyKey,phone.contact_id,hash,sender,request.purpose,binding.digest,Date.now()).first();
  if(!service)return refuse('sms-service-authority-changed');
 }else if(request.content.test){
  if(!config.modules.sms.enabled||!config.modules.sms.config.testAllowlist.includes(request.to))return refuse('sms-test-destination-not-allowed');
 }else{
  const approved=await db.prepare(`SELECT r.id FROM recipient_steps r JOIN sms_approval_policies a ON a.revision_id=r.revision_id JOIN campaign_revisions v ON v.id=r.revision_id
   WHERE r.id=? AND r.idempotency_key=? AND r.contact_id=? AND r.destination=? AND r.channel='sms' AND a.policy_digest=? AND a.sender=? AND v.sms_sender=? AND v.message_category=? AND v.state='approved' AND r.send_by_at>?`)
   .bind(request.recipientStepId,request.idempotencyKey,phone.contact_id,request.to,binding.digest,sender,sender,policy.category,Date.now()).first();
  if(!approved)return refuse('sms-approval-policy-changed-review-required');
  const consent=await db.prepare(`SELECT e.id FROM consent_evidence e JOIN contacts c ON c.id=e.contact_id JOIN contact_phones p ON p.contact_id=e.contact_id AND p.phone_e164=e.destination
   WHERE e.contact_id=? AND e.destination=? AND e.channel='sms' AND e.confirmed_at IS NOT NULL AND e.brand_or_legal_sender=? AND e.sms_program=? AND e.message_category=? AND e.frequency_disclosure=? AND e.destination_jurisdiction=?
   AND c.sms_status='subscribed' AND p.channel_status='subscribed' AND NOT EXISTS(SELECT 1 FROM contact_suppressions s WHERE s.channel='sms' AND s.destination_hash=?)
   AND NOT EXISTS(SELECT 1 FROM surviving_opt_outs o WHERE o.channel='sms' AND o.destination_hash=? AND o.occurred_at>=e.occurred_at) LIMIT 1`)
   .bind(phone.contact_id,request.to,policy.brand,policy.programme,policy.category,policy.frequency,policy.jurisdiction,hash,hash).first();
  if(!consent)return refuse('sms-consent-scope-changed');
  const previous=await db.prepare(`SELECT MAX(${marketingOccurrenceSql}) AS at FROM recipient_steps WHERE destination=? AND channel='sms' AND id<>?`).bind(request.to,request.recipientStepId).first<{at:number|null}>();
  const interval=marketingFrequencyWindowMs('sms',config);
  if(!Number.isFinite(interval))return refuse('sms-frequency-policy-unavailable');
  if(previous?.at&&Date.now()-previous.at<interval)throw new ProviderDeferredError(new Date(previous.at+interval),'sms-frequency-window');
  frequency={destinationHash:hash,contactId:phone.contact_id,recipientStepId:request.recipientStepId,interval,sendByAt:authority.expiresAt};
 }
 const guard=()=>{
  let current;try{current=smsPolicyBinding(config);}catch{return refuse('sms-configuration-unavailable');}
  if(current.json!==json||Date.now()>=authority.expiresAt)return refuse('sms-policy-or-deadline-changed');
  const window=smsWindow(current.policy,new Date(),phone.time_zone,phone.location_source,phone.location_recorded_at);
  if(!window.allowed){
   const next=nextPermittedSmsInstant(current.policy,new Date(),phone.time_zone,phone.location_source,phone.location_recorded_at,new Date(authority.expiresAt));
   throw new ProviderDeferredError(next.at??new Date(authority.expiresAt),next.at?window.reason:next.reason);
  }
 };
 guard();
 const claim=frequency?await claimSmsFrequency(database,frequency):undefined;
 return Object.assign(guard,{accepted:async()=>{await claim?.accepted();},failed:async(error:unknown)=>{await claim?.failed(error);}});
}
