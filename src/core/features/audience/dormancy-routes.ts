import {Hono} from 'hono';
import {z} from 'zod';
import type {Platform} from '@/core/shared/platform';
import type {AuthVariables} from '@/core/features/auth/routes';
import {effectiveRole} from '@/core/features/auth/product-roles';
import {senderWriteAuthority,senderWriteGuard,SenderAuthorityChanged} from '@/core/features/settings/sender-authority';
import {dormancyPolicySchema,installationDormancyPolicy} from './dormancy-policy';

/** Policy changes and their operator audit share one native transaction. */
export function createDormancyRoutes(platform:Platform) {
  const routes=new Hono<{Variables:AuthVariables}>(),db=platform.database.$client;
  routes.get('/settings/audience-exclusions',async c=>c.json({policy:await installationDormancyPolicy(db)}));
  for(const campaign of [false,true]) {
    routes.put(campaign?'/campaigns/:id/dormancy':'/settings/audience-exclusions',async c=>{
      const schema=campaign?z.object({revisionId:z.string().min(1),policy:dormancyPolicySchema}).strict():z.object({policy:dormancyPolicySchema.omit({includeOpenOnly:true})}).strict();
      const input=schema.safeParse(await c.req.json().catch(()=>null));
      if(!input.success)return c.json({error:'invalid_dormancy_policy'},400);
      const policy={...input.data.policy,includeOpenOnly:'includeOpenOnly' in input.data.policy?input.data.policy.includeOpenOnly:false};
      const revisionId='revisionId' in input.data?input.data.revisionId:undefined;
      try {
        const actor=c.get('operator').id,authority=await senderWriteAuthority(platform,c.req.raw,actor),at=Date.now(),key=crypto.randomUUID();
        const allowed=campaign?"'owner','admin','manager'":"'owner','admin'";
        const roleGuard=`EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=? AND n.status='active' AND ${effectiveRole} IN (${allowed}))`;
        const guard=`${senderWriteGuard} AND ${roleGuard}`;
        const values=[authority.sessionId,actor,authority.version,at,actor];
        const campaignGuard=campaign?" AND EXISTS(SELECT 1 FROM campaign_revisions r JOIN campaigns c ON c.active_revision_id=r.id WHERE r.id=? AND c.id=? AND c.state='draft' AND r.state='draft')":'';
        const scoped=campaign?[revisionId,c.req.param('id')]:[];
        const policyJson=JSON.stringify(policy);
        const statements=[db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,actor_type,actor_id,action,entity_type,entity_id,detail_json,occurred_at,created_at)
          SELECT ?,?,'operator',?,?,?, ?,?,?,? WHERE ${guard}${campaignGuard}`)
          .bind(key,key,actor,campaign?'audience.dormancy-changed':'audience.default-changed',campaign?'campaign-revision':'setting',revisionId??'audience.exclusions.v1',JSON.stringify({policy:'audience.exclusions.v1',...policy}),at,at,...values,...scoped)];
        const authorized='EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)';
        if(campaign) {
          statements.push(db.prepare(`DELETE FROM campaign_checks WHERE revision_id=? AND ${authorized}`).bind(revisionId,key));
          statements.push(db.prepare(`DELETE FROM campaign_audience_channel_counts WHERE audience_id IN (SELECT id FROM campaign_audiences WHERE revision_id=?) AND ${authorized}`).bind(revisionId,key));
          statements.push(db.prepare(`DELETE FROM campaign_audiences WHERE revision_id=? AND ${authorized}`).bind(revisionId,key));
          statements.push(db.prepare(`UPDATE campaign_revisions SET dormancy_policy_json=?,updated_at=max(updated_at+1,?) WHERE id=? AND ${authorized}`).bind(policyJson,at,revisionId,key));
        } else statements.push(db.prepare(`INSERT INTO audience_exclusion_settings(id,policy_json,updated_at,operator_id) SELECT 1,?,?,? WHERE ${authorized} ON CONFLICT(id) DO UPDATE SET policy_json=excluded.policy_json,updated_at=excluded.updated_at,operator_id=excluded.operator_id`).bind(policyJson,at,actor,key));
        const result=await db.batch(statements);
        if(!result[0].meta.changes)return c.json({error:'policy_authority_changed'},409);
        return c.json({policy});
      }catch(error){return c.json({error:error instanceof SenderAuthorityChanged?'authority_changed':'dormancy_save_failed'},error instanceof SenderAuthorityChanged?403:500);}
    });
  }
  return routes;
}
