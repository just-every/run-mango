CREATE TABLE source_sync_runs (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  source_type TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('queued', 'running', 'failed', 'completed', 'superseded')),
  next_cursor TEXT,
  pages INTEGER NOT NULL DEFAULT 0,
  records INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  lease_expires_at INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE UNIQUE INDEX source_sync_runs_active ON source_sync_runs(provider, source_type) WHERE state IN ('queued', 'running');
CREATE INDEX source_sync_runs_updated ON source_sync_runs(updated_at);
CREATE TABLE source_sync_cursors (
  run_id TEXT NOT NULL,
  cursor_digest TEXT NOT NULL,
  PRIMARY KEY (run_id, cursor_digest)
);
