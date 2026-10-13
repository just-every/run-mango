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

    async upsertSourceRecord(values: typeof sourceRecords.$inferInsert, fence?: SyncWriteFence) {
      if (fence) {
        await fencedInsert(database, sourceRecords, values, fence, {target: ['provider', 'sourceType', 'providerSourceId'], update: ['contactId', 'occurredAt', 'payload', 'payloadDigest', 'updatedAt']});
        return (await database.select().from(sourceRecords).where(and(eq(sourceRecords.provider, values.provider), eq(sourceRecords.sourceType, values.sourceType), eq(sourceRecords.providerSourceId, values.providerSourceId))))[0];
      }
      const rows = await database
        .insert(sourceRecords)
        .values(values)
        .onConflictDoUpdate({
          target: [sourceRecords.provider, sourceRecords.sourceType, sourceRecords.providerSourceId],
          set: {
            contactId: values.contactId,
            occurredAt: values.occurredAt,
            payload: values.payload,
            payloadDigest: values.payloadDigest,
            updatedAt: values.updatedAt,
          },
        })
        .returning();
      return rows[0];
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

    async upsertSourceActivity(values: typeof sourceActivities.$inferInsert, fence?: SyncWriteFence) {
      if (fence) {
        await fencedInsert(database, sourceActivities, values, fence, {target: ['contactId', 'sourceRecordId', 'kind'], update: ['productId', 'state', 'occurredAt', 'updatedAt']});
        return;
      }
      await database
        .insert(sourceActivities)
        .values(values)
        .onConflictDoUpdate({
          target: [sourceActivities.contactId, sourceActivities.sourceRecordId, sourceActivities.kind],
          set: {
            productId: values.productId,
            state: values.state,
            occurredAt: values.occurredAt,
            updatedAt: values.updatedAt,
          },
        });
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
