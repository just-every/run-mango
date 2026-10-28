-- Native execution leases are server-created after the shared door's decision.
-- They are not sessions and cannot authenticate a browser or a bearer request.
CREATE TABLE mango_agent_executions (
  id TEXT PRIMARY KEY, sponsor_id TEXT NOT NULL, sponsor_version INTEGER NOT NULL,
  expires_at INTEGER NOT NULL, policy_state TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('running','finished'))
);
CREATE TABLE mango_agent_custody (
  kind TEXT NOT NULL, target_id TEXT NOT NULL, principal_json TEXT NOT NULL,
  prepared_by_json TEXT NOT NULL, approvers_json TEXT NOT NULL, created_at INTEGER NOT NULL,
  PRIMARY KEY(kind,target_id)
);
CREATE TABLE mango_agent_operations (
  id TEXT PRIMARY KEY, tool TEXT NOT NULL, target_uri TEXT NOT NULL,
  agent_id TEXT NOT NULL, sponsor_id TEXT NOT NULL, attribution_json TEXT NOT NULL,
  result_json TEXT NOT NULL, created_at INTEGER NOT NULL
);
