import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const seedRuns = sqliteTable('seed_runs', {
  id: text('id').primaryKey(),
  appliedAt: integer('applied_at', { mode: 'timestamp_ms' }).notNull(),
});
