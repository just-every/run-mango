-- Durable cross-worker transport authority. Applied migrations remain unchanged.
CREATE TABLE provider_pacing (
  scope TEXT PRIMARY KEY, next_at REAL NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE provider_holds (
  provider TEXT NOT NULL, scope TEXT NOT NULL, reason TEXT NOT NULL,
  held INTEGER NOT NULL, effective_at INTEGER NOT NULL, observed_at INTEGER NOT NULL,
  evidence_id TEXT NOT NULL, detail TEXT NOT NULL,
  PRIMARY KEY (provider, scope, reason)
);
CREATE TABLE provider_outage_notifications (
  outage_id TEXT NOT NULL, operator_id TEXT NOT NULL, state TEXT NOT NULL,
  request_json TEXT NOT NULL, provider_message_id TEXT, updated_at INTEGER NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0, first_attempt_at INTEGER,next_attempt_at INTEGER,last_error TEXT,reconcile_cursor TEXT,lookup_until INTEGER,
  PRIMARY KEY(outage_id, operator_id)
);
ALTER TABLE recipient_steps ADD COLUMN first_attempt_at INTEGER;
ALTER TABLE recipient_steps ADD COLUMN actual_sender TEXT;
ALTER TABLE provider_outages ADD COLUMN next_probe_at INTEGER;
DROP INDEX provider_outages_open_idx;
UPDATE provider_outages SET state='recovered' WHERE state IN ('observing','paused') AND EXISTS(SELECT 1 FROM provider_outages newer WHERE newer.adapter=provider_outages.adapter AND newer.channel=provider_outages.channel AND newer.state IN ('observing','paused') AND (newer.first_failure_at>provider_outages.first_failure_at OR (newer.first_failure_at=provider_outages.first_failure_at AND newer.id>provider_outages.id)));
CREATE UNIQUE INDEX provider_one_active_outage ON provider_outages(adapter, channel) WHERE state IN ('observing','paused');

UPDATE recipient_steps SET first_attempt_at=handoff_started_at WHERE transport_disposition NOT IN ('queued','skipped') AND handoff_started_at IS NOT NULL;

CREATE TABLE provider_health (
  adapter TEXT NOT NULL, channel TEXT NOT NULL, next_probe_at INTEGER NOT NULL,
  reachable INTEGER NOT NULL DEFAULT 0, observed_at INTEGER, code TEXT,
  PRIMARY KEY(adapter,channel)
);

CREATE TABLE provider_account_events(provider TEXT NOT NULL,event_id TEXT NOT NULL,payload_digest TEXT NOT NULL,PRIMARY KEY(provider,event_id));
