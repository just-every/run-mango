import type { BlobStore, LinkInspection } from '@/core/shared/platform';
import { campaignAssetKey, parseMediaName } from './limits';
import { findCampaignAsset } from './repository';

/** The media name when `value` is exactly this deployment's own /media/<sha256>[.<ext>] URL. */
export function ownMediaName(value: string, publicBaseUrl: URL) {
  let url: URL;
  try { url = new URL(value); } catch { return undefined; }
  if (url.origin !== publicBaseUrl.origin || url.search || url.hash) return undefined;
  const segment = /^\/media\/([^/]+)$/.exec(url.pathname)?.[1];
  return segment ? parseMediaName(segment) : undefined;
}

/** Approval's check of Mango's own image (MSG-006 policy): the record and its immutable bytes
 * are read from D1 and R2 directly instead of the Worker fetching its own hostname. */
export async function inspectOwnMedia(db: D1Database, blobs: BlobStore, name: NonNullable<ReturnType<typeof parseMediaName>>): Promise<LinkInspection> {
  const { sha256 } = name;
  const asset = await findCampaignAsset(db, sha256);
  if (!asset || !name.matches(asset.contentType)) return { ok: false, detail: 'This deployment holds no campaign image with that address.' };
  const object = await blobs.head(campaignAssetKey(sha256));
  if (!object || object.size !== asset.bytes) return { ok: false, detail: 'The campaign image record exists but its stored bytes are missing.' };
  return { ok: true, detail: 'Campaign image stored by this deployment.' };
}
