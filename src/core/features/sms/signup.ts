import { Hono } from 'hono';
import { z } from 'zod';
import type { Platform } from '@/core/shared/platform';
import type { createAudienceService } from '@/core/features/audience/service';
import { sha256 } from '@/core/shared/ids';
import { signupNetwork, signupLimits, reserveSignupAllowance, verifySignupChallenge } from '@/core/features/audience/signup-security';
import { programme } from './policy';
import { limitedBody } from '@/core/features/audience/signup-routes';
const capture=z.object({phone:z.string().regex(/^\+61\d{9}$/),consent:z.literal(true),timeZone:z.string().min(1).max(100),disclosure:z.string(),website:z.string().optional(),'cf-turnstile-response':z.string().optional()});
export function smsSignupDescription(platform:Platform){
 if(!platform.config.modules.sms.enabled||!platform.sms)return undefined;
 const policy=programme(platform),text=`I agree to receive ${policy.category} SMS from ${policy.brand}, programme ${policy.programme}, ${policy.frequency}. Reply STOP to unsubscribe. Help: ${policy.support}.`;
 return {sender:platform.config.modules.sms.config.confirmationSender,brand:policy.brand,programme:policy.programme,frequency:policy.frequency,jurisdiction:policy.jurisdiction,consentText:text,disclosure:JSON.stringify({text,version:'sms-signup-v1',sender:platform.config.modules.sms.config.confirmationSender})};
}
export function createSmsSignupRoutes(platform:Platform,service:ReturnType<typeof createAudienceService>){
 const routes=new Hono(),db=platform.database.$client;
 routes.post('/subscribe/sms',async context=>{
  if(!platform.config.modules.sms.enabled||!platform.sms)return context.json({error:'sms_unavailable'},503);
  let raw:unknown;try{raw=JSON.parse(await limitedBody(context.req.raw));}catch{return context.json({error:'invalid_signup_body'},400);}
  const parsed=capture.safeParse(raw);if(!parsed.success)return context.json({error:'invalid_sms_signup',fields:parsed.error.flatten().fieldErrors},400);
  const input=parsed.data,ip=context.req.header('CF-Connecting-IP')??'',network=signupNetwork(ip);
  if(!network)return context.json({error:'client_ip_required'},400);
  if(!await verifySignupChallenge(platform,input['cf-turnstile-response'],ip))return context.json({error:'verification_failed'},400);
  const hash=await sha256(`${platform.config.contactHashSalt}:signup-sms:${input.phone}`),networkHash=await sha256(`${platform.config.contactHashSalt}:signup:${network}`);
  if(!await reserveSignupAllowance(db,`signup:${networkHash}`,'hour',signupLimits.networkPerHour))return context.json({error:'rate_limited'},429);
  const success=()=>context.json({status:'confirmation-required'},202);
  if(input.website)return success();
  const description=smsSignupDescription(platform)!,policy=programme(platform);
  if(input.disclosure!==description.disclosure)return context.json({error:'signup_disclosure_changed'},409);
  try{if(!input.timeZone.startsWith('Australia/'))throw new Error();new Intl.DateTimeFormat('en',{timeZone:input.timeZone});}catch{return context.json({error:'invalid_sms_time_zone'},400);}
  const status=await db.prepare('SELECT channel_status FROM contact_phones WHERE phone_e164=?').bind(input.phone).first<{channel_status:string}>();
  if(status&&['subscribed','suppressed'].includes(status.channel_status))return success();
  if(!await reserveSignupAllowance(db,`signup-sms:${hash}`,'day',signupLimits.destinationPerDay))return context.json({error:'rate_limited'},429);
  const reservation=await reserveSignupAllowance(db,'signup-global','hour',signupLimits.globalPerHour);if(!reservation)return context.json({error:'rate_limited'},429);
  const id=`sms-signup:${await sha256(`${hash}:${reservation.window}`)}`,now=new Date(reservation.reservedAt);
  const claimed=await db.prepare("INSERT INTO audience_signup_requests(id,destination_hash,status,created_at) VALUES(?,?,'sending',?) ON CONFLICT(id) DO NOTHING RETURNING id").bind(id,hash,now.getTime()).first();
  if(!claimed)return success();
  try{
   await service.captureConsent({contact:{phone:input.phone},channel:'sms',brandOrLegalSender:policy.brand,smsProgram:policy.programme,messageCategory:policy.category,frequencyDisclosure:policy.frequency,destinationJurisdiction:policy.jurisdiction,captureMethod:'hosted-sms-signup',captureSource:new URL('/subscribe',platform.config.publicBaseUrl).toString(),consentText:description.consentText,consentVersion:'sms-signup-v1',occurredAt:now,confirmationRequired:true,idempotencyKey:id,timeZone:input.timeZone,locationSource:'recipient-supplied-signup',locationRecordedAt:now});
   await db.prepare("UPDATE audience_signup_requests SET status='sent' WHERE id=?").bind(id).run();
  }catch{await db.prepare("UPDATE audience_signup_requests SET status='failed' WHERE id=?").bind(id).run();return context.json({error:'sms_confirmation_unavailable'},503);}
  return success();
 });return routes;
}
