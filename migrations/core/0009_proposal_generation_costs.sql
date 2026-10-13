ALTER TABLE `external_cost_facts` ADD COLUMN `proposal_id` text;
--> statement-breakpoint
CREATE INDEX `external_cost_facts_proposal_idx` ON `external_cost_facts` (`proposal_id`, `occurred_at`);
