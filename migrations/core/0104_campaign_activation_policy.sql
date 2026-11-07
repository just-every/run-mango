CREATE TABLE campaign_activation_policy (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  approver_operator_id TEXT NOT NULL,
  generation INTEGER NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE campaign_activation_holds (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  revision_id TEXT NOT NULL,
  revision_updated_at INTEGER NOT NULL,
  policy_generation INTEGER NOT NULL,
  approver_operator_id TEXT NOT NULL,
  credential_id TEXT NOT NULL,
  risk_classes_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (revision_id, revision_updated_at, policy_generation, credential_id)
);
