-- The name a contact had in an imported file. An archive move-in leaves the name of a
-- contact that existed before it, so the exported name is kept here only.
ALTER TABLE audience_import_observations ADD COLUMN source_display_name TEXT;
