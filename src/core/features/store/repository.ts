import {createAtomicCommerceIngestion} from './atomic-ingestion';
import { fencedInsert, type SyncWriteFence } from './sync-write-fence';
import { createSyncRunRepository } from './sync-run-repository';
import { and, asc, desc, eq, inArray, lte, sql } from 'drizzle-orm';

import type { Database } from '@/core/platform/db/client';

import {
  commerceSourceCapabilities,
  providerCapabilities,
  sourceActivities,
  sourceRecords,
  sourceSyncs,
} from './schema';

export function createStoreRepository(database: Database) {
  return {
    syncRuns: createSyncRunRepository(database),
    ingestAtomic: createAtomicCommerceIngestion(database),
    async intervalCoverageRows(types: string[]) {
      return (await database.$client.prepare("SELECT c.* FROM commerce_source_coverage c JOIN source_sync_runs r ON r.id=c.run_id JOIN source_syncs s ON s.source_type=c.source_type WHERE r.state='completed' AND s.last_successful_at=c.completed_at AND c.source_type IN (SELECT value FROM json_each(?))").bind(JSON.stringify(types)).all<{source_type:string;mode:string;exhaustive:number;from_at:number|null;channel_id:string|null;completed_at:number}>()).results;
    },
    async channelStatus() { return (await database.$client.prepare("SELECT * FROM commerce_channels ORDER BY id").all()).results; },
    listProviderCapabilities() {
      return database.select().from(providerCapabilities).orderBy(asc(providerCapabilities.adapter));
    },

    async importLocalDemoProvider(values: typeof providerCapabilities.$inferInsert) {
      await database.insert(providerCapabilities).values(values).onConflictDoNothing();
    },

    async importLocalDemoSourceSync(values: typeof sourceSyncs.$inferInsert) {
      await database.insert(sourceSyncs).values(values).onConflictDoNothing();
    },

    listSourceSyncs() {
      return database.select().from(sourceSyncs).orderBy(asc(sourceSyncs.sourceType));
    },

    listCommerceSourceCapabilities() {
      return database.select().from(commerceSourceCapabilities).orderBy(asc(commerceSourceCapabilities.sourceType));
    },

    getCommerceSourceCapabilities(sourceTypes: string[]) {
      if (!sourceTypes.length) return Promise.resolve([]);
      return database
        .select()
        .from(commerceSourceCapabilities)
        .where(inArray(commerceSourceCapabilities.sourceType, sourceTypes));
    },

    getSourceSyncs(sourceTypes: string[]) {
      if (!sourceTypes.length) return Promise.resolve([]);
      return database.select().from(sourceSyncs).where(inArray(sourceSyncs.sourceType, sourceTypes));
    },

    async recordCommerceSourceCapability(values: typeof commerceSourceCapabilities.$inferInsert, fence?: SyncWriteFence) {
      if (fence) {
        await fencedInsert(database, commerceSourceCapabilities, values, fence, {target: ['sourceType'], update: ['available', 'detail', 'updatedAt']});
        return;
      }
      await database
        .insert(commerceSourceCapabilities)
        .values(values)
        .onConflictDoUpdate({
          target: commerceSourceCapabilities.sourceType,
          set: { available: values.available, detail: values.detail, updatedAt: values.updatedAt },
        });
    },

    async recordSyncSuccess(sourceType: string, id: string, completedAt: Date) {
      await database
        .insert(sourceSyncs)
        .values({ id, sourceType, lastSuccessfulAt: completedAt, lastError: null, createdAt: completedAt, updatedAt: completedAt })
        .onConflictDoUpdate({
          target: sourceSyncs.sourceType,
          set: { lastSuccessfulAt: completedAt, lastError: null, updatedAt: completedAt },
          // Webhooks and scheduled full syncs may arrive out of order. A delayed
          // completion cannot make a newer adapter failure disappear.
          where: lte(sourceSyncs.updatedAt, completedAt),
        });
    },

    async recordSyncFailure(sourceType: string, id: string, error: string, occurredAt: Date) {
      await database
        .insert(sourceSyncs)
        .values({ id, sourceType, lastSuccessfulAt: null, lastError: error, createdAt: occurredAt, updatedAt: occurredAt })
        .onConflictDoUpdate({
          target: sourceSyncs.sourceType,
          set: { lastError: error, updatedAt: occurredAt },
          // Preserve the latest observed adapter state when a retry reports an
          // older failure after a newer successful completion.
          where: lte(sourceSyncs.updatedAt, occurredAt),
        });
    },

    getSourceRecord(provider: string, sourceType: string, providerSourceId: string) {
      return database
        .select()
        .from(sourceRecords)
        .where(and(
          eq(sourceRecords.provider, provider),
          eq(sourceRecords.sourceType, sourceType),
          eq(sourceRecords.providerSourceId, providerSourceId),
        ))
        .then((rows) => rows[0]);
    },

    sourceRecordCount(provider: string, sourceType: string, providerSourceId: string) {
      return database
        .select({ count: sql<number>`count(*)` })
        .from(sourceRecords)
        .where(and(
          eq(sourceRecords.provider, provider),
          eq(sourceRecords.sourceType, sourceType),
          eq(sourceRecords.providerSourceId, providerSourceId),
        ))
        .then((rows) => Number(rows[0]?.count ?? 0));
    },

    listSourceActivities(contactId: string) {
      return database
        .select()
        .from(sourceActivities)
        .where(eq(sourceActivities.contactId, contactId))
        .orderBy(desc(sourceActivities.occurredAt));
    },

    listSourceRecords(contactId: string) {
      return database
        .select()
        .from(sourceRecords)
        .where(eq(sourceRecords.contactId, contactId))
        .orderBy(desc(sourceRecords.occurredAt));
    },

    async moveSourceData(mergedContactId: string, survivorContactId: string) {
      await database.$client.batch([
        database.$client.prepare('UPDATE commerce_observations SET contact_id=? WHERE contact_id=?').bind(survivorContactId,mergedContactId),
        database.$client.prepare('INSERT INTO commerce_privacy_controls(contact_id,revoked_at) SELECT ?,revoked_at FROM commerce_privacy_controls WHERE contact_id=? ON CONFLICT(contact_id) DO UPDATE SET revoked_at=max(revoked_at,excluded.revoked_at)').bind(survivorContactId,mergedContactId),
        database.$client.prepare('DELETE FROM commerce_privacy_controls WHERE contact_id=?').bind(mergedContactId),
      ]);
      await database
        .update(sourceRecords)
        .set({ contactId: survivorContactId })
        .where(eq(sourceRecords.contactId, mergedContactId));
      await database.run(sql`
        UPDATE OR IGNORE source_activities
        SET contact_id = ${survivorContactId}
        WHERE contact_id = ${mergedContactId}
      `);
      await database.delete(sourceActivities).where(eq(sourceActivities.contactId, mergedContactId));
    },


  };
}
