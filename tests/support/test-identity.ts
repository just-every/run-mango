// Test-only database fixture. Product entrypoints never import this module.
import { createAuthRepository } from '@/core/features/auth/repository';
import { hashToken, opaqueToken } from '@/vendor/base/operator-auth/crypto.mjs';
import type { Platform } from '@/core/shared/platform';
export function testIdentity(platform: Platform) {
  const repository = createAuthRepository(platform.database), db = platform.database.$client;
  return {
    async importLocalDemoOperator(operator: { id:string; email:string; displayName:string }, now:Date) {
      await db.prepare('INSERT INTO operators(id,email,display_name,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING').bind(operator.id,operator.email.toLowerCase(),operator.displayName,now.getTime(),now.getTime()).run();
      await db.prepare("INSERT INTO oa_operators(id,email,display_name,role,status,created_at) VALUES(?,?,?,'owner','active',?) ON CONFLICT(id) DO NOTHING").bind(operator.id,operator.email.toLowerCase(),operator.displayName,now.getTime()).run();
    },
    async createTestSession(operatorId:string, now=new Date()) {
      const operator=await repository.getOperator(operatorId);
      if(!operator) throw new Error('Test operator is missing.');
      const token=opaqueToken(), hash=await hashToken(platform.config.sessionSigningKey,'session',token);
      await db.prepare("INSERT INTO oa_sessions(id,token_hash,operator_id,operator_version,kind,created_at,expires_at) SELECT ?,?,id,version,'native',?,? FROM oa_operators WHERE id=?").bind(crypto.randomUUID(),hash,now.getTime(),now.getTime()+7*86400000,operatorId).run();
      return {operator,token,cookie:`operator_session_local=${token}; Path=/; HttpOnly; SameSite=Lax`};
    },
  };
}
