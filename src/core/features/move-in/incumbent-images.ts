import type { Platform } from '@/core/shared/platform';
import { ulid } from '@/core/shared/ids';
import { parseEmailHtml, type EmailNode } from '../campaigns/email-html-parse';
import { htmlToText } from '../campaigns/authoring-content';
import { completeImage, readImageHeader } from '../campaign-assets/image-header';
import { campaignAssetLimits, campaignAssetKey, mediaPath } from '../campaign-assets/limits';
import { recordCampaignAsset } from '../campaign-assets/repository';
import { readInspectedImage } from '@/core/platform/link-inspector';
import { sha256Hex, type ArchiveEntry } from './zip-reader';
import type { ContentRecord } from './archive-content';

const hosts = ['mcusercontent.com', '*.mcusercontent.com', 'gallery.mailchimp.com'];
export function incumbentImage(value: string) {
  try { const url = new URL(value); return url.hostname === 'mcusercontent.com' || url.hostname.endsWith('.mcusercontent.com') || url.hostname === 'gallery.mailchimp.com'; } catch { return false; }
}
export function incumbentImages(html: string) {
  const sources: string[] = [];
  const walk = (nodes: EmailNode[]) => { for (const node of nodes) if (node.kind === 'element') {
    const src = node.tag === 'img' ? node.attributes.get('src') : undefined;
    if (src && incumbentImage(src)) sources.push(src);
    walk(node.children);
  } };
  walk(parseEmailHtml(html).nodes); return sources;
}
type Attempt = { state: string; media_url: string | null; reason: string };
/** Called only while applying an import. Preview, review and hand-off never read the network. */
export async function bringImagesHome(platform: Platform, archiveId: string, record: ContentRecord, operatorId: string, gallery: ArchiveEntry[] = []) {
  const db = platform.database.$client, reports: string[] = [];
  let html = record.html;
  for (const source of new Set(incumbentImages(html))) {
    let attempt = await db.prepare('SELECT state,media_url,reason FROM move_in_image_attempts WHERE archive_id=? AND source_url=?').bind(archiveId,source).first<Attempt>();
    if (!attempt) {
      const claimed = await db.prepare("INSERT INTO move_in_image_attempts(archive_id,source_url,state,reason) VALUES(?,?,'pending','Import interrupted before the image was stored; upload a replacement.') ON CONFLICT DO NOTHING RETURNING archive_id").bind(archiveId,source).first();
      if (!claimed) attempt = {state:'failed',media_url:null,reason:'Image import is already in progress; upload a replacement.'};
      else try {
        const filename = decodeURIComponent(new URL(source).pathname.split('/').at(-1)!);
        const candidates = gallery.filter(entry => entry.path.split('/').at(-1) === filename);
        // Duplicate file names agree only when their content hashes agree too.
        if (new Set(candidates.map(entry => entry.sha256)).size > 1) throw new Error('Gallery filename matches different contents; upload a replacement.');
        const candidate = candidates[0];
        if (candidate && !candidate.bytes) throw new Error('Gallery image exceeds the retained image limit.');
        const bytes = candidate?.bytes ?? await readInspectedImage(source,hosts,campaignAssetLimits.maxBytes);
        const sha256 = await sha256Hex(bytes);
        if (candidate && sha256 !== candidate.sha256) throw new Error('Gallery content hash does not match.');
        const header = readImageHeader(bytes), max = campaignAssetLimits.maxPixelsPerSide;
        if (!bytes.length || bytes.length > campaignAssetLimits.maxBytes) throw new Error('Image exceeds the byte limit or is empty.');
        if (!header || !campaignAssetLimits.contentTypes.includes(header.contentType)) throw new Error('Unsupported image type.');
        if (header.width < 1 || header.height < 1 || header.width > max || header.height > max) throw new Error('Image exceeds the pixel limits.');
        if (!completeImage(bytes,header.contentType)) throw new Error('Image is incomplete.');
        const key = campaignAssetKey(sha256);
        if (!await platform.blobs.head(key)) await platform.blobs.put(key,bytes,{httpMetadata:{contentType:header.contentType}});
        await recordCampaignAsset(db,{id:ulid(),sha256,...header,bytes:bytes.length,source:'incumbent-import',createdBy:operatorId,createdAt:Date.now()});
        attempt = {state:'rehosted',media_url:new URL(mediaPath(sha256),platform.config.publicBaseUrl).href,reason:candidate ? `Gallery ${candidate.path}; SHA-256 ${sha256}` : `Inspected network image; SHA-256 ${sha256}`};
      } catch (error) { attempt = {state:'failed',media_url:null,reason:error instanceof Error ? error.message : 'Image could not be imported.'}; }
      if (claimed) await db.prepare('UPDATE move_in_image_attempts SET state=?,media_url=?,reason=? WHERE archive_id=? AND source_url=?').bind(attempt!.state,attempt!.media_url,attempt!.reason,archiveId,source).run();
    }
    if (attempt!.state === 'rehosted' && attempt!.media_url) {
      // Imported content is canonical HTML: replace only the src value, leaving
      // alt, dimensions, link and every other byte of the body unchanged.
      const escaped = source.replaceAll('&','&amp;').replaceAll('"','&quot;');
      html = html.replace(/<img\b[^>]*>/g, tag => tag.replace(`src="${escaped}"`,`src="${attempt!.media_url}"`));
      reports.push(`Image re-hosted: ${source} → ${attempt!.media_url}; ${record.sourcePath}; ${attempt!.reason}`);
    } else reports.push(`Image failed: ${source}; ${record.sourcePath}; ${attempt!.reason} Upload a replacement in the builder.`);
  }
  return {...record,html,text:htmlToText(html),removed:[...record.removed,...reports]};
}
