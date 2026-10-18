import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthVariables} from './routes';
import type {createAudienceService} from '@/core/features/audience/service';

/** Support records requests and restrictions; it never grants consent. */
export function contactSupportRoutes(db:D1Database, audience:ReturnType<typeof createAudienceService>) {
  const routes=new Hono<{Variables:AuthVariables}>();
  routes.get('/contacts/:id/privacy-requests',async context=>{
    const requests=(await db.prepare('SELECT id,kind,created_at AS createdAt FROM operator_privacy_requests WHERE contact_id=? ORDER BY created_at DESC').bind(context.req.param('id')).all()).results;
    return context.json({requests});
  });
  routes.post('/contacts/:id/privacy-requests',async context=>{
    const body=z.object({kind:z.literal('erasure')}).strict().safeParse(await context.req.json().catch(()=>null));
    if(!body.success)return context.json({error:'invalid_privacy_request'},400);
    const contactId=context.req.param('id'),actor=context.get('operator').id;
    if(!await db.prepare('SELECT id FROM contacts WHERE id=?').bind(contactId).first())return context.json({error:'not_found'},404);
    const id=crypto.randomUUID(),now=Date.now();
    await db.batch([
      db.prepare("INSERT INTO operator_privacy_requests(id,contact_id,kind,actor_id,created_at) VALUES(?,?,'erasure',?,?)").bind(id,contactId,actor,now),
      db.prepare("INSERT INTO lifecycle_audit_entries(id,operation_key,actor_type,actor_id,action,entity_type,entity_id,detail_json,occurred_at,created_at) VALUES(?,?,'operator',?,'contact.erasure-requested','contact',?,'{}',?,?)").bind(id,id,actor,contactId,now,now),
    ]);
    return context.json({id,kind:'erasure',createdAt:now},201);
  });
  routes.post('/contacts/:id/opt-out',async context=>{
    const body=z.object({channel:z.enum(['email','sms'])}).strict().safeParse(await context.req.json().catch(()=>null));
    if(!body.success)return context.json({error:'invalid_opt_out'},400);
    const contactId=context.req.param('id'),detail=await audience.detail(contactId);
    if(!detail)return context.json({error:'not_found'},404);
    const id=crypto.randomUUID(),now=new Date(),actor=context.get('operator').id;
    const destination=body.data.channel==='email'?detail.contact.email:detail.phones[0]?.phoneE164;
    if(!destination)return context.json({error:'channel_destination_missing'},409);
    try {await audience.recordChannelOptOut({contactId,channel:body.data.channel,reason:'operator-recorded-opt-out',occurredAt:now,stableId:id});}
    catch{return context.json({error:'opt_out_unavailable'},503);}
    await db.prepare("INSERT INTO lifecycle_audit_entries(id,operation_key,actor_type,actor_id,action,entity_type,entity_id,detail_json,occurred_at,created_at) VALUES(?,?,'operator',?,'contact.opt-out-recorded','contact',?,json_object('channel',?),?,?)").bind(id,id,actor,contactId,body.data.channel,now.getTime(),now.getTime()).run();
    return context.json({status:'unsubscribed'});
  });
  return routes;
}
