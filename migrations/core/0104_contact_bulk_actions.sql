-- CONT-022: one durable job per bulk action. Items hold contact identifiers only, never a name
-- or address, so a receipt stays readable after any member is erased under CONT-013.
CREATE TABLE contact_bulk_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('tag','untag','export','suppress','erase','add-to-topic')),
  params_json TEXT NOT NULL DEFAULT '{}',
  filter_fields_json TEXT NOT NULL DEFAULT '[]',
  state TEXT NOT NULL CHECK(state IN ('preparing','running','complete','failed')),
  total INTEGER NOT NULL,
  erased_count INTEGER NOT NULL DEFAULT 0,
  erasure_reference TEXT,
  error TEXT,
  actor_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE TABLE contact_bulk_items (
  job_id TEXT NOT NULL REFERENCES contact_bulk_jobs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  contact_id TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'pending' CHECK(outcome IN ('pending','done','refused')),
  reason TEXT,
  PRIMARY KEY(job_id,position)
);
CREATE INDEX contact_bulk_items_pending ON contact_bulk_items(job_id,outcome,position);
CREATE INDEX contact_bulk_items_contact ON contact_bulk_items(contact_id);
-- A topic membership always names the confirmed consent evidence that covers it.
CREATE TABLE contact_topic_memberships (
  contact_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  channel TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY(contact_id,topic)
);
