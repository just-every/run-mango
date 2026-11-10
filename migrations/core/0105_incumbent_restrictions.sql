CREATE TABLE incumbent_restriction_connections (
  id TEXT PRIMARY KEY,
  data_center TEXT NOT NULL,
  audience_id TEXT NOT NULL,
  credentials TEXT NOT NULL,
  connected_by TEXT NOT NULL,
  connected_at INTEGER NOT NULL,
  last_success_at INTEGER,
  last_error TEXT,
  UNIQUE(data_center,audience_id)
);
CREATE TABLE incumbent_restriction_receipts (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  occurred_at INTEGER NOT NULL
);
CREATE INDEX incumbent_restriction_receipts_connection ON incumbent_restriction_receipts(connection_id);
