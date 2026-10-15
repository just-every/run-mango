import type {LifecycleRuntime} from '@/core/features/lifecycle/types';
import {createLifecycleRepository} from '@/core/features/lifecycle/repository';
import {evaluateAudience} from '@/core/features/lifecycle/evaluate-audience';
import {smsPolicyBinding} from './content';
import {smsProgrammeSchema} from './policy';
import {renderSmsRecipientPreview} from './recipient-preview';
export type SmsReviewPreview={examples:Array<{destination:string;text:string;segments:number;encoding:string}>;detail:string};
/** Read-only previews issue opaque URLs but never register them as active public links. */
export async function smsReviewPreview(runtime:LifecycleRuntime,campaignId:string,revisionId:string):Promise<SmsReviewPreview|undefined>{
 const repository=createLifecycleRepository(runtime.platform.database),snapshot=await repository.readRevisionSnapshot(campaignId,revisionId);
 if(!snapshot?.steps.some(step=>step.channel==='sms'))return undefined;
 try{
  const now=new Date();let {policy,sender}=smsPolicyBinding(runtime.platform.config);
  if(snapshot.revision.state==='approved'){
   const frozen=await runtime.platform.database.$client.prepare('SELECT sender,policy_json FROM sms_approval_policies WHERE revision_id=?').bind(revisionId).first<{sender:string;policy_json:string}>();
   if(!frozen)return {examples:[],detail:'Approved SMS policy is unavailable; review a new revision.'};
   policy=smsProgrammeSchema.parse(JSON.parse(frozen.policy_json).policy);sender=frozen.sender;
  }
  const {candidates,personalisations}=await evaluateAudience(runtime,repository,{...snapshot.revision,channels:['sms']},now);
  const step=snapshot.steps.find(step=>step.channel==='sms')!,examples:SmsReviewPreview['examples']=[];
  for(const candidate of candidates.filter(candidate=>candidate.channels.sms).slice(0,3)){
   const rendered=await renderSmsRecipientPreview(runtime.platform,{revision:snapshot.revision,links:snapshot.links,values:personalisations.get(`${candidate.contactId}:sms`)??{},sendByAt:step.sendByAt,policy,sender},now);
   examples.push({destination:candidate.channels.sms!.destination,text:rendered.text,segments:rendered.segments,encoding:rendered.encoding});
  }
  return {examples,detail:examples.length?'Exact counts for these rendered recipient examples, including managed disclosures and opaque tracked URLs. Preview links are inactive. Other recipient values can change counts.':'No currently eligible SMS recipient is available for a rendered preview.'};
 }catch{return {examples:[],detail:'SMS preview is unavailable until programme, audience and link checks pass.'};}
}
