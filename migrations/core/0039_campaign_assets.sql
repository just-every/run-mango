-- Campaign images (CAMP-012). Each image is stored once in R2 under its SHA-256
-- (campaign-assets/<sha256>) and served publicly at /media/<sha256>. A row and its
-- bytes never change and are never deleted, so an approved letter's images cannot
-- change under it; only contact erasure removes bytes that hold an erased identifier. The row holds no contact data.
CREATE TABLE campaign_assets (
  id TEXT PRIMARY KEY NOT NULL,
  sha256 TEXT NOT NULL UNIQUE CHECK(length(sha256) = 64 AND sha256 NOT GLOB '*[^0-9a-f]*'),
  content_type TEXT NOT NULL CHECK(content_type IN ('image/jpeg','image/png','image/gif','image/webp')),
  bytes INTEGER NOT NULL CHECK(bytes > 0),
  width INTEGER NOT NULL CHECK(width > 0),
  height INTEGER NOT NULL CHECK(height > 0),
  source TEXT NOT NULL CHECK(source IN ('upload','design-import')),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER campaign_assets_immutable_update BEFORE UPDATE ON campaign_assets BEGIN SELECT RAISE(ABORT,'CAMPAIGN_ASSET_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER campaign_assets_immutable_delete BEFORE DELETE ON campaign_assets BEGIN SELECT RAISE(ABORT,'CAMPAIGN_ASSET_IMMUTABLE'); END;
