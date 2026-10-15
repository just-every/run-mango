import type { Platform } from '@/core/shared/platform';
import type { ConsentCapture } from '@/core/features/audience/service';
import { programme, smsLocationFresh } from './policy';
import { queueSmsService } from './service-delivery';
export function validateSmsConsent(platform:Platform,input:ConsentCapture){
 const policy=programme(platform),module=platform.config.modules.sms;
 if(!module.enabled)throw new Error(module.detail);
 if(!/^\+61\d{9}$/.test(input.contact.phone??'')||input.destinationJurisdiction!==policy.jurisdiction||input.smsProgram!==policy.programme||input.brandOrLegalSender!==policy.brand||input.messageCategory!==policy.category||input.frequencyDisclosure!==policy.frequency)throw new Error('SMS consent must match the configured sender programme, brand, category, jurisdiction and frequency.');
 if(input.confirmationRequired===false)throw new Error('SMS requires destination confirmation.');
 if(!input.timeZone?.startsWith('Australia/')||!input.locationSource||!input.locationRecordedAt)throw new Error('SMS confirmation requires original recipient time-zone evidence.');
 try{new Intl.DateTimeFormat('en',{timeZone:input.timeZone});}catch{throw new Error('SMS recipient time zone is invalid.');}
 if(!smsLocationFresh(new Date(),input.timeZone,input.locationSource,input.locationRecordedAt.getTime()))throw new Error('SMS recipient location evidence is stale.');
}
export async function sendSmsConfirmation(platform:Platform,input:{destination:string;token:string;expiresAt:Date;contactId:string;consentId:string}){
 const policy=programme(platform),module=platform.config.modules.sms;if(!module.enabled)throw new Error(module.detail);
 const tokenDigest=input.consentId,url=new URL(`/consent/confirm/${encodeURIComponent(input.token)}`,platform.config.publicBaseUrl);
 const request={purpose:'consent-confirmation' as const,recipientStepId:`consent-confirmation:${tokenDigest}`,idempotencyKey:`consent-confirmation:${tokenDigest}`,handoffStartedAt:new Date(),to:input.destination,sender:module.config.confirmationSender,
  content:{text:`${policy.brand} - ${policy.programme}. ${policy.frequency}. Confirm your ${policy.category} subscription: ${url}\nReply STOP to unsubscribe. Help: ${policy.support}`},callbackUrl:new URL('/webhooks/sms/mobile-message',platform.config.publicBaseUrl).toString()};
 const state=await queueSmsService(platform,request,{contactId:input.contactId,consentId:input.consentId,expiresAt:input.expiresAt});
 if(['blocked','expired','uncertain'].includes(state))throw new Error('SMS confirmation delivery is blocked or unconfirmed. Review the service-message status; an uncertain handoff is never repeated.');
 return state;
}
