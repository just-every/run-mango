import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const operators = sqliteTable(
  'operators',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    isInitial: integer('is_initial', { mode: 'boolean' }).notNull().default(false),
    invitedAt: integer('invited_at', { mode: 'timestamp_ms' }),
    removedAt: integer('removed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  // Profiles retain historical attribution. Only Base's oa_operators grants authority.
  (table) => [index('operators_email_idx').on(table.email)],
);

export const operatorMagicLinks = sqliteTable(
  'operator_magic_links',
  {
    id: text('id').primaryKey(),
    operatorId: text('operator_id').notNull(),
    tokenDigest: text('token_digest').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    consumedAt: integer('consumed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('operator_magic_links_token_digest_idx').on(table.tokenDigest),
    index('operator_magic_links_operator_idx').on(table.operatorId, table.expiresAt),
  ],
);

export const operatorBootstraps = sqliteTable('operator_bootstraps', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const authRateLimits = sqliteTable('auth_rate_limits', {
  key: text('key').primaryKey(),
  windowStartedAt: integer('window_started_at', { mode: 'timestamp_ms' }).notNull(),
  requests: integer('requests').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const operatorSessions = sqliteTable(
  'operator_sessions',
  {
    id: text('id').primaryKey(),
    operatorId: text('operator_id').notNull(),
    tokenDigest: text('token_digest').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    lastActiveAt: integer('last_active_at', { mode: 'timestamp_ms' }).notNull(),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('operator_sessions_token_digest_idx').on(table.tokenDigest),
    index('operator_sessions_operator_idx').on(table.operatorId),
  ],
);
