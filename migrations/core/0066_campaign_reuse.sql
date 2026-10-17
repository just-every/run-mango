CREATE TABLE campaign_templates (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 composition_json TEXT NOT NULL,
 created_by TEXT NOT NULL,
 updated_by TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE TABLE campaign_draft_step_settings (
 revision_id TEXT PRIMARY KEY REFERENCES campaign_revisions(id),
 settings_json TEXT NOT NULL
);
