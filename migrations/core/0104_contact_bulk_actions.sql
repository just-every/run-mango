-- Frozen selections contain references only; receipts resolve identities live.
CREATE TABLE contact_bulk_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  action TEXT NOT NULL,
  value TEXT,
  channel TEXT NOT NULL DEFAULT 'email',
  principal_id TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued',
  total INTEGER NOT NULL,
  lease_token TEXT,
  lease_until INTEGER,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE contact_bulk_items (
  job_id TEXT NOT NULL REFERENCES contact_bulk_jobs(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  erasure_reference TEXT,
  PRIMARY KEY(job_id,ordinal)
);
CREATE INDEX contact_bulk_pending ON contact_bulk_items(job_id,state,ordinal);
CREATE INDEX contact_bulk_contact ON contact_bulk_items(contact_id);
CREATE TABLE contact_tag_overrides (
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  present INTEGER NOT NULL CHECK(present IN (0,1)),
  PRIMARY KEY(contact_id,tag)
);
CREATE TABLE contact_topic_memberships (
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  topic TEXT NOT NULL,
  evidence_id TEXT NOT NULL REFERENCES consent_evidence(id) ON DELETE CASCADE,
  added_at INTEGER NOT NULL,
  PRIMARY KEY(contact_id,channel,topic)
);
-- Native erasure also operates when a restore tool disables foreign keys.
CREATE TRIGGER contact_bulk_erased BEFORE DELETE ON contacts BEGIN
  UPDATE contact_bulk_items SET contact_id=NULL,reason=CASE WHEN state='pending' THEN 'contact-erased' ELSE NULL END,state=CASE WHEN state='pending' THEN 'refused' ELSE state END WHERE contact_id=OLD.id;
  DELETE FROM contact_tag_overrides WHERE contact_id=OLD.id;
  DELETE FROM contact_topic_memberships WHERE contact_id=OLD.id;
END;
CREATE TRIGGER tag_override_insert AFTER INSERT ON contact_tag_overrides BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER tag_override_update AFTER UPDATE ON contact_tag_overrides BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER tag_override_delete AFTER DELETE ON contact_tag_overrides BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
