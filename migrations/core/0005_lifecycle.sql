ALTER TABLE `campaign_revisions` ADD COLUMN `preheader` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `campaign_revisions` ADD COLUMN `physical_address` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `campaign_revisions` ADD COLUMN `message_category` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `campaign_revisions` ADD COLUMN `inclusion_rule_json` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `campaign_revisions` ADD COLUMN `exclusion_rules_json` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `campaign_revisions` ADD COLUMN `source_types_json` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `campaign_revisions` ADD COLUMN `tracking_enabled` integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `campaign_revisions` ADD COLUMN `content_digest` text;
--> statement-breakpoint
ALTER TABLE `campaign_revisions` ADD COLUMN `approved_at` integer;
--> statement-breakpoint
ALTER TABLE `campaign_revisions` ADD COLUMN `approved_by_operator_id` text;
--> statement-breakpoint
ALTER TABLE `proposals` ADD COLUMN `trigger_events_json` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `proposals` ADD COLUMN `lookback_start_at` integer;
--> statement-breakpoint
ALTER TABLE `proposals` ADD COLUMN `inclusion_rule_json` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `proposals` ADD COLUMN `exclusion_rules_json` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE `proposals` ADD COLUMN `generation_error` text;
--> statement-breakpoint
CREATE TABLE `campaign_approval_requests` (
  `idempotency_key` text PRIMARY KEY NOT NULL,
  `campaign_id` text NOT NULL,
  `revision_id` text NOT NULL,
  `revision_digest` text NOT NULL,
  `write_token` text NOT NULL,
  `operator_id` text NOT NULL,
  `approved_at` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_approval_revision_idx` ON `campaign_approval_requests` (`campaign_id`, `revision_id`);
--> statement-breakpoint
CREATE TABLE `campaign_state_transitions` (
  `id` text PRIMARY KEY NOT NULL,
  `campaign_id` text NOT NULL,
  `from_state` text NOT NULL,
  `to_state` text NOT NULL,
  `actor_type` text NOT NULL,
  `actor_id` text NOT NULL,
  `reason` text,
  `occurred_at` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campaign_state_transitions_campaign_idx` ON `campaign_state_transitions` (`campaign_id`, `occurred_at`);
--> statement-breakpoint
CREATE TABLE `campaign_revision_candidates` (
  `id` text PRIMARY KEY NOT NULL,
  `revision_id` text NOT NULL,
  `contact_id` text NOT NULL,
  `contact_identity_key` text NOT NULL,
  `matched_at` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_revision_candidates_once_idx` ON `campaign_revision_candidates` (`revision_id`, `contact_identity_key`);
--> statement-breakpoint
CREATE INDEX `campaign_revision_candidates_contact_idx` ON `campaign_revision_candidates` (`contact_id`);
--> statement-breakpoint
CREATE TABLE `step_dispatches` (
  `step_id` text PRIMARY KEY NOT NULL,
  `revision_id` text NOT NULL,
  `state` text NOT NULL,
  `lease_token` text,
  `lease_expires_at` integer,
  `started_at` integer,
  `completed_at` integer,
  `estimated_completion_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipient_steps` (
  `id` text PRIMARY KEY NOT NULL,
  `campaign_id` text NOT NULL,
  `revision_id` text NOT NULL,
  `step_id` text NOT NULL,
  `contact_id` text NOT NULL,
  `contact_identity_key` text NOT NULL,
  `channel` text NOT NULL,
  `destination` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `transport_disposition` text NOT NULL,
  `skip_reason` text,
  `provider` text,
  `provider_message_id` text,
  `provider_accepted_at` integer,
  `handed_off_at` integer,
  `delivered_at` integer,
  `bounced_at` integer,
  `complained_at` integer,
  `suppressed_at` integer,
  `attempt_count` integer NOT NULL DEFAULT 0,
  `next_attempt_at` integer,
  `handoff_started_at` integer,
  `reconcile_until` integer,
  `reconcile_cursor` text,
  `lease_token` text,
  `lease_expires_at` integer,
  `last_error_code` text,
  `last_error_detail` text,
  `outbound_request_json` text,
  `send_by_at` integer NOT NULL,
  `terminal_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipient_steps_idempotency_idx` ON `recipient_steps` (`idempotency_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipient_steps_once_idx` ON `recipient_steps` (`revision_id`, `step_id`, `contact_identity_key`);
--> statement-breakpoint
CREATE INDEX `recipient_steps_dispatch_idx` ON `recipient_steps` (`step_id`, `transport_disposition`, `next_attempt_at`);
--> statement-breakpoint
CREATE INDEX `recipient_steps_reconcile_idx` ON `recipient_steps` (`transport_disposition`, `reconcile_until`);
--> statement-breakpoint
CREATE TABLE `delivery_facts` (
  `id` text PRIMARY KEY NOT NULL,
  `identity_key` text NOT NULL,
  `recipient_step_id` text NOT NULL,
  `provider` text NOT NULL,
  `provider_event_id` text,
  `provider_message_id` text NOT NULL,
  `kind` text NOT NULL,
  `provider_occurred_at` integer NOT NULL,
  `provider_version` text,
  `payload_digest` text NOT NULL,
  `detail_json` text NOT NULL,
  `billable_units` integer,
  `reported_cost_micros` integer,
  `currency` text,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `delivery_facts_identity_idx` ON `delivery_facts` (`identity_key`);
--> statement-breakpoint
CREATE INDEX `delivery_facts_recipient_idx` ON `delivery_facts` (`recipient_step_id`, `provider_occurred_at`);
--> statement-breakpoint
CREATE TABLE `provider_outages` (
  `id` text PRIMARY KEY NOT NULL,
  `adapter` text NOT NULL,
  `channel` text NOT NULL,
  `state` text NOT NULL,
  `first_failure_at` integer NOT NULL,
  `paused_at` integer,
  `recovered_at` integer,
  `last_error` text NOT NULL,
  `notice_sent_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_outages_open_idx` ON `provider_outages` (`adapter`, `channel`, `state`);
--> statement-breakpoint
CREATE TABLE `campaign_channel_pauses` (
  `id` text PRIMARY KEY NOT NULL,
  `campaign_id` text NOT NULL,
  `revision_id` text NOT NULL,
  `channel` text NOT NULL,
  `reason` text NOT NULL,
  `detail` text NOT NULL,
  `paused_at` integer NOT NULL,
  `resume_check_at` integer NOT NULL,
  `resumed_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_channel_pauses_active_idx` ON `campaign_channel_pauses` (`campaign_id`, `revision_id`, `channel`, `reason`);
--> statement-breakpoint
CREATE TABLE `provider_fact_inbox` (
  `identity_key` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL,
  `provider_message_id` text,
  `mango_reference` text,
  `kind` text NOT NULL,
  `provider_occurred_at` integer NOT NULL,
  `payload_digest` text NOT NULL,
  `detail_json` text NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `provider_fact_inbox_message_idx` ON `provider_fact_inbox` (`provider_message_id`);
--> statement-breakpoint
CREATE TABLE `tracked_links` (
  `token_digest` text PRIMARY KEY NOT NULL,
  `recipient_step_id` text NOT NULL,
  `destination_url` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `link_click_facts` (
  `id` text PRIMARY KEY NOT NULL,
  `recipient_step_id` text NOT NULL,
  `request_digest` text NOT NULL,
  `occurred_at` integer NOT NULL,
  `automated` integer NOT NULL,
  `automation_reason` text,
  `user_agent` text,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `link_click_facts_request_idx` ON `link_click_facts` (`request_digest`);
--> statement-breakpoint
CREATE INDEX `link_click_facts_recipient_idx` ON `link_click_facts` (`recipient_step_id`, `occurred_at`);
--> statement-breakpoint
CREATE TABLE `attribution_facts` (
  `id` text PRIMARY KEY NOT NULL,
  `order_source_record_id` text NOT NULL,
  `campaign_id` text NOT NULL,
  `recipient_step_id` text NOT NULL,
  `click_fact_id` text NOT NULL,
  `attribution_window_days` integer NOT NULL,
  `gross_amount_minor` integer NOT NULL,
  `refund_amount_minor` integer NOT NULL DEFAULT 0,
  `currency` text NOT NULL,
  `attributed_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attribution_facts_order_once_idx` ON `attribution_facts` (`order_source_record_id`);
--> statement-breakpoint
CREATE TABLE `external_cost_facts` (
  `id` text PRIMARY KEY NOT NULL,
  `campaign_id` text,
  `recipient_step_id` text,
  `provider` text NOT NULL,
  `operation` text NOT NULL,
  `model_or_channel` text NOT NULL,
  `billable_units` integer NOT NULL,
  `reported_cost_micros` integer,
  `currency` text,
  `occurred_at` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `external_cost_facts_campaign_idx` ON `external_cost_facts` (`campaign_id`, `occurred_at`);
--> statement-breakpoint
CREATE TABLE `proposal_evidence_items` (
  `id` text PRIMARY KEY NOT NULL,
  `proposal_id` text NOT NULL,
  `source_record_id` text NOT NULL,
  `source_type` text NOT NULL,
  `claim_key` text NOT NULL,
  `observed_value_json` text NOT NULL,
  `occurred_at` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proposal_evidence_item_idx` ON `proposal_evidence_items` (`proposal_id`, `source_record_id`, `claim_key`);
--> statement-breakpoint
CREATE TABLE `proposal_forecasts` (
  `id` text PRIMARY KEY NOT NULL,
  `proposal_id` text NOT NULL,
  `metric` text NOT NULL,
  `value_minor` integer,
  `method` text NOT NULL,
  `campaign_ids_json` text NOT NULL,
  `source_event_ids_json` text NOT NULL,
  `sample_size` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proposal_forecasts_metric_idx` ON `proposal_forecasts` (`proposal_id`, `metric`);
--> statement-breakpoint
CREATE TABLE `proposal_transitions` (
  `id` text PRIMARY KEY NOT NULL,
  `proposal_id` text NOT NULL,
  `from_state` text NOT NULL,
  `to_state` text NOT NULL,
  `actor_id` text NOT NULL,
  `reason` text,
  `occurred_at` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `proposal_transitions_proposal_idx` ON `proposal_transitions` (`proposal_id`, `occurred_at`);
--> statement-breakpoint
CREATE TABLE `lifecycle_audit_entries` (
  `id` text PRIMARY KEY NOT NULL,
  `operation_key` text NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `action` text NOT NULL,
  `actor_type` text NOT NULL,
  `actor_id` text NOT NULL,
  `detail_json` text NOT NULL,
  `occurred_at` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lifecycle_audit_operation_idx` ON `lifecycle_audit_entries` (`operation_key`);
--> statement-breakpoint
CREATE INDEX `lifecycle_audit_entity_idx` ON `lifecycle_audit_entries` (`entity_type`, `entity_id`, `occurred_at`);
