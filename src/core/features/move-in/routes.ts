import { Hono, type Context } from 'hono';
import type { AuthVariables } from '@/core/features/auth/routes';
import type { Platform } from '@/core/shared/platform';
import { audienceImportContext } from '@/core/features/audience/import-service';
import { sharedAudienceImport } from '@/core/features/audience/import-authority';
import { importConflict } from '@/core/features/audience/import-conflict';
import { readD1ImportStream } from '@/vendor/base/import-kit/src/d1/index';
import { archiveLimits } from './archive-limits';
import { normalizeConsent } from './archive-review';
import { ArchiveReviewStale, createArchiveService, type ArchiveRecord } from './archive-service';
import { archiveReport } from './archive-report';
import { copyHistory } from './archive-drafts';
import { ArchiveRefused } from './zip-reader';

type RouteContext = Context<{ Variables: AuthVariables }>;
const megabytes = (bytes: number) => `${Math.round(bytes / 104857.6) / 10} MB`;
const tooLarge = (size?: number) => ({ error: 'archive_too_large', detail: `${size ? `This archive is ${megabytes(size)}. ` : ''}Mango reads an account export of up to ${megabytes(archiveLimits.archiveBytes)} in one go. Unzip it and import the audience CSV files individually under Import contacts, or export again with a shorter time frame and without the gallery.` });

/** The archive and its fields from a multipart upload, refusing an oversized body by its declared length without keeping it. */
async function upload(context: RouteContext) {
  const declared = Number(context.req.header('content-length') ?? 0);
  if (declared > archiveLimits.archiveBytes + 256 * 1024) {
    // Answer once the upload has arrived: a server that closes its connection
    // under an unread body resets the client, which can lose this plain message
    // before reading it. The body streams to nowhere; nothing is held.
    await context.req.raw.body?.pipeTo(new WritableStream());
    return { response: context.json(tooLarge(declared), 413) };
  }
  const form = await context.req.raw.formData().catch(() => null);
  const file = form?.get('archive');
  if (!form || !(file instanceof File)) return { response: context.json({ error: 'invalid_archive', detail: 'Choose a .zip account export.' }, 400) };
  if (file.size > archiveLimits.archiveBytes) return { response: context.json(tooLarge(file.size), 413) };
  let consent: unknown = {};
  try { consent = JSON.parse(String(form.get('consent') ?? '{}')); } catch { return { response: context.json({ error: 'invalid_archive', detail: 'Consent evidence could not be read.' }, 400) }; }
  return { name: file.name.slice(0, 200) || 'archive.zip', bytes: new Uint8Array(await file.arrayBuffer()), consent: normalizeConsent(consent), fingerprint: String(form.get('fingerprint') ?? '') };
}
function refused(context: RouteContext, error: unknown) {
  if (error instanceof ArchiveRefused) {
    if (error.code === 'archive-too-large' || error.code === 'retained-text-too-large') return context.json(tooLarge(), 413);
    return context.json({ error: 'archive_refused', code: error.code, detail: error.message, ...(error.entry ? { entry: error.entry } : {}) }, 400);
  }
  if (error instanceof ArchiveReviewStale) return context.json({ error: 'review_stale', detail: error.message }, 409);
  return context.json({ error: 'archive_failed', detail: error instanceof Error ? error.message : 'The archive could not be imported.' }, 400);
}

export function createMoveInRoutes(platform: Platform) {
  const routes = new Hono<{ Variables: AuthVariables }>();
  const service = createArchiveService(platform);
  const view = async (archive: ArchiveRecord, context: RouteContext) => {
    let audience: { state: string; checkpoint: number; total: number } | null = null;
    if (archive.audience_stream) {
      const authority = await audienceImportContext(platform, context.get('operator').id, context.req.raw);
      try {
        const job = await readD1ImportStream(archive.audience_stream, await sharedAudienceImport(archive.audience_stream, authority));
        audience = job ? { state: job.state, checkpoint: job.checkpoint, total: job.total } : null;
      } catch (error) {
        // Contact erasure withdraws the stream while retaining the reconciliation report.
        if (error instanceof Error && error.message === 'IMPORT_JOB_NOT_FOUND') return null;
        throw error;
      }
    }
    return { id: archive.id, name: archive.name, sha256: archive.sha256, size: archive.size, state: archive.state, createdAt: archive.created_at, appliedAt: archive.applied_at, undoneAt: archive.undone_at,
      summary: service.summary(archive), undo: archive.undo_json ? JSON.parse(archive.undo_json) : null, progress: { contentDone: archive.content_done, contentTotal: archive.content_total, audience } };
  };
  const read = (context: RouteContext) => service.read(context.req.param('id')!);

  routes.post('/audience/archive-preview', async context => {
    const input = await upload(context);
    if ('response' in input) return input.response;
    try { return context.json(await service.review(input.name, input.bytes, input.consent, context.get('operator').id, context.req.raw)); }
    catch (error) { return refused(context, error); }
  });
  routes.post('/audience/archives', async context => {
    const input = await upload(context);
    if ('response' in input) return input.response;
    if (!input.fingerprint) return context.json({ error: 'review_required', detail: 'Preview the archive before importing it.' }, 400);
    try {
      const result = await service.apply(input.name, input.bytes, input.consent, input.fingerprint, context.get('operator').id, context.req.raw);
      return context.json({ archive: await view(result.archive, context), repeated: result.repeated });
    } catch (error) { return refused(context, error); }
  });
  routes.get('/audience/archives', async context => context.json({ archives: (await Promise.all((await service.list()).map(archive => view(archive, context)))).filter(archive => archive !== null) }));
  routes.get('/audience/archives/:id', async context => {
    const archive = await read(context);
    if (!archive) return context.json({ error: 'not_found' }, 404);
    const visible = await view(archive, context);
    if (!visible) return context.json({ error: 'not_found' }, 404);
    return context.json({ archive: visible, entries: await service.entries(archive.id), content: await service.content(archive.id) });
  });
  for (const action of ['continue', 'undo'] as const) routes.post(`/audience/archives/:id/${action}`, async context => {
    try {
      const archive = await service[action](context.req.param('id'), context.get('operator').id, context.req.raw);
      return archive ? context.json({ archive: await view(archive, context) }) : context.json({ error: 'not_found' }, 404);
    } catch (error) { return context.json({ error: 'archive_conflict', ...importConflict(error, action) }, 409); }
  });
  routes.get('/audience/archives/:id/report', async context => {
    const archive = await read(context);
    if (!archive) return context.json({ error: 'not_found' }, 404);
    const report = await archiveReport(platform.database.$client, archive, await service.content(archive.id) as never);
    return new Response(report, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="move-in-${archive.id}.md"`, 'Cache-Control': 'no-store' } });
  });
  routes.get('/imported-history/:id', async context => {
    const record = await platform.database.$client.prepare("SELECT id,archive_id,kind,source_path,source_row,title,subject,sent_at_source,html,text,removed_json,flagged_json,merge_tags_json,state FROM move_in_content WHERE id=? AND kind='history'").bind(context.req.param('id')).first();
    return record ? context.json({ record }) : context.json({ error: 'not_found' }, 404);
  });
  routes.post('/imported-history/:id/copy', async context => {
    const draft = await copyHistory(platform, context.req.param('id'), context.get('operator').id);
    return draft ? context.json(draft, 201) : context.json({ error: 'not_found' }, 404);
  });
  return routes;
}
