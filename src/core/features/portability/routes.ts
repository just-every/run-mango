import { Hono } from 'hono';
import { createPortabilityHandler } from '@/vendor/base/portability/index.mjs';
import type { AppEnvironment } from '@/core/app/app';
import type { Platform, AppBindings } from '@/core/shared/platform';
import { portabilityPolicy } from './policy';

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
    return await handle(context.req.raw) ?? context.notFound();
  });
  return routes;
}
