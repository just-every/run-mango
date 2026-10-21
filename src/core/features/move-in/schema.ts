import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Imported history and draft starters from an archive move-in (migration 0036). */
export const moveInContent = sqliteTable('move_in_content', {
  id: text('id').primaryKey(),
  archiveId: text('archive_id').notNull(),
  ordinal: integer('ordinal').notNull(),
  kind: text('kind').notNull(),
  sourcePath: text('source_path').notNull(),
  sourceRow: integer('source_row'),
  sourceCampaignId: text('source_campaign_id'),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  sentAtSource: text('sent_at_source').notNull(),
  html: text('html').notNull(),
  text: text('text').notNull(),
  removedJson: text('removed_json').notNull(),
  flaggedJson: text('flagged_json').notNull(),
  mergeTagsJson: text('merge_tags_json').notNull(),
  campaignId: text('campaign_id'),
  revisionId: text('revision_id'),
  revisionUpdatedAt: integer('revision_updated_at'),
  state: text('state').notNull(),
  outcome: text('outcome'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
