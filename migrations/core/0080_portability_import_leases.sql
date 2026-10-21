-- Install transfer bookkeeping before admitting archive requests, so refusing
-- invalid authority never changes the destination's durable schema.
CREATE TABLE IF NOT EXISTS rer_portability_import_leases (
  job TEXT PRIMARY KEY REFERENCES rer_portability_jobs(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  holder TEXT
);
