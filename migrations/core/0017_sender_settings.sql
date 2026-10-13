CREATE TABLE sender_settings (
  id TEXT PRIMARY KEY NOT NULL CHECK (id = 'business'),
  display_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to_email TEXT NOT NULL,
  physical_address TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
