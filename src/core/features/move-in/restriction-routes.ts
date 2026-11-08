import {Hono} from 'hono';
import type {Platform} from '@/core/shared/platform';
import type {AuthVariables} from '@/core/features/auth/routes';
import {activityStatement} from '@/core/features/auth/activity-record';
import {sha256} from '@/core/shared/ids';
import {restrictionConnectionSchema,sealRestrictionKey} from './restriction-connections';
import {readMailchimpMembers} from './mailchimp-transport';

export function restrictionRoutes(platform:Platform,synchronize:()=>Promise<unknown>) {
  const routes=new Hono<{Variables:AuthVariables}>(),db=platform.database.$client;
  routes.get('/settings/incumbent-restrictions',async context=>context.json({connections:(await db.prepare(
    'SELECT id,data_center AS dataCenter,audience_id AS audienceId,connected_at AS connectedAt,last_success_at AS lastSuccessAt,last_error AS lastError FROM incumbent_restriction_connections ORDER BY connected_at').all()).results}));
  routes.use('/settings/incumbent-restrictions',async(context,next)=>{
    if(context.req.method!=='GET'&&context.get('operator').role!=='owner')return context.json({error:'owner_required'},403);
    await next();
  });
  routes.post('/settings/incumbent-restrictions',async context=>{
    const parsed=restrictionConnectionSchema.safeParse(await context.req.json().catch(()=>null));
    if(!parsed.success)return context.json({error:'invalid_connection'},400);
    const input=parsed.data,id=await sha256(`${input.dataCenter}:${input.audienceId}`);
    try {await readMailchimpMembers(input);}catch{return context.json({error:'incumbent_connection_refused'},422);}
    await db.batch([db.prepare(`INSERT INTO incumbent_restriction_connections(id,data_center,audience_id,credentials,connected_by,connected_at)
      VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET credentials=excluded.credentials,connected_by=excluded.connected_by,connected_at=excluded.connected_at,last_success_at=NULL,last_error=NULL`)
      .bind(id,input.dataCenter,input.audienceId,await sealRestrictionKey(input.apiKey,platform.config.sessionSigningKey),context.get('operator').id,Date.now()),
      activityStatement(db,{key:crypto.randomUUID(),action:'incumbent-restrictions-connected',entityType:'integration',entityId:id,actorId:context.get('operator').id,
        detail:{dataCenter:input.dataCenter,audienceId:input.audienceId,restrictionWriteConsent:true}})]);
    try {await synchronize();}catch{return context.json({connected:true,synchronized:false},202);}
    return context.json({connected:true,synchronized:true},201);
  });
  routes.post('/settings/incumbent-restrictions/sync',async context=>{
    if(context.get('operator').role!=='owner')return context.json({error:'owner_required'},403);
    try {return context.json({outcomes:await synchronize()});}catch{return context.json({error:'incumbent_sync_failed'},409);}
  });
  routes.delete('/settings/incumbent-restrictions/:id',async context=>{
    if(context.get('operator').role!=='owner')return context.json({error:'owner_required'},403);
    try {await synchronize();}catch{return context.json({error:'pending_restrictions'},409);}
    const id=context.req.param('id');
    await db.batch([db.prepare('DELETE FROM incumbent_restriction_connections WHERE id=?').bind(id),
      activityStatement(db,{key:crypto.randomUUID(),action:'incumbent-restrictions-disconnected',entityType:'integration',entityId:id,actorId:context.get('operator').id})]);
    return context.json({disconnected:true});
  });
  return routes;
}
