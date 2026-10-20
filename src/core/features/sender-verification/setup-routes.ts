import {Hono} from 'hono';
import {z} from 'zod';
import type {Platform} from '@/core/shared/platform';
import type {AuthVariables} from '@/core/features/auth/routes';
import {activityStatement} from '@/core/features/auth/activity-record';
import {setupSendgridDomain, validateSendgridDomain} from './domain-setup';
import {domainName, digest} from './identity';
import {inspectTrackingDomain, trackingDomainStatus} from './tracking-domain';
export function domainSetupRoutes(platform: Platform) {
  const routes = new Hono<{Variables: AuthVariables}>(), db = platform.database.$client;
  const domain = () => domainName(platform.config.mailSender.fromEmail.split('@')[1] ?? '');
  const eligible = () => platform.config.mailProvider === 'sendgrid' && !!platform.config.mailProviderApiKey;
  routes.get('/settings/sender/domain-guide', async context => {
    if (!eligible()) return context.json({error: 'sendgrid_connection_required'}, 409);
    try {return context.json({setup: await setupSendgridDomain(platform.config.mailProviderApiKey, domain()), tracking: await trackingDomainStatus(platform), trackingTarget: platform.config.publicBaseUrl.hostname});}
    catch {return context.json({error: 'domain_guide_unavailable'}, 502);}
  });
  routes.post('/settings/sender/domain-authentication', async context => {
    const operator = context.get('operator');
    if (operator.role !== 'owner') return context.json({error: 'owner_required'}, 403);
    if (!eligible()) return context.json({error: 'sendgrid_connection_required'}, 409);
    const parsed = z.object({action: z.enum(['create', 'validate'])}).strict().safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return context.json({error: 'invalid_domain_action'}, 400);
    try {
      const setup = parsed.data.action === 'create' ? await setupSendgridDomain(platform.config.mailProviderApiKey, domain(), true) : await validateSendgridDomain(platform.config.mailProviderApiKey, domain());
      // An explicit Owner setup action retires the old receiver observation.
      // Clearing revocation permits a new inbox check, never a send lease:
      // current provider/DNS checks and a receiver confirmation are still required.
      await db.batch([db.prepare(`UPDATE sender_verification_state SET generation=generation+1,
        observation_id=NULL,configuration_digest=NULL,revoked_at=NULL,reason='domain-setup-changed',updated_at=? WHERE id=?`)
        .bind(Date.now(), await digest(['marketing-sender', platform.config.publicBaseUrl.origin])),
        activityStatement(db, {key: crypto.randomUUID(), action: 'sender-domain-' + parsed.data.action, entityType: 'integration', entityId: 'sendgrid', actorId: operator.id, detail: {domain: setup.domain}})]);
      return context.json({setup});
    } catch {return context.json({error: 'domain_setup_failed'}, 502);}
  });
  routes.put('/settings/sender/tracking-domain', async context => {
    const operator = context.get('operator');
    if (operator.role !== 'owner') return context.json({error: 'owner_required'}, 403);
    const parsed = z.object({host: z.string().max(253)}).strict().safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return context.json({error: 'invalid_tracking_host'}, 400);
    try {
      const host = parsed.data.host.trim().toLowerCase();
      const tracking = host ? await inspectTrackingDomain(host, platform.config.publicBaseUrl.hostname) : null;
      await db.batch([host ? db.prepare('INSERT INTO tracking_domain(id,host,updated_at,operator_id) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET host=excluded.host,updated_at=excluded.updated_at,operator_id=excluded.operator_id').bind(tracking!.host, Date.now(), operator.id) : db.prepare('DELETE FROM tracking_domain WHERE id=1'),
        activityStatement(db, {key: crypto.randomUUID(), action: 'tracking-domain-changed', entityType: 'integration', entityId: 'tracking', actorId: operator.id, detail: {host}})]);
      return context.json({tracking});
    } catch {return context.json({error: 'invalid_tracking_host'}, 400);}
  });
  return routes;
}
