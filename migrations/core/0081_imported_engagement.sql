-- Imported observations are distinct from Mango sends and their results.
-- Generic portability discovers these tables; no credentials or replay are needed.
CREATE TABLE imported_engagement_facts (
  id TEXT PRIMARY KEY,
  archive_id TEXT NOT NULL REFERENCES move_in_archives(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  history_id TEXT NOT NULL REFERENCES move_in_content(id),
  source TEXT NOT NULL,
  source_row INTEGER NOT NULL,
  source_ordinal INTEGER NOT NULL,
  source_campaign_id TEXT NOT NULL,
  link TEXT,
  kind TEXT NOT NULL CHECK(kind IN ('click','open')),
  occurred_at INTEGER NOT NULL,
  UNIQUE(archive_id,source_ordinal,source_row)
);
CREATE INDEX imported_engagement_contact_time ON imported_engagement_facts(contact_id,kind,occurred_at);
CREATE TABLE move_in_contact_history (
  id TEXT PRIMARY KEY,
  archive_id TEXT NOT NULL REFERENCES move_in_archives(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  has_history INTEGER NOT NULL CHECK(has_history IN (0,1)),
  UNIQUE(archive_id,contact_id)
);
CREATE INDEX move_in_history_contact ON move_in_contact_history(contact_id);
ALTER TABLE move_in_content ADD COLUMN source_campaign_id TEXT;
CREATE TRIGGER imported_engagement_insert AFTER INSERT ON imported_engagement_facts BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER imported_engagement_update AFTER UPDATE ON imported_engagement_facts BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER imported_engagement_delete AFTER DELETE ON imported_engagement_facts BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER move_in_history_insert AFTER INSERT ON move_in_contact_history BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER move_in_history_update AFTER UPDATE ON move_in_contact_history BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER move_in_history_delete AFTER DELETE ON move_in_contact_history BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
CREATE TRIGGER move_in_completion_update AFTER UPDATE OF state,applied_at ON move_in_archives BEGIN UPDATE audience_source_authority SET generation=generation+1 WHERE id=1; END;
-- Existing revisions retain their historical default. New authored drafts copy
-- the installation policy, then carry it through approval and dispatch.
ALTER TABLE campaign_revisions ADD COLUMN dormancy_policy_json TEXT NOT NULL DEFAULT '{"enabled":true,"windowDays":365,"includeOpenOnly":false}';
ALTER TABLE campaign_audiences ADD COLUMN no_history_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE campaign_audiences ADD COLUMN open_only_count INTEGER NOT NULL DEFAULT 0;
CREATE TABLE audience_exclusion_settings (
  id INTEGER PRIMARY KEY CHECK(id=1),
  policy_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  operator_id TEXT NOT NULL
);

ALTER TABLE move_in_archives ADD COLUMN engagement_done INTEGER NOT NULL DEFAULT 0;

ALTER TABLE campaign_audiences ADD COLUMN dormancy_included_count INTEGER NOT NULL DEFAULT 0;
