import {z} from 'zod';
const text=z.string().trim().min(1).max(2000);
export const manualEntrySchema=z.object({
 contact:z.object({email:z.string().email().optional(),phone:z.string().max(30).optional(),displayName:z.string().max(200).optional()}),
 channel:z.enum(['email','sms']),brandOrLegalSender:text,smsProgram:text.optional(),
 timeZone:z.string().max(100).optional(),locationSource:text.optional(),locationRecordedAt:z.string().datetime().transform(value=>new Date(value)).optional(),
 messageCategory:text,frequencyDisclosure:text,destinationJurisdiction:text,captureMethod:text,captureSource:text,consentText:text,consentVersion:text,
 occurredAt:z.string().datetime().transform(value=>new Date(value)),
 expressWrittenConsent:z.literal(true).optional(),
 permissionMethod:z.enum(['in-person','event','phone','written']).optional(),affirmed:z.literal(true).optional(),
 properties:z.record(z.string().min(1).max(100),z.union([z.string().max(2000),z.number().finite(),z.boolean(),z.null()])).refine(value=>Object.keys(value).length<=50).optional(),
}).superRefine((value,context)=>{if(value.channel==='sms'&&(!value.expressWrittenConsent||!value.affirmed||!value.permissionMethod))context.addIssue({code:'custom',message:'SMS hand entry requires recorded express written permission.'});if((value.permissionMethod!==undefined||value.affirmed!==undefined||value.properties!==undefined)&&(!value.permissionMethod||!value.affirmed))context.addIssue({code:'custom',message:'Record the permission method and affirm that the person gave permission.'});if(value.occurredAt.getTime()>Date.now())context.addIssue({code:'custom',message:'Consent time cannot be in the future.'});});
