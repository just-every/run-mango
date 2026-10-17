-- Credentials grant API operations only; they are never operator sessions.
CREATE TABLE integration_credentials (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  last_used_at INTEGER,
  rate_window INTEGER NOT NULL DEFAULT 0,
  rate_count INTEGER NOT NULL DEFAULT 0
);

-- Pending audit rows commit before execution; interrupted calls remain visible.
-- No tokens, request bodies, addresses or arbitrary URL paths enter this log.
CREATE TABLE integration_audit (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  credential_id TEXT REFERENCES integration_credentials(id),
  actor_id TEXT,
  operation TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL DEFAULT 'pending',
  occurred_at INTEGER NOT NULL
);
CREATE INDEX integration_audit_credential ON integration_audit(credential_id,sequence);

CREATE TABLE integration_segments (
  segment_id TEXT PRIMARY KEY NOT NULL REFERENCES audience_segments(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL REFERENCES integration_credentials(id),
  name TEXT NOT NULL,
  UNIQUE(name)
);
CREATE TABLE integration_segment_members (
  segment_id TEXT NOT NULL REFERENCES integration_segments(segment_id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY(segment_id,contact_id)
);
CREATE INDEX integration_segment_contact ON integration_segment_members(contact_id);
CREATE TABLE integration_contact_profiles (
  contact_id TEXT PRIMARY KEY NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  fields_json TEXT NOT NULL DEFAULT '{}',
  tags_json TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE integration_suppression_sources (
  provider_event_id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  cause TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  contact_id TEXT REFERENCES contacts(id) ON DELETE CASCADE
);

-- Sequences never recycle, including after erasure; cursors are safe to replay.
-- Email is projected from the current contact, never copied into this ledger.
CREATE TABLE integration_events (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  contact_id TEXT REFERENCES contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  destination TEXT,
  cause TEXT NOT NULL,
  occurred_at INTEGER NOT NULL
);
CREATE INDEX integration_events_contact ON integration_events(contact_id);

CREATE TRIGGER integration_unsubscribe_event AFTER UPDATE OF channel_status ON contact_email_addresses
WHEN NEW.channel_status='unsubscribed' AND OLD.channel_status<>'unsubscribed'
BEGIN
  INSERT OR IGNORE INTO integration_events(id,type,contact_id,channel,destination,cause,occurred_at)
  VALUES('unsubscribe:' || NEW.id || ':' || NEW.channel_status_at,'unsubscribe',NEW.contact_id,'email',NEW.email,'unsubscribe',NEW.channel_status_at);
END;
CREATE TRIGGER integration_sms_unsubscribe_event AFTER UPDATE OF channel_status ON contact_phones
WHEN NEW.channel_status='unsubscribed' AND OLD.channel_status<>'unsubscribed'
BEGIN
  INSERT OR IGNORE INTO integration_events(id,type,contact_id,channel,destination,cause,occurred_at)
  VALUES('unsubscribe:' || NEW.id || ':' || NEW.channel_status_at,'unsubscribe',NEW.contact_id,'sms',NEW.phone_e164,'unsubscribe',NEW.channel_status_at);
END;
-- The verified inbox is durable before derived safety-state application. Unknown
-- destinations have already been removed by the existing erasure privacy policy.
CREATE TRIGGER integration_provider_event AFTER INSERT ON provider_fact_inbox
WHEN NEW.kind IN ('unsubscribed','bounced','complained','suppressed')
BEGIN
  INSERT OR IGNORE INTO integration_events(id,type,contact_id,channel,destination,cause,occurred_at)
  VALUES('provider:' || NEW.provider || ':' || NEW.identity_key,
    CASE NEW.kind WHEN 'unsubscribed' THEN 'unsubscribe' WHEN 'bounced' THEN 'bounce' WHEN 'complained' THEN 'complaint' ELSE 'suppression' END,
    COALESCE((SELECT contact_id FROM contact_email_addresses WHERE email=lower(json_extract(NEW.detail_json,'$.destination'))),
      (SELECT contact_id FROM contact_phones WHERE phone_e164=json_extract(NEW.detail_json,'$.destination'))),
    CASE WHEN instr(json_extract(NEW.detail_json,'$.destination'),'@')>0 OR json_extract(NEW.detail_json,'$.destination') IS NULL AND NEW.provider<>'mobile-message' THEN 'email' ELSE 'sms' END,
    json_extract(NEW.detail_json,'$.destination'),NEW.kind,NEW.provider_occurred_at);
END;
CREATE TRIGGER integration_suppression_event AFTER INSERT ON contact_suppressions
WHEN NEW.provider_event_id IS NULL OR NEW.provider_event_id NOT LIKE 'provider-suppression:%'
BEGIN
  INSERT OR IGNORE INTO integration_events(id,type,contact_id,channel,destination,cause,occurred_at)
  VALUES('suppression:' || NEW.id,
    CASE WHEN NEW.cause IN ('complaint','complained') THEN 'complaint'
      WHEN NEW.cause IN ('hard','hard-bounce','soft-bounce','three-consecutive-soft-bounces') THEN 'bounce'
      ELSE 'suppression' END,
    NEW.contact_id,NEW.channel,
    COALESCE((SELECT email FROM integration_suppression_sources WHERE provider_event_id=NEW.provider_event_id),
      CASE WHEN NEW.channel='email' THEN (SELECT email FROM contacts WHERE id=NEW.contact_id)
      ELSE (SELECT phone_e164 FROM contact_phones WHERE contact_id=NEW.contact_id LIMIT 1) END),NEW.cause,NEW.occurred_at);
END;
CREATE TRIGGER integration_bounce_event AFTER INSERT ON contact_bounce_facts
WHEN NEW.kind='soft-bounce' AND NEW.provider_event_id NOT LIKE 'provider-soft-bounce:%'
BEGIN
  INSERT OR IGNORE INTO integration_events(id,type,contact_id,channel,destination,cause,occurred_at)
  VALUES('bounce:' || NEW.provider_event_id,'bounce',NEW.contact_id,'email',(SELECT email FROM contacts WHERE id=NEW.contact_id),NEW.kind,NEW.occurred_at);
END;

-- Explicit cleanup also works on database tools that disable foreign keys.
-- Existing erasure invalidates all active exports before this contact deletion.
CREATE TRIGGER integration_contact_erasure BEFORE DELETE ON contacts
BEGIN
  DELETE FROM integration_events WHERE contact_id=OLD.id;
  DELETE FROM integration_contact_profiles WHERE contact_id=OLD.id;
  DELETE FROM integration_segment_members WHERE contact_id=OLD.id;
  DELETE FROM integration_suppression_sources WHERE contact_id=OLD.id OR email=OLD.email;
END;
CREATE TRIGGER integration_destination_arrived AFTER INSERT ON contact_email_addresses
BEGIN
  UPDATE integration_events SET contact_id=NEW.contact_id WHERE destination=NEW.email AND contact_id IS NULL;
  UPDATE integration_suppression_sources SET contact_id=NEW.contact_id WHERE email=NEW.email AND contact_id IS NULL;
END;
CREATE TRIGGER integration_destination_erased BEFORE DELETE ON contact_email_addresses
BEGIN
  DELETE FROM integration_events WHERE destination=OLD.email;
  DELETE FROM integration_suppression_sources WHERE email=OLD.email;
END;
CREATE TRIGGER integration_saved_segment_delete AFTER DELETE ON audience_segments
BEGIN
  DELETE FROM integration_segment_members WHERE segment_id=OLD.id;
  DELETE FROM integration_segments WHERE segment_id=OLD.id;
END;
