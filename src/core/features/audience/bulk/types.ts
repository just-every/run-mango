import {z} from 'zod';
import {contactSearchSchema} from './search';
export const bulkInput=z.object({contactIds:z.array(z.string().min(1).max(160)).min(1).max(50000).optional(),search:contactSearchSchema.optional(),action:z.enum(['tag','untag','export','suppress','erase','topic']),value:z.string().trim().min(1).max(100).optional(),channel:z.enum(['email','sms']).default('email')}).superRefine((v,c)=>{if(Boolean(v.contactIds)===Boolean(v.search))c.addIssue({code:'custom',message:'Choose contacts or a search.'});if(['tag','untag','topic'].includes(v.action)&&!v.value)c.addIssue({code:'custom',message:'Choose a tag or topic.'});});
export type BulkInput=z.infer<typeof bulkInput>;
export type BulkJob={id:string;action:BulkInput['action'];value:string|null;channel:'email'|'sms';principal_id:string;session_hash:string;state:string;total:number;lease_token:string|null;error:string|null;created_at:number};
export type BulkItem={ordinal:number;contact_id:string|null;erasure_reference:string|null};
