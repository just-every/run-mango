import { Hono } from 'hono';
import { z } from 'zod';

import { readParams } from '@/core/api/input';

import { invalidLink, messagePage } from './message-response';
import type { createAudienceService } from './service';
import { registerUnsubscribeRoutes } from './unsubscribe-routes';

const tokenParams = z.object({ token: z.string().min(16) });
const confirmation = z.object({ confirm: z.union([z.literal(true), z.literal('true')]) });

function safeToken(value: string) {
  return encodeURIComponent(value);
}

const alreadyUsed = { title: 'Link already used', heading: 'This confirmation link has already been used' };

export function createAudiencePublicRoutes(service: ReturnType<typeof createAudienceService>) {
  const routes = new Hono();
  routes.use('*',async(context,next)=>{context.header('Cache-Control','no-store');context.header('Referrer-Policy','no-referrer');await next();});

  registerUnsubscribeRoutes(routes, service);

  routes.get('/consent/confirm/:token', async (context) => {
    const params = readParams(context, tokenParams);
    if ('error' in params) return invalidLink(context);
    const result = await service.previewConsentConfirmation(params.data.token);
    if (result.kind === 'already-confirmed') return messagePage(context, 410, alreadyUsed);
    if (result.kind !== 'confirmation-required') return invalidLink(context);
    return messagePage(context, 200, {
      title: 'Confirm subscription', heading: 'Confirm subscription', text: 'Confirm that you want to receive this newsletter.', mark: 'stamp',
      form: { action: `/consent/confirm/${safeToken(params.data.token)}`, button: 'Confirm subscription' },
    });
  });

  routes.post('/consent/confirm/:token', async (context) => {
    const params = readParams(context, tokenParams);
    if ('error' in params) return invalidLink(context);
    const body = (context.req.header('Content-Type') ?? '').includes('application/json')
      ? await context.req.json().catch(() => undefined)
      : await context.req.parseBody().catch(() => undefined);
    if (!confirmation.safeParse(body).success) return context.json({ error: 'invalid_request' }, 400);
    const result = await service.confirmConsent(params.data.token, new Date(), context.req.header('CF-Connecting-IP'));
    if (result.kind === 'already-confirmed') return messagePage(context, 410, { ...alreadyUsed, text: 'It cannot change your current subscription status.' });
    if (result.kind === 'confirmed') {
      return messagePage(context, 200, { title: 'Subscription confirmed', heading: 'Subscription confirmed', text: 'Your consent has been recorded.', mark: 'posted' });
    }
    return invalidLink(context);
  });

  return routes;
}
