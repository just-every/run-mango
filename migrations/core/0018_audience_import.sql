CREATE TABLE mango_import_revisions (contact_id TEXT PRIMARY KEY, revision TEXT NOT NULL, value_hash TEXT NOT NULL);
CREATE TABLE audience_import_plans (fingerprint TEXT PRIMARY KEY, principal_id TEXT NOT NULL, plan_json TEXT NOT NULL, source_digest TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE mango_audience_hashes (id TEXT PRIMARY KEY, contact_id TEXT NOT NULL, channel TEXT NOT NULL, destination_hash TEXT NOT NULL, owned_opt_out_id TEXT, owned_suppression_ids TEXT NOT NULL);
CREATE TABLE consent_capture_metadata (id TEXT PRIMARY KEY, contact_id TEXT NOT NULL, capture_ip TEXT, confirmation_ip TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TRIGGER audience_capture_metadata_erasure AFTER DELETE ON contacts BEGIN
 DELETE FROM consent_capture_metadata WHERE contact_id=OLD.id;
 DELETE FROM mango_audience_hashes WHERE contact_id=OLD.id;
 DELETE FROM mango_import_revisions WHERE contact_id=OLD.id;
END;
CREATE TRIGGER audience_capture_metadata_merge AFTER UPDATE OF contact_id ON consent_evidence BEGIN
 UPDATE consent_capture_metadata SET contact_id=NEW.contact_id WHERE id=NEW.id;
END;
CREATE TABLE audience_signup_requests (id TEXT PRIMARY KEY, destination_hash TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE audience_import_observations (id TEXT PRIMARY KEY,contact_id TEXT NOT NULL,source_file TEXT NOT NULL,source_row INTEGER NOT NULL,source_status TEXT NOT NULL,capture_method TEXT NOT NULL,capture_source TEXT NOT NULL,optin_time TEXT,confirm_time TEXT,capture_ip TEXT,confirmation_ip TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TRIGGER audience_import_observations_erasure AFTER DELETE ON contacts BEGIN DELETE FROM audience_import_observations WHERE contact_id=OLD.id; END;
CREATE TRIGGER audience_import_metadata_merge AFTER INSERT ON contact_merges BEGIN
 UPDATE audience_import_observations SET contact_id=NEW.survivor_contact_id WHERE contact_id=NEW.merged_contact_id;
 UPDATE mango_audience_hashes SET contact_id=NEW.survivor_contact_id WHERE contact_id=NEW.merged_contact_id;
END;
CREATE UNIQUE INDEX audience_import_plans_source_actor ON audience_import_plans(source_digest,principal_id);
