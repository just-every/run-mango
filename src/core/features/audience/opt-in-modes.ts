import {Hono} from 'hono';
import type {AuthVariables} from '@/core/features/auth/routes';
import type {Platform} from '@/core/shared/platform';
import {effectiveRole} from '@/core/features/auth/product-roles';
import {senderWriteAuthority,senderWriteGuard,SenderAuthorityChanged} from '@/core/features/settings/sender-authority';
export const ownedOptInPoints=['hosted','kiosk','manual'] as const;
export type OptInPoint=typeof ownedOptInPoints[number];
export type OptInMode={point:OptInPoint;mode:'double'|'single';version:number};
export async function loadOptInMode(db:D1Database,point:OptInPoint):Promise<OptInMode>{
 const row=await db.prepare('SELECT mode,version FROM opt_in_modes WHERE point=?').bind(point).first<{mode:'double'|'single';version:number}>();
 return {point,mode:row?.mode??'double',version:row?.version??0};
}
export function optInRoutes(platform:Platform){
 const routes=new Hono<{Variables:AuthVariables}>(),db=platform.database.$client;
 routes.get('/settings/opt-in',async c=>{
  const points=await Promise.all(ownedOptInPoints.map(point=>loadOptInMode(db,point)));
  const credentials=(await db.prepare('SELECT id,name FROM integration_credentials WHERE revoked_at IS NULL ORDER BY name,id').all()).results;
  return c.json({points,credentials,connections:['Shopify','WooCommerce','Stripe','Incumbent move-in sources'],policy:'contact.opt-in.v1'});
 });
 routes.put('/settings/opt-in/:point',async c=>{
  if(!['owner','admin'].includes(c.get('operator').role))return c.json({error:'opt_in_owner_or_admin_required'},403);
  const point=c.req.param('point'),body=await c.req.json().catch(()=>null);
  if(!ownedOptInPoints.includes(point as OptInPoint)||!body||Object.keys(body).join(',')!=='mode'||!['double','single'].includes(body.mode))return c.json({error:'invalid_opt_in_mode'},400);
  try{
   const authority=await senderWriteAuthority(platform,c.req.raw,c.get('operator').id),now=Date.now(),operation=crypto.randomUUID();
   const role=`EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=? AND n.status='active' AND ${effectiveRole} IN ('owner','admin'))`;
   const results=await db.batch([
    db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
     SELECT ?,?,'capture-point',?,'opt-in.mode.changed','operator',?,json_object('policy','contact.opt-in.v1','mode',?),?,? WHERE ${senderWriteGuard} AND ${role}
     AND COALESCE((SELECT mode FROM opt_in_modes WHERE point=?),'double')!=?`).bind(operation,operation,point,authority.operatorId,body.mode,now,now,authority.sessionId,authority.operatorId,authority.version,now,authority.operatorId,point,body.mode),
    db.prepare(`INSERT INTO opt_in_modes(point,mode,version,operator_id,updated_at) SELECT ?,?,1,?,? WHERE EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)
     ON CONFLICT(point) DO UPDATE SET mode=excluded.mode,version=version+1,operator_id=excluded.operator_id,updated_at=excluded.updated_at`).bind(point,body.mode,authority.operatorId,now,operation),
    db.prepare(`SELECT 1 AS authorized WHERE ${senderWriteGuard} AND ${role}`).bind(authority.sessionId,authority.operatorId,authority.version,now,authority.operatorId)
   ]);
   if(!results[2].results.length)throw new SenderAuthorityChanged();
   return c.json(await loadOptInMode(db,point as OptInPoint));
  }catch(error){return c.json({error:error instanceof SenderAuthorityChanged?'authority_changed':'opt_in_save_failed'},error instanceof SenderAuthorityChanged?403:500);}
 });
 return routes;
}
