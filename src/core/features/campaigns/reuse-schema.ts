import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Channel settings without instants: these records never enter the scheduler. */
export const draftStepSettings = sqliteTable('campaign_draft_step_settings', {
  revisionId: text('revision_id').primaryKey(),
  settingsJson: text('settings_json').notNull(),
});

/** Saved library entries; imports use their custody row id for atomic undo. */
export const campaignTemplates = sqliteTable('campaign_templates', {
  id:text('id').primaryKey(), name:text('name').notNull(), compositionJson:text('composition_json').notNull(),
  createdBy:text('created_by').notNull(), updatedBy:text('updated_by').notNull(),
  createdAt:integer('created_at').notNull(), updatedAt:integer('updated_at').notNull(),
});
