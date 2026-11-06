const width = 1440;
import { openPage, reloadPage } from '../support/navigation';
import { localSessionCookieName } from '../support/local-session';
import { test, expect, request as requestClient, type Page, type APIRequestContext } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { authoredBody } from '../../src/core/features/campaigns/authoring-content';
import { parseEmailHtml } from '../../src/core/features/campaigns/email-html-parse';
import { authoringRuntime } from './browser-runtime.mjs';
import { png } from '../support/images';
import { startFakeTwelveUi } from '../support/fake-twelve-ui';

test.describe.configure({ mode: 'serial', timeout: 240000 });
test.use({ timezoneId: 'America/Los_Angeles' });

// 12ui is replaced only at the network edge: a local stand-in speaking its /api/v1, serving the real orchard LayerDoc
// and a synthetic candidate PNG of the LayerDoc's canvas size. No request ever reaches 12ui.
const layerDoc = readFileSync(new URL('./fixtures/orchard.layerdoc.json', import.meta.url), 'utf8');
const canvas = JSON.parse(layerDoc).canvas as { width: number; height: number };
const candidateImage = png(canvas.width, canvas.height, 9);
const designKey = 'test-design-key';
const publicOrigin = 'https://mango.example.test', destination = 'https://shop.example.test/season';

async function openDraft(runtime: Awaited<ReturnType<typeof authoringRuntime>>, page: Page, request: APIRequestContext, emailBody = '<p>An earlier draft.</p>') {
  const open = await request.post(runtime.url + '/_authoring/open', { headers: { 'X-Test-Token': runtime.token } });
  expect(open.status(), await open.text()).toBe(200);
  await page.context().addCookies([{ name: localSessionCookieName(runtime.url), value: (await open.json()).token, url: runtime.url }]);
  const api = page.context().request, headers = { Origin: runtime.url };
  const created = await (await api.post(runtime.url + '/api/campaigns', { headers, data: {} })).json();
  const seeded = await api.patch(`${runtime.url}/api/campaign-revisions/${created.revisionId}`, { headers, data: {
    name: 'Orchard letter', emailSubject: 'Good Things Are Ripening', preheader: 'Seasonal news from the orchard', emailBody,
    inclusionRuleJson: JSON.stringify({ version: 1, operator: 'all', predicates: [{ sourceType: 'contact', field: 'email', comparator: 'contains', value: '@example.test' }] }),
    steps: [{ channel: 'email', timezone: 'Australia/Brisbane', localScheduledAt: '2031-04-07T10:00', whyThisTime: 'Operator time' }] } });
  expect(seeded.status(), await seeded.text()).toBe(200);
  const read = async () => (await api.get(`${runtime.url}/api/campaigns/${created.campaignId}`)).json();
  return { api, headers, campaignId: created.campaignId as string, read };
}

/** The candidate's own control: "Use this design" beside its image. */
const useDesign = (run: ReturnType<Page['getByRole']>, page: Page, slot: string) =>
  run.getByRole('listitem').filter({ has: page.getByRole('img', { name: `Design ${slot}`, exact: true }) }).getByRole('button', { name: 'Use this design', exact: true });

const designRuntime = (origin: string) => authoringRuntime({ suite: 'design-generation', queueConsumers: true, vars: {
  MANGO_PUBLIC_BASE_URL: publicOrigin, AUTHORING_LINK_HOST: 'shop.example.test', DESIGN_PROVIDER_API_KEY: designKey, DESIGN_PROVIDER_ORIGIN: origin } });







export const walk0 = async ({ page, request }) => {
  const runtime = await authoringRuntime({ suite: 'design-generation', vars: { MANGO_PUBLIC_BASE_URL: publicOrigin } });
  try {
    const outbound: string[] = [];
    page.on('request', item => { if (!item.url().startsWith(runtime.url)) outbound.push(item.url()); });
    const { api, headers, campaignId } = await openDraft(runtime, page, request);
    await openPage(page, `${runtime.url}/app/campaigns/${campaignId}/review`);
    const status = await api.get(`${runtime.url}/api/campaigns/${campaignId}/design-jobs`);
    expect(status.ok()).toBe(true);
    expect((await status.json()).enabled).toBe(false);
    await expect(page.getByRole('button', { name: 'Import 12ui design', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Design with 12ui' })).toHaveCount(0);
    const refused = await api.post(`${runtime.url}/api/campaigns/${campaignId}/design-jobs`, { headers, data: { brief: 'A seasonal letter', candidates: 2 } });
    expect(refused.status()).toBe(409);
    expect(await refused.json()).toMatchObject({ error: 'design_unavailable', detail: expect.stringContaining('DESIGN_PROVIDER_API_KEY') });
    expect(await runtime.sql('SELECT count(*) AS n FROM design_jobs')).toEqual([{ n: 0 }]);
    expect(outbound).toEqual([]);
  } finally { await runtime.close(); }
};
export const walk1 = async ({ page, request }, testInfo) => {
  const fake = await startFakeTwelveUi({ key: designKey, candidateImage, layerDoc, drawMs: { a: 0, b: 15000 }, layoutMs: 12000 });
  const runtime = await designRuntime(fake.origin);
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const outbound: string[] = [], saves: string[] = [];
    page.on('request', item => {
      if (!item.url().startsWith(runtime.url)) outbound.push(item.url());
      if (item.method() === 'PATCH' && item.url().includes('/api/campaign-revisions/')) saves.push(item.url());
    });
    const { api, headers, campaignId, read } = await openDraft(runtime, page, request);
    const review = `${runtime.url}/app/campaigns/${campaignId}/review`;
    await openPage(page, review);
    const body = page.getByLabel('Email body', { exact: true });
    await expect(body).toBeVisible();
    const savedBody = (await read()).revision.emailBody;

    await page.getByRole('button', { name: 'Design with 12ui', exact: true }).click();
    const brief = page.getByRole('dialog', { name: 'Design this email with 12ui' });
    // The brief starts from the draft itself, and the paid step shows its estimate first.
    await expect(brief.getByLabel('Brief')).toHaveValue(/Good Things Are Ripening[\s\S]*An earlier draft\./);
    await expect(brief.getByRole('note')).toBeVisible();
    await brief.getByRole('button', { name: 'Generate designs', exact: true }).click();
    await expect(brief).toHaveCount(0);

    // Candidates appear as they land, and the run survives a reload.
    const run = page.getByRole('region', { name: 'Design with 12ui' });
    await expect(run.getByRole('img', { name: 'Design A' })).toBeVisible({ timeout: 30000 });
    await expect(run.getByRole('img', { name: 'Design B' })).toHaveCount(0);
    await reloadPage(page);
    await expect(run.getByRole('img', { name: 'Design A' })).toBeVisible();
    await expect(run.getByRole('img', { name: 'Design B' })).toBeVisible({ timeout: 45000 });
    await page.screenshot({ path: testInfo.outputPath('design-generation-candidates.png'), fullPage: true });

    // Choosing prepares the layout in the background, across a reload. The operator keeps typing in the body: when the
    // layout is ready the run says so with a notice, and nothing opens or takes focus until the operator asks.
    await useDesign(run, page, 'B').click();
    await expect(run.getByRole('status')).toBeVisible();
    await reloadPage(page);
    const apply = page.getByRole('dialog', { name: 'Use this design in the email' });
    const ready = run.getByRole('button', { name: 'Use design B in the email', exact: true });
    await expect(run.getByRole('status')).toBeVisible();
    await expect(ready).toHaveCount(0);
    await body.click();
    for (let typed = 0; typed < 400 && !await ready.isVisible(); typed++) await page.keyboard.type(' orchard', { delay: 20 });
    await expect(ready).toBeVisible();
    await page.keyboard.type(' still typing');
    await expect(apply).toHaveCount(0);
    await expect(body).toBeFocused();
    expect(await body.evaluate(element => element instanceof HTMLTextAreaElement ? element.value : element.textContent)).toContain('orchard still typing');
    await ready.click();
    const build = async () => {
      await apply.getByLabel('Button destination').fill(destination, { timeout: 45000 });
      await apply.getByRole('button', { name: 'Build the email', exact: true }).click();
      await page.getByRole('alertdialog', { name: 'Replace the email body?' }).getByRole('button', { name: 'Replace', exact: true }).click();
    };
    await build();

    // The same summary as an import: lines not in the brief are highlighted; the body is an unsaved edit.
    const summary = page.getByRole('region', { name: 'Check the imported email before you save' });
    await expect(summary).toBeVisible({ timeout: 30000 });
    await expect(summary.locator('mark').filter({ hasText: 'Our early varieties are ready' })).toBeVisible();
    await expect(summary.locator('mark').filter({ hasText: 'Good Things' })).toHaveCount(0);
    await expect(summary).toContainText(destination);
    const imported = await body.inputValue();
    expect(imported).toContain(`href="${destination}"`);
    expect(imported).not.toMatch(/<mark|127\.0\.0\.1:\d+\/api\/v1|123 Orchard Lane/);
    expect(saves).toEqual([]);
    expect((await read()).revision.emailBody).toBe(savedBody);
    await page.screenshot({ path: testInfo.outputPath('design-generation-applied.png'), fullPage: true });

    // Until the draft is saved with it, the run stays: discarding the edit offers the same design again, bought once.
    const layouts = () => fake.requests.filter(item => item.method === 'POST' && item.path === '/api/v1/convert').length;
    expect(layouts()).toBe(1);
    await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
    await expect(summary).toHaveCount(0);
    await useDesign(run, page, 'B').click();
    await build();
    await expect(summary).toBeVisible({ timeout: 30000 });
    await expect(body).toHaveValue(imported);
    expect(layouts()).toBe(1);

    await page.getByRole('button', { name: 'Save full draft', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Draft saved.' })).toBeVisible();
    const detail = await read();
    const library=await (await api.get(runtime.url+'/api/campaign-templates')).json();
    const filed=library.templates.filter((item:any)=>item.kind==='saved');
    expect(filed).toHaveLength(1);
    expect(filed[0].name).toBe('Orchard letter');
    const copy=await api.post(`${runtime.url}/api/campaign-templates/${encodeURIComponent(filed[0].id)}/start`,{headers});
    expect(copy.status()).toBe(201);
    const copied=await (await api.get(`${runtime.url}/api/campaigns/${(await copy.json()).campaignId}`)).json();
    expect(copied.campaign.state).toBe('draft');expect(copied.steps).toEqual([]);
    expect(copied.revision.emailBody).toBe(detail.revision.emailBody);

    expect(detail.campaign.state).toBe('draft');
    expect(detail.revision.emailBody).toBe(imported);
    // The generated body is saved through the ordinary save path, in the canonical form parsers read (CAMP-022, MSG-009).
    expect(parseEmailHtml(authoredBody(detail.revision.emailBody)).canonical).toBe(authoredBody(detail.revision.emailBody));
    expect(detail.links.map((link: { destinationUrl: string }) => link.destinationUrl)).toEqual([destination]);
    // Nothing was approved, scheduled or sent along the way.
    const state = await (await request.post(runtime.url + '/_authoring/state', { headers: { 'X-Test-Token': runtime.token } })).json();
    expect(state.approvals).toEqual([]);
    expect(state.recipients).toEqual([]);
    expect(state.jobs).toEqual([]);
    await expect.poll(() => runtime.sql(`SELECT state FROM design_jobs WHERE campaign_id = '${campaignId}'`)).toEqual([{ state: 'applied' }]);
    await expect(run).toHaveCount(0);
    // The browser fetched designs only from Mango; only the Worker spoke to the design service.
    expect(outbound).toEqual([]);
    expect(fake.requests.length).toBeGreaterThan(0);
  } finally { await runtime.close(); await fake.close(); }
};
export const walk2 = async ({ page, request }, testInfo) => {
  const candidateImages = { a: candidateImage, b: png(canvas.width, canvas.height, 27) };
  const fake = await startFakeTwelveUi({ key: designKey, candidateImage, slotImages: candidateImages, layerDoc, drawMs: { c: 3_600_000 }, holdDispatch: ['b'], layoutStatus: 'failed', failOnce: { '/candidates/a': 503 } });
  const runtime = await designRuntime(fake.origin);
  try {
    const { api, campaignId, read } = await openDraft(runtime, page, request, '<p>Hello {{first_name | fallback: friend}}, an earlier draft.</p>');
    const operatorResponse = await api.get(`${runtime.url}/api/operator`);
    expect(operatorResponse.status()).toBe(200);
    const operator = (await operatorResponse.json()).operator;
    expect(operator.id).toBe('authoring-operator');
    await openPage(page, `${runtime.url}/app/campaigns/${campaignId}/review`);
    const body = page.getByLabel('Email body', { exact: true });
    await expect(body).toBeVisible();
    const content = () => body.evaluate(element => element instanceof HTMLTextAreaElement ? element.value : element.innerHTML);
    // The rich-text body fills in after hydration; compare against the saved draft, not the empty mount.
    await expect.poll(content).toContain('an earlier draft.');
    const before = await content();
    await page.getByRole('button', { name: 'Design with 12ui', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Design this email with 12ui' });
    // The prefilled brief already went without the draft's token; one typed in goes too.
    await expect(dialog.getByLabel('Brief')).not.toHaveValue(/\{\{/);
    const submittedBrief = 'Good Things Are Ripening\nHello {{first_name | fallback: friend}} and {{unsubscribe_url}}';
    await dialog.getByLabel('Brief').fill(submittedBrief);
    const retainedBrief = 'Good Things Are Ripening\nHello and';
    const creationResponse = page.waitForResponse(response => response.request().method() === 'POST'
      && response.url() === `${runtime.url}/api/campaigns/${campaignId}/design-jobs`);
    const creationBefore = Date.now();
    await dialog.getByRole('button', { name: 'Generate designs', exact: true }).click();
    const started = await creationResponse, creationAfter = Date.now();
    expect(started.status()).toBe(201);
    expect(started.request().postDataJSON()).toMatchObject({ brief: submittedBrief });
    const startedJob = (await started.json()).job;
    expect(startedJob).toMatchObject({ brief: retainedBrief, campaignId, state: 'drafting' });
    expect(startedJob.createdAt).toBeGreaterThanOrEqual(creationBefore);
    expect(startedJob.createdAt).toBeLessThanOrEqual(creationAfter);
    const run = page.getByRole('region', { name: 'Design with 12ui' });
    // Slot A's first purchase meets an outage; the retried pass replays the same key and buys it once.
    await expect(useDesign(run, page, 'B')).toBeVisible({ timeout: 60000 });
    await expect(useDesign(run, page, 'A')).toBeVisible({ timeout: 30000 });
    const candidatesAfter = Date.now();

    const posts = fake.requests.filter(item => item.method === 'POST');
    expect(fake.requests.every(item => item.authorized)).toBe(true);
    expect(posts.every(item => item.idempotencyKey)).toBe(true);
    const created = posts.filter(item => item.path === '/api/v1/create');
    expect(created).toHaveLength(1);
    const concept = (created[0].json as { concept: string }).concept;
    expect(concept).toContain('Good Things Are Ripening');
    // Tokens never leave, and nothing from the audience is added: the request carries the brief and Mango's own words only.
    expect(concept).not.toMatch(/\{|\}|first_name|unsubscribe_url/);
    expect(JSON.stringify(created[0].json)).not.toMatch(/@example\.test|An earlier draft|Seasonal news/);
    const slotA = posts.filter(item => item.path.endsWith('/candidates/a'));
    expect(slotA).toHaveLength(2);
    expect(new Set(slotA.map(item => item.idempotencyKey)).size).toBe(1);
    expect(fake.purchases.filter(item => item.startsWith('draft:'))).toHaveLength(2);
    const issuedRun = fake.issued.filter(item => item.kind === 'run');
    expect(issuedRun).toHaveLength(1);
    const candidates = () => runtime.sql('SELECT slot, state, sha256, bytes, created_at AS createdAt FROM design_candidates ORDER BY slot');
    const stored = await candidates();
    expect(stored.map(({ createdAt, ...candidate }) => candidate)).toEqual(['a', 'b'].map(slot => ({ slot, state: 'succeeded',
      sha256: createHash('sha256').update(candidateImages[slot]).digest('hex'), bytes: candidateImages[slot].byteLength })));
    for (const candidate of stored) {
      expect(candidate.createdAt).toBeGreaterThanOrEqual(issuedRun[0].at);
      expect(candidate.createdAt).toBeLessThanOrEqual(candidatesAfter);
    }
    const retained = async () => {
      const rows = await runtime.sql(`SELECT id, campaign_id AS campaignId, state, brief, provider_run_id AS providerRunId,
        provider_layout_id AS providerLayoutId, chosen_slot AS chosenSlot, created_by AS createdBy, created_at AS createdAt,
        updated_at AS updatedAt, deadline_at AS deadlineAt, error_code AS errorCode FROM design_jobs WHERE id = '${startedJob.id}'`);
      expect(rows).toHaveLength(1);
      const record = rows[0];
      expect(record).toMatchObject({ id: startedJob.id, campaignId, brief: retainedBrief, providerRunId: issuedRun[0].id,
        createdBy: operator.id, createdAt: startedJob.createdAt });
      const response = await api.get(`${runtime.url}/api/campaigns/${campaignId}/design-jobs`);
      expect(response.status()).toBe(200);
      const status = (await response.json()).job;
      expect(status).toMatchObject({ id: record.id, campaignId, state: record.state, brief: retainedBrief,
        createdAt: record.createdAt, updatedAt: record.updatedAt, deadlineAt: record.deadlineAt, chosenSlot: record.chosenSlot,
        ...(record.errorCode ? { errorCode: record.errorCode } : {}) });
      expect(status.candidates).toEqual(['a', 'b'].map(slot => ({ slot, state: 'succeeded', width: canvas.width, height: canvas.height,
        bytes: candidateImages[slot].byteLength, imageUrl: `/api/design-jobs/${startedJob.id}/candidates/${slot}/image` })));
      expect(await candidates()).toEqual(stored);
      return { record, status };
    };

    // The layout fails at the service: the run says so in Mango's words, keeps both paid designs on offer (also after a
    // reload) and leaves the draft untouched. Nothing asks for a new brief.
    const layoutBefore = Date.now();
    await useDesign(run, page, 'A').click();
    const failure = run.getByRole('alert');
    await expect(failure.getByRole('button', { name: 'Try the layout again', exact: true })).toBeVisible({ timeout: 45000 });
    const failureAfter = Date.now();
    await expect(failure).not.toContainText('Injected');
    const issuedFailedLayout = fake.issued.filter(item => item.kind === 'layout');
    expect(issuedFailedLayout).toHaveLength(1);
    expect(issuedFailedLayout[0].at).toBeGreaterThanOrEqual(layoutBefore);
    const failedRecord = await retained();
    expect(failedRecord.record).toMatchObject({ state: 'failed', chosenSlot: 'a', errorCode: 'provider_failed', providerLayoutId: issuedFailedLayout[0].id });
    expect(failedRecord.record.updatedAt).toBeGreaterThanOrEqual(issuedFailedLayout[0].at);
    expect(failedRecord.record.updatedAt).toBeLessThanOrEqual(failureAfter);
    await reloadPage(page);
    expect(await retained()).toEqual(failedRecord);
    expect(await retained()).toEqual(failedRecord);
    await expect(failure).toBeVisible();
    await expect(useDesign(run, page, 'A')).toBeVisible({ timeout: 30000 });
    await expect(useDesign(run, page, 'B')).toBeVisible();
    const converts = () => fake.requests.filter(item => item.method === 'POST' && item.path === '/api/v1/convert');
    expect(converts()).toHaveLength(1);
    expect(converts()[0].fields).toMatchObject({ output: 'layerdoc', model: 'fast' });
    expect(converts()[0].fileSha256).toBe(createHash('sha256').update(candidateImage).digest('hex'));
    await expect.poll(content).toBe(before);
    expect((await read()).revision.emailBody).toContain('an earlier draft.');
    const costs = () => runtime.sql(`SELECT provider, operation, model_or_channel AS tier, billable_units AS units FROM external_cost_facts WHERE campaign_id = '${campaignId}' ORDER BY operation, id`);
    const draftCost = { provider: '12ui', operation: 'design-draft', tier: 'standard', units: 1 }, layoutCost = { provider: '12ui', operation: 'design-layout', tier: 'fast', units: 1 };
    expect(await costs()).toEqual([draftCost, draftCost, layoutCost]);
    const firstRun = async () => (await runtime.sql(`SELECT state, error_code AS code, chosen_slot AS slot FROM design_jobs WHERE campaign_id = '${campaignId}' ORDER BY created_at LIMIT 1`))[0];
    expect(await firstRun()).toEqual({ state: 'failed', code: 'provider_failed', slot: 'a' });

    // Trying again is a new layout under a new key (a replayed key would only replay the failure). Here 12ui says the
    // wallet is empty: the run names that, and the designs stay on offer.
    fake.refuseNext('POST /api/v1/convert', { status: 402 });
    await failure.getByRole('button', { name: 'Try the layout again', exact: true }).click();
    await expect.poll(firstRun, { timeout: 30000 }).toEqual({ state: 'failed', code: 'provider_quota', slot: 'a' });
    await expect(failure.getByRole('button', { name: 'Try the layout again', exact: true })).toBeVisible();
    expect(converts()).toHaveLength(2);
    expect(new Set(converts().map(item => item.idempotencyKey)).size).toBe(2);

    // Choosing a different design moves focus to it. The operator chooses it and waits: as the continuation of that
    // choice the import path opens on its destination field; closing it leaves the ready design on offer.
    fake.setLayoutStatus('succeeded');
    await failure.getByRole('button', { name: 'Choose a different design', exact: true }).click();
    await expect(useDesign(run, page, 'B')).toBeFocused();
    const completionBefore = Date.now();
    await page.keyboard.press('Enter');
    const apply = page.getByRole('dialog', { name: 'Use this design in the email' });
    await expect(apply.getByLabel('Button destination')).toBeFocused({ timeout: 45000 });
    const completionAfter = Date.now();
    await apply.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(run.getByRole('button', { name: 'Use design B in the email', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(content).toBe(before);
    // The refused try bought nothing: two designs and two layouts.
    expect(await costs()).toEqual([draftCost, draftCost, layoutCost, layoutCost]);
    const issuedLayouts = fake.issued.filter(item => item.kind === 'layout');
    expect(issuedLayouts).toHaveLength(2);
    expect(issuedLayouts[1].at).toBeGreaterThanOrEqual(completionBefore);
    const readyRecord = await retained();
    expect(readyRecord.record).toMatchObject({ state: 'ready', chosenSlot: 'b', errorCode: null, providerLayoutId: issuedLayouts[1].id });
    expect(readyRecord.record.updatedAt).toBeGreaterThanOrEqual(issuedLayouts[1].at);
    expect(readyRecord.record.updatedAt).toBeLessThanOrEqual(completionAfter);

    // Arrange the permitted drafting role on the existing native session.
    const fixtureTime = Date.now();
    await runtime.sql(`INSERT INTO operators (id, email, display_name, created_at, updated_at)
      VALUES ('synthetic-mango-771', 'synthetic-mango-771' || char(64) || 'example.test', 'Retained owner', ${fixtureTime}, ${fixtureTime});
      INSERT INTO oa_operators (id, email, display_name, role, status, created_at)
      VALUES ('synthetic-mango-771', 'synthetic-mango-771' || char(64) || 'example.test', 'Retained owner', 'owner', 'active', ${fixtureTime});
      INSERT INTO operator_product_roles (operator_id, role, updated_by, updated_at) VALUES
      ('synthetic-mango-771', 'owner', 'synthetic-mango-771', ${fixtureTime}),
      ('authoring-operator', 'author', 'synthetic-mango-771', ${fixtureTime})`);
    expect((await (await api.get(`${runtime.url}/api/operator`)).json()).operator).toMatchObject({ id: operator.id, role: 'author' });

    // Follow the artifact URLs actually offered by this successful native run.
    // Expected bytes come from the provider edge inputs, independently of storage.
    const artifacts = [
      ...readyRecord.status.candidates.map(candidate => ({ url: candidate.imageUrl, type: 'image/png', bytes: Buffer.from(candidateImages[candidate.slot]) })),
      { url: readyRecord.status.layerDocUrl, type: 'application/json', bytes: Buffer.from(layerDoc) },
    ];
    expect(artifacts).toHaveLength(3);
    const custody = async () => ({
      runs: await runtime.sql('SELECT * FROM design_jobs ORDER BY id'),
      candidates: await runtime.sql('SELECT * FROM design_candidates ORDER BY job_id, slot'),
      costs: await costs(), purchases: [...fake.purchases], requests: structuredClone(fake.requests),
      campaign: await read(),
      authority: await (await request.post(runtime.url + '/_authoring/state', { headers: { 'X-Test-Token': runtime.token } })).json(),
    });
    const beforeArtifactReads = await custody();
    expect(beforeArtifactReads.authority).toEqual({ approvals: [], recipients: [], jobs: [] });
    const artifactReads: { phase: string; url: string; deniedStatus: number; allowedStatus: number; contentType: string; bytes: number; expectedSha256: string; observedSha256: string }[] = [];
    const readArtifacts = async (phase: string) => {
      const signedOut = await requestClient.newContext({ storageState: { cookies: [], origins: [] } });
      try {
        for (const artifact of artifacts) {
          expect(artifact.url).toEqual(expect.any(String));
          const url = new URL(artifact.url, runtime.url).href;
          const denied = await signedOut.get(url);
          expect(denied.status()).toBe(401);
          const deniedBytes = await denied.body();
          expect(JSON.parse(deniedBytes.toString())).toEqual({ error: 'unauthenticated' });
          expect(deniedBytes.includes(artifact.bytes)).toBe(false);
          const allowed = await api.get(url);
          expect(allowed.status()).toBe(200);
          expect(allowed.headers()['content-type'].split(';')[0]).toBe(artifact.type);
          const observed = await allowed.body();
          expect(observed.equals(artifact.bytes), `Retained ${artifact.type} must preserve the supplied provider bytes`).toBe(true);
          artifactReads.push({ phase, url: artifact.url, deniedStatus: denied.status(), allowedStatus: allowed.status(),
            contentType: allowed.headers()['content-type'], bytes: observed.byteLength,
            expectedSha256: createHash('sha256').update(artifact.bytes).digest('hex'),
            observedSha256: createHash('sha256').update(observed).digest('hex') });
        }
        expect((await signedOut.storageState()).cookies).toEqual([]);
      } finally { await signedOut.dispose(); }
    };
    await readArtifacts('before-reload');
    expect(await custody()).toEqual(beforeArtifactReads);
    await reloadPage(page);
    expect(await retained()).toEqual(readyRecord);
    expect(await retained()).toEqual(readyRecord);
    await readArtifacts('after-reload');
    expect(await custody()).toEqual(beforeArtifactReads);
    await test.info().attach('design-provider-custody', { contentType: 'application/json', body: JSON.stringify({
      clause: 'DESIGN-011', point: 'acceptance-4 retained artifact session and byte preservation', operatorId: operator.id, role: 'author',
      reads: artifactReads, unchanged: ['run rows', 'candidate rows', 'cost facts', 'purchases', 'provider requests', 'campaign', 'approval and recipient authority', 'commands'],
      runCount: beforeArtifactReads.runs.length, candidateCount: beforeArtifactReads.candidates.length,
      costCount: beforeArtifactReads.costs.length, purchaseCount: beforeArtifactReads.purchases.length, providerRequestCount: beforeArtifactReads.requests.length,
    }, null, 2) });
    console.log('PROBE DESIGN-011 acceptance-4: native retained artifact URLs before and after reload -> signed-out 401, Author 200 with exact PNG and LayerDoc bytes; records, spend, provider traffic and campaign authority unchanged');

    // Capture the same retained-design screen at both landing widths; assertions remain at 1440.
    await page.screenshot({ path: testInfo.outputPath('design-provider-custody-1440.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath('design-provider-custody-390.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });

    await runtime.sql("DELETE FROM operator_product_roles WHERE operator_id = 'authoring-operator'");
    expect((await (await api.get(`${runtime.url}/api/operator`)).json()).operator.role).toBe(operator.role);

    // A new run while a prepared design is on offer: the brief says the designs stay, and they do, under Earlier designs.
    // 12ui names a time to ask again: the run says it is waiting, then continues with the same purchase key.
    const start = async (designs = '2') => {
      await page.getByRole('button', { name: 'Design with 12ui', exact: true }).click();
      await dialog.getByLabel('Designs').selectOption(designs);
      await dialog.getByRole('button', { name: 'Generate designs', exact: true }).click();
      await expect(dialog).toHaveCount(0);
    };
    const earlier = page.locator('details').filter({ hasText: 'Earlier designs' });
    await page.getByRole('button', { name: 'Design with 12ui', exact: true }).click();
    await expect(dialog.getByText('Earlier designs', { exact: false })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    fake.refuseNext('POST /api/v1/create', { status: 429, retryAfter: 6 });
    fake.setDraw('b', 15_000);
    await start();
    await expect(run.getByRole('alert')).toBeVisible({ timeout: 30000 });
    // Once 12ui accepts the retried request the wait is over: no alert stays beside a design that landed while another draws.
    await expect(run.getByRole('img', { name: 'Design A' })).toBeVisible({ timeout: 60000 });
    await expect(run.getByRole('alert')).toHaveCount(0);
    await expect(useDesign(run, page, 'B')).toBeVisible({ timeout: 60000 });
    await expect(earlier.getByRole('button', { name: 'Use design B in the email', exact: true })).toBeVisible();
    fake.setDraw('b', 0);
    const limited = fake.requests.filter(item => item.method === 'POST' && item.path === '/api/v1/create').slice(-2);
    expect(limited).toHaveLength(2);
    expect(limited[0].idempotencyKey).toBe(limited[1].idempotencyKey);

    // Without a time (the daily allowance or the wallet is spent) the run fails at once, in Mango's words.
    fake.refuseNext('POST /api/v1/create', { status: 429 });
    await start();
    await expect(run.getByRole('alert')).toContainText('Design generation failed', { timeout: 30000 });
    await expect(run.getByRole('alert')).not.toContainText('Injected');
    await reloadPage(page);
    // The streamed run can paint before the rich editor hydrates and changes its height.
    // Confirm the saved body is mounted before clicking the run's moving control.
    await expect.poll(content).toBe(before);
    await expect(run.getByRole('alert')).toContainText('Design generation failed');
    await run.getByRole('button', { name: 'Dismiss', exact: true }).click();
    // With the failed run dismissed, the newest run with designs on offer is the one shown.
    await expect(useDesign(run, page, 'A')).toBeVisible({ timeout: 30000 });

    // A run that outlives its deadline fails as a timeout once the draft is read, with or without a cron.
    await page.getByRole('button', { name: 'Design with 12ui', exact: true }).click();
    await dialog.getByLabel('Designs').selectOption('3');
    await dialog.getByRole('button', { name: 'Generate designs', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(run.getByRole('img', { name: 'Design B' })).toBeVisible({ timeout: 45000 });
    await runtime.sql(`UPDATE design_jobs SET deadline_at = 0 WHERE state = 'drafting'`);
    await reloadPage(page);
    await expect(run.getByRole('alert')).toContainText('did not finish in time');
    // The designs it drew stay usable, and every earlier run with designs is still on offer.
    await expect(useDesign(run, page, 'B')).toBeVisible();
    expect(await runtime.sql(`SELECT state, error_code AS code FROM design_jobs ORDER BY created_at`)).toEqual([
      { state: 'ready', code: null }, { state: 'choosing', code: null }, { state: 'discarded', code: 'provider_quota' }, { state: 'failed', code: 'provider_timeout' },
    ]);
    await expect.poll(content).toBe(before);
  } finally { await runtime.close(); await fake.close(); }
};
