import {sql} from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const stepDispatches = sqliteTable('step_dispatches', {
  stepId: text('step_id').primaryKey(),
  revisionId: text('revision_id').notNull(),
  state: text('state').notNull(),
  leaseToken: text('lease_token'),
  leaseExpiresAt: integer('lease_expires_at', { mode: 'timestamp_ms' }),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  estimatedCompletionAt: integer('estimated_completion_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const recipientSteps = sqliteTable(
  'recipient_steps',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id').notNull(),
    revisionId: text('revision_id').notNull(),
    stepId: text('step_id').notNull(),
    contactId: text('contact_id').notNull(),
    contactIdentityKey: text('contact_identity_key').notNull(),
    channel: text('channel').notNull(),
    destination: text('destination').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    transportDisposition: text('transport_disposition').notNull(),
    skipReason: text('skip_reason'),
    provider: text('provider'),
    providerMessageId: text('provider_message_id'),
    providerAcceptedAt: integer('provider_accepted_at', { mode: 'timestamp_ms' }),
    handedOffAt: integer('handed_off_at', { mode: 'timestamp_ms' }),
    deliveredAt: integer('delivered_at', { mode: 'timestamp_ms' }),
    bouncedAt: integer('bounced_at', { mode: 'timestamp_ms' }),
    complainedAt: integer('complained_at', { mode: 'timestamp_ms' }),
    suppressedAt: integer('suppressed_at', { mode: 'timestamp_ms' }),
    messageUnsubscribedAt: integer('message_unsubscribed_at', { mode: 'timestamp_ms' }),
    unsubscribeMethod: integer('unsubscribe_method'),
    attemptCount: integer('attempt_count').notNull(),
    firstAttemptAt: integer('first_attempt_at',{mode:'timestamp_ms'}),
    actualSender: text('actual_sender'),
    nextAttemptAt: integer('next_attempt_at', { mode: 'timestamp_ms' }),
    handoffStartedAt: integer('handoff_started_at', { mode: 'timestamp_ms' }),
    reconcileUntil: integer('reconcile_until', { mode: 'timestamp_ms' }),
    reconcileCursor: text('reconcile_cursor'),
    leaseToken: text('lease_token'),
    leaseExpiresAt: integer('lease_expires_at', { mode: 'timestamp_ms' }),
    lastErrorCode: text('last_error_code'),
    lastErrorDetail: text('last_error_detail'),
    outboundRequestJson: text('outbound_request_json'),
    sendByAt: integer('send_by_at', { mode: 'timestamp_ms' }).notNull(),
    terminalAt: integer('terminal_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('recipient_steps_idempotency_idx').on(table.idempotencyKey),
    uniqueIndex('recipient_steps_once_idx').on(table.revisionId, table.stepId, table.contactIdentityKey),
    index('recipient_steps_dispatch_idx').on(table.stepId, table.transportDisposition, table.nextAttemptAt),
    index('recipient_steps_reconcile_idx').on(table.transportDisposition, table.reconcileUntil),
  ],
);

export const deliveryFacts = sqliteTable(
  'delivery_facts',
  {
    id: text('id').primaryKey(),
    identityKey: text('identity_key').notNull(),
    recipientStepId: text('recipient_step_id').notNull(),
    provider: text('provider').notNull(),
    providerEventId: text('provider_event_id'),
    providerMessageId: text('provider_message_id').notNull(),
    kind: text('kind').notNull(),
    providerOccurredAt: integer('provider_occurred_at', { mode: 'timestamp_ms' }).notNull(),
    providerVersion: text('provider_version'),
    payloadDigest: text('payload_digest').notNull(),
    detailJson: text('detail_json').notNull(),
    billableUnits: integer('billable_units'),
    reportedCostMicros: integer('reported_cost_micros'),
    currency: text('currency'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('delivery_facts_identity_idx').on(table.identityKey),
    index('delivery_facts_recipient_idx').on(table.recipientStepId, table.providerOccurredAt),
  ],
);

export const providerOutages = sqliteTable(
  'provider_outages',
  {
    id: text('id').primaryKey(),
    adapter: text('adapter').notNull(),
    channel: text('channel').notNull(),
    state: text('state').notNull(),
    firstFailureAt: integer('first_failure_at', { mode: 'timestamp_ms' }).notNull(),
    pausedAt: integer('paused_at', { mode: 'timestamp_ms' }),
    recoveredAt: integer('recovered_at', { mode: 'timestamp_ms' }),
    lastError: text('last_error').notNull(),
    noticeSentAt: integer('notice_sent_at', { mode: 'timestamp_ms' }),
    nextProbeAt: integer('next_probe_at',{mode:'timestamp_ms'}),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('provider_one_active_outage').on(table.adapter, table.channel).where(sql`${table.state} IN ('observing','paused')`)],
);

export const campaignChannelPauses = sqliteTable(
  'campaign_channel_pauses',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id').notNull(),
    revisionId: text('revision_id').notNull(),
    channel: text('channel').notNull(),
    reason: text('reason').notNull(),
    detail: text('detail').notNull(),
    pausedAt: integer('paused_at', { mode: 'timestamp_ms' }).notNull(),
    resumeCheckAt: integer('resume_check_at', { mode: 'timestamp_ms' }).notNull(),
    resumedAt: integer('resumed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('campaign_channel_pauses_active_idx').on(table.campaignId, table.revisionId, table.channel, table.reason)],
);

export const providerFactInbox = sqliteTable(
  'provider_fact_inbox',
  {
    identityKey: text('identity_key').primaryKey(),
    provider: text('provider').notNull(),
    providerMessageId: text('provider_message_id'),
    mangoReference: text('mango_reference'),
    kind: text('kind').notNull(),
    providerOccurredAt: integer('provider_occurred_at', { mode: 'timestamp_ms' }).notNull(),
    payloadDigest: text('payload_digest').notNull(),
    detailJson: text('detail_json').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('provider_fact_inbox_message_idx').on(table.providerMessageId)],
);

export const trackedLinks = sqliteTable('tracked_links', {
  tokenDigest: text('token_digest').primaryKey(),
  recipientStepId: text('recipient_step_id').notNull(),
  revisionLinkId: text('revision_link_id'),
  destinationUrl: text('destination_url').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const linkClickFacts = sqliteTable(
  'link_click_facts',
  {
    id: text('id').primaryKey(),
    recipientStepId: text('recipient_step_id').notNull(),
    requestDigest: text('request_digest').notNull(),
    revisionLinkId: text('revision_link_id'),
    destinationUrl: text('destination_url'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    automated: integer('automated', { mode: 'boolean' }).notNull(),
    automationReason: text('automation_reason'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('link_click_facts_request_idx').on(table.requestDigest),
    index('link_click_facts_recipient_idx').on(table.recipientStepId, table.occurredAt),
    index('link_click_facts_link_idx').on(table.revisionLinkId, table.automated, table.recipientStepId),
    index('link_click_facts_destination_idx').on(table.destinationUrl, table.recipientStepId, table.automated),
  ],
);

export const attributionFacts = sqliteTable(
  'attribution_facts',
  {
    id: text('id').primaryKey(),
    orderSourceRecordId: text('order_source_record_id').notNull(),
    campaignId: text('campaign_id').notNull(),
    recipientStepId: text('recipient_step_id').notNull(),
    clickFactId: text('click_fact_id').notNull(),
    attributionWindowDays: integer('attribution_window_days').notNull(),
    grossAmountMinor: integer('gross_amount_minor').notNull(),
    refundAmountMinor: integer('refund_amount_minor').notNull(),
    currency: text('currency').notNull(),
    attributedAt: integer('attributed_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('attribution_facts_order_once_idx').on(table.orderSourceRecordId)],
);

export const externalCostFacts = sqliteTable(
  'external_cost_facts',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id'),
    recipientStepId: text('recipient_step_id'),
    provider: text('provider').notNull(),
    operation: text('operation').notNull(),
    modelOrChannel: text('model_or_channel').notNull(),
    billableUnits: integer('billable_units').notNull(),
    unitsKnown: integer('units_known').notNull().default(1),
    unitKind: text('unit_kind').notNull().default('provider units'),
    outcome: text('outcome').notNull().default('reported'),
    reportedCostMicros: integer('reported_cost_micros'),
    currency: text('currency'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('external_cost_facts_campaign_idx').on(table.campaignId, table.occurredAt), index('external_cost_facts_day_idx').on(table.occurredAt)],
);
