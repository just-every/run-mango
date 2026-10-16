import { collectSenderTimings } from '@/core/features/sender-verification/timings';
import { z } from 'zod';

import { readJson, readParams } from '@/core/api/input';

import type { ApprovalService } from './approval';
import type { DeliveryService } from './delivery';
import type { LifecycleRepository } from './repository';
import type { LifecycleApp } from './types';

const identifier = z.object({ id: z.string().min(1), token: z.string().min(32).optional() });
const approvalBody = z.object({
  revisionId: z.string().min(1),
  idempotencyKey: z.string().min(16).max(200),
});
const testSendBody = z.object({
  revisionId: z.string().min(1),
  channel: z.enum(['email', 'sms']),
  to: z.string().min(3).max(320),
});

function operatorId(context: any) {
  const operator = context.get('operator') as { id?: string } | undefined;
  return operator?.id;
}

export function registerLifecycleHttpRoutes(
  app: LifecycleApp,
  approval: ApprovalService,
  delivery: DeliveryService,
  repository: LifecycleRepository,
) {
  app.post('/api/campaigns/:id/checks/:checkId/acknowledge', async (context: any) => {
    const actor = operatorId(context);
    if (!actor) return context.json({error: 'unauthenticated'}, 401);
    const params = readParams(context, z.object({id: z.string().min(1), checkId: z.string().min(1)}));
    if ('error' in params) return params.error;
    const body = await readJson(context, z.object({revisionId: z.string().min(1), findingIdentity: z.string().regex(/^[a-f0-9]{64}$/)}).strict());
    if ('error' in body) return body.error;
    const result = await repository.acknowledgeAdvisory({campaignId: params.data.id, checkId: params.data.checkId,
      ...body.data, operatorId: actor});
    if (result.kind === 'not_found') return context.json({error: 'not_found'}, 404);
    if (result.kind !== 'acknowledged') return context.json({error: result.kind === 'not_advisory' ? 'finding_not_advisory' : 'stale_finding'}, 409);
    return context.json({status: 'acknowledged', acknowledgement: result.acknowledgement});
  });

  app.post('/api/campaigns/:id/checks', async (context: any) => {
    if (!operatorId(context)) return context.json({error: 'unauthenticated'}, 401);
    const params = readParams(context, identifier);
    if ('error' in params) return params.error;
    const body = await readJson(context, z.object({revisionId: z.string().min(1)}));
    if ('error' in body) return body.error;
    const result = await approval.preview({campaignId: params.data.id, revisionId: body.data.revisionId});
    if (result.kind === 'not_found') return context.json({error: 'not_found'}, 404);
    if (result.kind === 'conflict') return context.json({error: 'revision_not_draft'}, 409);
    return context.json(result);
  });

  app.post('/api/campaigns/:id/approve', async (context: any) => {
    const actor = operatorId(context);
    if (!actor) return context.json({ error: 'unauthenticated' }, 401);
    const params = readParams(context, identifier);
    if ('error' in params) return params.error;
    const body = await readJson(context, approvalBody);
    if ('error' in body) return body.error;
    const result = await approval.approve({
      campaignId: params.data.id,
      revisionId: body.data.revisionId,
      idempotencyKey: body.data.idempotencyKey,
      operatorId: actor,
    });
    if (result.kind === 'not_found') return context.json({ error: 'not_found' }, 404);
    if (result.kind === 'blocked') return context.json({ status: 'blocked', blockers: result.blockers }, 409);
    if (result.kind === 'conflict') return context.json({ error: 'approval_conflict', detail: result.detail }, 409);
    return context.json({ status: 'scheduled', revisionDigest: result.revisionDigest, idempotent: result.idempotent });
  });

  app.post('/api/campaigns/:id/reapprove', async (context: any) => {
    const actor = operatorId(context);
    if (!actor) return context.json({ error: 'unauthenticated' }, 401);
    const params = readParams(context, identifier);
    if ('error' in params) return params.error;
    const body = await readJson(context, approvalBody);
    if ('error' in body) return body.error;
    const result = await approval.reapprove({ campaignId: params.data.id, revisionId: body.data.revisionId,
      idempotencyKey: body.data.idempotencyKey, operatorId: actor });
    if (result.kind === 'not_found') return context.json({ error: 'not_found' }, 404);
    if (result.kind === 'blocked') return context.json({ status: 'blocked', blockers: result.blockers }, 409);
    if (result.kind === 'conflict') return context.json({ error: 'approval_conflict', detail: result.detail }, 409);
    return context.json({ status: 'reapproved', revisionDigest: result.revisionDigest, idempotent: result.idempotent });
  });

  app.post('/api/campaigns/:id/test-send', async (context: any) => {
    const actor = operatorId(context);
    if (!actor) return context.json({ error: 'unauthenticated' }, 401);
    const params = readParams(context, identifier);
    if ('error' in params) return params.error;
    const body = await readJson(context, testSendBody);
    if ('error' in body) return body.error;
    const timing = await collectSenderTimings(() => approval.sendTest({ campaignId: params.data.id, operatorId: actor, ...body.data }), 'test_send');
    context.header('Server-Timing', timing.header);
    const result = timing.value;
    if (result.kind === 'not_found') return context.json({ error: 'not_found' }, 404);
    if (result.kind === 'blocked') return context.json({ status: 'blocked', blockers: [{ kind: 'test-send', detail: result.detail, blocking: true }] }, 409);
    return context.json({ status: 'test-sent', disposition: result.disposition, providerMessageId: result.providerMessageId });
  });

  app.post('/api/campaigns/:id/cancel', async (context: any) => {
    const actor = operatorId(context);
    if (!actor) return context.json({ error: 'unauthenticated' }, 401);
    const params = readParams(context, identifier);
    if ('error' in params) return params.error;
    const cancelled = await repository.cancelCampaign(params.data.id, actor, new Date());
    return cancelled ? context.json({ status: 'cancelled' }) : context.json({ error: 'campaign_not_cancellable' }, 409);
  });

  app.get('/l/:token', async (context: any) => {
    const token = context.req.param('token');
    const result = await delivery.followTrackedLink(token, context.req.raw);
    if (result.kind === 'not_found') return context.json({ error: 'not_found' }, 404);
    context.header('Cache-Control', 'no-store');
    context.header('Referrer-Policy', 'no-referrer');
    return context.redirect(result.destinationUrl, 302);
  });

  app.post('/webhooks/mail/*', async (context: any) => {
    const result = await delivery.handleWebhook('email', context.req.raw);
    if (result.kind === 'unavailable') return context.json({ error: 'mail_webhook_unavailable' }, 404);
    return context.body(null, 204);
  });
  app.post('/webhooks/sms/*', async (context: any) => {
    const result = await delivery.handleWebhook('sms', context.req.raw);
    if (result.kind === 'unavailable') return context.json({ error: 'sms_webhook_unavailable' }, 404);
    return context.body(null, 204);
  });
}
