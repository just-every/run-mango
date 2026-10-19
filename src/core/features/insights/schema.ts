import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const campaignResults = sqliteTable(
  'campaign_results',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id').notNull(),
    metric: text('metric').notNull(),
    value: integer('value').notNull(),
    observedAt: integer('observed_at', { mode: 'timestamp_ms' }).notNull(),
    source: text('source').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('campaign_results_campaign_idx').on(table.campaignId, table.observedAt)],
);

/** Anonymous membership facts created by migrations 0073/0074. */
export const listGrowthEvents = sqliteTable('list_growth_events', {
  id: integer('id').primaryKey({autoIncrement:true}),
  observedAt: integer('observed_at', {mode:'timestamp_ms'}).notNull(),
  channel: text('channel').notNull(),
  kind: text('kind').notNull(),
  delta: integer('delta').notNull(),
  recording: text('recording').notNull().default('live'),
});
