import { Hono } from 'hono';

import type { createSettingsService } from './service';
import type { AuthVariables } from '@/core/features/auth/routes';
import { senderIdentitySchema } from './sender-validation';
import { SenderAuthorityChanged } from './sender-authority';

/** Mount under /api after the native session middleware. */
export function createSettingsRoutes(service: ReturnType<typeof createSettingsService>) {
  const routes = new Hono<{ Variables: AuthVariables }>();
  routes.get('/settings/sender', async (context) => {
    context.header('Cache-Control', 'no-store');
    return context.json(await service.senderStatus());
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
  return routes;
}
