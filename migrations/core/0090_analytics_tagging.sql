CREATE TABLE analytics_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  policy_json TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
-- NULL preserves issued and historical message URLs and their approval digests.
ALTER TABLE campaign_revisions ADD COLUMN utm_policy_json TEXT;
ALTER TABLE tracked_links ADD COLUMN original_destination_url TEXT;
