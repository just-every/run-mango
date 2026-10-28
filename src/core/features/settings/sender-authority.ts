import {ToolRefusal} from '@/vendor/base/agent-door/index.ts';
import {agentAction,agentWriteAdmission} from '../agent-door/context';
import {productAuthority,effectiveRole} from '../auth/product-roles';
// @ts-expect-error Portable Base ESM has no separate declaration for this helper.
import { localCookieName } from '@/vendor/base/operator-auth/http.mjs';
import { hmacSha256Hex } from '@/core/platform/crypto';
import type { Platform } from '@/core/shared/platform';

export type SenderWriteAuthority = {sessionId: string; operatorId: string; version: number};
export class SenderAuthorityChanged extends Error {}

/** The native middleware already authenticates; capture its exact session for the write fence. */
export async function senderWriteAuthority(platform: Pick<Platform, 'config' | 'database'>, request: Request, operatorId: string) {
  const agent=agentAction.getStore();
  if(agent){
    if(agent.person.id!==operatorId)throw new SenderAuthorityChanged();
    const db=platform.database.$client,operator=await db.prepare("SELECT version FROM oa_operators WHERE id=? AND status='active'").bind(operatorId).first<{version:number}>();
    const authority=await productAuthority(db,operatorId);
    if(!operator||!authority)throw new SenderAuthorityChanged();
    const key=crypto.randomUUID();
    await db.prepare(`INSERT INTO mango_agent_write_admissions(id,sponsor_id,sponsor_version,product_role,agent_id,client_id,consent,policy_state,expires_at)
      SELECT ?,?,?,?,?,?,?,json_array(envelope,local_document,local_paused),? FROM agent_door_state WHERE id=1 AND local_paused=0`)
      .bind(key,operatorId,operator.version,authority.role,agent.agent.id,agent.agent.id==='integration:'+agent.clientId?agent.clientId:null,agent.consent??null,Date.now()+60000).run();
    return {sessionId:key,operatorId,version:operator.version};
  }
  const cookies = request.headers.get('Cookie') ?? '';
  const local = platform.config.local === true;
  const name = local ? localCookieName('operator_session_local', request.url) : '__Host-operator_session';
  const matches = cookies.split(';').map(value => value.trim()).filter(value => value.startsWith(`${name}=`));
  const token = matches.length === 1 ? matches[0].slice(name.length + 1) : '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new SenderAuthorityChanged();
  const hash = await hmacSha256Hex(platform.config.sessionSigningKey, `session\0${token}`);
  const authority = await platform.database.$client.prepare(`SELECT s.id AS sessionId,o.id AS operatorId,o.version
    FROM oa_sessions s JOIN oa_operators o ON o.id=s.operator_id WHERE s.token_hash=? AND o.id=?
      AND s.revoked_at IS NULL AND s.expires_at>? AND o.status='active' AND s.operator_version=o.version`)
    .bind(hash, operatorId, Date.now()).first<SenderWriteAuthority>();
  if (!authority) throw new SenderAuthorityChanged();
  return authority;
}

export const senderWriteGuard = `EXISTS (SELECT 1 FROM (
    SELECT s.id,s.operator_id,s.operator_version,s.expires_at FROM oa_sessions s WHERE s.revoked_at IS NULL
    UNION ALL
    SELECT a.id,a.sponsor_id,a.sponsor_version,a.expires_at FROM mango_agent_write_admissions a
      JOIN oa_operators n ON n.id=a.sponsor_id JOIN operators p ON p.id=n.id
      LEFT JOIN operator_product_roles r ON r.operator_id=n.id
      WHERE ${effectiveRole}=a.product_role
        AND a.policy_state=(SELECT json_array(envelope,local_document,local_paused) FROM agent_door_state WHERE id=1 AND local_paused=0)
        AND NOT EXISTS(SELECT 1 FROM agent_door_agents g WHERE g.id=a.agent_id AND g.revoked=1)
        AND (a.client_id IS NULL OR EXISTS(SELECT 1 FROM integration_credentials c WHERE c.id=a.client_id AND c.revoked_at IS NULL))
  ) s JOIN oa_operators o ON o.id=s.operator_id
  WHERE s.id=? AND o.id=? AND o.version=? AND s.operator_version=o.version AND o.status='active'
    AND s.expires_at > MAX(?,CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)))`;

/** Recheck saved native agent authority at each paid/network handoff. */
export async function assertAgentHandoff(platform: Pick<Platform,'database'>) {
  if (!agentAction.getStore()) return;
  const admission=agentWriteAdmission.getStore();
  if (!admission || !await platform.database.$client.prepare(`SELECT 1 WHERE ${senderWriteGuard}`)
    .bind(admission.sessionId,admission.operatorId,admission.version,Date.now()).first())
    throw new ToolRefusal('authority_changed');
}

export async function agentHandoff<T>(platform: Pick<Platform,'database'>, effect:()=>Promise<T>): Promise<T> {
  await assertAgentHandoff(platform);
  return effect();
}
