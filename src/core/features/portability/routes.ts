import { Hono } from 'hono';
import { createPortabilityHandler } from '@/vendor/base/portability/index.mjs';
import type { AppEnvironment } from '@/core/app/app';
import type { Platform, AppBindings } from '@/core/shared/platform';
import { portabilityPolicy } from './policy';
import { recordActivity } from '@/core/features/auth/activity-record';

export function createPortabilityRoutes(environment: AppBindings, platform: Platform) {
  const routes = new Hono<AppEnvironment>();
  routes.all('/portability/*', async context => {
    // The ordinary app middleware authenticates before Base inspects storage.
    const operator = context.get('operator');
    const origin = platform.config.local ? new URL(context.req.url).origin : platform.config.publicBaseUrl.origin;
    const handle = await createPortabilityHandler({
      db: environment.DB, buckets: { ASSETS_BUCKET: environment.ASSETS_BUCKET },
      policy: portabilityPolicy(platform.config), appOrigin: origin,
      authorize: (_request, { operation }) => operation === 'import' && environment.MANGO_RESTORE_MODE !== '1' ? null : operator.id,
    });
    const [, , , collection, jobId] = new URL(context.req.url).pathname.split('/');
    const response = await handle(context.req.raw);
    if (!response) return context.notFound();
    // An account export is recorded once, when Base accepts it. A restore is not: its target must stay empty of history.
    if (context.req.method === 'POST' && response.status === 201 && collection === 'exports' && !jobId) {
      const {id} = await response.clone().json() as {id: string};
      await recordActivity(environment.DB, {key: `account-export-started:${id}`, action: 'account.export-started', entityType: 'account-transfer', entityId: id, actorId: operator.id});
    }
    return response;
  });
  return routes;
}
