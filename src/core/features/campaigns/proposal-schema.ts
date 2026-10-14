import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const proposals = sqliteTable(
  'proposals',
  {
    id: text('id').primaryKey(),
    state: text('state').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    evidence: text('evidence').notNull(),
    audienceRule: text('audience_rule').notNull(),
    sourceDataAsOf: integer('source_data_as_of', { mode: 'timestamp_ms' }).notNull(),
    sendByAt: integer('send_by_at', { mode: 'timestamp_ms' }).notNull(),
    campaignId: text('campaign_id'),
    triggerEventsJson: text('trigger_events_json').notNull().default('[]'),
    lookbackStartAt: integer('lookback_start_at', { mode: 'timestamp_ms' }),
    inclusionRuleJson: text('inclusion_rule_json').notNull().default(''),
    exclusionRulesJson: text('exclusion_rules_json').notNull().default('[]'),
    decisionContextJson: text('decision_context_json').notNull().default('{}'),
    generationError: text('generation_error'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('proposals_state_created_idx').on(table.state, table.createdAt)],
);

export const proposalExclusions = sqliteTable(
  'proposal_exclusions',
  {
    id: text('id').primaryKey(),
    proposalId: text('proposal_id').notNull(),
    reason: text('reason').notNull(),
    count: integer('count').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('proposal_exclusions_proposal_idx').on(table.proposalId)],
);

export const proposalSteps = sqliteTable(
  'proposal_steps',
  {
    id: text('id').primaryKey(),
    proposalId: text('proposal_id').notNull(),
    sequence: integer('sequence').notNull(),
    channel: text('channel').notNull(),
    scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }).notNull(),
    timezone: text('timezone').notNull(),
    sendByAt: integer('send_by_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('proposal_steps_proposal_idx').on(table.proposalId, table.sequence)],
);

export const proposalAudiences = sqliteTable(
  'proposal_audiences',
  {
    id: text('id').primaryKey(),
    proposalId: text('proposal_id').notNull(),
    asOfAt: integer('as_of_at', { mode: 'timestamp_ms' }).notNull(),
    candidateCount: integer('candidate_count').notNull(),
    excludedCount: integer('excluded_count').notNull(),
    eligibleCount: integer('eligible_count').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('proposal_audiences_proposal_idx').on(table.proposalId)],
);

export const proposalAudienceChannelCounts = sqliteTable(
  'proposal_audience_channel_counts',
  {
    id: text('id').primaryKey(),
    audienceId: text('audience_id').notNull(),
    channel: text('channel').notNull(),
    recipientStepCount: integer('recipient_step_count').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('proposal_audience_channel_counts_audience_channel_idx').on(table.audienceId, table.channel),
  ],
);
