import {nativeAgent,executionState,executionPolicyAvailable} from '../agent-door/native-context';
// @ts-expect-error Portable Base ESM has no separate declaration for this helper.
import { localCookieName } from '@/vendor/base/operator-auth/http.mjs';
import { hmacSha256Hex } from '@/core/platform/crypto';
import type { Platform } from '@/core/shared/platform';

export type SenderWriteAuthority = {sessionId: string; operatorId: string; version: number};
export class SenderAuthorityChanged extends Error {}

/** The native middleware already authenticates; capture its exact session for the write fence. */
export async function senderWriteAuthority(platform: Pick<Platform, 'config' | 'database'>, request: Request, operatorId: string) {
  const agent=nativeAgent.getStore();
  if(agent){
    if(agent.context.person.id!==operatorId)throw new SenderAuthorityChanged();
    const authority=await platform.database.$client.prepare(`SELECT 'agent:'||e.id AS sessionId,o.id AS operatorId,o.version
      FROM mango_agent_executions e JOIN oa_operators o ON o.id=e.sponsor_id WHERE e.id=? AND o.id=?
      AND e.state='running' AND e.expires_at>? AND e.sponsor_version=o.version AND o.status='active'`)
      .bind(agent.executionId,operatorId,Date.now()).first<SenderWriteAuthority>();
    if(!authority)throw new SenderAuthorityChanged();
    return authority;
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
  SELECT id,operator_id,operator_version,revoked_at,expires_at FROM oa_sessions
  UNION ALL SELECT 'agent:'||e.id,e.sponsor_id,e.sponsor_version,NULL,e.expires_at FROM mango_agent_executions e
    JOIN oa_operators n ON n.id=e.sponsor_id LEFT JOIN operator_product_roles r ON r.operator_id=n.id
    WHERE e.state='running' AND e.policy_state=${executionState('n','r')} AND ${executionPolicyAvailable}
  ) s JOIN oa_operators o ON o.id=s.operator_id
  WHERE s.id=? AND o.id=? AND o.version=? AND s.operator_version=o.version AND o.status='active'
    AND s.revoked_at IS NULL AND s.expires_at > MAX(?,CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)))`;
