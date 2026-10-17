import { createCampaignReportRoutes } from './campaign-report-routes';
import type { Database } from '@/core/platform/db/client';
import { Hono } from 'hono';

import type { createInsightsService } from './service';

export function createInsightsRoutes(service: ReturnType<typeof createInsightsService>, database:Database) {
  const routes = new Hono();
  routes.route('/',createCampaignReportRoutes(database));
  routes.get('/insights', async (context) => context.json(await service.list()));
  routes.get('/campaigns/:id/results', async (context) => context.json(await service.campaignResult(context.req.param('id'))));
  routes.get('/insights/deliverability', async (context) => {
    const windowDays = Number(context.req.query('windowDays') ?? service.reportingWindowDays);
    if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365) {
      return context.json({ error: 'invalid_reporting_window' }, 400);
    }
    return context.json({ windowDays, senders: await service.deliverability(windowDays) });
  });
  return routes;
}
