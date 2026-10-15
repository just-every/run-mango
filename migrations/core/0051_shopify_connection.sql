ALTER TABLE source_records ADD COLUMN provider_updated_at INTEGER;
UPDATE source_records SET provider_updated_at = occurred_at;
ALTER TABLE source_activities ADD COLUMN activity_key TEXT NOT NULL DEFAULT '';
UPDATE source_activities SET activity_key = coalesce(product_id, '');
DROP INDEX source_activities_contact_record_kind_idx;
CREATE UNIQUE INDEX source_activities_contact_record_kind_idx ON source_activities(contact_id, source_record_id, kind, activity_key);
CREATE TABLE commerce_receipts (
  id TEXT PRIMARY KEY, digest TEXT NOT NULL, received_at INTEGER NOT NULL
);
CREATE TABLE commerce_observations (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, event_id TEXT NOT NULL,
  source_type TEXT NOT NULL, source_id TEXT NOT NULL, contact_id TEXT,
  occurred_at INTEGER NOT NULL, provider_updated_at INTEGER NOT NULL, received_at INTEGER NOT NULL,
  payload TEXT NOT NULL, digest TEXT NOT NULL,
  UNIQUE(channel, event_id)
);
CREATE INDEX commerce_observations_channel_sequence ON commerce_observations(channel,sequence);
CREATE INDEX commerce_observations_contact ON commerce_observations(contact_id);
CREATE TABLE commerce_channels (
  id TEXT PRIMARY KEY, shop TEXT NOT NULL, installation_id TEXT NOT NULL, pixel_id TEXT,
  coverage_start INTEGER NOT NULL, retention_start INTEGER NOT NULL, healthy_at INTEGER NOT NULL,
  log_revision INTEGER NOT NULL DEFAULT 0,
  last_observation_at INTEGER, last_error TEXT, supported_events TEXT NOT NULL,
  purpose TEXT NOT NULL, exhaustive INTEGER NOT NULL DEFAULT 0 CHECK(exhaustive=0)
);
CREATE TABLE commerce_transaction_guard (valid INTEGER NOT NULL CHECK(valid=1));

-- Every deletion invalidates outstanding cursors. The retained-history boundary
-- follows the deleted observation, not deletion time: routine expiry must not
-- hide the still-retained recent window.
CREATE TRIGGER commerce_observation_erased AFTER DELETE ON commerce_observations BEGIN
  UPDATE commerce_channels SET log_revision=log_revision+1, retention_start=max(retention_start,OLD.received_at+1) WHERE id=OLD.channel;
END;
CREATE TABLE commerce_privacy_controls (contact_id TEXT PRIMARY KEY, revoked_at INTEGER NOT NULL);
CREATE TABLE commerce_source_coverage (
  source_type TEXT PRIMARY KEY, run_id TEXT NOT NULL, mode TEXT NOT NULL,
  exhaustive INTEGER NOT NULL, from_at INTEGER, channel_id TEXT, completed_at INTEGER NOT NULL
);
ALTER TABLE source_records ADD COLUMN snapshot_run_id TEXT;
