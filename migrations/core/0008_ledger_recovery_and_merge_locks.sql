ALTER TABLE `contacts` ADD COLUMN `merge_lock` text;
--> statement-breakpoint
ALTER TABLE `contact_imports` ADD COLUMN `completed_at` integer;
--> statement-breakpoint
CREATE UNIQUE INDEX `consent_confirmations_evidence_idx` ON `consent_confirmations` (`consent_evidence_id`);
