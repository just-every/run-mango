import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const campaigns = sqliteTable(
  'campaigns',
  {
    id: text('id').primaryKey(),
    proposalId: text('proposal_id'),
    state: text('state').notNull(),
    activeRevisionId: text('active_revision_id'),
    cancelledAt: integer('cancelled_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('campaigns_state_updated_idx').on(table.state, table.updatedAt)],
);

export const campaignRevisions = sqliteTable(
  'campaign_revisions',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id').notNull(),
    version: integer('version').notNull(),
    state: text('state').notNull(),
    name: text('name').notNull(),
    emailSubject: text('email_subject').notNull(),
    emailBody: text('email_body').notNull(),
    emailText: text('email_text').notNull(),
    preheader: text('preheader').notNull(),
    smsBody: text('sms_body').notNull(),
    senderName: text('sender_name').notNull(),
    fromEmail: text('from_email').notNull(),
    audienceRule: text('audience_rule').notNull(),
    replyToEmail: text('reply_to_email').notNull(),
    smsSender: text('sms_sender').notNull(),
    physicalAddress: text('physical_address').notNull(),
    messageCategory: text('message_category').notNull(),
    dormancyPolicyJson: text('dormancy_policy_json').notNull().default('{"enabled":true,"windowDays":365,"includeOpenOnly":false}'),
    inclusionRuleJson: text('inclusion_rule_json').notNull(),
    exclusionRulesJson: text('exclusion_rules_json').notNull(),
    authoredExclusionReasonsJson: text('authored_exclusion_reasons_json').notNull().default('[]'),
    sourceTypesJson: text('source_types_json').notNull(),
    trackingEnabled: integer('tracking_enabled', { mode: 'boolean' }).notNull(),
    contentDigest: text('content_digest'),
    approvedAt: integer('approved_at', { mode: 'timestamp_ms' }),
    approvedByOperatorId: text('approved_by_operator_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('campaign_revisions_version_idx').on(table.campaignId, table.version),
    index('campaign_revisions_campaign_idx').on(table.campaignId),
  ],
);

export const campaignApprovalRequests = sqliteTable(
  'campaign_approval_requests',
  {
    idempotencyKey: text('idempotency_key').primaryKey(),
    campaignId: text('campaign_id').notNull(),
    revisionId: text('revision_id').notNull(),
    revisionDigest: text('revision_digest').notNull(),
    operatorId: text('operator_id').notNull(),
    approvedAt: integer('approved_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('campaign_approval_revision_idx').on(table.campaignId, table.revisionId)],
);

export const campaignRevisionCandidates = sqliteTable(
  'campaign_revision_candidates',
  {
    id: text('id').primaryKey(),
    revisionId: text('revision_id').notNull(),
    contactId: text('contact_id').notNull(),
    contactIdentityKey: text('contact_identity_key').notNull(),
    matchedAt: integer('matched_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('campaign_revision_candidates_once_idx').on(table.revisionId, table.contactIdentityKey),
    index('campaign_revision_candidates_contact_idx').on(table.contactId),
  ],
);

export const campaignStateTransitions = sqliteTable(
  'campaign_state_transitions',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id').notNull(),
    fromState: text('from_state').notNull(),
    toState: text('to_state').notNull(),
    actorType: text('actor_type').notNull(),
    actorId: text('actor_id').notNull(),
    reason: text('reason'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('campaign_state_transitions_campaign_idx').on(table.campaignId, table.occurredAt)],
);

export const campaignSteps = sqliteTable(
  'campaign_steps',
  {
    id: text('id').primaryKey(),
    revisionId: text('revision_id').notNull(),
    sequence: integer('sequence').notNull(),
    channel: text('channel').notNull(),
    timezone: text('timezone').notNull(),
    scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }).notNull(),
    sendByAt: integer('send_by_at', { mode: 'timestamp_ms' }).notNull(),
    whyThisTime: text('why_this_time').notNull(),
    timingOrigin: text('timing_origin'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('campaign_steps_revision_sequence_idx').on(table.revisionId, table.sequence),
    index('campaign_steps_revision_idx').on(table.revisionId, table.sequence),
  ],
);

export const campaignRevisionLinks = sqliteTable(
  'campaign_revision_links',
  {
    id: text('id').primaryKey(),
    revisionId: text('revision_id').notNull(),
    sequence: integer('sequence').notNull(),
    label: text('label').notNull(),
    destinationUrl: text('destination_url').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('campaign_revision_links_revision_sequence_idx').on(table.revisionId, table.sequence),
  ],
);

export const campaignAudiences = sqliteTable(
  'campaign_audiences',
  {
    id: text('id').primaryKey(),
    revisionId: text('revision_id').notNull(),
    asOfAt: integer('as_of_at', { mode: 'timestamp_ms' }).notNull(),
    candidateCount: integer('candidate_count').notNull(),
    excludedCount: integer('excluded_count').notNull(),
    eligibleCount: integer('eligible_count').notNull(),
    dormancyIncludedCount: integer('dormancy_included_count').notNull().default(0),
    noHistoryCount: integer('no_history_count').notNull().default(0),
    openOnlyCount: integer('open_only_count').notNull().default(0),
    exclusions: text('exclusions').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('campaign_audiences_revision_idx').on(table.revisionId)],
);

export const campaignChecks = sqliteTable(
  'campaign_checks',
  {
    id: text('id').primaryKey(),
    revisionId: text('revision_id').notNull(),
    kind: text('kind').notNull(),
    status: text('status').notNull(),
    detail: text('detail').notNull(),
    blocking: integer('blocking', { mode: 'boolean' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('campaign_checks_revision_idx').on(table.revisionId)],
);

export const campaignAudienceChannelCounts = sqliteTable(
  'campaign_audience_channel_counts',
  {
    id: text('id').primaryKey(),
    audienceId: text('audience_id').notNull(),
    channel: text('channel').notNull(),
    recipientStepCount: integer('recipient_step_count').notNull(),
    eligibleContactCount: integer('eligible_contact_count'),
    fallbackContactCount: integer('fallback_contact_count'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('campaign_audience_channel_counts_audience_channel_idx').on(table.audienceId, table.channel),
  ],
);
