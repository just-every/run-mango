import { Hono } from 'hono';

import { deploymentHealth } from '@/base/deployment-health';
import type { AppBindings } from '@/core/shared/platform';
import type { HealthService } from './service';

export function createHealthRoutes(service: HealthService, environment: AppBindings) {
  const routes = new Hono();

  routes.get('/health', async (context) => {
    const health = await service.check();
    context.header('Cache-Control', 'no-store');
    return context.json({ ...deploymentHealth(environment), ...health }, health.ok ? 200 : 503);
  });

  return routes;
}
