import { z } from 'zod';
import type { Platform } from '@/core/shared/platform';
const window = z.object({days:z.array(z.number().int().min(0).max(6)).min(1),startMinute:z.number().int().min(0).max(1439),endMinute:z.number().int().min(1).max(1440)}).strict().refine(value=>value.startMinute<value.endMinute);
/** Account/carrier minima must be backed by current installation evidence. No
 * national SMS quiet-hour rule is inferred from telemarketing voice-call rules. */
export const smsProgrammeSchema=z.object({
 brand:z.string().trim().min(1).max(120),programme:z.string().trim().min(1).max(120),category:z.string().trim().min(1).max(120),
 frequency:z.enum(['Daily','Weekly','Monthly']),jurisdiction:z.literal('AU'),support:z.string().trim().min(1).max(160),
 providerAlreadyReplies:z.boolean(),policySource:z.string().url().startsWith('https://'),policyVerifiedAt:z.string().datetime(),policyExpiresAt:z.string().datetime(),
 providerWindows:z.array(window).min(1).max(14),jurisdictionWindows:z.array(window).min(1).max(14),
 recipientWindows:z.array(window).min(1).max(14),
}).strict();
export type SmsProgramme=z.infer<typeof smsProgrammeSchema>;
export function programme(platform: Platform): SmsProgramme {
 const module=platform.config.modules.sms;
 if(!module.enabled || !platform.sms)throw new Error(module.enabled?'SMS adapter is unavailable.':module.detail);
 const parsed=smsProgrammeSchema.safeParse(module.config.programme);
 if(!parsed.success)throw new Error('SMS_PROGRAMME_POLICY is incomplete or invalid.');
 return parsed.data;
}
// Preserve Mango's existing 30-day recipient-location freshness preference.
export const smsLocationEvidenceLifetimeMs=30*86400000;
export function smsLocationFresh(now:Date,timeZone:string|null,source:string|null,recordedAt:number|null){
 if(!timeZone?.startsWith('Australia/')||!source||!recordedAt||!Number.isFinite(recordedAt)||!Number.isFinite(now.getTime())||recordedAt>now.getTime()||now.getTime()-recordedAt>smsLocationEvidenceLifetimeMs)return false;
 try{new Intl.DateTimeFormat('en',{timeZone});return true;}catch{return false;}
}
function windowClock(timeZone:string){return new Intl.DateTimeFormat('en-US',{timeZone,hourCycle:'h23',weekday:'short',hour:'2-digit',minute:'2-digit'});}
function insideWindows(policy:SmsProgramme,now:Date,clock:Intl.DateTimeFormat){
 const parts=Object.fromEntries(clock.formatToParts(now).map(part=>[part.type,part.value]));
 const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday),minute=Number(parts.hour)*60+Number(parts.minute);
 const inside=(windows:SmsProgramme['providerWindows'])=>windows.some(window=>window.days.includes(day)&&minute>=window.startMinute&&minute<window.endMinute);
 // Preserve Mango's existing 09:00–20:00 house preference, not a legal claim.
 return minute>=9*60&&minute<20*60&&inside(policy.providerWindows)&&inside(policy.jurisdictionWindows)&&inside(policy.recipientWindows);
}
export function smsWindow(policy:SmsProgramme, now:Date,timeZone:string|null, locationSource:string|null,locationRecordedAt:number|null){
 if(now.getTime()-Date.parse(policy.policyVerifiedAt)>180*86400000 || Date.parse(policy.policyVerifiedAt)>now.getTime() || Date.parse(policy.policyExpiresAt)<=now.getTime())return {allowed:false,reason:'sms-policy-evidence-stale'};
 if(!smsLocationFresh(now,timeZone,locationSource,locationRecordedAt))return {allowed:false,reason:'sms-location-evidence-missing-or-stale'};
 return {allowed:insideWindows(policy,now,windowClock(timeZone!)),reason:'sms-quiet-window'};
}
/** Exact UTC search across local DST transitions. Minute-resolution configured
 * windows bound the search; fresh location limits it to at most thirty days. */
export function nextPermittedSmsInstant(policy:SmsProgramme,now:Date,timeZone:string|null,source:string|null,recordedAt:number|null,expiresAt:Date){
 const initial=smsWindow(policy,now,timeZone,source,recordedAt);
 if(!initial.allowed&&initial.reason!=='sms-quiet-window')return {reason:initial.reason};
 if(initial.allowed&&now<expiresAt)return {at:now,reason:'allowed'};
 const until=Math.min(expiresAt.getTime(),Date.parse(policy.policyExpiresAt),Date.parse(policy.policyVerifiedAt)+180*86400000,recordedAt!+smsLocationEvidenceLifetimeMs);
 const clock=windowClock(timeZone!);
 for(let at=(Math.floor(now.getTime()/60000)+1)*60000;at<until;at+=60000){
  const candidate=new Date(at);if(insideWindows(policy,candidate,clock))return {at:candidate,reason:'allowed'};
 }
 return {reason:'quiet-hours-deadline'};
}
