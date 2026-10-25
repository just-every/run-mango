-- Recipient choices use the existing contact history, including merge/erasure/export.
-- No profile field is enabled until an Owner or Admin explicitly chooses it.
CREATE TABLE recipient_preference_settings (
  id INTEGER PRIMARY KEY CHECK(id=1),
  fields_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(fields_json)),
  operator_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX contact_history_preference_kind ON contact_history(kind,contact_id,occurred_at);
-- Additive recovery: restore the matching pre-upgrade backup through the ordinary
-- empty-deployment import; never delete recipient consent history to undo a pause.
