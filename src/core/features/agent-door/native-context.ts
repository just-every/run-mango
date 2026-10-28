import { AsyncLocalStorage } from 'node:async_hooks';
import type { ToolContext } from '@/vendor/base/agent-door/index.ts';

/** Server call context. No header, cookie or serialized client input can create it. */
export const nativeAgent = new AsyncLocalStorage<{context: ToolContext; executionId: string}>();
export function nativeActor(operatorId: string) {
  const saved=nativeAgent.getStore(),active=saved?.context;
  return active ? {type: 'agent' as const, id: active.agent.id, label: active.actor.label,
    detail: {operationId:saved?.executionId,preparedBy: active.actor, approvers: active.approvers}} : {type: 'operator' as const, id: operatorId, detail: {}};
}
/** A lease binds current company policy, Business mapping and native authority. */
export function executionState(operator:string,roles:string){
 return `COALESCE((SELECT COALESCE(envelope,'')||'|'||COALESCE(local_document,'')||'|'||local_revision||'|'||local_paused FROM agent_door_state WHERE id=1),'')
  ||'|business:'||COALESCE((SELECT rev||'|'||stopped||'|'||COALESCE(owner_id,'') FROM bs_settings WHERE singleton=1),'')
  ||'|native:'||${operator}.role||'|'||COALESCE(${roles}.role,'')||'|'||COALESCE(${roles}.unmasked_contacts,0)||'|'||COALESCE(${roles}.updated_at,0)`;
}
export const executionPolicyAvailable=`NOT EXISTS(SELECT 1 FROM agent_door_state s WHERE s.id=1 AND (s.local_paused=1 OR json_extract(s.envelope,'$.paused')=1 OR json_extract(s.envelope,'$.exp')<=CAST(strftime('%s','now') AS INTEGER)))`;
export async function runNativeAgent<T>(context: ToolContext, run: () => Promise<T>) {
  if(nativeAgent.getStore()?.context===context)return run();
  const db=context.db, executionId=crypto.randomUUID(), now=Date.now();
  const inserted=await db.prepare(`INSERT INTO mango_agent_executions(id,sponsor_id,sponsor_version,expires_at,policy_state,state)
    SELECT ?,o.id,o.version,?,${executionState('o','r')},'running' FROM oa_operators o
    LEFT JOIN operator_product_roles r ON r.operator_id=o.id WHERE o.id=? AND o.status='active'`)
    .bind(executionId,now+300_000,context.person.id).run();
  if(!inserted.meta.changes)throw new Error('Native sponsor is no longer active.');
  try { return await nativeAgent.run({context,executionId},run); }
  finally { await db.prepare("UPDATE mango_agent_executions SET state='finished' WHERE id=?").bind(executionId).run(); }
}

/** The final native transaction rechecks the execution lease and live sponsor. */
export function nativeExecutionGuard() {
 const active=nativeAgent.getStore();if(!active)return '1';
 const id=active.executionId;
 if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('Invalid native execution identity.');
 return `EXISTS(SELECT 1 FROM mango_agent_executions e JOIN oa_operators o ON o.id=e.sponsor_id
   LEFT JOIN operator_product_roles r ON r.operator_id=o.id
   WHERE e.id='${id}' AND e.state='running' AND o.status='active' AND o.version=e.sponsor_version
   AND e.expires_at>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)
   AND e.policy_state=${executionState('o','r')} AND ${executionPolicyAvailable})`;
}
