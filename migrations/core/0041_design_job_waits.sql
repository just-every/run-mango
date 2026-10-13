-- Design runs 12ui holds back (DESIGN-002): while a run waits out a rate limit or retries after an outage, the
-- editor says why and until when. Both columns are cleared once 12ui answers again; a run that cannot continue
-- fails with its safe error code as before.
ALTER TABLE design_jobs ADD COLUMN wait_code TEXT CHECK(wait_code IS NULL OR wait_code IN ('provider_quota','provider_unavailable'));
--> statement-breakpoint
ALTER TABLE design_jobs ADD COLUMN retry_at INTEGER;
