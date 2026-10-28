-- Additive: legacy profile JSON is retained byte-for-byte. Typed changes use the
-- existing contact ledger, so import undo, portability and erasure share custody.
CREATE TABLE contact_property_definitions (
  key TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('text','number','money','date','boolean','list')),
  options_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX contact_property_history ON contact_history(contact_id,kind,occurred_at,id);
