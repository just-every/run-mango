-- Import attempts are durable so continuation never fetches an image twice.
CREATE TABLE move_in_image_attempts (
  archive_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','rehosted','failed')),
  media_url TEXT,
  reason TEXT NOT NULL,
  PRIMARY KEY(archive_id,source_url)
);

-- Expand provenance without changing existing asset identities, bytes or timestamps.
CREATE TABLE campaign_assets_import (
  id TEXT PRIMARY KEY NOT NULL,
  sha256 TEXT NOT NULL UNIQUE CHECK(length(sha256) = 64 AND sha256 NOT GLOB '*[^0-9a-f]*'),
  content_type TEXT NOT NULL CHECK(content_type IN ('image/jpeg','image/png','image/gif','image/webp')),
  bytes INTEGER NOT NULL CHECK(bytes > 0),
  width INTEGER NOT NULL CHECK(width > 0),
  height INTEGER NOT NULL CHECK(height > 0),
  source TEXT NOT NULL CHECK(source IN ('upload','design-import','incumbent-import')),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

INSERT INTO campaign_assets_import SELECT * FROM campaign_assets;
DROP TABLE campaign_assets;
ALTER TABLE campaign_assets_import RENAME TO campaign_assets;
--> statement-breakpoint
CREATE TRIGGER campaign_assets_immutable_update BEFORE UPDATE ON campaign_assets BEGIN SELECT RAISE(ABORT,'CAMPAIGN_ASSET_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER campaign_assets_immutable_delete BEFORE DELETE ON campaign_assets BEGIN SELECT RAISE(ABORT,'CAMPAIGN_ASSET_IMMUTABLE'); END;
