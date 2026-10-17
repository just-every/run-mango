import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Channel settings without instants: these records never enter the scheduler. */
export const draftStepSettings = sqliteTable('campaign_draft_step_settings', {
  revisionId: text('revision_id').primaryKey(),
  settingsJson: text('settings_json').notNull(),
});
