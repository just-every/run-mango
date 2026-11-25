import {complianceReport} from './compliance-report';
import {deliverabilityVersion,presented} from './deliverability-version';
import {savedReportRoutes} from './saved-report-routes';
import {overviewQuery,overviewPeriod} from './overview-period';
import { createListGrowthRoutes } from './list-growth-routes';
import { createRetentionRoutes } from './retention-routes';
import { createCampaignReportRoutes } from './campaign-report-routes';
import { createCampaignPerformanceRoutes } from './campaign-performance-routes';
import type { Database } from '@/core/platform/db/client';
import { Hono } from 'hono';

import type { createInsightsService } from './service';

export function createInsightsRoutes(service: ReturnType<typeof createInsightsService>, database:Database) {
  const routes = new Hono();
  routes.route('/',savedReportRoutes(database));
  routes.route('/',createCampaignReportRoutes(database));
  routes.route('/',createCampaignPerformanceRoutes(database));
  routes.route('/',createRetentionRoutes(database));
  routes.route('/',createListGrowthRoutes(database));
  routes.get('/insights', async context => {
    const parsed=overviewQuery.safeParse(context.req.query());
    if(!parsed.success)return context.json({error:'invalid_overview_period'},400);
    let period;try{period=overviewPeriod(parsed.data);}catch{return context.json({error:'invalid_overview_period'},400);}
    context.header('Cache-Control','no-store');
    return context.json(await service.list(period));
  });
  routes.get('/campaigns/:id/results', async (context) => context.json(await service.campaignResult(context.req.param('id'))));
  routes.get('/insights/deliverability', async (context) => {
    const windowDays = Number(context.req.query('windowDays') ?? service.reportingWindowDays);
    if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365) {
      return context.json({ error: 'invalid_reporting_window' }, 400);
    }
    const now=new Date();
    // Revalidated on every read; the browser reuses its copy only when this version still matches.
    const version=await deliverabilityVersion(database,windowDays,now);
    context.header('Cache-Control','private, no-cache');
    context.header('ETag',version);
    if(presented(context.req.header('If-None-Match'),version))return context.body(null,304);
    const [senders,mailboxes]=await Promise.all([service.deliverability(windowDays,now),service.mailboxes(windowDays,now)]);
    const compliance=await complianceReport(database,senders,windowDays,now);
    return context.json({windowDays,senders,mailboxes,compliance});
  });
  return routes;
}
