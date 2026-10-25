-- Import attempts are durable so continuation never fetches an image twice.
CREATE TABLE move_in_image_attempts (
  archive_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','rehosted','failed')),
  media_url TEXT,
  reason TEXT NOT NULL,
  PRIMARY KEY(archive_id,source_url)
);
