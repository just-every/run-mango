import {Hono} from 'hono';
import {z} from 'zod';
import {IncumbentError} from './mailchimp';
import {parallelRunService} from './service';
import type {AuthVariables} from '@/core/features/auth/routes';
import type {Platform} from '@/core/shared/platform';

/** Owner routes (provider.connect writes; settings reads) for the parallel-run link. */
export function parallelRunRoutes(platform: Platform) {
  const routes = new Hono<{Variables: AuthVariables}>(), service = parallelRunService(platform);
  const refused = (context: any, error: unknown) => context.json({error: 'parallel_run_refused',
    detail: error instanceof IncumbentError ? error.reason : 'The parallel run could not complete.'}, 422);
  routes.get('/settings/parallel-run', async context => context.json(await service.status()));
  routes.put('/settings/parallel-run', async context => {
    const body = z.object({apiKey: z.string().trim().min(8).max(256), listId: z.string().trim().regex(/^[A-Za-z0-9]{4,32}$/)}).strict().safeParse(await context.req.json().catch(() => null));
    if (!body.success) return context.json({error: 'invalid_parallel_run'}, 400);
    try { return context.json(await service.connect(body.data, context.get('operator'))); } catch (error) { return refused(context, error); }
  });
  routes.post('/settings/parallel-run/retry', async context => context.json(await service.retryFailed()));
  routes.delete('/settings/parallel-run', async context => {
    try { return context.json(await service.disconnect(context.get('operator'))); } catch (error) { return refused(context, error); }
  });
  return routes;
}
