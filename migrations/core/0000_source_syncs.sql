CREATE TABLE `source_syncs` (
  `id` text PRIMARY KEY NOT NULL,
  `source_type` text NOT NULL,
  `last_successful_at` integer,
  `last_error` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `source_syncs_source_type_idx` ON `source_syncs` (`source_type`);
