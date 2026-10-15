-- Existing environment policies remain authoritative until an operator saves Settings.
CREATE TABLE link_host_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1), hosts TEXT NOT NULL,
  updated_at INTEGER NOT NULL, operator_id TEXT NOT NULL
);
