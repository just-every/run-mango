import type { AppConfig } from '@/core/shared/platform';
import { sha256 } from '@/core/shared/ids';
import { smsProgrammeSchema, type SmsProgramme } from './policy';
export function smsPolicyBinding(config:AppConfig){
 const module=config.modules.sms;if(!module.enabled)throw new Error('SMS configuration unavailable.');
 const policy=smsProgrammeSchema.parse(module.config.programme),sender=module.config.confirmationSender;
 return {policy,sender,json:JSON.stringify({sender,policy})};
}
export async function smsPolicyAuthority(config:AppConfig){const binding=smsPolicyBinding(config);return {...binding,digest:await sha256(binding.json)};}
export function smsComplianceBlock(policy:SmsProgramme,sender:string){
 return `${policy.brand} | ${policy.programme}\n${policy.category}; ${policy.frequency}. Sender ${sender}; ${policy.jurisdiction}.\nReply STOP to unsubscribe. HELP: ${policy.support}.`;
}
export function managedSmsText(text:string,policy:SmsProgramme,sender:string){
 const block=smsComplianceBlock(policy,sender);return text.endsWith(`\n\n${block}`)?text:`${text}\n\n${block}`;
}
