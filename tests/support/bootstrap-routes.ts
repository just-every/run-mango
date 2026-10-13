import { Hono } from 'hono';
import { z } from 'zod';

import { readJson } from '@/core/api/input';
import type { createAuthService } from '@/core/features/auth/service';

import type { createBootstrapService } from '@/core/features/bootstrap/service';

const bootstrapRequest = z.object({ testSession: z.boolean().optional(), testSessionState: z.enum(['expired', 'revoked']).optional() });
const loopbackHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

export function createLocalBootstrapRoutes(
  token: string,
  service: ReturnType<typeof createBootstrapService>,
  auth: ReturnType<typeof createAuthService> & ReturnType<typeof import('./test-identity').testIdentity>,
) {
  const routes = new Hono();
  routes.post('/_local/bootstrap', async (context) => {
    if (!loopbackHost.test(context.req.header('Host') ?? '')) {
      return context.json({ error: 'not_found' }, 404);
    }
    if (context.req.header('X-Mango-Local-Bootstrap-Token') !== token) {
      return context.json({ error: 'forbidden' }, 403);
    }
    const body = await readJson(context, bootstrapRequest);
    if ('error' in body) return body.error;
    const result = await service.seedLocal();
    if (!body.data.testSession) return context.json(result);
    const createdAt = body.data.testSessionState === 'expired' ? new Date(Date.now() - 31 * 86400000) : new Date();
    const session = await auth.createTestSession(service.operatorId(), createdAt);
    if (body.data.testSessionState === 'revoked') {
      const url = new URL(context.req.url);
      await auth.signOut(new Request(url, { method: 'POST', headers: { Origin: url.origin, Host: url.host, Cookie: session.cookie.split(';')[0] } }));
    }
    return context.json({ ...result, session });
  });
  return routes;
}
