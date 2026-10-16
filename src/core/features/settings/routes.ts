import { Hono } from 'hono';

import type { createSettingsService } from './service';
import type { AuthVariables } from '@/core/features/auth/routes';
import { senderIdentitySchema } from './sender-validation';
import { SenderAuthorityChanged } from './sender-authority';
import { VerificationError } from '@/core/features/sender-verification/types';
import { senderReasonText } from '@/core/features/sender-verification/reason-text';
import { ProviderTransportError } from '@/core/shared/platform';
import { collectSenderTimings } from '@/core/features/sender-verification/timings';

/** Mount under /api after the native session middleware. */
export function createSettingsRoutes(service: ReturnType<typeof createSettingsService>) {
  const routes = new Hono<{ Variables: AuthVariables }>();
  routes.get('/settings/sender', async (context) => {
    context.header('Cache-Control', 'no-store');
    const result = await collectSenderTimings(() => service.senderStatus());
    context.header('Server-Timing', result.header);
    return context.json(result.value);
  });
  routes.put('/settings/sender', async (context) => {
    context.header('Cache-Control', 'no-store');
    const operator = context.get('operator');
    if (!operator) return context.json({error: 'unauthenticated'}, 401);
    const parsed = senderIdentitySchema.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success) return context.json({error: 'invalid_sender', fields: parsed.error.flatten().fieldErrors}, 400);
    try {
      await service.saveSender(parsed.data, operator.id, context.req.raw);
      return context.json({identity: parsed.data});
    } catch (error) {
      if (error instanceof SenderAuthorityChanged) return context.json({error: 'authority_changed'}, 403);
      return context.json({error: 'sender_save_failed'}, 500);
    }
  });
  routes.get('/settings/providers', async (context) => context.json(await service.providers()));
  routes.post('/settings/sender/confirmation', async (context) => {
    context.header('Cache-Control', 'no-store');
    const operator = context.get('operator');
    try {
      return context.json(await service.sendOwnerConfirmation(operator.email), 202);
    } catch (error) {
      const reason = error instanceof VerificationError ? error.reason : error instanceof ProviderTransportError ? 'provider-rejected' : 'verification-unavailable';
      return context.json({error: 'sender_check_not_sent', reason, detail: reason === 'provider-rejected'
        ? 'Your mail provider refused the check. Confirm the From domain is verified with the provider, then try again.'
        : senderReasonText(reason)}, 409);
    }
  });
  return routes;
}
