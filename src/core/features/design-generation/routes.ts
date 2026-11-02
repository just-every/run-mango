import {saveWork} from '../agent-door/custody';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { readJson, readParams } from '@/core/api/input';
import type { AuthVariables } from '@/core/features/auth/routes';
import { ulid } from '@/core/shared/ids';
import type { Platform } from '@/core/shared/platform';
import { designCommand } from './advance';
import { briefWithoutTokens, candidateSlots, maxBriefCharacters, maxCandidates, minCandidates, workingStates, type DesignGenerationStatus, type DesignJobView } from './model';
import { createDesignRepository, designCandidateKey, designLayoutKey, type DesignJob } from './repository';

/** A run that has not settled this long after it started (or after a candidate was chosen) fails visibly. */
export const designDeadlineMs = 15 * 60_000;

const campaign = z.object({ id: z.string().min(1).max(128) });
const job = z.object({ id: z.string().min(1).max(128) });
const candidate = z.object({ id: z.string().min(1).max(128), slot: z.enum(candidateSlots) });
const start = z.object({ brief: z.string().max(maxBriefCharacters), candidates: z.number().int().min(minCandidates).max(maxCandidates) }).strict();
const choose = z.object({ slot: z.enum(candidateSlots) }).strict();
const close = z.object({ outcome: z.enum(['applied', 'discarded']) }).strict();

/** Operator routes of in-composer design generation (DESIGN-001 to DESIGN-003), mounted under /api behind the session
 * and same-origin checks. They start, show, steer and close a run; they never save, approve, schedule or send. */
export function createDesignGenerationRoutes(db: D1Database, platform: Platform) {
  const routes = new Hono<{ Variables: AuthVariables }>();
  const repository = createDesignRepository(db);
  const module = platform.config.modules.design;
  const unavailable = (context: Context) => context.json({ error: 'design_unavailable', detail: module.enabled ? 'The design adapter is not composed.' : module.detail }, 409);

  const view = async (record: DesignJob): Promise<DesignJobView> => ({
    id: record.id, campaignId: record.campaignId, state: record.state, brief: record.brief, candidateCount: record.candidateCount,
    ...(record.chosenSlot ? { chosenSlot: record.chosenSlot } : {}), ...(record.errorCode ? { errorCode: record.errorCode } : {}),
    createdAt: record.createdAt, updatedAt: record.updatedAt, deadlineAt: record.deadlineAt,
    // Until 12ui answers again: past the retry time Mango is asking, so the editor keeps saying it waits on 12ui
    // instead of flipping back to ordinary progress while that request is still unanswered.
    ...(record.waitCode && record.retryAt && workingStates.includes(record.state) ? { waiting: { reason: record.waitCode, retryAt: record.retryAt } } : {}),
    candidates: (await repository.candidates(record.id)).map(item => item.state === 'succeeded'
      ? { slot: item.slot, state: item.state, imageUrl: `/api/design-jobs/${record.id}/candidates/${item.slot}/image`, width: item.width!, height: item.height!, bytes: item.bytes! }
      : { slot: item.slot, state: item.state }),
    ...(record.layerdocSha256 ? { layerDocUrl: `/api/design-jobs/${record.id}/layerdoc` } : {}),
  });

  routes.get('/campaigns/:id/design-jobs', async context => {
    const params = readParams(context, campaign);
    if ('error' in params) return params.error;
    context.header('Cache-Control', 'no-store');
    if (!module.enabled || !platform.design) return context.json({ enabled: false, detail: module.enabled ? undefined : module.detail } satisfies DesignGenerationStatus);
    // Reading a draft settles any of its runs that outlived their deadline, with or without a cron.
    await repository.failStale(Date.now(), params.data.id);
    const latest = await repository.latest(params.data.id);
    const earlier = latest ? await Promise.all((await repository.onOffer(params.data.id, latest.id)).map(view)) : [];
    return context.json({ enabled: true, ...(latest ? { job: await view(latest) } : {}), earlier } satisfies DesignGenerationStatus);
  });

  routes.post('/campaigns/:id/design-jobs', async context => {
    const params = readParams(context, campaign);
    if ('error' in params) return params.error;
    const body = await readJson(context, start);
    if ('error' in body) return body.error;
    if (!platform.design) return unavailable(context);
    const state = await repository.campaignState(params.data.id);
    if (!state) return context.json({ error: 'not_found' }, 404);
    if (state !== 'draft') return context.json({ error: 'campaign_not_draft' }, 409);
    const brief = briefWithoutTokens(body.data.brief);
    if (!brief) return context.json({ error: 'invalid_request', detail: 'Describe the email in the brief.' }, 400);
    const now = Date.now(), id = ulid(now);
    await repository.failStale(now, params.data.id);
    const created = await repository.create({ id, campaignId: params.data.id, provider: platform.design.provider, brief, candidateCount: body.data.candidates,
      deadlineAt: now + designDeadlineMs, createdBy: context.get('operator').id, createdAt: now });
    if (!created) return context.json({ error: 'design_job_active', detail: 'A design for this draft is still being made.' }, 409);
    await saveWork(db,'design',id,'mango.designs.advance',{});
    await platform.jobs.enqueue(designCommand('design.draft', id));
    return context.json({ job: await view((await repository.get(id))!) }, 201);
  });

  routes.post('/design-jobs/:id/choose', async context => {
    const params = readParams(context, job);
    if ('error' in params) return params.error;
    const body = await readJson(context, choose);
    if ('error' in body) return body.error;
    if (!platform.design) return unavailable(context);
    const record = await repository.get(params.data.id);
    if (!record) return context.json({ error: 'not_found' }, 404);
    const chosen = (await repository.candidates(record.id)).find(item => item.slot === body.data.slot && item.state === 'succeeded');
    if (!chosen) return context.json({ error: 'candidate_unavailable' }, 409);
    if (await repository.campaignState(record.campaignId) !== 'draft') return context.json({ error: 'campaign_not_draft' }, 409);
    // A failed run keeps its landed designs on offer: choosing again (the same design or another) after a failure is a
    // new layout round with its own purchase key; choosing among a working run's prepared layouts reuses their keys.
    const choosable = ['choosing', 'ready', 'failed'] as const;
    if (!(choosable as readonly string[]).includes(record.state)) return context.json({ error: 'design_job_state', detail: 'This design is not waiting for a choice.' }, 409);
    const now = Date.now();
    const moved = await repository.update(record.id, [record.state], { state: 'preparing', chosenSlot: chosen.slot, providerLayoutId: null, layerdocSha256: null,
      errorCode: null, attempts: 0, waitCode: null, retryAt: null, deadlineAt: now + designDeadlineMs, layoutRound: record.layoutRound + (record.state === 'failed' ? 1 : 0) }, now);
    if (!moved) return context.json({ error: 'design_job_state', detail: 'This design is not waiting for a choice.' }, 409);
    await saveWork(db,'design',record.id,'mango.designs.advance',{});
    await platform.jobs.enqueue(designCommand('design.layout', record.id));
    return context.json({ job: await view((await repository.get(record.id))!) });
  });

  routes.post('/design-jobs/:id/close', async context => {
    const params = readParams(context, job);
    if ('error' in params) return params.error;
    const body = await readJson(context, close);
    if ('error' in body) return body.error;
    const from = body.data.outcome === 'applied' ? ['ready'] as const : ['drafting', 'choosing', 'preparing', 'ready', 'failed'] as const;
    const record = await repository.get(params.data.id);
    if (!record) return context.json({ error: 'not_found' }, 404);
    if (!await repository.update(record.id, from, { state: body.data.outcome }, Date.now())) return context.json({ error: 'design_job_state' }, 409);
    return context.json({ job: await view((await repository.get(record.id))!) });
  });

  routes.get('/design-jobs/:id/candidates/:slot/image', async context => {
    const params = readParams(context, candidate);
    if ('error' in params) return params.error;
    const stored = (await repository.candidates(params.data.id)).find(item => item.slot === params.data.slot && item.state === 'succeeded');
    const object = stored ? await platform.blobs.get(designCandidateKey(params.data.id, params.data.slot)) : null;
    if (!object) return context.json({ error: 'not_found' }, 404);
    return new Response((object as R2ObjectBody).body, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
  });

  routes.get('/design-jobs/:id/layerdoc', async context => {
    const params = readParams(context, job);
    if ('error' in params) return params.error;
    const record = await repository.get(params.data.id);
    const object = record?.layerdocSha256 ? await platform.blobs.get(designLayoutKey(record.id)) : null;
    if (!object) return context.json({ error: 'not_found' }, 404);
    return new Response((object as R2ObjectBody).body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  });

  return routes;
}
