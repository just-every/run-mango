-- A whole account export moved in as one reviewed archive. The original archive is
-- kept as import custody (base64 chunks) with an immutable list of every entry and
-- its SHA-256. Imported history and draft starters are records of their own; the
-- audience goes through the ordinary reviewed contact import.
CREATE TABLE move_in_archives (
  id TEXT PRIMARY KEY NOT NULL,
  principal_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  size INTEGER NOT NULL,
  consent_digest TEXT NOT NULL,
  consent_json TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('applying','applied','undoing','undone')),
  audience_plan TEXT,
  audience_stream TEXT,
  summary_json TEXT NOT NULL,
  content_total INTEGER NOT NULL,
  content_done INTEGER NOT NULL DEFAULT 0,
  undo_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  applied_at INTEGER,
  undone_at INTEGER
);
--> statement-breakpoint
-- One live application per archive and consent: repeating it changes nothing.
CREATE UNIQUE INDEX move_in_archives_live_idx ON move_in_archives(sha256, consent_digest) WHERE state IN ('applying','applied','undoing');
--> statement-breakpoint
CREATE TABLE move_in_archive_entries (
  archive_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  path TEXT NOT NULL,
  size INTEGER NOT NULL,
  compressed_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  part TEXT NOT NULL,
  disposition TEXT NOT NULL,
  PRIMARY KEY (archive_id, ordinal)
);
--> statement-breakpoint
CREATE TRIGGER move_in_archive_entries_immutable_update BEFORE UPDATE ON move_in_archive_entries BEGIN SELECT RAISE(ABORT,'ARCHIVE_ENTRY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER move_in_archive_entries_immutable_delete BEFORE DELETE ON move_in_archive_entries BEGIN SELECT RAISE(ABORT,'ARCHIVE_ENTRY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TABLE move_in_archive_chunks (
  archive_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  base64 TEXT NOT NULL,
  PRIMARY KEY (archive_id, ordinal)
);
--> statement-breakpoint
CREATE TABLE move_in_content (
  id TEXT PRIMARY KEY NOT NULL,
  archive_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('history','draft')),
  source_path TEXT NOT NULL,
  source_row INTEGER,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at_source TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT NOT NULL,
  removed_json TEXT NOT NULL,
  flagged_json TEXT NOT NULL,
  merge_tags_json TEXT NOT NULL,
  campaign_id TEXT,
  revision_id TEXT,
  revision_updated_at INTEGER,
  state TEXT NOT NULL CHECK(state IN ('imported','removed','kept')),
  outcome TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX move_in_content_ordinal_idx ON move_in_content(archive_id, ordinal);
