CREATE TABLE newsletter_archive (
  id TEXT PRIMARY KEY NOT NULL,
  campaign_id TEXT NOT NULL,
  revision_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  published_at INTEGER NOT NULL
);
CREATE INDEX newsletter_archive_published ON newsletter_archive(published_at DESC, id);
