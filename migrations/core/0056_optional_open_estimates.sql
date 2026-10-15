-- Existing installations remain untracked until an operator explicitly opts in.
CREATE TABLE open_tracking_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1), enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  generation INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, operator_id TEXT
);
CREATE TABLE open_tracking_tokens (
  token_digest TEXT PRIMARY KEY, recipient_step_id TEXT NOT NULL REFERENCES recipient_steps(id),
  generation INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX open_tracking_recipient ON open_tracking_tokens(recipient_step_id);
CREATE TABLE open_estimate_facts (
  recipient_step_id TEXT PRIMARY KEY REFERENCES recipient_steps(id), occurred_at INTEGER NOT NULL
);
