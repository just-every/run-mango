-- A parallel-run link to the incumbent audience (CONT-004, MOVE-013, MOVE-023). Installation authority:
-- the sealed key never travels in an audience export or restored archive. Writeback work is keyed by
-- Mango contact, never by address, so erasing a person leaves no copy of the destination here.
CREATE TABLE parallel_run_links (
 id INTEGER PRIMARY KEY CHECK(id=1), provider TEXT NOT NULL, server_prefix TEXT NOT NULL, list_id TEXT NOT NULL,
 secret_cipher TEXT NOT NULL, last_four TEXT NOT NULL, webhook_secret_digest TEXT NOT NULL, webhook_id TEXT,
 connected_by TEXT NOT NULL, connected_at INTEGER NOT NULL, last_event_at INTEGER
);
CREATE TABLE parallel_run_writebacks (
 contact_id TEXT PRIMARY KEY, status_at INTEGER NOT NULL, origin TEXT NOT NULL CHECK(origin IN ('mango','incumbent')),
 state TEXT NOT NULL CHECK(state IN ('pending','done','failed')), attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at INTEGER NOT NULL, written_at INTEGER, echoed_at INTEGER, last_error TEXT
);
CREATE INDEX parallel_run_writebacks_due_idx ON parallel_run_writebacks(state, next_attempt_at);
