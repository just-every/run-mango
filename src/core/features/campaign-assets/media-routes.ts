import { Hono, type Context } from 'hono';
import type { BlobStore } from '@/core/shared/platform';
import { campaignAssetKey, campaignAssetLimits, parseMediaName } from './limits';
import { findCampaignAsset, takeMediaAllowance } from './repository';

const notFound = (context: Context) => context.json({ error: 'not_found' }, 404);

/** Public, sessionless campaign images (CAMP-012, BASE-ACCESS-003). Every recipient gets the
 * same URL and the route records nothing about the requester, so a fetch identifies no one.
 * The rate-limit key is the asset, not the client address, because mailbox image proxies
 * fetch for many recipients from few addresses. */
export function createMediaRoutes(db: D1Database, blobs: BlobStore) {
  const routes = new Hono();
  routes.on(['GET', 'HEAD'], '/media/:name', async context => {
    const name = parseMediaName(context.req.param('name'));
    if (!name) return notFound(context);
    const { sha256 } = name;
    // Unknown names cost one read and write nothing.
    const asset = await findCampaignAsset(db, sha256);
    if (!asset || !name.matches(asset.contentType)) return notFound(context);
    if (!await takeMediaAllowance(db, sha256, campaignAssetLimits.mediaRequestsPerMinutePerAsset)) {
      context.header('Retry-After', '60');
      return context.json({ error: 'rate_limited' }, 429);
    }
    const head = context.req.method === 'HEAD';
    const object = head ? await blobs.head(campaignAssetKey(sha256)) : await blobs.get(campaignAssetKey(sha256));
    // The record stays when its bytes are gone: contact erasure (CONT-013) deletes any stored
    // object holding an erased contact's identifier, and storage can be lost. Never a quiet 404.
    if (!object) return context.json({ error: 'asset_bytes_removed' }, 410);
    const headers = new Headers({
      'Content-Type': asset.contentType,
      'Content-Length': String(asset.bytes),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': `"${sha256}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Referrer-Policy': 'no-referrer',
    });
    return new Response(head ? null : (object as R2ObjectBody).body, { status: 200, headers });
  });
  return routes;
}
