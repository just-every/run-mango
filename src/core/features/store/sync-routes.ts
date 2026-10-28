import {custodyStatement} from '../agent-door/custody';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Platform } from '@/core/shared/platform';
import { commerceSourceTypes, type createStoreService } from './service';
import { SourceSyncBusyError } from './sync-run-repository';

export function createSyncRoutes(platform: Platform, store: ReturnType<typeof createStoreService>) {
  const routes = new Hono();
  routes.post('/store/sync', async context => {
    const parsed = z.object({sourceType: z.enum(commerceSourceTypes), runId: z.string().min(1).max(200).optional()}).strict().safeParse(await context.req.json().catch(() => undefined));
    if (!parsed.success) return context.json({error: 'invalid_sync_request'}, 400);
    if (!platform.commerce) {
      const detail = platform.config.modules.commerce.enabled
        ? 'The commerce adapter is unavailable despite complete module configuration.'
        : platform.config.modules.commerce.detail;
      return context.json({error: 'source_unavailable', detail}, 409);
    }
    try { await platform.commerce.refreshHealth?.(); }
    catch (error) {
      const detail = error instanceof Error ? error.message : 'Shopify connection check failed.';
      await store.recordCommerceSyncFailure([parsed.data.sourceType], detail);
      return context.json({error:'source_unavailable',detail},409);
    }
    const capabilities = platform.commerce.capabilities();
    if (!capabilities.sourceTypes.includes(parsed.data.sourceType)) return context.json({error: 'source_unavailable', detail: capabilities.detail}, 409);
    if (!capabilities.provider) return context.json({error: 'source_provider_unidentified', detail: 'The adapter must declare its provider identity before an operator sync can be queued.'}, 409);
    if (parsed.data.runId && !await store.syncRuns.get(parsed.data.runId)) return context.json({error: 'sync_not_found'}, 404);
    let run;
    try {
      run = await store.syncRuns.ensure(parsed.data.runId ?? crypto.randomUUID(), capabilities.provider, parsed.data.sourceType, new Date());
    } catch (error) {
      return context.json({error: error instanceof SourceSyncBusyError ? 'sync_already_active' : 'sync_identity_conflict', detail: error instanceof Error ? error.message : 'Sync could not be queued.'}, 409);
    }
    if (run.state === 'superseded') return context.json({error: 'sync_superseded', detail: 'A newer run replaced this interrupted sync. Refresh the source status before retrying.', runId: run.id}, 409);
    if (run.state === 'completed') return context.json({status: 'completed', runId: run.id});
    const custody=custodyStatement(platform.database.$client,'source',run.id);if(custody)await custody.run();
    try {
      await platform.jobs.enqueue({kind: 'source.sync', idempotencyKey: `source-sync:${run.id}`, payload: {sourceType: run.sourceType, provider: run.provider, runId: run.id}});
    } catch (error) {
      await store.syncRuns.enqueueFailed(run, error instanceof Error ? error.message : 'Queue acceptance failed.', new Date());
      return context.json({error: 'sync_queue_failed', runId: run.id}, 503);
    }
    return context.json({status: 'queued', runId: run.id}, 202);
  });
  return routes;
}
