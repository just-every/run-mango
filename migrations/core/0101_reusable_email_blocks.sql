CREATE TABLE reusable_email_blocks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  block_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
  edit_token TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE reusable_email_block_placements (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES reusable_email_blocks(id),
  target_kind TEXT NOT NULL CHECK(target_kind IN ('campaign','template','flow')),
  target_id TEXT NOT NULL,
  node_id TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL CHECK(position >= 0),
  block_json TEXT NOT NULL,
  replacement_revision_id TEXT,
  UNIQUE(target_kind,target_id,node_id,position)
);
CREATE INDEX reusable_email_block_placements_block ON reusable_email_block_placements(block_id);
