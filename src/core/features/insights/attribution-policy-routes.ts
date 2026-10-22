import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnvironment } from '@/core/app/app';
import type { Platform } from '@/core/shared/platform';
import { hasPermission } from '@/core/features/auth/permissions';
import { effectiveRole } from '@/core/features/auth/product-roles';
import { senderWriteAuthority, senderWriteGuard, SenderAuthorityChanged } from '@/core/features/settings/sender-authority';
import { attributionMetrics, attributionPolicy } from './attribution-policy';

const input = z.object({metric: z.string().max(71), clickWindowDays: z.object({
  email: z.number().int().min(1).max(365), sms: z.number().int().min(1).max(365),
}).strict()}).strict();
export function createAttributionPolicyRoutes(platform: Platform) {
  const routes = new Hono<AppEnvironment>(), db = platform.database.$client;
  const read = async () => ({...await attributionPolicy(db), availableMetrics: await attributionMetrics(db)});
  routes.get('/insights/attribution-policy', async c => c.json(await read()));
  routes.put('/insights/attribution-policy', async c => {
    if (!hasPermission(c.get('operator').role, 'settings.manage')) return c.json({error: 'role_forbidden'}, 403);
    const parsed = input.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({error: 'invalid_attribution_policy'}, 400);
    const value = parsed.data;
    if (!(await attributionMetrics(db)).some(metric => metric.id === value.metric)) return c.json({error: 'unknown_conversion_metric'}, 400);
    try {
      const authority = await senderWriteAuthority(platform, c.req.raw, c.get('operator').id);
      const operation = crypto.randomUUID(), now = Date.now();
      const roleGuard = `EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id
        LEFT JOIN operator_product_roles r ON r.operator_id=n.id
        WHERE n.id=? AND n.status='active' AND ${effectiveRole} IN ('owner','admin'))`;
      const [audit] = await db.batch([
        db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,actor_type,actor_id,action,entity_type,entity_id,detail_json,occurred_at,created_at)
          SELECT ?,?,'operator',?,'campaign.attribution-policy-changed','settings','campaign.attribution.v1',?,?,?
          WHERE ${senderWriteGuard} AND ${roleGuard}`)
          .bind(operation, operation, authority.operatorId, JSON.stringify(value), now, now,
            authority.sessionId, authority.operatorId, authority.version, now, authority.operatorId),
        db.prepare(`INSERT INTO campaign_attribution_policy(id,metric,email_window_days,sms_window_days,operator_id,updated_at)
          SELECT 1,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)
          ON CONFLICT(id) DO UPDATE SET metric=excluded.metric,email_window_days=excluded.email_window_days,
            sms_window_days=excluded.sms_window_days,operator_id=excluded.operator_id,updated_at=excluded.updated_at`)
          .bind(value.metric, value.clickWindowDays.email, value.clickWindowDays.sms, authority.operatorId, now, operation),
      ]);
      if (!audit.meta.changes) throw new SenderAuthorityChanged();
      return c.json(await read());
    } catch (error) {
      return c.json({error: error instanceof SenderAuthorityChanged ? 'authority_changed' : 'attribution_policy_save_failed'}, error instanceof SenderAuthorityChanged ? 403 : 500);
    }
  });
  return routes;
}
