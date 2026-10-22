ALTER TABLE woocommerce_connection ADD COLUMN plugin_enabled INTEGER NOT NULL DEFAULT 0 CHECK(plugin_enabled IN (0,1));
CREATE TABLE woocommerce_flows (
  id TEXT PRIMARY KEY NOT NULL,
  connection_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('draft','live','paused')),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  activated_by TEXT,
  activated_at INTEGER
);
CREATE TABLE woocommerce_flow_enrollments (
  id TEXT PRIMARY KEY NOT NULL,
  revision_id TEXT NOT NULL REFERENCES woocommerce_flows(id),
  event_id TEXT NOT NULL,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  source_record_id TEXT NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  current_node TEXT NOT NULL,
  state TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  completed_at INTEGER,
  UNIQUE(revision_id,event_id)
);
