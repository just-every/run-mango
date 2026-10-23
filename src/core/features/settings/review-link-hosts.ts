import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '@/core/features/auth/routes';
import { hasPermission } from '@/core/features/auth/permissions';
import { effectiveRole } from '@/core/features/auth/product-roles';
import type { ApprovalService } from '@/core/features/lifecycle/approval';
import type { Platform } from '@/core/shared/platform';
import { configuredLinkHosts, linkHostsSchema } from './link-hosts-validation';
import { loadLinkHosts,linkHostState } from './link-hosts';
import { senderWriteAuthority, senderWriteGuard, SenderAuthorityChanged } from './sender-authority';

const bodySchema = z.object({host: z.string().min(1)}).strict();
const approveGuard = `EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id
  LEFT JOIN operator_product_roles r ON r.operator_id=n.id
  WHERE n.id=? AND n.status='active' AND ${effectiveRole} IN ('owner','admin','manager'))`;

export function reviewLinkHostRoutes(platform: Platform, approval: ApprovalService) {
  const routes = new Hono<{Variables: AuthVariables}>(), db = platform.database.$client;
  routes.post('/campaigns/:id/link-hosts', async context => {
    const operator = context.get('operator');
    if (!hasPermission(operator.role, 'campaign.approve')) return context.json({error: 'role_forbidden'}, 403);
    const body = bodySchema.safeParse(await context.req.json().catch(() => null));
    const parsed = body.success ? linkHostsSchema.safeParse(body.data.host) : undefined;
    if (!parsed?.success || parsed.data.length !== 1) return context.json({error: 'invalid_link_host'}, 400);
    const host = parsed.data[0], campaignId = context.req.param('id');
    const revision = await db.prepare(`SELECT id FROM campaign_revisions WHERE campaign_id=? AND state='draft'
      ORDER BY updated_at DESC,id DESC LIMIT 1`).bind(campaignId).first<{id: string}>();
    if (!revision) return context.json({error: 'revision_not_draft'}, 409);
    try {
      const authority = await senderWriteAuthority(platform, context.req.raw, operator.id);
      const now = Date.now(), operation = crypto.randomUUID();
      const guard = [authority.sessionId, authority.operatorId, authority.version, now, operator.id];
      const state=await linkHostState(platform),initial=[...state.operator];
      const emptyDefault = configuredLinkHosts(undefined, platform.config.publicBaseUrl);
      if (!initial.includes(host)) initial.push(host);
      if (!emptyDefault.includes(host)) emptyDefault.push(host);
      const [audit] = await db.batch([
        db.prepare(`INSERT INTO lifecycle_audit_entries
          (id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
          SELECT ?,?,'campaign',?,'link-host.allowed','operator',?,
            json_object('host',?,'source','allowed in review','campaignId',?,'operatorId',?),?,?
          WHERE ${senderWriteGuard} AND ${approveGuard}
            AND EXISTS(SELECT 1 FROM campaign_revisions WHERE id=? AND campaign_id=? AND state='draft')`)
          .bind(operation, operation, campaignId, operator.id, host, campaignId, operator.id, now, now, ...guard, revision.id, campaignId),
        db.prepare(`INSERT INTO link_host_settings(id,hosts,auto_sources,updated_at,operator_id)
          SELECT 1,?,?,?,? WHERE EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)
          ON CONFLICT(id) DO UPDATE SET
            hosts=CASE WHEN trim(link_host_settings.hosts)='' THEN ?
              WHEN instr(',' || link_host_settings.hosts || ',', ',' || ? || ',')>0 THEN link_host_settings.hosts
              ELSE link_host_settings.hosts || ',' || ? END,
            updated_at=excluded.updated_at,operator_id=excluded.operator_id`)
          .bind(initial.join(','),state.autoSources,now,operator.id,operation, emptyDefault.join(','), host, host),
        db.prepare('DELETE FROM link_host_exclusions WHERE host=? AND EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)').bind(host,operation),
      ]);
      if (!audit.meta.changes) throw new SenderAuthorityChanged();
    } catch (error) {
      return context.json({error: error instanceof SenderAuthorityChanged ? 'authority_changed' : 'link_hosts_save_failed'},
        error instanceof SenderAuthorityChanged ? 403 : 500);
    }
    const hosts = await loadLinkHosts(platform);
    const review = await approval.preview({campaignId, revisionId: revision.id});
    return context.json({host, hosts, review});
  });
  return routes;
}
