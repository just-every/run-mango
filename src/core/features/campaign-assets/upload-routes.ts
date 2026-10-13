import { Hono } from 'hono';
import type { AuthVariables } from '@/core/features/auth/routes';
import { ulid } from '@/core/shared/ids';
import type { BlobStore } from '@/core/shared/platform';
import { completeImage, readImageHeader } from './image-header';
import { campaignAssetKey, campaignAssetLimits, mediaPath } from './limits';
import { recordCampaignAsset, type CampaignAsset } from './repository';

/** Where an image came from: the editor's Insert image, or a design import's cropped photo (DESIGN-004). */
const assetSources = ['upload', 'design-import'];
/** Room for the multipart boundary and part headers around one image. */
const multipartOverhead = 16_384;

/** Reads at most `limit` bytes; undefined when the body is longer. */
async function readCapped(body: ReadableStream<Uint8Array> | null, limit: number): Promise<Uint8Array<ArrayBuffer> | undefined> {
  if (!body) return new Uint8Array();
  const reader = body.getReader(), chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { await reader.cancel(); return undefined; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

/** The one `file` part of a multipart body, or a refusal. The client's declared type and name are ignored. */
async function uploadedFile(request: Request, body: Uint8Array<ArrayBuffer>) {
  let form: FormData;
  try { form = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('Content-Type') ?? '' }, body }).formData(); }
  catch { return { error: 'multipart_file_required' as const }; }
  const entries = [...form.entries()];
  const file = form.get('file');
  if (entries.length !== 1 || typeof file === 'string' || !file) return { error: 'multipart_file_required' as const };
  return { file };
}

async function hex(bytes: Uint8Array<ArrayBuffer>) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

const describe = (asset: CampaignAsset, publicBaseUrl: URL) => ({
  id: asset.id, sha256: asset.sha256, contentType: asset.contentType, bytes: asset.bytes,
  width: asset.width, height: asset.height, url: new URL(mediaPath(asset.sha256), publicBaseUrl).toString(),
});

/** Operator upload of one campaign image as the single `file` part of a multipart/form-data body
 * (CAMP-012); `?source=design-import` records an image cut from an imported design. The type comes from the file's own header, never from the client; the file must be
 * complete. Nothing is repaired, and a refusal stores nothing. */
export function createCampaignAssetRoutes(db: D1Database, blobs: BlobStore, publicBaseUrl: URL) {
  const routes = new Hono<{ Variables: AuthVariables }>();
  routes.post('/campaign-assets', async context => {
    const source = context.req.query('source') ?? 'upload';
    if (!assetSources.includes(source)) return context.json({ error: 'invalid_source' }, 400);
    const declared = (context.req.header('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
    if (declared !== 'multipart/form-data') return context.json({ error: 'multipart_file_required' }, 415);
    const limit = campaignAssetLimits.maxBytes + multipartOverhead;
    if (Number(context.req.header('Content-Length') ?? 0) > limit) return context.json({ error: 'payload_too_large' }, 413);
    const body = await readCapped(context.req.raw.body, limit);
    if (!body) return context.json({ error: 'payload_too_large' }, 413);
    const part = await uploadedFile(context.req.raw, body);
    if ('error' in part) return context.json({ error: part.error }, 400);
    if (part.file.size > campaignAssetLimits.maxBytes) return context.json({ error: 'payload_too_large' }, 413);
    const bytes = new Uint8Array(await part.file.arrayBuffer());
    if (!bytes.byteLength) return context.json({ error: 'empty_upload' }, 400);
    const header = readImageHeader(bytes);
    if (!header || !campaignAssetLimits.contentTypes.includes(header.contentType)) return context.json({ error: 'unsupported_media_type' }, 415);
    const max = campaignAssetLimits.maxPixelsPerSide;
    if (header.width < 1 || header.height < 1 || header.width > max || header.height > max) return context.json({ error: 'invalid_dimensions' }, 422);
    if (!completeImage(bytes, header.contentType)) return context.json({ error: 'truncated_image' }, 400);
    const sha256 = await hex(bytes), key = campaignAssetKey(sha256);
    // The key is the content hash: an existing object already holds exactly these bytes.
    if (!await blobs.head(key)) await blobs.put(key, bytes, { httpMetadata: { contentType: header.contentType } });
    const { asset, created } = await recordCampaignAsset(db, {
      id: ulid(), sha256, ...header, bytes: bytes.byteLength, source, createdBy: context.get('operator').id, createdAt: Date.now(),
    });
    return context.json({ asset: describe(asset, publicBaseUrl) }, created ? 201 : 200);
  });
  return routes;
}
