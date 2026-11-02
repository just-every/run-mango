import {commerceProjection} from './commerce-projection';
import { sha256 } from '@/core/shared/ids';
import { SourceSyncBusyError } from './sync-run-repository';
import { z } from 'zod';
import type { CommerceStore } from '@/core/shared/platform';
import { commerceSourceTypes, type CommerceSourceType } from './service';
import type { createStoreService } from './service';
import type { createAudienceService } from '@/core/features/audience/service';

const commandSchema = z.object({sourceType: z.enum(commerceSourceTypes), provider: z.string().trim().min(1).max(100), runId: z.string().trim().min(1).max(200).optional()});
const recordSchema = z.object({
  sourceType: z.enum(commerceSourceTypes), sourceId: z.string().trim().min(1),
  occurredAt: z.date().refine(value => Number.isFinite(value.getTime())), updatedAt: z.date().optional(), contactId: z.string().optional(), payload: z.record(z.string(), z.unknown()),
});
/** Full-sync completion belongs to the final page only. Interrupted attempts
 * resume from the last fully imported page. Replayed partial pages use identity upserts. */
export function createCommerceSynchronizer(
  commerce: CommerceStore, store: ReturnType<typeof createStoreService>, audience: ReturnType<typeof createAudienceService>,
  options: {pageLimit?: number; leaseMs?: number; now?: () => Date; admit?:()=>Promise<void>} = {},
) {
  return async (payload: Record<string, unknown>) => {
    const {sourceType, provider, runId = crypto.randomUUID()} = commandSchema.parse(payload);
    const clock = options.now ?? (() => new Date());
    const pageLimit = options.pageLimit ?? 10, leaseMs = options.leaseMs ?? 120000;
    if (!Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 100 || leaseMs < 1) throw new Error('Invalid sync execution bounds.');
    const existing = await store.syncRuns.ensure(runId, provider, sourceType, clock());
    if (existing.state === 'superseded') return {status: 'superseded' as const, runId, sourceType, pages: existing.pages};
    if (existing.state === 'completed') return {status: 'completed' as const, runId, sourceType, pages: existing.pages};
    let run = await store.syncRuns.claim(runId, clock(), leaseMs);
    if (!run) return {status: 'busy' as const, runId, sourceType, pages: existing.pages};
    const token = run.leaseToken!;
    const progress=async()=>{await options.admit?.();await store.syncRuns.renew(runId,token,clock(),leaseMs);};
    try {
      await options.admit?.();
      if (commerce.refreshHealth) await commerce.refreshHealth(progress);
      const capability = commerce.capabilities();
      await store.recordSourceCapabilities(commerceSourceTypes.map(type => ({sourceType: type, available: capability.sourceTypes.includes(type), detail: capability.detail})), clock(), {runId, token, now: clock});
      if (!capability.sourceTypes.includes(sourceType)) throw new Error(`Commerce adapter does not supply ${sourceType}.`);
      if (capability.provider && capability.provider !== provider) throw new Error('The queued sync provider no longer matches the configured adapter.');
      for (let pageNumber = 0; pageNumber < pageLimit; pageNumber++) {
        await options.admit?.();
        const page = await commerce.synchronize(sourceType, run.nextCursor ?? undefined, progress);
        await options.admit?.();
        if (!await store.syncRuns.owns(runId, token, clock())) throw new SourceSyncBusyError('Sync lease changed while awaiting the adapter.');
        const records = z.array(recordSchema).parse(page.records);
        if (records.some(record => record.sourceType !== sourceType)) throw new Error(`Commerce returned a different source type during ${sourceType} sync.`);
        if (page.nextCursor !== undefined && (typeof page.nextCursor !== 'string' || !page.nextCursor.trim() || page.nextCursor.length > 4096 || await store.syncRuns.hasCursor(runId, await sha256(page.nextCursor)))) {
          throw new Error('Commerce returned an invalid or repeated pagination cursor.');
        }
        if (records.length) {
          await audience.ingestCommerceWebhook({
            provider, completion: 'delta', adapterCompleted: false, sourceTypes: [sourceType],
            records: records.map(commerceProjection),
          }, clock(), {runId, token, now: clock});
        }
        run = await store.syncRuns.checkpoint(run, token, page.nextCursor, page.nextCursor === undefined ? undefined : await sha256(page.nextCursor), records.length, clock(), leaseMs, page.coverage);
        if (run.state === 'completed') return {status: 'completed' as const, runId, sourceType, pages: run.pages};
      }
      await store.syncRuns.release(run, token, clock());
      return {status: 'pending' as const, runId, sourceType, pages: run.pages};
    } catch (error) {
      await store.syncRuns.fail(run, token, error instanceof Error ? error.message : 'Commerce sync failed.', clock());
      throw error;
    }
  };
}
