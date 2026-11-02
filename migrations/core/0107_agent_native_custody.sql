-- Native agent authority is distinct from a person session.
CREATE TABLE mango_agent_write_admissions (
 id TEXT PRIMARY KEY, sponsor_id TEXT NOT NULL, sponsor_version INTEGER NOT NULL,
 product_role TEXT NOT NULL, agent_id TEXT NOT NULL, client_id TEXT, consent TEXT,
 policy_state TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE mango_agent_work (
 kind TEXT NOT NULL, target_id TEXT NOT NULL, sponsor_id TEXT NOT NULL,
 principal_json TEXT NOT NULL, attribution_json TEXT NOT NULL, tool TEXT NOT NULL,
 args_json TEXT NOT NULL, operation INTEGER NOT NULL DEFAULT 0, last_outcome TEXT,
 created_at INTEGER NOT NULL, PRIMARY KEY(kind,target_id)
);
ALTER TABLE campaign_revisions ADD COLUMN authorized_by_agent_id TEXT;
ALTER TABLE campaign_revisions ADD COLUMN agent_sponsor_id TEXT;
ALTER TABLE campaign_revisions ADD COLUMN agent_approvers_json TEXT;
