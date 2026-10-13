import type { ImageHeader } from './image-header';

export type CampaignAsset = ImageHeader & { id: string; sha256: string; bytes: number; source: string; createdBy: string; createdAt: number };

const columns = 'id,sha256,content_type AS contentType,bytes,width,height,source,created_by AS createdBy,created_at AS createdAt';

export function findCampaignAsset(db: D1Database, sha256: string) {
  return db.prepare(`SELECT ${columns} FROM campaign_assets WHERE sha256=?`).bind(sha256).first<CampaignAsset>();
}

/** Inserts the record once per content hash; a repeat upload keeps the first record. */
export async function recordCampaignAsset(db: D1Database, asset: CampaignAsset) {
  const inserted = await db.prepare(`INSERT INTO campaign_assets (id,sha256,content_type,bytes,width,height,source,created_by,created_at)
    VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(sha256) DO NOTHING`)
    .bind(asset.id, asset.sha256, asset.contentType, asset.bytes, asset.width, asset.height, asset.source, asset.createdBy, asset.createdAt).run();
  const stored = await findCampaignAsset(db, asset.sha256);
  if (!stored) throw new Error('Campaign asset record was not stored.');
  return { asset: stored, created: inserted.meta.changes > 0 };
}

/** One atomic per-asset counter in the database clock's current minute; false once the
 * allowance is spent. It keeps a count only: nothing about who asked. */
export async function takeMediaAllowance(db: D1Database, sha256: string, limit: number) {
  const reserved = await db.prepare(`INSERT INTO oa_limits(key,window,count) VALUES(?,CAST(strftime('%s','now') AS INTEGER)/60,1)
    ON CONFLICT(key) DO UPDATE SET window=excluded.window,
      count=CASE WHEN oa_limits.window=excluded.window THEN oa_limits.count+1 ELSE 1 END
    WHERE oa_limits.window<excluded.window OR (oa_limits.window=excluded.window AND oa_limits.count<?)
    RETURNING count`).bind(`media:${sha256}`, limit).first<{ count: number }>();
  return Boolean(reserved);
}
