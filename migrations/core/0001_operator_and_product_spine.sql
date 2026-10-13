CREATE TABLE `operators` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `display_name` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operators_email_idx` ON `operators` (`email`);
--> statement-breakpoint
CREATE TABLE `operator_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `operator_id` text NOT NULL,
  `token_digest` text NOT NULL,
  `expires_at` integer NOT NULL,
  `last_active_at` integer NOT NULL,
  `revoked_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operator_sessions_token_digest_idx` ON `operator_sessions` (`token_digest`);
--> statement-breakpoint
CREATE INDEX `operator_sessions_operator_idx` ON `operator_sessions` (`operator_id`);
--> statement-breakpoint
CREATE TABLE `provider_capabilities` (
  `id` text PRIMARY KEY NOT NULL,
  `adapter` text NOT NULL,
  `configured` integer NOT NULL,
  `status` text NOT NULL,
  `detail` text NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_capabilities_adapter_idx` ON `provider_capabilities` (`adapter`);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_syncs_source_type_unique_idx` ON `source_syncs` (`source_type`);
--> statement-breakpoint
CREATE TABLE `contacts` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `display_name` text NOT NULL,
  `email_status` text NOT NULL,
  `sms_status` text NOT NULL,
  `last_activity_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_email_idx` ON `contacts` (`email`);
--> statement-breakpoint
CREATE TABLE `contact_history` (
  `id` text PRIMARY KEY NOT NULL,
  `contact_id` text NOT NULL,
  `kind` text NOT NULL,
  `detail` text NOT NULL,
  `occurred_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contact_history_contact_idx` ON `contact_history` (`contact_id`, `occurred_at`);
--> statement-breakpoint
CREATE TABLE `proposals` (
  `id` text PRIMARY KEY NOT NULL,
  `state` text NOT NULL,
  `title` text NOT NULL,
  `summary` text NOT NULL,
  `evidence` text NOT NULL,
  `audience_rule` text NOT NULL,
  `source_data_as_of` integer NOT NULL,
  `send_by_at` integer NOT NULL,
  `campaign_id` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `proposals_state_created_idx` ON `proposals` (`state`, `created_at`);
--> statement-breakpoint
CREATE TABLE `proposal_exclusions` (
  `id` text PRIMARY KEY NOT NULL,
  `proposal_id` text NOT NULL,
  `reason` text NOT NULL,
  `count` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `proposal_exclusions_proposal_idx` ON `proposal_exclusions` (`proposal_id`);
--> statement-breakpoint
CREATE TABLE `proposal_steps` (
  `id` text PRIMARY KEY NOT NULL,
  `proposal_id` text NOT NULL,
  `sequence` integer NOT NULL,
  `channel` text NOT NULL,
  `scheduled_at` integer NOT NULL,
  `timezone` text NOT NULL,
  `send_by_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `proposal_steps_proposal_idx` ON `proposal_steps` (`proposal_id`, `sequence`);
--> statement-breakpoint
CREATE TABLE `campaigns` (
  `id` text PRIMARY KEY NOT NULL,
  `proposal_id` text,
  `state` text NOT NULL,
  `active_revision_id` text,
  `cancelled_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campaigns_state_updated_idx` ON `campaigns` (`state`, `updated_at`);
--> statement-breakpoint
CREATE TABLE `campaign_revisions` (
  `id` text PRIMARY KEY NOT NULL,
  `campaign_id` text NOT NULL,
  `version` integer NOT NULL,
  `state` text NOT NULL,
  `name` text NOT NULL,
  `email_subject` text NOT NULL,
  `email_body` text NOT NULL,
  `email_text` text NOT NULL,
  `sms_body` text NOT NULL,
  `sender_name` text NOT NULL,
  `from_email` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_revisions_version_idx` ON `campaign_revisions` (`campaign_id`, `version`);
--> statement-breakpoint
CREATE INDEX `campaign_revisions_campaign_idx` ON `campaign_revisions` (`campaign_id`);
--> statement-breakpoint
CREATE TABLE `campaign_steps` (
  `id` text PRIMARY KEY NOT NULL,
  `revision_id` text NOT NULL,
  `sequence` integer NOT NULL,
  `channel` text NOT NULL,
  `timezone` text NOT NULL,
  `scheduled_at` integer NOT NULL,
  `send_by_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campaign_steps_revision_idx` ON `campaign_steps` (`revision_id`, `sequence`);
--> statement-breakpoint
CREATE TABLE `campaign_audiences` (
  `id` text PRIMARY KEY NOT NULL,
  `revision_id` text NOT NULL,
  `as_of_at` integer NOT NULL,
  `candidate_count` integer NOT NULL,
  `excluded_count` integer NOT NULL,
  `eligible_count` integer NOT NULL,
  `exclusions` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_audiences_revision_idx` ON `campaign_audiences` (`revision_id`);
--> statement-breakpoint
CREATE TABLE `campaign_checks` (
  `id` text PRIMARY KEY NOT NULL,
  `revision_id` text NOT NULL,
  `kind` text NOT NULL,
  `status` text NOT NULL,
  `detail` text NOT NULL,
  `blocking` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campaign_checks_revision_idx` ON `campaign_checks` (`revision_id`);
--> statement-breakpoint
CREATE TABLE `campaign_results` (
  `id` text PRIMARY KEY NOT NULL,
  `campaign_id` text NOT NULL,
  `metric` text NOT NULL,
  `value` integer NOT NULL,
  `observed_at` integer NOT NULL,
  `source` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campaign_results_campaign_idx` ON `campaign_results` (`campaign_id`, `observed_at`);
--> statement-breakpoint
CREATE TABLE `seed_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `applied_at` integer NOT NULL
);
