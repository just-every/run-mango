import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const contacts = sqliteTable(
  'contacts',
  {
    id: text('id').primaryKey(),
    // `email` is the display primary address. Every address, including this
    // one, is also represented in contactEmailAddresses so a restrictive merge
    // does not discard a destination identity.
    email: text('email'),
    displayName: text('display_name').notNull(),
    emailStatus: text('email_status').notNull(),
    smsStatus: text('sms_status').notNull(),
    emailStatusAt: integer('email_status_at', { mode: 'timestamp_ms' }),
    smsStatusAt: integer('sms_status_at', { mode: 'timestamp_ms' }),
    sourceCustomerRecordId: text('source_customer_record_id'),
    mergeLock: text('merge_lock'),
    lastActivityAt: integer('last_activity_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('contacts_email_idx').on(table.email)],
);

export const contactEmailAddresses = sqliteTable(
  'contact_email_addresses',
  {
    id: text('id').primaryKey(),
    contactId: text('contact_id').notNull(),
    email: text('email').notNull(),
    channelStatus: text('channel_status').notNull(),
    channelStatusAt: integer('channel_status_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('contact_email_addresses_email_idx').on(table.email),
    index('contact_email_addresses_contact_idx').on(table.contactId),
  ],
);

export const contactPhones = sqliteTable(
  'contact_phones',
  {
    id: text('id').primaryKey(),
    contactId: text('contact_id').notNull(),
    phoneE164: text('phone_e164').notNull(),
    channelStatus: text('channel_status').notNull(),
    channelStatusAt: integer('channel_status_at', { mode: 'timestamp_ms' }),
    identityStatus: text('identity_status').notNull(),
    timeZone: text('time_zone'),
    locationSource: text('location_source'),
    locationRecordedAt: integer('location_recorded_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('contact_phones_e164_idx').on(table.phoneE164),
    index('contact_phones_contact_idx').on(table.contactId),
  ],
);

export const contactHistory = sqliteTable(
  'contact_history',
  {
    id: text('id').primaryKey(),
    contactId: text('contact_id').notNull(),
    kind: text('kind').notNull(),
    detail: text('detail').notNull(),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('contact_history_contact_idx').on(table.contactId, table.occurredAt)],
);

export const consentEvidence = sqliteTable(
  'consent_evidence',
  {
    id: text('id').primaryKey(),
    contactId: text('contact_id').notNull(),
    channel: text('channel').notNull(),
    destination: text('destination').notNull(),
    brandOrLegalSender: text('brand_or_legal_sender').notNull(),
    smsProgram: text('sms_program'),
    messageCategory: text('message_category').notNull(),
    frequencyDisclosure: text('frequency_disclosure').notNull(),
    destinationJurisdiction: text('destination_jurisdiction').notNull(),
    captureMethod: text('capture_method').notNull(),
    captureSource: text('capture_source').notNull(),
    consentText: text('consent_text').notNull(),
    consentVersion: text('consent_version').notNull(),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    confirmationRequired: integer('confirmation_required', { mode: 'boolean' }).notNull(),
    confirmedAt: integer('confirmed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('consent_evidence_contact_channel_idx').on(table.contactId, table.channel, table.occurredAt)],
);

export const consentConfirmations = sqliteTable(
  'consent_confirmations',
  {
    id: text('id').primaryKey(),
    consentEvidenceId: text('consent_evidence_id').notNull(),
    contactId: text('contact_id').notNull(),
    channel: text('channel').notNull(),
    tokenDigest: text('token_digest').notNull(),
    sentAt: integer('sent_at', { mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    confirmedAt: integer('confirmed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('consent_confirmations_token_digest_idx').on(table.tokenDigest),
    uniqueIndex('consent_confirmations_evidence_idx').on(table.consentEvidenceId),
    index('consent_confirmations_contact_channel_idx').on(table.contactId, table.channel),
  ],
);

export const contactSuppressions = sqliteTable(
  'contact_suppressions',
  {
    id: text('id').primaryKey(),
    contactId: text('contact_id'),
    channel: text('channel').notNull(),
    destinationHash: text('destination_hash').notNull(),
    cause: text('cause').notNull(),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    providerEventId: text('provider_event_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('contact_suppressions_provider_event_idx').on(table.providerEventId),
    index('contact_suppressions_contact_channel_idx').on(table.contactId, table.channel, table.occurredAt),
    index('contact_suppressions_destination_channel_idx').on(table.destinationHash, table.channel),
  ],
);

export const survivingOptOuts = sqliteTable(
  'surviving_opt_outs',
  {
    id: text('id').primaryKey(),
    destinationHash: text('destination_hash').notNull(),
    channel: text('channel').notNull(),
    reason: text('reason').notNull(),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('surviving_opt_outs_destination_channel_reason_idx').on(table.destinationHash, table.channel, table.reason)],
);

export const contactBounceStates = sqliteTable(
  'contact_bounce_states',
  {
    contactId: text('contact_id').primaryKey(),
    consecutiveSoftBounces: integer('consecutive_soft_bounces').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
);

export const contactBounceFacts = sqliteTable(
  'contact_bounce_facts',
  {
    providerEventId: text('provider_event_id').primaryKey(),
    contactId: text('contact_id').notNull(),
    kind: text('kind').notNull(),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('contact_bounce_facts_contact_time_idx').on(table.contactId, table.occurredAt)],
);

export const contactImports = sqliteTable(
  'contact_imports',
  {
    id: text('id').primaryKey(),
    sourceDigest: text('source_digest').notNull(),
    createdCount: integer('created_count').notNull(),
    updatedCount: integer('updated_count').notNull(),
    rejectedCount: integer('rejected_count').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  },
  (table) => [uniqueIndex('contact_imports_source_digest_idx').on(table.sourceDigest)],
);

export const contactImportRows = sqliteTable(
  'contact_import_rows',
  {
    id: text('id').primaryKey(),
    importId: text('import_id').notNull(),
    rowNumber: integer('row_number').notNull(),
    status: text('status').notNull(),
    reason: text('reason'),
    contactId: text('contact_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('contact_import_rows_import_row_idx').on(table.importId, table.rowNumber),
    index('contact_import_rows_import_idx').on(table.importId),
  ],
);

export const contactMerges = sqliteTable(
  'contact_merges',
  {
    id: text('id').primaryKey(),
    survivorContactId: text('survivor_contact_id').notNull(),
    mergedContactId: text('merged_contact_id').notNull(),
    operatorId: text('operator_id'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('contact_merges_merged_contact_idx').on(table.mergedContactId)],
);

export const publicActionTokens = sqliteTable(
  'public_action_tokens',
  {
    id: text('id').primaryKey(),
    contactId: text('contact_id').notNull(),
    channel: text('channel').notNull(),
    recipientStepId: text('recipient_step_id'),
    purpose: text('purpose').notNull(),
    tokenDigest: text('token_digest').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('public_action_tokens_token_digest_idx').on(table.tokenDigest),
    index('public_action_tokens_contact_idx').on(table.contactId, table.channel, table.purpose),
    index('public_action_tokens_recipient_step_idx').on(table.recipientStepId),
  ],
);

export const publicTokenRateLimits = sqliteTable(
  'public_token_rate_limits',
  {
    tokenDigest: text('token_digest').primaryKey(),
    windowStartedAt: integer('window_started_at', { mode: 'timestamp_ms' }).notNull(),
    requestCount: integer('request_count').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
);

export const smsComplianceReplies = sqliteTable(
  'sms_compliance_replies',
  {
    id: text('id').primaryKey(),
    providerEventId: text('provider_event_id').notNull(),
    contactId: text('contact_id'),
    channel: text('channel').notNull(),
    canonicalAction: text('canonical_action').notNull(),
    keyword: text('keyword').notNull(),
    sender: text('sender').notNull(),
    program: text('program').notNull(),
    jurisdiction: text('jurisdiction').notNull(),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('sms_compliance_replies_event_idx').on(table.providerEventId)],
);
