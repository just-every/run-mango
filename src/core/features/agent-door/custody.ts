import {fingerprint} from './digest';
import { ToolRefusal, type ToolContext, type AgentDoor } from '@/vendor/base/agent-door/index.ts';
import { agentAction } from './context';

export function workStatement(db: D1Database, kind: string, targetId: string, tool: string, args: Record<string,unknown>, condition='1', bindings: unknown[]=[]) {
  const ctx=agentAction.getStore();if(!ctx)return null;
  return db.prepare(`INSERT INTO mango_agent_work(kind,target_id,sponsor_id,principal_json,attribution_json,tool,args_json,created_at)
    SELECT ?,?,?,?,?,?,?,? WHERE ${condition}
    ON CONFLICT(kind,target_id) DO UPDATE SET sponsor_id=excluded.sponsor_id,principal_json=excluded.principal_json,
      attribution_json=excluded.attribution_json,tool=excluded.tool,args_json=excluded.args_json,operation=mango_agent_work.operation+1,last_outcome=NULL`)
    .bind(kind,targetId,ctx.person.id,JSON.stringify({person:{id:ctx.person.id},agent:ctx.agent,consent:ctx.consent,scopes:ctx.scopes,clientId:ctx.clientId,operationId:ctx.operationId,idempotencyKey:ctx.idempotencyKey}),
      JSON.stringify({agent:ctx.actor.agent,sponsor:ctx.actor.for,label:ctx.actor.label,approvers:ctx.approvers}),tool,JSON.stringify(args),Date.now(),...bindings);
}
export async function saveWork(db:D1Database,kind:string,targetId:string,tool:string,args:Record<string,unknown>){
  await workStatement(db,kind,targetId,tool,args)?.run();
}
export async function admitWork(db:D1Database,door:AgentDoor|undefined,kind:string,targetId:string,args:Record<string,unknown>,effect:()=>Promise<unknown>) {
  const work=await db.prepare('SELECT principal_json,args_json,tool,operation,last_outcome FROM mango_agent_work WHERE kind=? AND target_id=?').bind(kind,targetId).first<{principal_json:string;args_json:string;tool:string;operation:number;last_outcome:string|null}>();
  if(!work)return effect(); // This job originated from the native person lifecycle.
  if(work.last_outcome&&JSON.parse(work.last_outcome).code==='subject_erased')throw new ToolRefusal('subject_erased');
  if(!door)throw new ToolRefusal('agent_door_unavailable');
  // The worker's operation has its own typed admission and durable identity.
  const principal=JSON.parse(work.principal_json);
  args={...JSON.parse(work.args_json),...args};
  if(!principal.operationId||!principal.idempotencyKey)throw new ToolRefusal('operation_mismatch');
  if(principal.consent&&await db.prepare('SELECT 1 FROM bs_settings WHERE singleton=1 AND stopped=1').first())throw new ToolRefusal('sponsor_unavailable');
  const origin=await db.prepare('SELECT row FROM agent_door_audit WHERE id=?').bind(principal.operationId).first<{row:string}>();
  if(origin){
    const admission=JSON.parse(origin.row);
    if(admission.outcome==='running'||admission.outcome==='pending'&&admission.approval&&await db.prepare("SELECT 1 FROM agent_door_approvals WHERE id=? AND state='executing'").bind(admission.approval.id).first())throw new Error('agent_preparation_in_progress');
  }
  const result=await door.invoke(work.tool.replace('mango.','mango.continuation.'),{...args,idempotency_key:principal.idempotencyKey},principal);
  await db.prepare('UPDATE mango_agent_work SET last_outcome=? WHERE kind=? AND target_id=? AND operation=?')
    .bind(JSON.stringify(result),kind,targetId,work.operation).run();
  if(result.outcome==='refused')throw new ToolRefusal(result.code??'native_refused');
  return result;
}
export function actorType(){return agentAction.getStore()?'agent':'operator';}
export function actorId(operatorId:string){return agentAction.getStore()?.agent.id??operatorId;}

/** A continuation item is derived from persisted native queue state, never a
 * caller's replay suffix. The original public key and admission stay unchanged.
 */
export async function nativeWorkItem(db:D1Database,tool:string,args:Record<string,unknown>){
 const name=tool.replace('mango.continuation.','mango.');
 const kind=name==='mango.delivery.dispatch'?'campaign':name==='mango.designs.advance'?'design':name==='mango.store.advance'?'sync':name==='mango.reports.dispatch'?'report':name==='mango.consent.dispatch'?'sms-service':name==='mango.flows.enroll'?'flow':null;
 if(!kind)return null;
 const delivery=kind==='report'?await db.prepare('SELECT * FROM insight_report_deliveries WHERE id=?').bind(args.deliveryId).first<Record<string,unknown>>():null;
 const target=kind==='campaign'?args.revisionId:kind==='design'?args.jobId:kind==='sync'?args.runId:kind==='report'?delivery?.schedule_id:args.id;
 if(typeof target!=='string')return null;
 const work=await db.prepare('SELECT principal_json,operation,last_outcome FROM mango_agent_work WHERE kind=? AND target_id=?').bind(kind,target).first<{principal_json:string;operation:number;last_outcome:string|null}>();
 if(!work||work.last_outcome&&JSON.parse(work.last_outcome).code==='subject_erased')return null;
 const identity=JSON.parse(work.principal_json);if(!identity.operationId)return null;
 const progress=kind==='campaign'?(await db.prepare('SELECT id,transport_disposition,attempt_count,next_attempt_at FROM recipient_steps WHERE revision_id=? ORDER BY id').bind(target).all()).results
  :kind==='design'?await db.prepare('SELECT state,provider_run_id,provider_layout_id,chosen_slot,layout_round,attempts,updated_at FROM design_jobs WHERE id=?').bind(target).first()
  :kind==='sync'?await db.prepare('SELECT * FROM source_sync_runs WHERE id=?').bind(target).first()
  :kind==='report'?delivery:kind==='sms-service'?await db.prepare('SELECT id,state,next_at FROM sms_service_messages WHERE id=?').bind(target).first()
  :await db.prepare("SELECT id,payload_digest FROM source_records WHERE json_extract(payload,'$.eventId')=?").bind(args.eventId).first();
 if(!progress)return null;
 return {id:kind+':'+target+':'+work.operation+':'+(await fingerprint(progress)).slice(0,32),operationId:identity.operationId};
}
