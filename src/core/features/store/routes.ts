import { Hono } from 'hono';

import type { createStoreService } from './service';

export function createStoreRoutes(service: ReturnType<typeof createStoreService>) {
  const routes = new Hono();

  routes.get('/store', async (context) => context.json(await service.status()));
  routes.get('/settings/providers', async (context) => context.json(await service.status()));

  return routes;
}
