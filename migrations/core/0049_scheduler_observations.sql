-- Actual Worker scheduled entries only; reads, deploys and manual lifecycle calls do not create observations.
CREATE TABLE scheduler_observation (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  run_id TEXT NOT NULL,
  scheduled_at INTEGER NOT NULL,
  entered_at INTEGER NOT NULL,
  finished_at INTEGER,
  outcome TEXT NOT NULL CHECK (outcome IN ('running','completed','failed','blocked-restore','blocked-erasure'))
);
