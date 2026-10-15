import { Hono } from 'hono';
import type { Platform } from '@/core/shared/platform';
import type { AppEnvironment } from '@/core/app/app';

export const openEstimateLabel = 'Privacy-sensitive open estimates';
export async function openTrackingSettings(db:D1Database) {
  const row=await db.prepare('SELECT enabled,generation FROM open_tracking_settings WHERE id=1').first<{enabled:number;generation:number}>();
  // No preference row is the off-by-default state, also on an empty restore target.
  return {enabled:row?.enabled===1,generation:row?.generation??0};
}
export async function openEstimates(db:D1Database,campaignId?:string) {
  const settings=await openTrackingSettings(db);
  const row=await db.prepare(`SELECT COUNT(*) count FROM open_estimate_facts f JOIN recipient_steps r ON r.id=f.recipient_step_id ${campaignId?'WHERE r.campaign_id=?':''}`)
    .bind(...(campaignId?[campaignId]:[])).first<{count:number}>();
  return {enabled:settings.enabled,estimatedRecipients:Number(row?.count??0),label:openEstimateLabel,
    note:'Image loads can come from proxies and automation. These estimates do not establish that anyone read a message and never affect clicks, conversions, delivery, confidence, deliverability or attribution.'};
}
export function createOpenTrackingSettingsRoutes(db:D1Database) {
  const routes=new Hono<AppEnvironment>();
  routes.get('/insights/open-tracking',async c=>c.json(await openEstimates(db)));
  routes.put('/insights/open-tracking',async c=>{
    const body=await c.req.json().catch(()=>null);
    if(!body||typeof body.enabled!=='boolean'||Object.keys(body).some(key=>key!=='enabled'))return c.json({error:'invalid_open_tracking_setting'},400);
    // Each change revokes all previously issued pixels, even after re-enabling.
    await db.prepare(`INSERT INTO open_tracking_settings (id,enabled,generation,updated_at,operator_id) VALUES (1,?,1,?,?)
      ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,generation=open_tracking_settings.generation+1,
      updated_at=excluded.updated_at,operator_id=excluded.operator_id WHERE open_tracking_settings.enabled<>excluded.enabled`)
      .bind(Number(body.enabled),Date.now(),c.get('operator').id).run();
    return c.json(await openEstimates(db));
  });
  return routes;
}
/** Only delivery invokes this. Neither previews nor ordinary campaign images track. */
export async function appendOpenPixel(platform:Platform,recipientStepId:string,html:string,expiresAt:Date) {
  const db=platform.database.$client,settings=await openTrackingSettings(db);
  if(!settings.enabled)return html;
  const token=await platform.publicTokens.issue({id:crypto.randomUUID(),purpose:'open-estimate',expiresAt});
  const inserted=await db.prepare(`INSERT INTO open_tracking_tokens (token_digest,recipient_step_id,generation,expires_at)
    SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM open_tracking_settings WHERE id=1 AND enabled=1 AND generation=?)`)
    .bind(await platform.publicTokens.digest(token),recipientStepId,settings.generation,expiresAt.getTime(),settings.generation).run();
  if(!inserted.meta.changes)return html;
  const url=new URL(`/o/${encodeURIComponent(token)}`,platform.config.publicBaseUrl).href;
  return `${html}<img data-mango-open-estimate="1" src="${url}" width="1" height="1" alt="" />`;
}
export async function removeDisabledPixel(platform:Platform,html:string|undefined) {
  if(!html|| (await openTrackingSettings(platform.database.$client)).enabled)return html;
  return html.replace(/<img data-mango-open-estimate="1"[^>]*\/>/g,'');
}
export function createOpenPixelRoutes(platform:Platform) {
  const routes=new Hono();
  routes.get('/o/:token',async c=>{
    const token=c.req.param('token'),now=new Date();
    try {await platform.publicTokens.verify(token,'open-estimate',now);} catch {return c.body(null,404);}
    // The signed bearer is the authentication. One estimate per recipient-step,
    // no IP, user agent, cookie, destination, provider payload or repeat history.
    await platform.database.$client.prepare(`INSERT INTO open_estimate_facts (recipient_step_id,occurred_at)
      SELECT t.recipient_step_id,? FROM open_tracking_tokens t JOIN open_tracking_settings s ON s.id=1
      JOIN recipient_steps r ON r.id=t.recipient_step_id
      WHERE t.token_digest=? AND t.expires_at>? AND s.enabled=1 AND s.generation=t.generation
        AND r.handoff_started_at IS NOT NULL
      ON CONFLICT(recipient_step_id) DO NOTHING`).bind(now.getTime(),await platform.publicTokens.digest(token),now.getTime()).run();
    c.header('Cache-Control','no-store, private');c.header('Referrer-Policy','no-referrer');
    c.header('Content-Type','image/gif');c.header('X-Content-Type-Options','nosniff');
    return c.body(Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),x=>x.charCodeAt(0)));
  });
  return routes;
}
