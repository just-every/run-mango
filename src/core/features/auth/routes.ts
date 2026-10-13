import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { AuthError } from '@/vendor/base/operator-auth/index.mjs';
import type { AuthenticatedOperator, createAuthService } from './service';

type AuthService = ReturnType<typeof createAuthService>;
export type AuthVariables = { operator: AuthenticatedOperator };

export function createPublicAuthRoutes(service: AuthService, _options: { secureCookie: boolean }) {
  const routes = new Hono();
  routes.all('/auth/*', async context => await service.handle(context.req.raw) ?? context.notFound());
  // Legacy page links never consume credentials on GET. Base owns new links.
  routes.get('/signin/verify/:token', context => context.redirect('/signin?reason=invalid-or-expired-link', 303));
  routes.post('/api/auth/magic-link', async context => {
    const url = new URL(context.req.url); url.pathname = '/auth/magic-link';
    return await service.handle(new Request(url, context.req.raw)) ?? context.notFound();
  });
  return routes;
}
export function createOperatorRoutes(service: AuthService, _options: { secureCookie: boolean }) {
  const routes = new Hono<{ Variables: AuthVariables }>();
  routes.get('/operator', context => context.json({ operator: context.get('operator') }));
  routes.get('/operators', async context => context.json({ operators: await service.listOperators(context.req.raw) }));
  routes.post('/operators', async context => {
    try {
      const body = await context.req.json<{email?: unknown}>();
      if (typeof body.email !== 'string') return context.json({ error: 'invalid_request' }, 400);
      return context.json({ operator: await service.inviteOperator(context.req.raw, body.email) }, 201);
    } catch (error) { return context.json({ error: error instanceof Error ? error.message : 'operator_invitation_failed' }, error instanceof AuthError ? error.status as ContentfulStatusCode : 400); }
  });
  routes.delete('/operators/:id', async context => {
    try {
      await service.removeOperator(context.req.raw, context.req.param('id'));
      if (context.req.param('id') === context.get('operator').id) {
        const result = await service.signOut(new Request(context.req.raw, { method: 'POST' }));
        context.header('Set-Cookie', result.cookie);
      }
      return context.body(null, 204);
    }
    catch (error) { return context.json({ error: error instanceof Error ? error.message : 'operator_removal_failed' }, error instanceof AuthError ? error.status as ContentfulStatusCode : 400); }
  });
  routes.post('/auth/signout', async context => {
    const result = await service.signOut(context.req.raw);
    context.header('Set-Cookie', result.cookie); return context.body(null, 204);
  });
  return routes;
}
