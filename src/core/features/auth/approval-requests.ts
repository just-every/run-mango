import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthVariables} from './routes';
import type {createCampaignService} from '@/core/features/campaigns/service';

export function approvalRequestRoutes(db:D1Database, campaigns:Pick<ReturnType<typeof createCampaignService>,'review'>) {
  const routes=new Hono<{Variables:AuthVariables}>();
  routes.get('/campaigns/:id/approval-requests',async context=>context.json({requests:(await db.prepare(`SELECT a.entity_id AS revisionId,a.occurred_at AS requestedAt,o.display_name AS operator,a.detail_json AS detailJson
    FROM lifecycle_audit_entries a LEFT JOIN operators o ON o.id=a.actor_id
    JOIN campaign_revisions v ON v.id=a.entity_id WHERE v.campaign_id=? AND a.action='campaign.approval-requested'
    ORDER BY a.occurred_at DESC LIMIT 10`).bind(context.req.param('id')).all<{revisionId:string;requestedAt:number;operator:string|null;detailJson:string}>()).results.map(({detailJson,...entry})=>({...entry,blockedHosts:JSON.parse(detailJson).blockedHosts??[]}))}));
  routes.post('/campaigns/:id/request-approval',async context=>{
    const body=z.object({revisionId:z.string().min(1)}).strict().safeParse(await context.req.json().catch(()=>null));
    if(!body.success)return context.json({error:'invalid_request'},400);
    const revision=await db.prepare(`SELECT v.id,v.updated_at AS updatedAt FROM campaign_revisions v JOIN campaigns c ON c.id=v.campaign_id
      WHERE v.id=? AND c.id=? AND c.state='draft'`).bind(body.data.revisionId,context.req.param('id')).first<{id:string;updatedAt:number}>();
    if(!revision)return context.json({error:'revision_not_draft'},409);
    // Resolve names from the saved review, never from caller-supplied hosts.
    const review=await campaigns.review(context.req.param('id'));
    if(review?.revision?.id!==revision.id)return context.json({error:'revision_not_draft'},409);
    const key=`approval-request:${revision.id}:${revision.updatedAt}`,now=Date.now();
    const detail=JSON.stringify({campaignId:context.req.param('id'),revisionId:revision.id,blockedHosts:review.blockedHosts.map(({host})=>({host}))});
    await db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,actor_type,actor_id,action,entity_type,entity_id,detail_json,occurred_at,created_at)
      SELECT ?,?,'operator',?,'campaign.approval-requested','campaign-revision',?,?,?,?
      WHERE EXISTS(SELECT 1 FROM campaign_revisions v JOIN campaigns c ON c.id=v.campaign_id
        WHERE v.id=? AND v.updated_at=? AND c.id=? AND c.state='draft')
      ON CONFLICT(operation_key) DO NOTHING`)
      .bind(crypto.randomUUID(),key,context.get('operator').id,revision.id,detail,now,now,revision.id,revision.updatedAt,context.req.param('id')).run();
    return context.json({status:'approval-requested'});
  });
  return routes;
}
