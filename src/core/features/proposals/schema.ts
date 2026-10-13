import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const proposalEvidenceItems = sqliteTable(
  'proposal_evidence_items',
  {
    id: text('id').primaryKey(),
    proposalId: text('proposal_id').notNull(),
    sourceRecordId: text('source_record_id').notNull(),
    sourceType: text('source_type').notNull(),
    claimKey: text('claim_key').notNull(),
    observedValueJson: text('observed_value_json').notNull(),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('proposal_evidence_item_idx').on(table.proposalId, table.sourceRecordId, table.claimKey)],
);

export const proposalForecasts = sqliteTable(
  'proposal_forecasts',
  {
    id: text('id').primaryKey(),
    proposalId: text('proposal_id').notNull(),
    metric: text('metric').notNull(),
    valueMinor: integer('value_minor'),
    method: text('method').notNull(),
    campaignIdsJson: text('campaign_ids_json').notNull(),
    sourceEventIdsJson: text('source_event_ids_json').notNull(),
    sampleSize: integer('sample_size').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('proposal_forecasts_metric_idx').on(table.proposalId, table.metric)],
);

export const proposalTransitions = sqliteTable(
  'proposal_transitions',
  {
    id: text('id').primaryKey(),
    proposalId: text('proposal_id').notNull(),
    fromState: text('from_state').notNull(),
    toState: text('to_state').notNull(),
    actorId: text('actor_id').notNull(),
    reason: text('reason'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('proposal_transitions_proposal_idx').on(table.proposalId, table.occurredAt)],
);
