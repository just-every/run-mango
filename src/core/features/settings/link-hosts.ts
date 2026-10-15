import { Hono } from 'hono';
import type { Platform } from '@/core/shared/platform';
import type { AuthVariables } from '@/core/features/auth/routes';
import { configuredLinkHosts, linkHostsSchema } from './link-hosts-validation';
import { senderWriteAuthority, senderWriteGuard, SenderAuthorityChanged } from './sender-authority';

export async function loadLinkHosts(platform: Pick<Platform, 'database' | 'config'>) {
  const row = await platform.database.$client.prepare('SELECT hosts FROM link_host_settings WHERE id=1').first<{hosts: string}>();
  // Keep the array held by the link inspector in sync with approval and tracking.
  if (row) platform.config.allowedLinkHosts.splice(0, platform.config.allowedLinkHosts.length,
    ...configuredLinkHosts(row.hosts, platform.config.publicBaseUrl));
  return platform.config.allowedLinkHosts;
}

export function createLinkHostRoutes(platform: Platform) {
  const routes = new Hono<{Variables: AuthVariables}>();
  const status = async () => ({hosts: await loadLinkHosts(platform), defaultHost: platform.config.publicBaseUrl.hostname});
  routes.get('/settings/link-hosts', async context => {
    context.header('Cache-Control', 'no-store');
    return context.json(await status());
  });
  routes.put('/settings/link-hosts', async context => {
    context.header('Cache-Control', 'no-store');
    const body = await context.req.json().catch(() => null);
    const parsed = linkHostsSchema.safeParse(body?.hosts);
    if (!parsed.success || Object.keys(body).some(key => key !== 'hosts')) return context.json({error: 'invalid_link_hosts'}, 400);
    try {
      const authority = await senderWriteAuthority(platform, context.req.raw, context.get('operator').id), now = Date.now();
      const guard = [authority.sessionId, authority.operatorId, authority.version, now];
      const results = await platform.database.$client.batch([
        platform.database.$client.prepare(`INSERT INTO link_host_settings (id,hosts,updated_at,operator_id)
          SELECT 1,?,?,? WHERE ${senderWriteGuard}
          ON CONFLICT(id) DO UPDATE SET hosts=excluded.hosts,updated_at=excluded.updated_at,operator_id=excluded.operator_id`)
          .bind(parsed.data.join(','), now, authority.operatorId, ...guard),
        platform.database.$client.prepare(`SELECT 1 AS authorized WHERE ${senderWriteGuard}`).bind(...guard),
      ]);
      if (!results[1].results.length) throw new SenderAuthorityChanged();
    } catch (error) {
      return context.json({error: error instanceof SenderAuthorityChanged ? 'authority_changed' : 'link_hosts_save_failed'},
        error instanceof SenderAuthorityChanged ? 403 : 500);
    }
    return context.json(await status());
  });
  return routes;
}
