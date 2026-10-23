import {Hono} from 'hono';
import {bodyLimit} from 'hono/body-limit';
import {z} from 'zod';
import type {AuthVariables} from '@/core/features/auth/routes';
import {hasPermission} from '@/core/features/auth/permissions';
import {activityStatement} from '@/core/features/auth/activity-record';
import type {Platform} from '@/core/shared/platform';
import {sha256} from '@/core/shared/ids';
import {seal,unseal} from '@/core/features/store/stripe/secrets';
import {createCredentialStore} from '../credentials';
import {recordCustomEvent} from '../custom-events';
import {IntegrationError} from '../schema';
import {verifyAdapter,type SupportedApp} from './signatures';
import {adapterFact} from './payloads';
export const reviewApps=[{id:'judgeme',name:'Judge.me'},{id:'yotpo',name:'Yotpo'},{id:'okendo',name:'Okendo'},{id:'smile',name:'Smile.io'}] as const;
const input=z.object({accountId:z.string().trim().regex(/^[a-zA-Z0-9_.-]{1,200}$/),secret:z.string().min(16).max(512),exclusiveSecret:z.literal(true)}).strict();
type Connection={app:SupportedApp;account_id:string;secret_cipher:string;credential_id:string};
const path='/settings/integrations/reviews-loyalty';
export function reviewLoyaltyRoutes(platform:Platform,restoreMode=false) {
  const db=platform.database.$client,credentials=createCredentialStore(db);
  const settings=new Hono<{Variables:AuthVariables}>(),webhooks=new Hono();
  const failure=(error:Error,c:any)=>c.json({error:error instanceof IntegrationError?error.code:'adapter_unavailable'},error instanceof IntegrationError?error.status:503);
  settings.onError(failure);webhooks.onError(failure);
  settings.use(path+'*',async(c,next)=>{
    const role=c.get('operator').role;
    if(!hasPermission(role,'integration.manage')||!['owner','admin'].includes(role))return c.json({error:'owner_or_admin_required'},403);
    await next();
  });
  settings.use(path+'*',bodyLimit({maxSize:4096,onError:c=>c.json({error:'request_too_large'},413)}));
  settings.get(path,async c=>{
    const rows=(await db.prepare('SELECT app,account_id AS accountId,connected_at AS connectedAt,unmatched_count AS unmatchedCount FROM review_loyalty_connections ORDER BY app').all()).results;
    return c.json({apps:reviewApps.map(app=>({...app,supported:app.id!=='yotpo',gap:app.id==='yotpo'?'Signature protocol has not been verified; connection disabled.':app.id==='smile'?'Customer profile observations only; earned-points and tier-transition events are not inferred.':null,connection:rows.find(row=>row.app===app.id)??null,webhookPath:'/webhooks/commerce/engagement/'+app.id}))});
  });
  settings.put(path+'/:app',async c=>{
    const app=c.req.param('app')??'';
    if(app==='yotpo')throw new IntegrationError('adapter_signature_protocol_unverified',409);
    if(!['judgeme','okendo','smile'].includes(app))throw new IntegrationError('adapter_not_found',404);
    const parsed=input.safeParse(await c.req.json().catch(()=>null));
    if(!parsed.success)throw new IntegrationError('invalid_adapter_connection',400);
    if(app==='okendo'&&!/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(parsed.data.secret))throw new IntegrationError('invalid_adapter_connection',400);
    const actor=c.get('operator'),now=Date.now();
    const prior=await db.prepare('SELECT credential_id FROM review_loyalty_connections WHERE app=?').bind(app).first<{credential_id:string}>();
    const key=await credentials.create({name:reviewApps.find(a=>a.id===app)!.name+' inbound adapter',scopes:['events:write']},actor.id);
    await db.batch([
      ...(prior?[db.prepare('UPDATE integration_credentials SET revoked_at=? WHERE id=?').bind(now,prior.credential_id)]:[]),
      db.prepare(`INSERT INTO review_loyalty_connections(app,account_id,secret_cipher,credential_id,connected_by,connected_at) VALUES(?,?,?,?,?,?)
        ON CONFLICT(app) DO UPDATE SET account_id=excluded.account_id,secret_cipher=excluded.secret_cipher,credential_id=excluded.credential_id,connected_by=excluded.connected_by,connected_at=excluded.connected_at,
        unmatched_count=CASE WHEN account_id=excluded.account_id THEN unmatched_count ELSE 0 END`).bind(app,parsed.data.accountId,await seal(parsed.data.secret,platform.config.sessionSigningKey),key.credential.id,actor.id,now),
      activityStatement(db,{key:crypto.randomUUID(),action:'review-loyalty.connected',entityType:'integration',entityId:app,actorId:actor.id,at:now}),
    ]);
    return c.json({connected:true});
  });
  settings.delete(path+'/:app',async c=>{
    const app=c.req.param('app')??'';if(!reviewApps.some(a=>a.id===app))throw new IntegrationError('adapter_not_found',404);
    await db.batch([
      db.prepare('UPDATE integration_credentials SET revoked_at=? WHERE id IN (SELECT credential_id FROM review_loyalty_connections WHERE app=?)').bind(Date.now(),app),
      db.prepare('DELETE FROM review_loyalty_connections WHERE app=?').bind(app),
      activityStatement(db,{key:crypto.randomUUID(),action:'review-loyalty.disconnected',entityType:'integration',entityId:app,actorId:c.get('operator').id}),
    ]);return c.json({disconnected:true});
  });
  webhooks.use('/webhooks/commerce/engagement/*',bodyLimit({maxSize:64*1024,onError:c=>c.json({error:'request_too_large'},413)}));
  webhooks.post('/webhooks/commerce/engagement/:app',async c=>{
    const app=c.req.param('app')??'';
    if(app==='yotpo')throw new IntegrationError('adapter_signature_protocol_unverified',409);
    if(!['judgeme','okendo','smile'].includes(app))throw new IntegrationError('adapter_not_found',404);
    const connection=await db.prepare('SELECT app,account_id,secret_cipher,credential_id FROM review_loyalty_connections WHERE app=?').bind(app).first<Connection>();
    if(!connection)throw new IntegrationError('adapter_not_connected',409);
    if(restoreMode||await db.prepare("SELECT 1 FROM audience_erasures WHERE state='pending'").first())throw new IntegrationError('adapter_maintenance',503);
    const raw=await c.req.text();
    await verifyAdapter(connection.app,c.req.raw.headers,raw,await unseal(connection.secret_cipher,platform.config.sessionSigningKey));
    await credentials.takeAllowance(connection.credential_id);
    let value:unknown;try{value=JSON.parse(raw);}catch{throw new IntegrationError('invalid_adapter_event',400);}
    const fact=adapterFact(connection.app,value,connection.account_id);
    if(Date.parse(fact.occurredAt)>Date.now())throw new IntegrationError('event_in_future',400);
    const namespace='adapter:'+app+':'+await sha256(connection.account_id);
    const receipt=await sha256(platform.config.sessionSigningKey+':'+namespace+':'+fact.eventId),digest=await sha256(platform.config.sessionSigningKey+':'+raw),attempt=crypto.randomUUID();
    const prior=await db.prepare('SELECT payload_digest FROM review_loyalty_receipts WHERE id=?').bind(receipt).first<{payload_digest:string}>();
    if(prior)throw new IntegrationError(prior.payload_digest===digest?'adapter_webhook_replayed':'idempotency_conflict',409);
    const contact=await db.prepare('SELECT a.contact_id id FROM contact_email_addresses a JOIN contacts c ON c.id=a.contact_id WHERE a.email=? AND c.merge_lock IS NULL').bind(fact.email).first<{id:string}>();
    if(!contact) {
      // Only keyed digests, never the address or request, survive an unmatched
      // event. A per-attempt marker makes the count atomic under concurrent replay.
      const [written,stored]=await db.batch<{payload_digest:string}>([
        db.prepare(`INSERT INTO review_loyalty_receipts(id,app,attempt_id,payload_digest,received_at)
          SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM review_loyalty_connections WHERE app=? AND credential_id=?) ON CONFLICT DO NOTHING`).bind(receipt,app,attempt,digest,Date.now(),app,connection.credential_id),
        db.prepare('SELECT payload_digest FROM review_loyalty_receipts WHERE id=?').bind(receipt),
        db.prepare(`UPDATE review_loyalty_connections SET unmatched_count=unmatched_count+1 WHERE app=? AND credential_id=? AND EXISTS(SELECT 1 FROM review_loyalty_receipts WHERE id=? AND attempt_id=?)`).bind(app,connection.credential_id,receipt,attempt),
      ]);
      if(!stored.results[0])throw new IntegrationError('event_authority_changed',409);
      if(stored.results[0].payload_digest!==digest)throw new IntegrationError('idempotency_conflict',409);
      if(!written.meta.changes)throw new IntegrationError('adapter_webhook_replayed',409);
      return c.json({status:'unmatched'});
    }
    const result=await recordCustomEvent(db,connection.credential_id,{name:fact.name,contactId:contact.id,idempotencyKey:fact.eventId.padEnd(8,'_'),occurredAt:fact.occurredAt,properties:fact.properties},{provider:app,namespace,receipt:{id:receipt,digest,attemptId:attempt}});
    if(result.status==='replayed')throw new IntegrationError('adapter_webhook_replayed',409);
    return c.json({status:'recorded',id:result.id});
  });
  return {settings,webhooks};
}
