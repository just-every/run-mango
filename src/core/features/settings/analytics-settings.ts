import {Hono} from 'hono';
import type {AuthVariables} from '@/core/features/auth/routes';
import type {Platform} from '@/core/shared/platform';
import {effectiveRole} from '@/core/features/auth/product-roles';
import {senderWriteAuthority,senderWriteGuard,SenderAuthorityChanged} from './sender-authority';
import {parseAnalyticsPolicy,defaultAnalyticsPolicy} from './analytics-policy';

export async function loadAnalyticsPolicy(db:D1Database){
  const saved=await db.prepare('SELECT policy_json FROM analytics_settings WHERE id=1').first<{policy_json:string}>();
  return saved?parseAnalyticsPolicy(JSON.parse(saved.policy_json)):{...defaultAnalyticsPolicy};
}
export function analyticsSettingsRoutes(platform:Platform){
  const routes=new Hono<{Variables:AuthVariables}>(),db=platform.database.$client;
  routes.get('/settings/analytics',async c=>c.json(await loadAnalyticsPolicy(db)));
  routes.get('/settings/analytics/campaigns',async c=>c.json({campaigns:(await db.prepare("SELECT id,name,utm_policy_json AS utmPolicyJson FROM campaign_revisions WHERE state='draft' ORDER BY updated_at DESC").all()).results}));
  routes.put('/settings/analytics',async c=>{
    if(!['owner','admin'].includes(c.get('operator').role))return c.json({error:'analytics_owner_or_admin_required'},403);
    let policy;try{policy=parseAnalyticsPolicy(await c.req.json());}catch{return c.json({error:'invalid_analytics_policy'},400);}
    try{
      const authority=await senderWriteAuthority(platform,c.req.raw,c.get('operator').id),operation=crypto.randomUUID(),now=Date.now(),json=JSON.stringify(policy);
      const roles=`EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=? AND n.status='active' AND ${effectiveRole} IN ('owner','admin'))`;
      const result=await db.batch([
        db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
          SELECT ?,?,'settings','campaign.analytics.v1','analytics.settings.changed','operator',?,?,?,? WHERE ${senderWriteGuard} AND ${roles} AND NOT EXISTS(SELECT 1 FROM analytics_settings WHERE id=1 AND policy_json=?)`)
          .bind(operation,operation,authority.operatorId,json,now,now,authority.sessionId,authority.operatorId,authority.version,now,authority.operatorId,json),
        db.prepare(`INSERT INTO analytics_settings(id,policy_json,operator_id,updated_at) SELECT 1,?,?,? WHERE EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)
          ON CONFLICT(id) DO UPDATE SET policy_json=excluded.policy_json,operator_id=excluded.operator_id,updated_at=excluded.updated_at`).bind(json,authority.operatorId,now,operation),
        db.prepare(`SELECT 1 AS authorized WHERE ${senderWriteGuard} AND ${roles}`).bind(authority.sessionId,authority.operatorId,authority.version,now,authority.operatorId),
      ]);
      if(!result[2].results.length)throw new SenderAuthorityChanged();
      return c.json(await loadAnalyticsPolicy(db));
    }catch(error){return c.json({error:error instanceof SenderAuthorityChanged?'authority_changed':'analytics_save_failed'},error instanceof SenderAuthorityChanged?403:500);}
  });
  return routes;
}
