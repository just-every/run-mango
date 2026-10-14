import { sql } from 'drizzle-orm';
import { check, primaryKey, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const providerCapabilities = sqliteTable(
  'provider_capabilities',
  {
    id: text('id').primaryKey(),
    adapter: text('adapter').notNull(),
    configured: integer('configured', { mode: 'boolean' }).notNull(),
    status: text('status').notNull(),
    detail: text('detail').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('provider_capabilities_adapter_idx').on(table.adapter)],
);

export const sourceSyncs = sqliteTable(
  'source_syncs',
  {
    id: text('id').primaryKey(),
    sourceType: text('source_type').notNull(),
    lastSuccessfulAt: integer('last_successful_at', { mode: 'timestamp_ms' }),
    lastError: text('last_error'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('source_syncs_source_type_unique_idx').on(table.sourceType)],
);

export const commerceSourceCapabilities = sqliteTable(
  'commerce_source_capabilities',
  {
    id: text('id').primaryKey(),
    sourceType: text('source_type').notNull(),
    available: integer('available', { mode: 'boolean' }).notNull(),
    detail: text('detail').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('commerce_source_capabilities_type_idx').on(table.sourceType)],
);

export const sourceRecords = sqliteTable(
  'source_records',
  {
    id: text('id').primaryKey(),
    provider: text('provider').notNull(),
    sourceType: text('source_type').notNull(),
    providerSourceId: text('provider_source_id').notNull(),
    providerUpdatedAt: integer('provider_updated_at', { mode: 'timestamp_ms' }),
    snapshotRunId: text('snapshot_run_id'),
    contactId: text('contact_id'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    payload: text('payload').notNull(),
    payloadDigest: text('payload_digest').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('source_records_provider_identity_idx').on(table.provider, table.sourceType, table.providerSourceId),
    index('source_records_contact_occurred_idx').on(table.contactId, table.occurredAt),
    index('source_records_type_occurred_idx').on(table.sourceType, table.occurredAt),
  ],
);

export const sourceActivities = sqliteTable(
  'source_activities',
  {
    id: text('id').primaryKey(),
    contactId: text('contact_id').notNull(),
    sourceRecordId: text('source_record_id').notNull(),
    kind: text('kind').notNull(),
    productId: text('product_id'),
    activityKey: text('activity_key').notNull().default(''),
    state: text('state').notNull(),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('source_activities_contact_record_kind_idx').on(table.contactId, table.sourceRecordId, table.kind, table.activityKey),
    index('source_activities_contact_occurred_idx').on(table.contactId, table.occurredAt),
  ],
);

export const sourceSyncRuns = sqliteTable('source_sync_runs', {
  id: text('id').primaryKey(), provider: text('provider').notNull(), sourceType: text('source_type').notNull(),
  state: text('state').notNull(), nextCursor: text('next_cursor'), pages: integer('pages').notNull().default(0),
  records: integer('records').notNull().default(0), leaseToken: text('lease_token'), leaseExpiresAt: integer('lease_expires_at', {mode: 'timestamp_ms'}),
  lastError: text('last_error'), createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(), updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
  completedAt: integer('completed_at', {mode: 'timestamp_ms'}),
}, table => [
  check('source_sync_runs_state', sql`${table.state} IN ('queued', 'running', 'failed', 'completed', 'superseded')`),
  uniqueIndex('source_sync_runs_active').on(table.provider, table.sourceType).where(sql`${table.state} IN ('queued', 'running')`),
  index('source_sync_runs_updated').on(table.updatedAt),
]);
export const sourceSyncCursors = sqliteTable('source_sync_cursors', {
  runId: text('run_id').notNull(), cursorDigest: text('cursor_digest').notNull(),
}, table => [primaryKey({columns: [table.runId, table.cursorDigest]})]);
