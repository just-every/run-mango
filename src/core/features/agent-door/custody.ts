import {fingerprint} from './digest';
import { ToolRefusal, type ToolContext, type AgentDoor } from '@/vendor/base/agent-door/index.ts';
import { agentAction } from './context';

export function workStatement(db: D1Database, kind: string, targetId: string, tool: string, args: Record<string,unknown>, condition='1', bindings: unknown[]=[]) {
  const ctx=agentAction.getStore();if(!ctx)return null;
  return db.prepare(`INSERT INTO mango_agent_work(kind,target_id,sponsor_id,principal_json,attribution_json,tool,args_json,created_at)
    SELECT ?,?,?,?,?,?,?,? WHERE ${condition}
    ON CONFLICT(kind,target_id) DO UPDATE SET sponsor_id=excluded.sponsor_id,principal_json=excluded.principal_json,
      attribution_json=excluded.attribution_json,tool=excluded.tool,args_json=excluded.args_json,operation=mango_agent_work.operation+1,last_outcome=NULL`)
    .bind(kind,targetId,ctx.person.id,JSON.stringify({person:{id:ctx.person.id},agent:ctx.agent,consent:ctx.consent,scopes:ctx.scopes,clientId:ctx.clientId}),
      JSON.stringify({agent:ctx.actor.agent,sponsor:ctx.actor.for,label:ctx.actor.label,approvers:ctx.approvers}),tool,JSON.stringify(args),Date.now(),...bindings);
}
export async function saveWork(db:D1Database,kind:string,targetId:string,tool:string,args:Record<string,unknown>){
  await workStatement(db,kind,targetId,tool,args)?.run();
}
export async function admitWork(db:D1Database,door:AgentDoor|undefined,kind:string,targetId:string,args:Record<string,unknown>,effect:()=>Promise<unknown>) {
  const work=await db.prepare('SELECT principal_json,args_json,tool,operation FROM mango_agent_work WHERE kind=? AND target_id=?').bind(kind,targetId).first<{principal_json:string;args_json:string;tool:string;operation:number}>();
  if(!work)return effect(); // This job originated from the native person lifecycle.
  if(!door)throw new ToolRefusal('agent_door_unavailable');
  // The worker's operation has its own typed admission and durable identity.
  const principal=JSON.parse(work.principal_json);
  args={...JSON.parse(work.args_json),...args};
  const progress=kind==='campaign'?(await db.prepare('SELECT id,transport_disposition,attempt_count,next_attempt_at FROM recipient_steps WHERE revision_id=? ORDER BY id').bind(targetId).all()).results
    :kind==='design'?await db.prepare('SELECT state,provider_run_id,provider_layout_id,chosen_slot,layout_round,attempts,updated_at FROM design_jobs WHERE id=?').bind(targetId).first()
    :kind==='sync'?await db.prepare('SELECT * FROM source_sync_runs WHERE id=?').bind(targetId).first()
    :kind==='report'?await db.prepare('SELECT id,state,next_at,updated_at,claim_token FROM insight_report_deliveries WHERE id=?').bind(args.deliveryId).first():null;
  const key=kind+':'+targetId+':'+work.operation+':'+(await fingerprint({args,progress})).slice(0,32);
  const result=await door.invoke(work.tool,{...args,idempotency_key:key},principal);
  await db.prepare('UPDATE mango_agent_work SET last_outcome=? WHERE kind=? AND target_id=? AND operation=?')
    .bind(JSON.stringify(result),kind,targetId,work.operation).run();
  if(result.outcome==='refused')throw new ToolRefusal(result.code??'native_refused');
  return result;
}
export function actorType(){return agentAction.getStore()?'agent':'operator';}
export function actorId(operatorId:string){return agentAction.getStore()?.agent.id??operatorId;}
