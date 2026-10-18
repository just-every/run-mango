import { Hono } from 'hono';
import { z } from 'zod';
import type { Database } from '@/core/platform/db/client';
import { listGrowth } from './list-growth';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const instant = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(instant) && new Date(instant).toISOString().slice(0,10) === value;
});
const filters = z.object({from:day.optional(),to:day.optional()}).strict();

/** Mounted within the native-session and erasure-fenced private API. */
export function createListGrowthRoutes(database: Database) {
  const routes = new Hono();
  routes.get('/insights/list-growth',async context => {
    context.header('Cache-Control','no-store');
    const parsed = filters.safeParse(context.req.query());
    if (!parsed.success) return context.json({error:'invalid_growth_period'},400);
    const to = parsed.data.to ?? new Date().toISOString().slice(0,10);
    const from = parsed.data.from ?? new Date(Date.parse(`${to}T00:00:00Z`)-29*86400000).toISOString().slice(0,10);
    const days = (Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))/86400000+1;
    if (days<1 || days>366) return context.json({error:'invalid_growth_period',detail:'Choose an ordered UTC day range of at most 366 days.'},400);
    return context.json(await listGrowth(database,from,to));
  });
  return routes;
}
