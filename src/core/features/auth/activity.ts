import { Hono } from 'hono';
import type { AuthVariables } from './routes';
import { hasPermission } from './permissions';
import { activityPage, activityFilters, activitySelect, csvColumns, csvRow, readEntry, type ActivityEntry } from './activity-query';
import { summariseSignupRefusals } from '@/core/features/audience/signup-refusals';

const exportLimit = 50_000;

/** OPER-007: every operator action and integration call, newest first, filterable and exportable for Owner and Admin. */
export function activityRoutes(db: D1Database) {
  const routes = new Hono<{Variables: AuthVariables}>();
  const read = (sql: string, bindings: Array<string | number>) => db.prepare(sql).bind(...bindings).all<Omit<ActivityEntry, 'detail'> & {detailJson: string}>();
  routes.get('/activity', async context => {
    if (!hasPermission(context.get('operator').role, 'activity.read')) return context.json({error: 'role_forbidden'}, 403);
    const query = activityPage.safeParse(context.req.query());
    if (!query.success) return context.json({error: 'invalid_activity_filter'}, 400);
    await summariseSignupRefusals(db);
    const {limit, before, ...filters} = query.data, {sql, bindings} = activitySelect(filters, before);
    const rows = (await read(`${sql} LIMIT ?`, [...bindings, limit + 1])).results, page = rows.slice(0, limit).map(readEntry), last = page.at(-1);
    return context.json({entries: page, nextCursor: rows.length > limit && last ? `${last.occurredAt}:${last.id}` : null});
  });
  routes.get('/activity/export', async context => {
    if (!hasPermission(context.get('operator').role, 'activity.read')) return context.json({error: 'role_forbidden'}, 403);
    const query = activityFilters.safeParse(context.req.query());
    if (!query.success) return context.json({error: 'invalid_activity_filter'}, 400);
    await summariseSignupRefusals(db);
    const {sql, bindings} = activitySelect(query.data), rows = (await read(`${sql} LIMIT ?`, [...bindings, exportLimit])).results.map(readEntry);
    return new Response(`${[csvColumns.join(','), ...rows.map(csvRow)].join('\r\n')}\r\n`, {headers: {
      'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="mango-activity.csv"', 'Cache-Control': 'no-store'}});
  });
  return routes;
}
