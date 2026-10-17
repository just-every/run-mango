import { Hono } from 'hono';
import { z } from 'zod';
import type { Database } from '@/core/platform/db/client';
import { campaignPerformanceSorts } from './campaign-performance-model';
import { campaignPerformance } from './campaign-performance-query';
import { campaignPerformanceCsv } from './campaign-performance-csv';
import { campaignReportCsvResponse } from './campaign-recipient-csv';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const instant = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(instant) && new Date(instant).toISOString().slice(0, 10) === value;
});
const filters = z.object({
  channel: z.enum(['email', 'sms']).optional(), topic: z.string().min(1).max(160).optional(),
  from: date.optional(), to: date.optional(), sort: z.enum(campaignPerformanceSorts).optional(),
  direction: z.enum(['asc', 'desc']).optional(), currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  format: z.literal('csv').optional(),
}).strict().refine(value => !value.from || !value.to || value.from <= value.to)
  .refine(value => !['netRevenue', 'revenuePerRecipient'].includes(value.sort ?? '') || Boolean(value.currency));

/** Mounted only inside the private, native-session and erasure-fenced API. */
export function createCampaignPerformanceRoutes(database: Database) {
  const routes = new Hono();
  routes.get('/insights/campaign-performance', async context => {
    context.header('Cache-Control', 'no-store');
    const parsed = filters.safeParse(context.req.query());
    if (!parsed.success) return context.json({ error: 'invalid_performance_filter' }, 400);
    const { format, ...filter } = parsed.data;
    const report = await campaignPerformance(database, filter);
    return format === 'csv' ? campaignReportCsvResponse(campaignPerformanceCsv(report), 'campaign-performance.csv') : context.json(report);
  });
  return routes;
}
