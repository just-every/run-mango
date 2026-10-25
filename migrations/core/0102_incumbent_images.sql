-- Import attempts are durable so continuation never fetches an image twice.
CREATE TABLE move_in_image_attempts (
  archive_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','rehosted','failed')),
  media_url TEXT,
  reason TEXT NOT NULL,
  PRIMARY KEY(archive_id,source_url)
);

-- Keep the restore engine's proven CHECK-only rebuild shape and every rowid.
CREATE TABLE mango_asset_source_expansion AS SELECT rowid AS retained_rowid,* FROM campaign_assets;
DROP TABLE campaign_assets;
CREATE TABLE campaign_assets (
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

INSERT INTO campaign_assets (rowid,id,sha256,content_type,bytes,width,height,source,created_by,created_at) SELECT retained_rowid,id,sha256,content_type,bytes,width,height,source,created_by,created_at FROM mango_asset_source_expansion;
DROP TABLE mango_asset_source_expansion;
--> statement-breakpoint
CREATE TRIGGER campaign_assets_immutable_update BEFORE UPDATE ON campaign_assets BEGIN SELECT RAISE(ABORT,'CAMPAIGN_ASSET_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER campaign_assets_immutable_delete BEFORE DELETE ON campaign_assets BEGIN SELECT RAISE(ABORT,'CAMPAIGN_ASSET_IMMUTABLE'); END;

-- Recovery: stop writers and restore the matching pre-upgrade D1/R2 backup
-- through rer import into an empty deployment. Never delete or rewrite stored
-- campaign image objects to roll back this metadata expansion.
