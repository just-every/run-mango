-- Each opt-out or suppression reason for a destination is its own surviving record.
-- Before this, one row per destination and channel held a single reason, so a later
-- soft-bounce suppression overwrote a person's opt-out and its lifting deleted it.
DROP INDEX `surviving_opt_outs_destination_channel_idx`;
--> statement-breakpoint
CREATE UNIQUE INDEX `surviving_opt_outs_destination_channel_reason_idx` ON `surviving_opt_outs` (`destination_hash`, `channel`, `reason`);
