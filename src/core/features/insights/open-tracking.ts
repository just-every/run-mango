import { Hono } from 'hono';
import type { Platform } from '@/core/shared/platform';
import type { AppEnvironment } from '@/core/app/app';
import { senderWriteAuthority, senderWriteGuard, SenderAuthorityChanged } from '@/core/features/settings/sender-authority';
import { reserveSignupAllowance } from '@/core/features/audience/signup-security';
import { hmacSha256Hex } from '@/core/platform/crypto';

/** seed.json limits.publicRequestsPerMinutePerIp, shared across every pixel token. */
const publicRequestsPerMinutePerIp = 60;

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
export function createOpenTrackingSettingsRoutes(platform:Platform) {
  const db=platform.database.$client;
  const routes=new Hono<AppEnvironment>();
  routes.get('/insights/open-tracking',async c=>c.json(await openEstimates(db)));
  routes.put('/insights/open-tracking',async c=>{
    const body=await c.req.json().catch(()=>null);
    if(!body||typeof body.enabled!=='boolean'||Object.keys(body).some(key=>key!=='enabled'))return c.json({error:'invalid_open_tracking_setting'},400);
    try {
      const authority=await senderWriteAuthority(platform,c.req.raw,c.get('operator').id),now=Date.now();
      const guard=[authority.sessionId,authority.operatorId,authority.version,now];
      // The current native authority is fenced in the same transaction as the
      // preference. Approved email keeps the setting it was approved with,
      // including scheduled steps that have not materialized recipients yet.
      // Each change revokes old pixels, even after re-enabling.
      const result=await db.batch<{enabled:number}>([
        db.prepare(`INSERT INTO open_tracking_settings (id,enabled,generation,updated_at,operator_id)
          SELECT 1,?,1,?,? WHERE ${senderWriteGuard}
          AND NOT EXISTS(SELECT 1 FROM campaigns c
            JOIN campaign_revisions r ON r.id=c.active_revision_id AND r.state='approved'
            JOIN campaign_steps s ON s.revision_id=r.id AND s.channel='email'
            LEFT JOIN step_dispatches d ON d.step_id=s.id
            WHERE c.state IN ('scheduled','dispatching','paused') AND s.send_by_at>?
              AND (d.step_id IS NULL OR d.state<>'completed'))
          ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,generation=open_tracking_settings.generation+1,
          updated_at=excluded.updated_at,operator_id=excluded.operator_id WHERE open_tracking_settings.enabled<>excluded.enabled`)
          .bind(Number(body.enabled),now,authority.operatorId,...guard,now),
        db.prepare(`SELECT 1 AS authorized WHERE ${senderWriteGuard}`).bind(...guard),
        db.prepare('SELECT enabled FROM open_tracking_settings WHERE id=1'),
      ]);
      if(!result[1].results.length)throw new SenderAuthorityChanged();
      if((result[2].results[0]?.enabled===1)!==body.enabled)return c.json({error:'approved_email_pending',detail:'Finish or cancel approved email before changing open estimates.'},409);
    } catch(error) {
      return c.json({error:error instanceof SenderAuthorityChanged?'authority_changed':'open_tracking_save_failed'},error instanceof SenderAuthorityChanged?403:500);
    }
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
export function createOpenPixelRoutes(platform:Platform) {
  const routes=new Hono();
  routes.get('/o/:token',async c=>{
    c.header('Cache-Control','no-store, private');c.header('Referrer-Policy','no-referrer');
    // Cloudflare supplies the client IP. Only an unlinked keyed digest and the
    // current minute's counter enter rate-limit storage; no address enters facts.
    const key=await hmacSha256Hex(platform.config.contactHashSalt,`open-rate\0${c.req.header('CF-Connecting-IP')??''}`);
    if(!await reserveSignupAllowance(platform.database.$client,`open:${key}`,'minute',publicRequestsPerMinutePerIp)) {
      c.header('Retry-After','60');
      return c.json({error:'rate_limited'},429);
    }
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
    c.header('Content-Type','image/gif');c.header('X-Content-Type-Options','nosniff');
    return c.body(Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),x=>x.charCodeAt(0)));
  });
  return routes;
}
