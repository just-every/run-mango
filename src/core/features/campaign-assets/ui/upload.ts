/** Browser upload of one campaign image through the campaign image door (CAMP-012). The server sniffs,
 * measures and hashes the file; the browser's own type and name are never trusted. */
import { campaignAssetLimits } from '../limits';

export type UploadedAsset = { sha256: string; url: string; contentType: string; bytes: number; width: number; height: number };
export type AssetSource = 'upload' | 'design-import';

const refusals: Record<string, string> = {
  payload_too_large: `it is larger than ${campaignAssetLimits.maxBytes / 1_048_576} MB`,
  unsupported_media_type: 'it is not a PNG, JPEG, GIF or WebP image',
  truncated_image: 'the file is incomplete',
  invalid_dimensions: `it is more than ${campaignAssetLimits.maxPixelsPerSide} pixels on a side`,
  empty_upload: 'the file is empty',
};

export class CampaignImageUploadError extends Error {}

export async function uploadCampaignImage(file: Blob, name: string, source: AssetSource = 'upload'): Promise<UploadedAsset> {
  const body = new FormData();
  body.append('file', file, name);
  const response = await fetch(`/api/campaign-assets${source === 'upload' ? '' : `?source=${source}`}`, { method: 'POST', body, headers: { Accept: 'application/json' } });
  if (response.status === 401) window.dispatchEvent(new Event('mango-session-lost'));
  const data = await response.json().catch(() => ({})) as { asset?: UploadedAsset; error?: string };
  if (response.ok && data.asset) return data.asset;
  const reason = data.error && refusals[data.error];
  throw new CampaignImageUploadError(reason ? `Mango did not store the image "${name}": ${reason}.` : `Mango did not store the image "${name}" (HTTP ${response.status}${data.error ? `, ${data.error}` : ''}).`);
}
