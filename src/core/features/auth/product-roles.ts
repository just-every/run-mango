import type { ProductRole } from './permissions';
import { AuthError } from '@/vendor/base/operator-auth/index.mjs';
import { senderWriteAuthority, senderWriteGuard } from '@/core/features/settings/sender-authority';
import type { Platform } from '@/core/shared/platform';

export const effectiveRole = "COALESCE(r.role,CASE WHEN n.role='member' THEN 'author' WHEN n.id=(SELECT owner_id FROM operator_role_settings WHERE singleton=1) THEN 'owner' ELSE 'admin' END)";

export async function productAuthority(db: D1Database, operatorId: string) {
  const row=await db.prepare(`SELECT ${effectiveRole} AS role,COALESCE(r.unmasked_contacts,0) AS unmaskedContacts
      FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id
      WHERE n.id=? AND n.status!='inactive'`).bind(operatorId).first<{role:ProductRole;unmaskedContacts:number}>();
  return row?{role:row.role,unmaskedContacts:row.unmaskedContacts}:undefined;
}

export async function assignProductRole(platform: Pick<Platform,'config'|'database'>, request: Request, actorId: string,
  targetId: string, role: ProductRole, unmaskedContacts: boolean) {
  const db=platform.database.$client, authority=await senderWriteAuthority(platform,request,actorId);
  if((await productAuthority(db,actorId))?.role!=='owner')throw new AuthError('role_forbidden',403);
  const target=await db.prepare('SELECT id FROM oa_operators WHERE id=? AND status!=?').bind(targetId,'inactive').first();
  if(!target)throw new AuthError('operator_not_found',404);
  const now=Date.now(), operation=crypto.randomUUID();
  const ownerGuard=`EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id
    LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=? AND n.status='active' AND ${effectiveRole}='owner')`;
  // Audit and write share a transaction. The session and effective product role
  // are rechecked at the write, so an intervening downgrade grants no authority.
  try {
    const [audit]=await db.batch([
      db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,actor_type,actor_id,action,entity_type,entity_id,detail_json,occurred_at,created_at)
        SELECT ?,?,'operator',?,'operator.role-changed','operator',?,json_object('role',?,'unmaskedContacts',?),?,?
        WHERE ${senderWriteGuard} AND ${ownerGuard}
          AND NOT EXISTS(SELECT 1 FROM operator_product_roles WHERE operator_id=? AND role=? AND unmasked_contacts=?)`)
        .bind(operation,operation,actorId,targetId,role,unmaskedContacts?1:0,now,now,
          authority.sessionId,authority.operatorId,authority.version,now,actorId,targetId,role,unmaskedContacts?1:0),
      db.prepare(`INSERT INTO operator_product_roles(operator_id,role,unmasked_contacts,updated_by,updated_at)
        SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)
        ON CONFLICT(operator_id) DO UPDATE SET role=excluded.role,unmasked_contacts=excluded.unmasked_contacts,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
        .bind(targetId,role,unmaskedContacts?1:0,actorId,now,operation),
    ]);
    if(!audit.meta.changes) {
      const [actor,current]=await Promise.all([productAuthority(db,actorId),productAuthority(db,targetId)]);
      if(actor?.role!=='owner')throw new AuthError('role_forbidden',403);
      if(current?.role!==role||Boolean(current.unmaskedContacts)!==unmaskedContacts)throw new AuthError('authority_changed',403);
    }
  } catch(error) {
    if(error instanceof Error&&error.message.includes('last_product_owner'))throw new AuthError('last_owner',409);
    throw error;
  }
}
