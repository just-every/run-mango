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
