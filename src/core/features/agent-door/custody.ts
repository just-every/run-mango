import type {ToolContext, AgentDoor} from '@/vendor/base/agent-door/index.ts';
import {nativeAgent} from './native-context';

export function custodyStatement(db:D1Database,kind:string,targetId:string,guard='1',bindings:unknown[]=[]) {
 const ctx=nativeAgent.getStore()?.context;
 if(!ctx)return null;
 const principal={person:{id:ctx.person.id},agent:ctx.agent,consent:ctx.consent,scopes:ctx.scopes,clientId:ctx.clientId};
 return db.prepare(`INSERT INTO mango_agent_custody(kind,target_id,principal_json,prepared_by_json,approvers_json,created_at)
  SELECT ?,?,?,?,?,? WHERE ${guard} ON CONFLICT(kind,target_id) DO UPDATE SET
  principal_json=excluded.principal_json,prepared_by_json=excluded.prepared_by_json,approvers_json=excluded.approvers_json,created_at=excluded.created_at`)
  .bind(kind,targetId,JSON.stringify(principal),JSON.stringify(ctx.actor),JSON.stringify(ctx.approvers),Date.now(),...bindings);
}
export async function retainedPrincipal(db:D1Database,kind:string,target:string) {
 const row=await db.prepare('SELECT principal_json FROM mango_agent_custody WHERE kind=? AND target_id=?').bind(kind,target).first<{principal_json:string}>();
 return row?JSON.parse(row.principal_json) as Parameters<AgentDoor['invoke']>[2]:null;
}
export async function admitRetainedDispatch(db:D1Database,door:AgentDoor,recipientId:string):Promise<boolean> {
 const row=await db.prepare('SELECT revision_id,attempt_count FROM recipient_steps WHERE id=?').bind(recipientId).first<{revision_id:string;attempt_count:number}>();
 if(!row)return true;
 const principal=await retainedPrincipal(db,'campaign',row.revision_id);
 if(!principal)return false;
 // A retained uncertain handoff is never resubmitted. The native recipient
 // service owns transport custody; its revision includes the current attempt.
 const result=await door.invoke('mango.delivery.dispatch',{
  id:recipientId,idempotency_key:`delivery:${recipientId}:attempt:${row.attempt_count}`,
 },principal);
 return result.outcome!=='done';
}
export function preparedPrincipal(ctx:ToolContext){return {person:{id:ctx.person.id},agent:ctx.agent,consent:ctx.consent,scopes:ctx.scopes,clientId:ctx.clientId};}

export async function admitRetainedStep(db:D1Database,door:AgentDoor,stepId:string,revisionId:string):Promise<'native'|'done'|'held'> {
 const principal=await retainedPrincipal(db,'campaign',revisionId);if(!principal)return 'native';
 const result=await door.invoke('mango.delivery.prepare',{id:stepId,revisionId,idempotency_key:`delivery-start:${stepId}`},principal);
 return result.outcome==='done'?'done':'held';
}
