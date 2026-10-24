import type { AuthenticatedOperator } from '@/core/features/auth/service';
import { withErasureWriteFence } from '@/core/features/audience/erasure/write-fence';
import { currentPlatform, initialReads, initialReadOnce, requestApi } from './request-platform';
import { retireTransfers } from '@/core/features/portability/retire-transfers';
import { loadLinkHosts } from '@/core/features/settings/link-hosts';
import { pendingErasure } from '@/core/features/audience/erasure/maintenance';
type Json = null | boolean | number | string | Json[] | {[key: string]: Json};

// Only the resources mounted by this page travel with its fresh server render.
// This is a request snapshot, never a cross-navigation or cross-session cache.
function pathsFor(pathname: string, search: string) {
  switch (pathname) {
    case '/app': return ['/api/decision-desk'];
    case '/app/campaigns': {
      const input = new URLSearchParams(search), filters = new URLSearchParams();
      for (const key of ['state', 'channel']) if (input.get(key)) filters.set(key, input.get(key)!);
      return [`/api/campaigns${filters.size ? `?${filters}` : ''}`, '/api/campaign-starters', '/api/decision-desk'];
    }
    case '/app/audience': return ['/api/audience', '/api/audience/segments', '/api/audience/signup'];
    case '/app/audience/import': return ['/api/audience/import-presets', '/api/audience/imports', '/api/audience/archives'];
    case '/app/insights': return ['/api/insights', '/api/insights/open-tracking', '/api/insights/deliverability'];
    case '/app/flows': return ['/api/flow-drafts'];
    case '/app/store': return ['/api/store'];
    case '/app/settings': return ['/api/operator', '/api/settings/providers', '/api/settings/sender', '/api/settings/link-hosts', '/api/operators'];
  }
  const campaign = /^\/app\/campaigns\/([^/]+)(?:\/(review|scheduled))?$/.exec(pathname);
  if (campaign) {
    const base = `/api/campaigns/${encodeURIComponent(decodeURIComponent(campaign[1]))}`;
    return campaign[2] === 'review' ? [`${base}/review`, '/api/campaign-authoring', '/api/audience/segments', `${base}/design-jobs`] : [base];
  }
  const contact = /^\/app\/audience\/([^/]+)$/.exec(pathname);
  return contact ? [`/api/contacts/${encodeURIComponent(decodeURIComponent(contact[1]))}`] : [];
}

export async function readPageResources(data: {pathname: string; search: string}, operator: AuthenticatedOperator) {
    const read = requestApi.getStore();
    if (!read) throw new Error('Missing request API.');
    const platform = currentPlatform();
    return initialReads.run({operator, once: new Map()}, () => {
      // These independent admission reads must finish before resource work,
      // but need not wait for each other or the erasure-generation read.
      // Hono consumes the original promises in its existing guard order.
      const preparation = Promise.allSettled([
        initialReadOnce('retire-transfers', () => retireTransfers(platform.database.$client, {ASSETS_BUCKET: platform.blobs})),
        initialReadOnce('link-hosts', () => loadLinkHosts(platform)),
        initialReadOnce('pending-erasure', () => pendingErasure(platform.database.$client)),
      ]);
      return withErasureWriteFence(platform.database.$client, async () => {
        await preparation;
        const entries = await Promise.all([...pathsFor(data.pathname, data.search), '/auth/environment'].map(async path => {
          const response = await read(path);
          // Existing resource error handling remains authoritative on failed reads.
          return response.ok ? [path, await response.json() as Json] as const : undefined;
        }));
        return Object.fromEntries(entries.filter(entry => entry !== undefined));
      });
    });
}
