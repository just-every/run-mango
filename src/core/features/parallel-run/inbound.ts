import {Hono} from 'hono';
import {echoWindowMs} from './writeback';
import {canonicalEmail} from '@/core/features/audience/identity';
import {sha256} from '@/core/shared/ids';
import type {createAudienceService} from '@/core/features/audience/service';
import type {Platform} from '@/core/shared/platform';

type Link = {webhook_secret_digest: string; list_id: string};

/**
 * Mailchimp's unsigned webhook. The secret path segment is unique to the move-in; any other path changes nothing.
 * An incumbent unsubscribe, abuse complaint or clean takes CONT-004 and CONT-006 precedence at once. Every other
 * event kind is acknowledged and applied nowhere here: no incoming event may lift or upgrade a Mango restriction.
 */
export function incumbentWebhookRoutes(platform: Platform, audience: ReturnType<typeof createAudienceService>) {
  const routes = new Hono(), db = platform.database.$client;
  async function verified(secret: string) {
    const link = await db.prepare('SELECT webhook_secret_digest,list_id FROM parallel_run_links WHERE id=1').first<Link>();
    return link && link.webhook_secret_digest === await sha256(secret) ? link : null;
  }
  // Mailchimp probes the address with a GET before it registers the webhook.
  routes.get('/webhooks/incumbent/mailchimp/:secret', async context => (await verified(context.req.param('secret'))) ? context.body(null, 200) : context.json({error: 'not_found'}, 404));
  routes.post('/webhooks/incumbent/mailchimp/:secret', async context => {
    const link = await verified(context.req.param('secret'));
    if (!link) return context.json({error: 'not_found'}, 404);
    if (Number(context.req.header('content-length') ?? 0) > 16384) return context.json({error: 'invalid_incumbent_event'}, 400);
    const form = new URLSearchParams(await context.req.text()), type = form.get('type') ?? '';
    const email = canonicalEmail(form.get('data[email]') ?? ''), at = Date.parse((form.get('fired_at') ?? '').replace(' ', 'T') + 'Z');
    if (form.get('data[list_id]') !== link.list_id || !email) return context.json({applied: false}, 200);
    if (type !== 'unsubscribe' && type !== 'cleaned') return context.json({applied: false}, 200);
    const now = Date.now(), occurredAt = new Date(Number.isFinite(at) && at <= now ? at : now);
    const contactId = (await db.prepare('SELECT contact_id AS id FROM contact_email_addresses WHERE email=?').bind(email).first<{id: string}>())?.id;
    // The incumbent echoing Mango's own writeback is recognized once and applies nothing twice.
    if (contactId && type === 'unsubscribe' && await db.prepare("UPDATE parallel_run_writebacks SET echoed_at=? WHERE contact_id=? AND state='done' AND echoed_at IS NULL AND written_at>=? RETURNING contact_id")
      .bind(now, contactId, now - echoWindowMs).first()) return context.json({applied: false, echo: true}, 200);
    const eventId = `mailchimp:${await sha256([link.list_id, type, form.get('fired_at'), email].join('|'))}`;
    if (type === 'cleaned') await audience.recordProviderSuppression({destination: email, channel: 'email', cause: 'provider-suppression', occurredAt, providerEventId: eventId});
    else if (form.get('data[action]') === 'abuse') await audience.recordProviderSuppression({destination: email, channel: 'email', cause: 'complaint', occurredAt, providerEventId: eventId});
    else await audience.recordChannelOptOut({destination: email, channel: 'email', reason: 'provider-unsubscribe', occurredAt, stableId: eventId});
    const contact = contactId ? await db.prepare('SELECT email_status_at AS at FROM contacts WHERE id=?').bind(contactId).first<{at: number | null}>() : null;
    // What the incumbent reported is already there: queue it done so the writeback never echoes it back.
    if (contactId && contact?.at) await db.prepare(`INSERT INTO parallel_run_writebacks(contact_id,status_at,origin,state,attempts,next_attempt_at,written_at)
      VALUES(?,?,'incumbent','done',0,?,?) ON CONFLICT(contact_id) DO UPDATE SET status_at=excluded.status_at,origin='incumbent',state='done',written_at=excluded.written_at,
      echoed_at=NULL,last_error=NULL WHERE parallel_run_writebacks.status_at<=excluded.status_at`).bind(contactId, contact.at, now, now).run();
    await db.prepare('UPDATE parallel_run_links SET last_event_at=? WHERE id=1').bind(now).run();
    return context.json({applied: true}, 200);
  });
  return routes;
}
