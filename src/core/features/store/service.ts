import type { SyncWriteFence } from './sync-write-fence';
import type { createStoreRepository } from './repository';
import { sha256, stableJson, ulid } from '@/core/shared/ids';

export const commerceSourceTypes = [
  'customer',
  'product',
  'variant',
  'inventory',
  'order',
  'refund',
  'cart',
  'browsing-event',
] as const;

export type CommerceSourceType = (typeof commerceSourceTypes)[number];

export type SourceCapability = {
  sourceType: CommerceSourceType;
  available: boolean;
  detail: string;
};

export type NormalizedCommerceRecord = {
  sourceType: CommerceSourceType;
  providerSourceId: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
  contactId?: string;
  activity?: { kind: 'order' | 'refund' | 'cart' | 'browsing-event' | 'click' | 'customer'; productId?: string; state: string };
};

export type SourceFreshnessIssue = {
  sourceType: CommerceSourceType;
  reason: 'source-unavailable' | 'source-not-synced' | 'source-sync-failed' | 'source-stale';
  detail: string;
};

export type LocalDemoProvider = {
  id: string;
  adapter: string;
  configured: boolean;
  status: string;
  detail: string;
};

export function createStoreService(repository: ReturnType<typeof createStoreRepository>) {
  async function freshness(sourceTypes: CommerceSourceType[], now: Date) {
    const uniqueTypes = [...new Set(sourceTypes)];
    const [capabilities, syncs] = await Promise.all([
      repository.getCommerceSourceCapabilities(uniqueTypes),
      repository.getSourceSyncs(uniqueTypes),
    ]);
    const capabilityByType = new Map(capabilities.map((capability) => [capability.sourceType, capability]));
    const syncByType = new Map(syncs.map((sync) => [sync.sourceType, sync]));
    const staleAfter = now.getTime() - 24 * 60 * 60 * 1000;

    return uniqueTypes.flatMap<SourceFreshnessIssue>((sourceType): SourceFreshnessIssue[] => {
      const capability = capabilityByType.get(sourceType);
      if (!capability || !capability.available) {
        return [{ sourceType, reason: 'source-unavailable' as const, detail: capability?.detail ?? 'The commerce adapter does not declare this source type.' }];
      }
      const sync = syncByType.get(sourceType);
      if (!sync?.lastSuccessfulAt) {
        return [{ sourceType, reason: 'source-not-synced' as const, detail: sync?.lastError ?? 'This source type has never completed a successful sync.' }];
      }
      if (sync.lastError) {
        return [{ sourceType, reason: 'source-sync-failed' as const, detail: sync.lastError }];
      }
      if (sync.lastSuccessfulAt.getTime() < staleAfter) {
        return [{ sourceType, reason: 'source-stale' as const, detail: 'The last successful sync is older than 24 hours.' }];
      }
      return [];
    });
  }

  return {
    syncRuns: repository.syncRuns,
    async importLocalDemo(
      providers: LocalDemoProvider[],
      sourceTypes: string[],
      now: Date,
    ) {
      for (const provider of providers) {
        await repository.importLocalDemoProvider({ ...provider, updatedAt: now });
      }
      for (const sourceType of sourceTypes) {
        await repository.importLocalDemoSourceSync({
          id: `source_${sourceType}`,
          sourceType,
          lastSuccessfulAt: null,
          lastError: 'No commerce adapter is configured.',
          createdAt: now,
          updatedAt: now,
        });
      }
    },

    async status() {
      const [providers, sourceSyncs] = await Promise.all([
        repository.listProviderCapabilities(),
        repository.listSourceSyncs(),
      ]);

      const sourceCapabilities = await repository.listCommerceSourceCapabilities();
      return { providers, sourceSyncs, sourceCapabilities, syncRuns: await repository.syncRuns.list() };
    },

    async providerBlockers() {
      const providers = await repository.listProviderCapabilities();
      return providers
        .filter((provider) => !provider.configured)
        .map((provider) => ({
          kind: provider.adapter,
          status: provider.status,
          detail: provider.detail,
          blocking: true,
        }));
    },

    async recordSourceCapabilities(capabilities: SourceCapability[], now = new Date(), fence?: SyncWriteFence) {
      const provided = new Set(capabilities.map((capability) => capability.sourceType));
      if (provided.size !== capabilities.length) throw new Error('Commerce source capabilities must declare each source type once.');
      for (const capability of capabilities) {
        await repository.recordCommerceSourceCapability({
          id: ulid(now.getTime()),
          sourceType: capability.sourceType,
          available: capability.available,
          detail: capability.detail,
          updatedAt: now,
        }, fence);
      }
    },

    freshness,

    async ingestSuccessfulCommerceBatch(
      provider: string,
      records: NormalizedCommerceRecord[],
      completion: 'full' | 'delta',
      completedSourceTypes: CommerceSourceType[],
      adapterCompleted: boolean,
      completedAt = new Date(),
      fence?: SyncWriteFence,
    ) {
      if (!provider.trim()) throw new Error('Commerce provider is required.');
      const sourceTypes = [...new Set(records.map((record) => record.sourceType))];
      if (completion === 'full' && (!adapterCompleted || !completedSourceTypes.length)) {
        throw new Error('A full sync must carry an explicit adapter completion for every completed source type.');
      }
      if (completion === 'delta' && !records.length) throw new Error('A delta webhook must carry a normalized source record.');
      try {
        for (const record of records) {
          if (!record.providerSourceId.trim()) throw new Error(`A ${record.sourceType} record is missing its provider identifier.`);
          const payload = stableJson(record.payload);
          const source = await repository.upsertSourceRecord({
            id: ulid(completedAt.getTime()),
            provider,
            sourceType: record.sourceType,
            providerSourceId: record.providerSourceId,
            contactId: record.contactId ?? null,
            occurredAt: record.occurredAt,
            payload,
            payloadDigest: await sha256(payload),
            createdAt: completedAt,
            updatedAt: completedAt,
          }, fence);
          if (record.contactId && record.activity) {
            await repository.upsertSourceActivity({
              id: ulid(completedAt.getTime()),
              contactId: record.contactId,
              sourceRecordId: source.id,
              kind: record.activity.kind,
              productId: record.activity.productId ?? null,
              state: record.activity.state,
              occurredAt: record.occurredAt,
              createdAt: completedAt,
              updatedAt: completedAt,
            }, fence);
          }
        }
        for (const sourceType of completion === 'full' && adapterCompleted ? completedSourceTypes : []) {
          await repository.recordSyncSuccess(sourceType, ulid(completedAt.getTime()), completedAt);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'The commerce adapter returned an unknown ingestion error.';
        for (const sourceType of fence ? [] : sourceTypes) {
          await repository.recordSyncFailure(sourceType, ulid(completedAt.getTime()), message, completedAt);
        }
        throw error;
      }
    },

    async recordCommerceSyncFailure(sourceTypes: CommerceSourceType[], error: string, occurredAt = new Date()) {
      if (!sourceTypes.length) throw new Error('A failed commerce sync must name every affected source type.');
      if (!error.trim()) throw new Error('A failed commerce sync must retain the adapter error.');
      for (const sourceType of [...new Set(sourceTypes)]) {
        await repository.recordSyncFailure(sourceType, ulid(occurredAt.getTime()), error, occurredAt);
      }
    },

    sourceActivities(contactId: string) {
      return repository.listSourceActivities(contactId);
    },

    sourceRecords(contactId: string) {
      return repository.listSourceRecords(contactId);
    },

    sourceRecord(provider: string, sourceType: CommerceSourceType, providerSourceId: string) {
      return repository.getSourceRecord(provider, sourceType, providerSourceId);
    },

    sourceRecordCount(provider: string, sourceType: CommerceSourceType, providerSourceId: string) {
      return repository.sourceRecordCount(provider, sourceType, providerSourceId);
    },

    moveSourceData(mergedContactId: string, survivorContactId: string) {
      return repository.moveSourceData(mergedContactId, survivorContactId);
    },


  };
}
