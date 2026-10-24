import {Hono} from 'hono';
import type {AuthVariables} from '@/core/features/auth/routes';
import type {Platform} from '@/core/shared/platform';
import {activityStatement} from '@/core/features/auth/activity-record';
import {starterTemplates} from '../campaigns/starter-templates';
import {graphSchema,validateGraph} from './graph';
/** Draft custody only. No activation, enrolment, scheduling or transport door. */
export function flowDraftRoutes(platform:Platform) {
  const db=platform.database.$client, routes=new Hono<{Variables:AuthVariables}>();
  routes.get('/flow-drafts/templates',async c=>c.json({templates:[...starterTemplates.map(({id,name})=>({id,name})),...(await db.prepare('SELECT id,name FROM campaign_templates ORDER BY updated_at DESC LIMIT 100').all()).results]}));
  routes.get('/flow-drafts/templates/:id',async c=>{
    const id=c.req.param('id'),starter=starterTemplates.find(item=>item.id===id);
    const row=starter?null:await db.prepare('SELECT composition_json FROM campaign_templates WHERE id=?').bind(id).first<{composition_json:string}>();
    if(!starter&&!row)return c.json({error:'template_not_found'},404);
    const composition=starter?.composition??JSON.parse(row!.composition_json).composition;
    return c.json({email:{templateId:id,subject:composition.emailSubject??'',preheader:composition.preheader??'',html:composition.emailBody??'',text:composition.emailText??''}});
  });
  routes.get('/flow-drafts',async c=>c.json({revisions:(await db.prepare('SELECT * FROM flow_draft_revisions ORDER BY created_at DESC,id DESC LIMIT 100').all()).results.map(row=>({...row,graph:JSON.parse(String(row.graph_json))}))}));
  routes.post('/flow-drafts',async c=>{
    const input=graphSchema.safeParse(await c.req.json().catch(()=>null));
    if(!input.success)return c.json({error:'invalid_flow_graph'},400);
    const errors=validateGraph(input.data);if(errors.length)return c.json({error:'flow_validation',errors},422);
    const id=crypto.randomUUID(),now=Date.now(),actor=c.get('operator').id;
    await db.batch([db.prepare('INSERT INTO flow_draft_revisions(id,name,graph_json,created_by,created_at) VALUES(?,?,?,?,?)').bind(id,input.data.name,JSON.stringify(input.data),actor,now),
      activityStatement(db,{key:crypto.randomUUID(),action:'flow-draft-saved',entityType:'flow',entityId:id,actorId:actor,detail:{state:'draft'},at:now})]);
    return c.json({id,revisionId:id,state:'draft'},201);
  });
  return routes;
}
