CREATE TABLE signup_settings (
  id TEXT PRIMARY KEY CHECK (id = 'newsletter'),
  frequency_disclosure TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
