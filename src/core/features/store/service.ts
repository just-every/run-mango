import type {CommerceReceipt} from './atomic-ingestion';
import type { SyncWriteFence } from './sync-write-fence';
import type { createStoreRepository } from './repository';
import { ulid } from '@/core/shared/ids';

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

// Webhook-only payment sources do not claim an exhaustive snapshot/sync capability.
export type CommerceSourceType = (typeof commerceSourceTypes)[number] | 'payment' | 'checkout-session' | 'subscription';

export type SourceCapability = {
  sourceType: CommerceSourceType;
  available: boolean;
  detail: string;
};

export type NormalizedCommerceRecord = {
  sourceType: CommerceSourceType;
  providerSourceId: string;
  occurredAt: Date;
  providerUpdatedAt?: Date;
  payload: Record<string, unknown>;
  contactId?: string;
  contact?: {email?:string;phone?:string;displayName?:string};
  activities?: Array<{kind: 'order' | 'refund' | 'cart' | 'browsing-event' | 'click' | 'customer' | 'payment' | 'checkout-session' | 'subscription'; productId?: string; state: string}>;
  activity?: { kind: 'order' | 'refund' | 'cart' | 'browsing-event' | 'click' | 'customer' | 'payment' | 'checkout-session' | 'subscription'; productId?: string; state: string };
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

export function createStoreService(repository: ReturnType<typeof createStoreRepository>, catalogChanged:()=>Promise<void>) {
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
      const [providers, recordedSyncs] = await Promise.all([
        repository.listProviderCapabilities(),
        repository.listSourceSyncs(),
      ]);

      const sourceCapabilities = await repository.listCommerceSourceCapabilities();
      // Show each source before its first completion too. The Decision Desk and
      // Store must not mistake an absent status row for a successful sync.
      const sourceSyncs = commerceSourceTypes.map(sourceType => recordedSyncs.find(source => source.sourceType === sourceType)
        ?? {id: `source_${sourceType}`, sourceType, lastSuccessfulAt: null, lastError: null, createdAt: null, updatedAt: null});
      return { providers, sourceSyncs, sourceCapabilities, syncRuns: await repository.syncRuns.list(), channels: await repository.channelStatus() };
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

    async intervalCoverage(types: CommerceSourceType[], from: Date, now: Date): Promise<SourceFreshnessIssue[]> {
      const issues = await freshness(types,now);
      const coverage = await repository.intervalCoverageRows(types);
      for (const sourceType of [...new Set(types)]) {
        const proof=coverage.find(row=>row.source_type===sourceType);
        if (!proof || proof.mode!=='snapshot' || !proof.exhaustive || (proof.from_at!==null && from.getTime()<proof.from_at)) {
          issues.push({sourceType,reason:'source-unavailable',detail:'A completed exhaustive source snapshot with verified historical access is required for this interval.'});
        }
      }
      return issues;
    },

    async observationCoverage(sourceType: 'cart' | 'browsing-event', from: Date, purpose: 'positive' | 'absence'): Promise<SourceFreshnessIssue[]> {
      if (purpose === 'absence') return [{sourceType,reason:'source-unavailable',detail:'Browser and cart observations cannot prove absence or abandonment.'}];
      const proof=(await repository.intervalCoverageRows([sourceType]))[0];
      if (!proof || proof.mode!=='observations' || !proof.channel_id) return [{sourceType,reason:'source-not-synced',detail:'This observation source has no completed verified replay range.'}];
      const channels = (await repository.channelStatus()).filter(channel=>channel.id===proof.channel_id);
      if (!channels.length || channels.some(channel => channel.last_error || Number(channel.healthy_at) < Date.now()-3600000)) return [{sourceType,reason:'source-unavailable',detail:'Observation installation or channel health is unverified, failed or expired.'}];
      if (channels.some(channel => from.getTime() < Number(channel.retention_start))) return [{sourceType,reason:'source-not-synced',detail:'The requested observation interval precedes coverage or contains a retention/privacy gap.'}];
      return [];
    },

    async ingestSuccessfulCommerceBatch(
      provider: string,
      records: NormalizedCommerceRecord[],
      completion: 'full' | 'delta',
      completedSourceTypes: CommerceSourceType[],
      adapterCompleted: boolean,
      completedAt = new Date(),
      fence?: SyncWriteFence,
      receipt?: CommerceReceipt,
      contactHashSalt?: string,
    ) {
      if (!provider.trim()) throw new Error('Commerce provider is required.');
      const sourceTypes = [...new Set(records.map((record) => record.sourceType))];
      if (completion === 'full' && (!adapterCompleted || !completedSourceTypes.length)) {
        throw new Error('A full sync must carry an explicit adapter completion for every completed source type.');
      }
      if (completion === 'delta' && !records.length) throw new Error('A delta webhook must carry a normalized source record.');
      try {
        for (const record of records) if (!record.providerSourceId.trim()) throw new Error('Commerce source identity is missing.');
        await repository.ingestAtomic(provider, records, completedAt, fence, receipt, contactHashSalt);
        for (const sourceType of completion === 'full' && adapterCompleted ? completedSourceTypes : []) {
          await repository.recordSyncSuccess(sourceType, ulid(completedAt.getTime()), completedAt);
        }
        if(sourceTypes.includes('product') || completedSourceTypes.includes('product'))await catalogChanged();
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
