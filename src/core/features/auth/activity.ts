import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from './routes';
import { hasPermission } from './permissions';

const querySchema = z.object({
  operator: z.string().min(1).max(200).optional(),
  action: z.string().min(1).max(200).optional(),
  object: z.string().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

/** Minimal lifecycle activity read; the full OPER-007 log/export remains partial. */
export function activityRoutes(db: D1Database) {
  const routes = new Hono<{Variables: AuthVariables}>();
  routes.get('/activity', async context => {
    if (!hasPermission(context.get('operator').role, 'activity.read')) return context.json({error: 'role_forbidden'}, 403);
    const query = querySchema.safeParse(context.req.query());
    if (!query.success) return context.json({error: 'invalid_activity_filter'}, 400);
    const filters: string[] = [], bindings: Array<string | number> = [];
    for (const [column, value] of [['a.actor_id', query.data.operator], ['a.action', query.data.action], ['a.entity_id', query.data.object]]) {
      if (value) { filters.push(`${column}=?`); bindings.push(value); }
    }
    const result = await db.prepare(`SELECT a.id,a.actor_id AS operatorId,p.display_name AS operatorName,
      a.actor_type AS actorType,a.action,a.entity_type AS objectType,a.entity_id AS objectId,
      a.detail_json AS detailJson,a.occurred_at AS occurredAt
      FROM lifecycle_audit_entries a LEFT JOIN operators p ON p.id=a.actor_id AND a.actor_type='operator'
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY a.occurred_at DESC,a.id DESC LIMIT ?`).bind(...bindings, query.data.limit)
      .all<{id: string; operatorId: string; operatorName: string | null; actorType: string; action: string;
        objectType: string; objectId: string; detailJson: string; occurredAt: number}>();
    return context.json({entries: result.results.map(({detailJson, ...entry}) => ({...entry, detail: JSON.parse(detailJson)}))});
  });
  return routes;
}
