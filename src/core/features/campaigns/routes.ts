import { CampaignExportLimitError } from './export';
import { hasPermission } from '@/core/features/auth/permissions';
import { campaignReportCsvResponse } from '@/core/features/insights/campaign-recipient-csv';
import { EmailTooLargeError } from './email-size';
import { createCampaignReuseRoutes } from './reuse-routes';
import type { createAuthoringService } from './authoring-service';
import { createDraftSchema } from './create-draft';
import { authoringAudienceSchema } from './authoring-audience';
import type { AuthVariables } from '@/core/features/auth/routes';
import { Hono } from 'hono';
import { z } from 'zod';

import { readJson, readParams } from '@/core/api/input';

import { UnsettledEmailBodyError } from './authoring-content';
import { campaignStates } from './result-model';
import { draftCompositionSchema } from './draft-composition';
import type { createCampaignService } from './service';

const identifier = z.object({ id: z.string().min(1) });
/** A body that never settles into a form that saves to itself is refused by name (CAMP-003); no such body is known. */
const settled = async <T,>(save: Promise<T>) => {
  try { return { saved: await save }; } catch (error) {
    if (error instanceof EmailTooLargeError) return {refused:{error:'email_too_large',detail:error.message,fields:{emailBody:error.message},size:error.size}};
    if (error instanceof UnsettledEmailBodyError) return { refused: { error: 'invalid_email_body', detail: error.message } };
    throw error;
  }
};

/** `mediaOrigin` is the deployment's own origin: campaign pages use it to recognise the draft's own images (CAMP-012). */
export function createCampaignRoutes(service: ReturnType<typeof createCampaignService>, authoring: ReturnType<typeof createAuthoringService>, mediaOrigin: string,
  refreshChecks: (campaignId: string, revisionId: string) => Promise<{kind: string}>) {
  const routes = new Hono<{Variables:AuthVariables}>();
  routes.route('/',createCampaignReuseRoutes(authoring.reuse));

  routes.get('/campaign-starters', async context => context.json(await authoring.starters()));
  routes.get('/campaign-authoring', context => context.json(authoring.defaults()));
  routes.post('/campaign-authoring/audience', async context => {
    const body = await readJson(context, authoringAudienceSchema);
    if ('error' in body) return body.error;
    return context.json(await authoring.audience(body.data));
  });
  routes.post('/campaign-authoring/email-size',async context=>{
    const body=await readJson(context,draftCompositionSchema);
    if('error' in body)return body.error;
    const result=await settled(authoring.emailSize(body.data));
    return 'refused' in result?context.json(result.refused,400):context.json(result.saved);
  });
  routes.post('/proposals/generate', async context => {
    const result = await authoring.generate(context.get('operator').id);
    return context.json(result, result.kind === 'proposed' ? 201 : 409);
  });
  routes.post('/proposals/:id/dismiss', async context => {
    const body=await readJson(context,z.object({reason:z.string().trim().min(1).max(4000)}).strict());
    if ('error' in body) return body.error;
    const dismissed=await authoring.dismiss(context.req.param('id'),context.get('operator').id,body.data.reason);
    return dismissed?context.json({kind:'dismissed'}):context.json({kind:'unavailable',detail:'Only a live proposed suggestion can be dismissed.'},409);
  });
  routes.post('/proposals/:id/adopt', async context => {
    const result = await authoring.adopt(context.req.param('id'), context.get('operator').id);
    return context.json(result, result.kind === 'not_found' ? 404 : result.kind === 'unavailable' ? 409 : 200);
  });
  routes.get('/decision-desk', async (context) => context.json(await service.decisionDesk()));
  routes.get('/proposals/:id', async (context) => {
    const parsed = readParams(context, identifier);
    if ('error' in parsed) return parsed.error;
    const detail = await service.proposalDetail(parsed.data.id);
    return detail ? context.json({ ...detail, mediaOrigin }) : context.json({ error: 'not_found' }, 404);
  });
  routes.post('/campaigns', async context => {
    const body = await readJson(context, createDraftSchema);
    if ('error' in body) return body.error;
    if (body.data.mode === 'store-signal') {
      const result = await authoring.fromSignal(body.data.starterSourceId,context.get('operator').id);
      return context.json(result,result.kind==='draft'?201:409);
    }
    const composition = body.data.mode === 'blank' ? { name: 'Untitled campaign' } : body.data.composition;
    const created = await settled(authoring.create(composition, context.get('operator').id));
    return 'refused' in created ? context.json(created.refused, 400) : context.json(created.saved, 201);
  });
  routes.get('/campaigns', async context => {
    const parsed = z.object({state:z.enum(campaignStates).optional(),channel:z.enum(['email','sms']).optional()}).safeParse(context.req.query());
    if (!parsed.success) return context.json({error:'invalid_campaign_filters'},400);
    const collection = await service.listCampaigns(parsed.data);
    if (parsed.data.channel === 'sms' && !collection.smsEnabled) return context.json({error:'sms_disabled'},400);
    return context.json(collection);
  });
  routes.get('/campaigns/export', async context => {
    if (!hasPermission(context.get('operator').role, 'audience.export')) return context.json({error:'role_forbidden'},403);
    try { return campaignReportCsvResponse(await service.exportCsv(), 'campaigns.csv'); }
    catch (error) {
      if (error instanceof CampaignExportLimitError) return context.json({error:'campaign_export_too_large',detail:error.message},422);
      throw error;
    }
  });
  routes.get('/campaigns/:id', async (context) => {
    const parsed = readParams(context, identifier);
    if ('error' in parsed) return parsed.error;
    const detail = await service.campaignDetail(parsed.data.id);
    return detail ? context.json({ ...detail, mediaOrigin }) : context.json({ error: 'not_found' }, 404);
  });
  routes.post('/campaigns/:id/edit-schedule',async context=>{
    const result=await service.editSchedule(context.req.param('id'),context.get('operator').id);
    return result?context.json(result,201):context.json({error:'not_found'},404);
  });
  routes.get('/campaigns/:id/review', async (context) => {
    const parsed = readParams(context, identifier);
    if ('error' in parsed) return parsed.error;
    const review = await service.review(parsed.data.id);
    return review ? context.json({ ...review, mediaOrigin }) : context.json({ error: 'not_found' }, 404);
  });
  routes.patch('/campaign-revisions/:id', async (context) => {
    const params = readParams(context, identifier);
    if ('error' in params) return params.error;
    const body = await readJson(context, draftCompositionSchema);
    if ('error' in body) return body.error;
    const started = performance.now();
    const update = await settled(service.updateDraft(params.data.id, body.data, context.req.query('review') === 'true', context.get('operator').id));
    const written = performance.now();
    context.header('Server-Timing', `draft_write;dur=${(written-started).toFixed(1)}`);
    if ('refused' in update) return context.json(update.refused, 400);
    const result = update.saved;
    if (result.kind === 'not_found') return context.json({ error: 'not_found' }, 404);
    if (result.kind === 'not_draft') return context.json({ error: 'revision_not_draft' }, 409);
    if (result.kind === 'stale_revision') return context.json({error:'stale_revision',detail:'This draft changed while saving. Reload it and review your changes before saving again.'},409);
    if (result.kind === 'written') {
      const revision = result.revision;
      // Checks must follow the guarded write; the canonical read must follow
      // checks. Keep that order in one request instead of three network trips.
      const checks = await refreshChecks(revision.campaignId, revision.id);
      const checked = performance.now();
      const review = await service.review(revision.campaignId);
      context.header('Server-Timing', `draft_write;dur=${(written-started).toFixed(1)}, draft_checks;dur=${(checked-written).toFixed(1)}, draft_read;dur=${(performance.now()-checked).toFixed(1)}`);
      return context.json({revision,
        checksRefreshed: checks.kind === 'preview', review: review ? {...review, mediaOrigin} : undefined});
    }
    return context.json({ revision: result.composition.revision, composition: result.composition });
  });
  routes.post('/campaigns/:id/approve', async (context) => {
    const parsed = readParams(context, identifier);
    if ('error' in parsed) return parsed.error;
    const result = await service.approvalBlockers(parsed.data.id);
    return result ? context.json(result, 409) : context.json({ error: 'not_found' }, 404);
  });
  routes.post('/campaigns/:id/test-send', async (context) => {
    const parsed = readParams(context, identifier);
    if ('error' in parsed) return parsed.error;
    const result = await service.testSendBlockers(parsed.data.id);
    return result ? context.json(result, 409) : context.json({ error: 'not_found' }, 404);
  });

  return routes;
}
