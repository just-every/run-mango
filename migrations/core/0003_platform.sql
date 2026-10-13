ALTER TABLE `operators` ADD COLUMN `is_initial` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `operators` ADD COLUMN `invited_at` integer;
--> statement-breakpoint
ALTER TABLE `operators` ADD COLUMN `removed_at` integer;
--> statement-breakpoint
CREATE INDEX `operators_removed_idx` ON `operators` (`removed_at`);
--> statement-breakpoint
CREATE TABLE `operator_magic_links` (
  `id` text PRIMARY KEY NOT NULL,
  `operator_id` text NOT NULL,
  `token_digest` text NOT NULL,
  `expires_at` integer NOT NULL,
  `consumed_at` integer,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operator_magic_links_token_digest_idx` ON `operator_magic_links` (`token_digest`);
--> statement-breakpoint
CREATE INDEX `operator_magic_links_operator_idx` ON `operator_magic_links` (`operator_id`, `expires_at`);
--> statement-breakpoint
CREATE TABLE `operator_bootstraps` (
  `id` text PRIMARY KEY NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_rate_limits` (
  `key` text PRIMARY KEY NOT NULL,
  `window_started_at` integer NOT NULL,
  `requests` integer NOT NULL,
  `updated_at` integer NOT NULL
);
