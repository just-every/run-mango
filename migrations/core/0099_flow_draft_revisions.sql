-- Inert visual flow revisions. They grant no enrolment or delivery authority.
CREATE TABLE flow_draft_revisions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  graph_json TEXT NOT NULL CHECK(json_valid(graph_json)),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
