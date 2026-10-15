-- A rolling segment ledger complements existing account spacing. Both survive
-- restarts and are retained by the normal full-table archive mechanism.
CREATE TABLE provider_pacing_reservations (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, reserved_at INTEGER NOT NULL,
  units INTEGER NOT NULL CHECK(units > 0)
);
CREATE INDEX provider_pacing_reservations_window ON provider_pacing_reservations(scope,reserved_at);
-- Existing spacing rows predate the ledger. Quarantine their final minute
-- rather than assume the unrecorded preceding segment volume was zero.
UPDATE provider_pacing SET next_at=MAX(next_at,updated_at+60000);
ALTER TABLE recipient_steps ADD COLUMN provider_credential_digest TEXT;
ALTER TABLE provider_outage_notifications ADD COLUMN provider TEXT;
ALTER TABLE provider_outage_notifications ADD COLUMN provider_credential_digest TEXT;
