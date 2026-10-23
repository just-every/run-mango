import {signupCapacity} from '@/core/features/audience/signup-capacity';
import {admitSignup,signupCapacityRefusal} from '@/core/features/audience/signup-admission';
import {loadSignupSettings} from '@/core/features/audience/signup-settings';
import {countSignupRefusal,type SignupRefusalReason} from '@/core/features/audience/signup-refusals';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Platform } from '@/core/shared/platform';
import type { createAudienceService } from '@/core/features/audience/service';
import { sha256 } from '@/core/shared/ids';
import { signupNetwork, reserveSignupAllowance, verifySignupChallenge } from '@/core/features/audience/signup-security';
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
  const ip=context.req.header('CF-Connecting-IP')??'',network=signupNetwork(ip);
  if(!network)return context.json({error:'client_ip_required'},400);
  const networkHash=await sha256(`${platform.config.contactHashSalt}:signup:${network}`),capacity=await signupCapacity(db);
  const badAttempt=()=>reserveSignupAllowance(db,`signup-refused:${networkHash}`,'hour',capacity.levels.networkRefused);
  const settings=await loadSignupSettings(platform),challenged=Boolean(settings.challengeEnabled&&platform.config.signupTurnstile);
  const rateLimited=async(reason:SignupRefusalReason,retryAfter:number)=>{await badAttempt();await countSignupRefusal(db,'hosted',reason);context.header('Retry-After',String(retryAfter));return context.json({error:'rate_limited',detail:'Too many signups right now. Please try again in a few minutes.'},429);};
  if(!challenged){const failed=await db.prepare("SELECT count,3600-CAST(strftime('%s','now') AS INTEGER)%3600 AS remaining FROM oa_limits WHERE key=? AND window=CAST(strftime('%s','now') AS INTEGER)/3600").bind(`signup-refused:${networkHash}`).first<{count:number;remaining:number}>();if(failed&&failed.count>=capacity.levels.networkRefused)return rateLimited('network-rate-limit',failed.remaining);}
  let raw:unknown;try{raw=JSON.parse(await limitedBody(context.req.raw));}catch{await badAttempt();return context.json({error:'invalid_signup_body'},400);}
  const parsed=capture.safeParse(raw);if(!parsed.success){await badAttempt();return context.json({error:'invalid_sms_signup',fields:parsed.error.flatten().fieldErrors},400);}
  const input=parsed.data;
  if(challenged&&!await verifySignupChallenge(platform,input['cf-turnstile-response'],ip,db)){await badAttempt();return context.json({error:'verification_failed'},400);}
  const hash=await sha256(`${platform.config.contactHashSalt}:signup-sms:${input.phone}`);
  const success=()=>context.json({status:'confirmation-required'},202);
  if(input.website){await badAttempt();return success();}
  const description=smsSignupDescription(platform)!,policy=programme(platform);
  if(input.disclosure!==description.disclosure){await badAttempt();return context.json({error:'signup_disclosure_changed'},409);}
  try{if(!input.timeZone.startsWith('Australia/'))throw new Error();new Intl.DateTimeFormat('en',{timeZone:input.timeZone});}catch{await badAttempt();return context.json({error:'invalid_sms_time_zone'},400);}
  const plan={networkKey:networkHash,kiosk:false,challenged,confirmation:true,destinationHash:hash,destinationCounterKey:`signup-sms:${hash}`,levels:capacity.levels};
  const blocked=await signupCapacityRefusal(db,{...plan,id:''});if(blocked)return rateLimited(blocked.reason,blocked.retryAfter);
  const status=await db.prepare('SELECT channel_status FROM contact_phones WHERE phone_e164=?').bind(input.phone).first<{channel_status:string}>();
  if(status&&['subscribed','suppressed'].includes(status.channel_status))return success();
  const hour=(await db.prepare("SELECT CAST(strftime('%s','now') AS INTEGER)/3600 AS hour").first<{hour:number}>())!.hour;
  const id=`sms-signup:${await sha256(`${hash}:${hour}`)}`;
  const reservation=await admitSignup(db,{...plan,id});
  if(reservation.kind==='duplicate')return success();
  if(reservation.kind==='refused'){
    if(reservation.reason==='daily-allowance'){await badAttempt();await countSignupRefusal(db,'hosted','daily-allowance');return success();}
    return rateLimited(reservation.reason,reservation.retryAfter);
  }
  const now=new Date(reservation.now);
  try{
   await service.captureConsent({contact:{phone:input.phone},channel:'sms',brandOrLegalSender:policy.brand,smsProgram:policy.programme,messageCategory:policy.category,frequencyDisclosure:policy.frequency,destinationJurisdiction:policy.jurisdiction,captureMethod:'hosted-sms-signup',captureSource:new URL('/subscribe',platform.config.publicBaseUrl).toString(),consentText:description.consentText,consentVersion:'sms-signup-v1',occurredAt:now,confirmationRequired:true,idempotencyKey:id,timeZone:input.timeZone,locationSource:'recipient-supplied-signup',locationRecordedAt:now});
   await db.prepare("UPDATE audience_signup_requests SET status='sent' WHERE id=?").bind(id).run();
  }catch{await db.prepare("UPDATE audience_signup_requests SET status='failed' WHERE id=?").bind(id).run();return context.json({error:'sms_confirmation_unavailable'},503);}
  return success();
 });return routes;
}
