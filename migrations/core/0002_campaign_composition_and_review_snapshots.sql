ALTER TABLE `campaign_revisions` ADD COLUMN `audience_rule` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `campaign_revisions` ADD COLUMN `reply_to_email` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `campaign_revisions` ADD COLUMN `sms_sender` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `campaign_steps` ADD COLUMN `why_this_time` text NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_steps_revision_sequence_idx` ON `campaign_steps` (`revision_id`, `sequence`);
--> statement-breakpoint
CREATE TABLE `campaign_revision_links` (
  `id` text PRIMARY KEY NOT NULL,
  `revision_id` text NOT NULL,
  `sequence` integer NOT NULL,
  `label` text NOT NULL,
  `destination_url` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_revision_links_revision_sequence_idx` ON `campaign_revision_links` (`revision_id`, `sequence`);
--> statement-breakpoint
CREATE TABLE `campaign_audience_channel_counts` (
  `id` text PRIMARY KEY NOT NULL,
  `audience_id` text NOT NULL,
  `channel` text NOT NULL,
  `recipient_step_count` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_audience_channel_counts_audience_channel_idx` ON `campaign_audience_channel_counts` (`audience_id`, `channel`);
--> statement-breakpoint
CREATE TABLE `proposal_audiences` (
  `id` text PRIMARY KEY NOT NULL,
  `proposal_id` text NOT NULL,
  `as_of_at` integer NOT NULL,
  `candidate_count` integer NOT NULL,
  `excluded_count` integer NOT NULL,
  `eligible_count` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proposal_audiences_proposal_idx` ON `proposal_audiences` (`proposal_id`);
--> statement-breakpoint
CREATE TABLE `proposal_audience_channel_counts` (
  `id` text PRIMARY KEY NOT NULL,
  `audience_id` text NOT NULL,
  `channel` text NOT NULL,
  `recipient_step_count` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proposal_audience_channel_counts_audience_channel_idx` ON `proposal_audience_channel_counts` (`audience_id`, `channel`);
