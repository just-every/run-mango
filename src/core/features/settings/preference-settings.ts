import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthVariables} from '@/core/features/auth/routes';
import type {Platform} from '@/core/shared/platform';
import {effectiveRole} from '@/core/features/auth/product-roles';
import {senderWriteAuthority,senderWriteGuard,SenderAuthorityChanged} from './sender-authority';
const policy=z.object({editableFields:z.array(z.literal('displayName')).max(1)}).strict();
export async function loadPreferenceSettings(db:D1Database) {
  const row=await db.prepare('SELECT fields_json FROM recipient_preference_settings WHERE id=1').first<{fields_json:string}>();
  return policy.parse({editableFields:row?JSON.parse(row.fields_json):[]});
}
export function preferenceSettingsRoutes(platform:Platform) {
  const routes=new Hono<{Variables:AuthVariables}>(),db=platform.database.$client;
  routes.get('/settings/preferences',async c=>c.json(await loadPreferenceSettings(db)));
  routes.put('/settings/preferences',async c=>{
    if(!['owner','admin'].includes(c.get('operator').role))return c.json({error:'preference_settings_owner_or_admin_required'},403);
    const parsed=policy.safeParse(await c.req.json().catch(()=>undefined));
    if(!parsed.success)return c.json({error:'invalid_preference_settings'},400);
    try {
      const authority=await senderWriteAuthority(platform,c.req.raw,c.get('operator').id),now=Date.now(),operation=crypto.randomUUID(),fields=JSON.stringify(parsed.data.editableFields);
      const role=`EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=? AND n.status='active' AND ${effectiveRole} IN ('owner','admin'))`;
      const guard=[authority.sessionId,authority.operatorId,authority.version,now,authority.operatorId];
      const result=await db.batch([
        db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
          SELECT ?,?,'settings','recipient.preferences.v1','preferences.settings.changed','operator',?,?,?,? WHERE ${senderWriteGuard} AND ${role}
          AND NOT EXISTS(SELECT 1 FROM recipient_preference_settings WHERE id=1 AND fields_json=?)`).bind(operation,operation,authority.operatorId,JSON.stringify(parsed.data),now,now,...guard,fields),
        db.prepare(`INSERT INTO recipient_preference_settings(id,fields_json,operator_id,updated_at) SELECT 1,?,?,? WHERE EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)
          ON CONFLICT(id) DO UPDATE SET fields_json=excluded.fields_json,operator_id=excluded.operator_id,updated_at=excluded.updated_at`).bind(fields,authority.operatorId,now,operation),
        db.prepare(`SELECT 1 AS authorized WHERE ${senderWriteGuard} AND ${role}`).bind(...guard),
      ]);
      if(!result[2].results.length)throw new SenderAuthorityChanged();
      return c.json(await loadPreferenceSettings(db));
    } catch(error) {return c.json({error:error instanceof SenderAuthorityChanged?'authority_changed':'preference_settings_save_failed'},error instanceof SenderAuthorityChanged?403:500);}
  });
  return routes;
}
