CREATE TABLE `contacts_ledger_next` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text,
  `display_name` text NOT NULL,
  `email_status` text NOT NULL,
  `sms_status` text NOT NULL,
  `email_status_at` integer,
  `sms_status_at` integer,
  `source_customer_record_id` text,
  `last_activity_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `contacts_ledger_next` (
  `id`, `email`, `display_name`, `email_status`, `sms_status`, `email_status_at`, `sms_status_at`,
  `last_activity_at`, `created_at`, `updated_at`
)
SELECT `id`, `email`, `display_name`, `email_status`, `sms_status`, `updated_at`, `updated_at`,
  `last_activity_at`, `created_at`, `updated_at`
FROM `contacts`;
--> statement-breakpoint
DROP TABLE `contacts`;
--> statement-breakpoint
ALTER TABLE `contacts_ledger_next` RENAME TO `contacts`;
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_email_idx` ON `contacts` (`email`);
--> statement-breakpoint
CREATE TABLE `contact_email_addresses` (
  `id` text PRIMARY KEY NOT NULL,
  `contact_id` text NOT NULL,
  `email` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_email_addresses_email_idx` ON `contact_email_addresses` (`email`);
--> statement-breakpoint
CREATE INDEX `contact_email_addresses_contact_idx` ON `contact_email_addresses` (`contact_id`);
--> statement-breakpoint
INSERT INTO `contact_email_addresses` (`id`, `contact_id`, `email`, `created_at`, `updated_at`)
SELECT `id` || '_email', `id`, `email`, `created_at`, `updated_at` FROM `contacts` WHERE `email` IS NOT NULL;
--> statement-breakpoint
CREATE TABLE `contact_phones` (
  `id` text PRIMARY KEY NOT NULL,
  `contact_id` text NOT NULL,
  `phone_e164` text NOT NULL,
  `identity_status` text NOT NULL,
  `time_zone` text,
  `location_source` text,
  `location_recorded_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_phones_e164_idx` ON `contact_phones` (`phone_e164`);
--> statement-breakpoint
CREATE INDEX `contact_phones_contact_idx` ON `contact_phones` (`contact_id`);
--> statement-breakpoint
CREATE TABLE `consent_evidence` (
  `id` text PRIMARY KEY NOT NULL,
  `contact_id` text NOT NULL,
  `channel` text NOT NULL,
  `brand_or_legal_sender` text NOT NULL,
  `sms_program` text,
  `message_category` text NOT NULL,
  `frequency_disclosure` text NOT NULL,
  `destination_jurisdiction` text NOT NULL,
  `capture_method` text NOT NULL,
  `capture_source` text NOT NULL,
  `consent_text` text NOT NULL,
  `consent_version` text NOT NULL,
  `occurred_at` integer NOT NULL,
  `confirmation_required` integer NOT NULL,
  `confirmed_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `consent_evidence_contact_channel_idx` ON `consent_evidence` (`contact_id`, `channel`, `occurred_at`);
--> statement-breakpoint
CREATE TABLE `consent_confirmations` (
  `id` text PRIMARY KEY NOT NULL,
  `consent_evidence_id` text NOT NULL,
  `contact_id` text NOT NULL,
  `channel` text NOT NULL,
  `token_digest` text NOT NULL,
  `sent_at` integer NOT NULL,
  `expires_at` integer NOT NULL,
  `confirmed_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `consent_confirmations_token_digest_idx` ON `consent_confirmations` (`token_digest`);
--> statement-breakpoint
CREATE INDEX `consent_confirmations_contact_channel_idx` ON `consent_confirmations` (`contact_id`, `channel`);
--> statement-breakpoint
CREATE TABLE `contact_suppressions` (
  `id` text PRIMARY KEY NOT NULL,
  `contact_id` text,
  `channel` text NOT NULL,
  `destination_hash` text NOT NULL,
  `cause` text NOT NULL,
  `occurred_at` integer NOT NULL,
  `provider_event_id` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_suppressions_provider_event_idx` ON `contact_suppressions` (`provider_event_id`);
--> statement-breakpoint
CREATE INDEX `contact_suppressions_contact_channel_idx` ON `contact_suppressions` (`contact_id`, `channel`, `occurred_at`);
--> statement-breakpoint
CREATE TABLE `surviving_opt_outs` (
  `id` text PRIMARY KEY NOT NULL,
  `destination_hash` text NOT NULL,
  `channel` text NOT NULL,
  `reason` text NOT NULL,
  `occurred_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `surviving_opt_outs_destination_channel_idx` ON `surviving_opt_outs` (`destination_hash`, `channel`);
--> statement-breakpoint
CREATE TABLE `contact_bounce_states` (
  `contact_id` text PRIMARY KEY NOT NULL,
  `consecutive_soft_bounces` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contact_imports` (
  `id` text PRIMARY KEY NOT NULL,
  `source_digest` text NOT NULL,
  `created_count` integer NOT NULL,
  `updated_count` integer NOT NULL,
  `rejected_count` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_imports_source_digest_idx` ON `contact_imports` (`source_digest`);
--> statement-breakpoint
CREATE TABLE `contact_import_rows` (
  `id` text PRIMARY KEY NOT NULL,
  `import_id` text NOT NULL,
  `row_number` integer NOT NULL,
  `status` text NOT NULL,
  `reason` text,
  `contact_id` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_import_rows_import_row_idx` ON `contact_import_rows` (`import_id`, `row_number`);
--> statement-breakpoint
CREATE INDEX `contact_import_rows_import_idx` ON `contact_import_rows` (`import_id`);
--> statement-breakpoint
CREATE TABLE `contact_merges` (
  `id` text PRIMARY KEY NOT NULL,
  `survivor_contact_id` text NOT NULL,
  `merged_contact_id` text NOT NULL,
  `operator_id` text,
  `occurred_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_merges_merged_contact_idx` ON `contact_merges` (`merged_contact_id`);
--> statement-breakpoint
CREATE TABLE `public_action_tokens` (
  `id` text PRIMARY KEY NOT NULL,
  `contact_id` text NOT NULL,
  `channel` text NOT NULL,
  `recipient_step_id` text,
  `purpose` text NOT NULL,
  `token_digest` text NOT NULL,
  `expires_at` integer NOT NULL,
  `used_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `public_action_tokens_token_digest_idx` ON `public_action_tokens` (`token_digest`);
--> statement-breakpoint
CREATE INDEX `public_action_tokens_contact_idx` ON `public_action_tokens` (`contact_id`, `channel`, `purpose`);
--> statement-breakpoint
CREATE INDEX `public_action_tokens_recipient_step_idx` ON `public_action_tokens` (`recipient_step_id`);
--> statement-breakpoint
CREATE TABLE `public_token_rate_limits` (
  `token_digest` text PRIMARY KEY NOT NULL,
  `window_started_at` integer NOT NULL,
  `request_count` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sms_compliance_replies` (
  `id` text PRIMARY KEY NOT NULL,
  `provider_event_id` text NOT NULL,
  `contact_id` text,
  `channel` text NOT NULL,
  `canonical_action` text NOT NULL,
  `keyword` text NOT NULL,
  `sender` text NOT NULL,
  `program` text NOT NULL,
  `jurisdiction` text NOT NULL,
  `occurred_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sms_compliance_replies_event_idx` ON `sms_compliance_replies` (`provider_event_id`);
--> statement-breakpoint
CREATE TABLE `commerce_source_capabilities` (
  `id` text PRIMARY KEY NOT NULL,
  `source_type` text NOT NULL,
  `available` integer NOT NULL,
  `detail` text NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commerce_source_capabilities_type_idx` ON `commerce_source_capabilities` (`source_type`);
--> statement-breakpoint
CREATE TABLE `source_records` (
  `id` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL,
  `source_type` text NOT NULL,
  `provider_source_id` text NOT NULL,
  `contact_id` text,
  `occurred_at` integer NOT NULL,
  `payload` text NOT NULL,
  `payload_digest` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_records_provider_identity_idx` ON `source_records` (`provider`, `source_type`, `provider_source_id`);
--> statement-breakpoint
CREATE INDEX `source_records_contact_occurred_idx` ON `source_records` (`contact_id`, `occurred_at`);
--> statement-breakpoint
CREATE INDEX `source_records_type_occurred_idx` ON `source_records` (`source_type`, `occurred_at`);
--> statement-breakpoint
CREATE TABLE `source_activities` (
  `id` text PRIMARY KEY NOT NULL,
  `contact_id` text NOT NULL,
  `source_record_id` text NOT NULL,
  `kind` text NOT NULL,
  `product_id` text,
  `state` text NOT NULL,
  `occurred_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_activities_contact_record_kind_idx` ON `source_activities` (`contact_id`, `source_record_id`, `kind`);
--> statement-breakpoint
CREATE INDEX `source_activities_contact_occurred_idx` ON `source_activities` (`contact_id`, `occurred_at`);
