import {toolPermission,currentAuthority} from './authorization';
import {ToolRefusal,type ToolDefinition,type ToolContext,type AgentDoor} from '@/vendor/base/agent-door/index.ts';
import {sha256} from '@/core/shared/ids';
import type {NativeToolSpec} from './catalogue';
import {nativeToolSpecs} from './catalogue';
import {classifyNative,nativePath,nativeSummary,authority} from './risk';
import {nativeRecord} from './records';
import type {NativeRequest} from './native';
import {runNativeAgent,nativeAgent} from './native-context';
import {recordActivity} from '../auth/activity-record';
import {hasPermission,type ProductRole} from '../auth/permissions';

async function nativeRevision(spec:NativeToolSpec,args:Record<string,unknown>,ctx:ToolContext):Promise<string|null>{
 const id=String(args.id??args.revisionId??args.proposalId??'');
 if(!id)return null;
 const tables:Record<string,string>={campaigns:'campaign_revisions',contacts:'contacts',segments:'audience_segments',designs:'design_jobs',flows:'woocommerce_flows',access:'oa_operators',blocks:'reusable_email_blocks',proposals:'proposals'};
 const table=tables[spec.entity];if(!table)return null;
 let record:unknown;
 if(table==='campaign_revisions'){
  record=(await ctx.db.prepare('SELECT id,state,version,updated_at,email_subject,email_body,inclusion_rule_json,exclusion_rules_json FROM campaign_revisions WHERE id=? OR campaign_id=? ORDER BY version DESC').bind(id,id).all()).results;
 }else record=await ctx.db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first();
 if(!record)return null;
 const authority=await ctx.db.prepare('SELECT generation FROM audience_source_authority WHERE id=1').first();
 const sender=await ctx.db.prepare("SELECT display_name,from_email,reply_to_email,physical_address,updated_at FROM sender_settings WHERE id='business'").first();
 return sha256(JSON.stringify({record,authority,sender}));
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
  async run(args,ctx){
   const execute=async()=>{
   await currentAuthority(ctx,toolPermission(spec));
   let result:unknown;
   if(['native:design-advance','native:source-advance','native:report-dispatch'].includes(spec.path)){
    result=await advance(spec.path.slice(7),args,ctx);
   }else if(spec.path==='native:draft-update'){
    const {id,...body}=args;result=await update(String(id),body,ctx.person.id);
    const outcome=result as {kind:string};
    if(!['written','unchanged'].includes(outcome.kind))throw new ToolRefusal(outcome.kind);
   }else if(spec.path==='native:prepare'){
    result=await prepare(String(args.id),String(args.revisionId));
   }else if(spec.path==='native:dispatch'){
    await runNativeAgent(ctx,()=>dispatch(String(args.id)));
    result={status:'admitted',recipientStepId:String(args.id)};
   }else if(spec.path.startsWith('native:')&&spec.path!=='native:asset'){
    result=await nativeRecord(spec.path.slice(7),String(args.id??''),ctx,native);
   }else{
    const {path,body}=nativePath(spec,args);
    if(spec.effect==='authorize')body.idempotencyKey=await sha256(JSON.stringify([ctx.agent.id,spec.name,args]));
    result=await native(path,spec.method,body,ctx);
   }
   if(spec.readOnly)return {result};
   const data=result as Record<string,unknown>,target=String((data.job as {id?:string}|undefined)?.id??(data.segment as {id?:string}|undefined)?.id??data.campaignId??data.revisionId??data.id??args.id??spec.entity);
   const uri=`mango://${spec.entity}/${encodeURIComponent(target)}`;
   const operationId=nativeAgent.getStore()!.executionId,at=Date.now();
   await runNativeAgent(ctx,async()=>{
    await ctx.db.prepare(`INSERT INTO mango_agent_operations(id,tool,target_uri,agent_id,sponsor_id,attribution_json,result_json,created_at) VALUES(?,?,?,?,?,?,?,?)`)
     .bind(operationId,spec.name,uri,ctx.agent.id,ctx.person.id,JSON.stringify({preparedBy:ctx.actor,approvers:ctx.approvers}),JSON.stringify({status:'done',native:uri}),at).run();
    await recordActivity(ctx.db,{key:operationId,action:spec.name,entityType:spec.entity,entityId:target,actorId:ctx.person.id,
     detail:{operationId,preparedBy:ctx.actor,approvers:ctx.approvers}});
   });
   ctx.emit(`${spec.entity}.changed`,uri,{operationId,tool:spec.name});
   ctx.emit('operation.recorded',`mango://operations/${operationId}`,{target:uri});
   return {result,resources:[{uri:`mango://operations/${operationId}`,name:ctx.actor.label}]};
   };
   return spec.readOnly?execute():runNativeAgent(ctx,execute);
  },
 }));
}
