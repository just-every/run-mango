CREATE TABLE campaign_followups (
  id TEXT PRIMARY KEY NOT NULL,
  campaign_id TEXT NOT NULL UNIQUE REFERENCES campaigns(id),
  source_campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  source_revision_id TEXT NOT NULL REFERENCES campaign_revisions(id),
  metric TEXT NOT NULL CHECK(metric IN ('click','open-estimate')),
  cutoff_at INTEGER NOT NULL,
  delay_hours INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX campaign_followups_source ON campaign_followups(source_campaign_id);
