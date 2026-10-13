-- Named audience rules are copied into drafts, never referenced by revisions.
CREATE TABLE audience_segments (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  inclusion_rule_json TEXT NOT NULL,
  exclusion_rules_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
