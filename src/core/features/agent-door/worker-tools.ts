import {deliverSmsService} from '../sms/service-delivery';
import {nativeOperator} from './native';
import {hasPermission,type Capability} from '../auth/permissions';
import {createReportScheduler} from '../insights/report-scheduler';
import {enrollWooFlows} from '../store/woocommerce/flows';
import {readWooConnection} from '../store/woocommerce/connection';
import {senderWriteAuthority} from '../settings/sender-authority';
import {type ToolDefinition, type ToolContext, ToolRefusal} from '@/vendor/base/agent-door/index.ts';
import {agentAction,agentWriteAdmission} from './context';
import type {LifecycleRuntime} from '../lifecycle/types';
import {createLifecycleServices} from '../lifecycle';
import {advanceDesignJob} from '../design-generation/advance';
import {fingerprint} from './digest';

export function workerTools(runtime: LifecycleRuntime): ToolDefinition[] {
  const db=runtime.platform.database.$client;
  function define(name:string,capability:Capability,properties:Record<string,{type:string}>,clauses:string[],run:(args:Record<string,unknown>,ctx:ToolContext)=>Promise<unknown>):ToolDefinition{
    return {name:'mango.'+name,title:'Admit '+name,description:'Admit saved native work under current sponsor authority, consent and company policy.',
      scope:'mango.'+name,readOnly:false,classes:['external'],clauses,
      inputSchema:{type:'object',properties:{...properties,...(name==='delivery.dispatch'?{segmentId:{type:'string'}}:{})},required:Object.keys(properties),additionalProperties:false},outputSchema:{type:'object'},
      classify:()=>[{class:'external',facts:{measure:1,counterparty:'known'}}],
      summary:args=>({target:{id:String(args.revisionId??args.jobId??args.runId??args.deliveryId)},items:[JSON.stringify(args)]}),
      revisionType:'string',revision:async args=>{
        if(args.revisionId)return fingerprint(await db.prepare('SELECT id,state,content_digest,updated_at FROM campaign_revisions WHERE id=?').bind(args.revisionId).first());
        return null;
      },
      async run(args,ctx){
        const operator=await nativeOperator(runtime.platform,ctx.person.id);
        if(!hasPermission(operator.role,capability))throw new ToolRefusal('role_forbidden');
        const result=await agentAction.run(ctx,async()=>{
          const authority=await senderWriteAuthority(runtime.platform,new Request(ctx.origin),ctx.person.id);
          return agentWriteAdmission.run(authority,()=>run(args,ctx));
        });
        const target=name==='delivery.dispatch'?'mango://campaigns/'+encodeURIComponent(String(args.campaignId)):name==='designs.advance'?'mango://designs/'+encodeURIComponent(String(args.jobId)):name==='store.advance'?'mango://store/readiness':null;
        if(target)ctx.emit(name.split('.')[0]+'.changed',target);
        return {result:result??{status:'processed'}};
      },
    };
  }
  const flowTool:ToolDefinition={
    name:'mango.flows.enroll',title:'Run a supported tag-and-exit step',description:'Apply the native WooCommerce tag-and-exit starter to an existing signed source event. Sends no messages.',
    scope:'mango.flows.enroll',readOnly:false,classes:['standard'],clauses:['FLOW-008','CONT-004'],
    inputSchema:{type:'object',properties:{id:{type:'string'},eventId:{type:'string'}},required:['id','eventId'],additionalProperties:false},outputSchema:{type:'object'},
    classify:()=>[{class:'standard',facts:{measure:1}}],summary:args=>({target:{id:String(args.id)},items:[String(args.eventId)]}),
    async run(args,ctx){
      if(!hasPermission((await nativeOperator(runtime.platform,ctx.person.id)).role,'flow.activate'))throw new ToolRefusal('role_forbidden');
      const connection=await readWooConnection(runtime.platform);if(!connection?.pluginEnabled)throw new ToolRefusal('trigger_source_unavailable');
      const source=await db.prepare("SELECT payload,occurred_at FROM source_records WHERE provider=? AND source_type='cart' AND json_extract(payload,'$.eventId')=? AND json_extract(payload,'$.identity')='woocommerce-signed-logged-in-customer'").bind('woocommerce:'+connection.id,args.eventId).first<{payload:string;occurred_at:number}>();
      if(!source||source.occurred_at<Date.now()-7*86400000)throw new ToolRefusal('source_unavailable');
      const record=JSON.parse(source.payload);
      await agentAction.run(ctx,()=>enrollWooFlows(runtime.platform,connection,{id:String(args.eventId),kind:record.observation,occurredAt:new Date(source.occurred_at).toISOString(),checkoutId:record.checkoutId,checkoutStartedAt:record.checkoutStartedAt},String(args.id)));
      ctx.emit('flows.changed','mango://flows/'+encodeURIComponent(String(args.id)));
      return {result:{status:'processed',id:args.id}};
    }};
  return [flowTool,
    define('consent.dispatch','contact.subscribe',{id:{type:'string'}},['CONT-004','AUD-005'],async args=>({state:await deliverSmsService(runtime.platform,String(args.id))})),
    define('reports.dispatch','settings.manage',{deliveryId:{type:'string'}},['REPORT-001'],async(args,ctx)=>{
      if(!['owner','admin'].includes(ctx.person.role))throw new ToolRefusal('role_forbidden');
      return createReportScheduler(runtime.platform).sendPrepared(String(args.deliveryId));
    }),
    define('delivery.dispatch','campaign.send',{campaignId:{type:'string'},revisionId:{type:'string'},stepId:{type:'string'},channel:{type:'string'}},['SEND-001','AUD-005'],async (args,ctx)=>{
      const current=await db.prepare('SELECT state,active_revision_id FROM campaigns WHERE id=?').bind(args.campaignId).first<{state:string;active_revision_id:string}>();
      if(!current||current.active_revision_id!==args.revisionId)throw new ToolRefusal('not_found');
      if(ctx.agent.id==='integration:'+ctx.clientId){
        const credential=await db.prepare("SELECT scopes_json,created_by FROM integration_credentials WHERE id=? AND revoked_at IS NULL").bind(ctx.clientId).first<{scopes_json:string;created_by:string}>();
        if(!credential||credential.created_by!==ctx.person.id||!JSON.parse(credential.scopes_json).includes('campaigns:send'))throw new ToolRefusal('insufficient_scope');
        const segment=await db.prepare('SELECT inclusion_rule_json,exclusion_rules_json FROM audience_segments WHERE id=? AND id IN(SELECT segment_id FROM integration_segments)').bind(args.segmentId).first<{inclusion_rule_json:string;exclusion_rules_json:string}>();
        const revision=await db.prepare('SELECT inclusion_rule_json,exclusion_rules_json FROM campaign_revisions WHERE id=?').bind(args.revisionId).first<{inclusion_rule_json:string;exclusion_rules_json:string}>();
        if(!segment||!revision||segment.inclusion_rule_json!==revision.inclusion_rule_json||segment.exclusion_rules_json!==revision.exclusion_rules_json)throw new ToolRefusal('approved_segment_mismatch');
      }
      if(!['owner','admin','manager'].includes(ctx.person.role))throw new ToolRefusal('role_forbidden');
      await createLifecycleServices(runtime).delivery.dispatchStep(args);
      return {status:'processed',revisionId:args.revisionId};
    }),
    define('designs.advance','draft.write',{kind:{type:'string'},jobId:{type:'string'}},['DESIGN-001','DESIGN-002','DESIGN-003'],async args=>{
      if(!['design.draft','design.layout'].includes(String(args.kind)))throw new ToolRefusal('invalid_arguments');
      await advanceDesignJob(runtime.platform,{kind:args.kind as 'design.draft'|'design.layout',idempotencyKey:String(args.kind)+':'+String(args.jobId),payload:{jobId:args.jobId}});
      return {status:'processed',jobId:args.jobId};
    }),
    define('store.advance','integration.manage',{sourceType:{type:'string'},provider:{type:'string'},runId:{type:'string'}},['STORE-004'],async args=>{
      if(!runtime.synchronizeCommerce)throw new ToolRefusal('source_unavailable');
      return await runtime.synchronizeCommerce(args);
    }),
  ];
}
