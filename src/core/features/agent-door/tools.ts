import {toolPermission,currentAuthority} from './authorization';
import {ToolRefusal,type ToolDefinition,type ToolContext,type AgentDoor} from '@/vendor/base/agent-door/index.ts';
import {sha256} from '@/core/shared/ids';
import type {NativeToolSpec} from './catalogue';
import {nativeToolSpecs} from './catalogue';
import {classifyNative,nativePath,nativeSummary,authority} from './risk';
import {nativeRecord} from './records';
import {nativeEffect} from './native-events';
import type {NativeRequest} from './native';
import {runNativeAgent,nativeAgent} from './native-context';
import {recordActivity} from '../auth/activity-record';
import {hasPermission,type ProductRole} from '../auth/permissions';

async function nativeRevision(spec:NativeToolSpec,args:Record<string,unknown>,ctx:Pick<ToolContext,'db'>):Promise<string|null>{
 const id=String(args.id??args.revisionId??args.proposalId??'');
 if(!id){
  const settings:Record<string,string>={sender:'sender_settings',connections:'sending_connection',signup:'signup_settings'};
  const table=settings[spec.entity];
  return table?sha256(JSON.stringify((await ctx.db.prepare(`SELECT * FROM ${table}`).all()).results)):null;
 }
 if(spec.entity==='reports')return sha256(JSON.stringify({
  delivery:await ctx.db.prepare('SELECT * FROM insight_report_deliveries WHERE id=?').bind(id).first(),
  schedule:await ctx.db.prepare('SELECT * FROM insight_report_schedules WHERE id=? OR id=(SELECT schedule_id FROM insight_report_deliveries WHERE id=?)').bind(id,id).first(),
 }));
 const tables:Record<string,string>={campaigns:'campaign_revisions',contacts:'contacts',segments:'audience_segments',designs:'design_jobs',flows:'woocommerce_flows',access:'oa_operators',blocks:'reusable_email_blocks',proposals:'proposals'};
 const table=tables[spec.entity];if(!table)return null;
 let record:unknown;
 if(table==='campaign_revisions'){
  record=(await ctx.db.prepare('SELECT id,state,version,updated_at,email_subject,email_body,inclusion_rule_json,exclusion_rules_json FROM campaign_revisions WHERE id=? OR campaign_id=? ORDER BY version DESC').bind(id,id).all()).results;
 }else record=await ctx.db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first();
 if(!record)return null;
 const authority=await ctx.db.prepare('SELECT generation FROM audience_source_authority WHERE id=1').first();
 const sender=await ctx.db.prepare("SELECT display_name,from_email,reply_to_email,physical_address,updated_at FROM sender_settings WHERE id='business'").first();
 const product=spec.entity==='access'?await ctx.db.prepare('SELECT * FROM operator_product_roles WHERE operator_id=?').bind(id).first():null;
 return sha256(JSON.stringify({record,product,authority,sender}));
}
export function mangoTools(native:NativeRequest,dispatch:(id:string)=>Promise<void>,prepare:(id:string,revisionId:string)=>Promise<unknown>,update:(id:string,args:Record<string,unknown>,actor:string)=>Promise<unknown>,advance:(kind:string,args:Record<string,unknown>,ctx:ToolContext)=>Promise<unknown>):ToolDefinition[]{
 return nativeToolSpecs.map(spec=>({
  ...spec,untrusted:true,
  classify:async(args,ctx)=>{await currentAuthority(ctx,toolPermission(spec));return classifyNative(spec,args,ctx,native);},
  ...(spec.readOnly?{}:{revisionType:'string' as const,revision:(args:Record<string,unknown>,ctx:ToolContext)=>nativeRevision(spec,args,ctx),
   summary:async(args:Record<string,unknown>,ctx:ToolContext)=>{
    const summary=await nativeSummary(spec,args,ctx),revision=await nativeRevision(spec,args,ctx);
    return {...summary,items:[...summary.items??[],...(revision?['Native evidence: '+revision]:[])]};
   }}),
  ...(spec.classes.some(cls=>cls==='access'||cls==='security')?{authority:async(args:Record<string,unknown>,ctx:ToolContext)=>{await currentAuthority(ctx,toolPermission(spec));return authority(spec,args,ctx);}}:{}),
  ...(spec.path==='native:draft-update'?{async undo(saved:unknown,ctx:import('@/vendor/base/agent-door/index.ts').UndoContext){
   const previous=saved as {id:string;campaignId:string;args:Record<string,unknown>;revision:string};
   await currentAuthority(ctx,'draft.write');
   if(await nativeRevision(spec,{id:previous.id},ctx)!==previous.revision)throw new ToolRefusal('revision_conflict');
   const result=await update(previous.id,previous.args,ctx.person.id) as {kind:string;revision?:{campaignId:string}};
   if(!['written','unchanged'].includes(result.kind))throw new ToolRefusal(result.kind);
   const uri=`mango://campaigns/${encodeURIComponent(previous.campaignId)}`;
   await recordActivity(ctx.db,{key:crypto.randomUUID(),action:'campaign.draft.undo',entityType:'campaign-revision',entityId:previous.id,actorId:ctx.person.id,detail:{reviewer:ctx.person.id}});
   ctx.emit('campaigns.changed',uri,{revisionId:previous.id});
  }}:{}),
  async run(args,ctx){
   const execute=async()=>{
   await currentAuthority(ctx,toolPermission(spec));
   const previous=spec.path==='native:draft-update'?await draftUndo(ctx.db,String(args.id)):null;
   let result:unknown;
   if(['native:design-advance','native:source-advance','native:report-dispatch','native:flow-enroll'].includes(spec.path)){
    result=await advance(spec.path.slice(7),args,ctx);
   }else if(spec.path==='native:draft-update'){
    const {id,...body}=args;result=await update(String(id),body,ctx.person.id);
    const outcome=result as {kind:string};
    if(!['written','unchanged'].includes(outcome.kind))throw new ToolRefusal(outcome.kind);
   }else if(spec.path==='native:prepare'){
    result=await prepare(String(args.id),String(args.revisionId));
   }else if(spec.path==='native:dispatch'){
    await runNativeAgent(ctx,()=>dispatch(String(args.id)));
    const recipient=await ctx.db.prepare('SELECT id,campaign_id,transport_disposition,skip_reason,attempt_count,provider_message_id FROM recipient_steps WHERE id=?').bind(String(args.id)).first();
    if(!recipient)throw new ToolRefusal('not_found');
    result={recipient};
   }else if(spec.path.startsWith('native:')&&spec.path!=='native:asset'){
    result=await nativeRecord(spec.path.slice(7),String(args.id??''),ctx,native);
   }else{
    const {path,body}=nativePath(spec,args);
    if(spec.effect==='authorize')body.idempotencyKey=await sha256(JSON.stringify([ctx.agent.id,spec.name,args]));
    result=await native(path,spec.method,body,ctx);
   }
   if(spec.readOnly){
    const record=result as {revision?:{id:string}};
    const revision=await nativeRevision(spec,{...args,...(record.revision?.id?{id:record.revision.id}:{})},ctx);
    return {result:revision?{...result as Record<string,unknown>,native_revision:revision}:result};
   }
   const {entity,target,uri,visible}=nativeEffect(spec,args,result);
   const operationId=nativeAgent.getStore()!.executionId,at=Date.now();
   await runNativeAgent(ctx,async()=>{
    await ctx.db.prepare(`INSERT INTO mango_agent_operations(id,tool,target_uri,agent_id,sponsor_id,attribution_json,result_json,created_at) VALUES(?,?,?,?,?,?,?,?)`)
     .bind(operationId,spec.name,uri,ctx.agent.id,ctx.person.id,JSON.stringify({preparedBy:ctx.actor,approvers:ctx.approvers}),JSON.stringify({status:'done',native:uri}),at).run();
    await recordActivity(ctx.db,{key:operationId,action:spec.name,entityType:spec.entity,entityId:target,actorId:ctx.person.id,
     detail:{operationId,preparedBy:ctx.actor,approvers:ctx.approvers}});
   });
   ctx.emit(`${entity}.changed`,uri,{operationId,tool:spec.name});
   ctx.emit('operation.recorded',`mango://operations/${operationId}`,{target:uri});
   const primary=visible?uri:null;
   return {result,resources:[{uri:`mango://operations/${operationId}`,name:ctx.actor.label},...(primary?[{uri:primary,name:spec.title}]:[])],...(previous?{undo:{id:String(args.id),campaignId:target,args:previous,revision:await nativeRevision(spec,args,ctx)}}:{})};
   };
   return spec.readOnly?execute():runNativeAgent(ctx,execute);
  },
 }));
}

async function draftUndo(db:D1Database,id:string):Promise<Record<string,unknown>|null>{
 const row=await db.prepare(`SELECT campaign_id AS campaignId,name,email_subject AS emailSubject,email_body AS emailBody,email_text AS emailText,preheader,sms_body AS smsBody,sender_name AS senderName,from_email AS fromEmail,reply_to_email AS replyToEmail,sms_sender AS smsSender,physical_address AS physicalAddress,message_category AS messageCategory,inclusion_rule_json AS inclusionRuleJson,exclusion_rules_json AS exclusionRulesJson,tracking_enabled AS trackingEnabled,utm_policy_json AS utmPolicyJson FROM campaign_revisions WHERE id=? AND state='draft'`).bind(id).first<Record<string,unknown>>();
 if(!row)return null;
 const steps=(await db.prepare('SELECT channel,timezone,scheduled_at,send_by_at,why_this_time FROM campaign_steps WHERE revision_id=? ORDER BY sequence').bind(id).all<{channel:string;timezone:string;scheduled_at:number;send_by_at:number;why_this_time:string}>()).results;
 const links=(await db.prepare('SELECT label,destination_url AS destinationUrl FROM campaign_revision_links WHERE revision_id=? ORDER BY sequence').bind(id).all()).results;
 const {campaignId,...composition}=row;
 return {...composition,trackingEnabled:Boolean(row.trackingEnabled),steps:steps.map(step=>({channel:step.channel,timezone:step.timezone,scheduledAt:new Date(step.scheduled_at).toISOString(),sendByAt:new Date(step.send_by_at).toISOString(),whyThisTime:step.why_this_time})),links};
}
