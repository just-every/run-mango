import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const campaignFollowups = sqliteTable('campaign_followups', {
  id:text('id').primaryKey(),campaignId:text('campaign_id').notNull(),sourceCampaignId:text('source_campaign_id').notNull(),
  sourceRevisionId:text('source_revision_id').notNull(),metric:text('metric').notNull(),cutoffAt:integer('cutoff_at').notNull(),
  delayHours:integer('delay_hours').notNull(),createdAt:integer('created_at').notNull(),
});
