-- In-composer design generation (DESIGN-001 to DESIGN-003). One row per design run an operator
-- starts from a draft's email editor. The run's candidate images and the chosen candidate's LayerDoc
-- are stored in R2 under design-jobs/<job id>/ and kept as authoring evidence; nothing here is
-- deleted automatically and a failed run stays visible with its safe error code. No contact data:
-- the brief is the operator's own text with personalisation tokens removed.
CREATE TABLE design_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  campaign_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('drafting','choosing','preparing','ready','applied','discarded','failed')),
  provider TEXT NOT NULL,
  brief TEXT NOT NULL,
  candidate_count INTEGER NOT NULL CHECK(candidate_count BETWEEN 2 AND 4),
  provider_run_id TEXT,
  chosen_slot TEXT,
  provider_layout_id TEXT,
  layerdoc_sha256 TEXT CHECK(layerdoc_sha256 IS NULL OR (length(layerdoc_sha256) = 64 AND layerdoc_sha256 NOT GLOB '*[^0-9a-f]*')),
  error_code TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  deadline_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX design_jobs_campaign_idx ON design_jobs (campaign_id, created_at);
--> statement-breakpoint
CREATE INDEX design_jobs_active_idx ON design_jobs (state, deadline_at);
--> statement-breakpoint
CREATE TABLE design_candidates (
  job_id TEXT NOT NULL,
  slot TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('succeeded','failed')),
  sha256 TEXT CHECK(sha256 IS NULL OR (length(sha256) = 64 AND sha256 NOT GLOB '*[^0-9a-f]*')),
  bytes INTEGER,
  width INTEGER,
  height INTEGER,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (job_id, slot),
  CHECK((state = 'succeeded') = (sha256 IS NOT NULL AND bytes > 0 AND width > 0 AND height > 0))
);
