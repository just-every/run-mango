import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { expect, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';
import { openPage, reloadPage } from '../support/navigation';
import { localSessionCookieName } from '../support/local-session';
import { png } from '../support/images';
import { startFakeTwelveUi } from '../support/fake-twelve-ui';
import { authoringRuntime } from './browser-runtime.mjs';

/** Exercise the native start fence and an independent earlier layout during a
 * provider-declared wait. The provider edge alone supplies the rate refusal. */
export async function walkConcurrency({ page, request }: { page: Page; request: APIRequestContext }, info: TestInfo) {
  const layerDoc = readFileSync(new URL('./fixtures/orchard.layerdoc.json', import.meta.url), 'utf8');
  const { width, height } = JSON.parse(layerDoc).canvas;
  const candidateImage = png(width, height, 11), earlierImage = png(width, height, 23);
  const key = 'synthetic-mango-701';
  const fake = await startFakeTwelveUi({ key, candidateImage, slotImages: { b: earlierImage }, layerDoc, layoutMs: 5000 });
  const runtime = await authoringRuntime({ suite: 'design-concurrency', queueConsumers: true, vars: {
    MANGO_PUBLIC_BASE_URL: 'https://mango.example.test', DESIGN_PROVIDER_API_KEY: key, DESIGN_PROVIDER_ORIGIN: fake.origin,
  } });
  try {
    const opened = await request.post(runtime.url + '/_authoring/open', { headers: { 'X-Test-Token': runtime.token } });
    expect(opened.status()).toBe(200);
    await page.context().addCookies([{ name: localSessionCookieName(runtime.url), value: (await opened.json()).token, url: runtime.url }]);
    const api = page.context().request, headers = { Origin: runtime.url };
    await runtime.sql('CREATE TABLE task_authoring_design_commands (kind TEXT, payload TEXT)');
    const created = await api.post(runtime.url + '/api/campaigns', { headers, data: {} });
    expect(created.status()).toBe(201);
    const { campaignId, revisionId } = await created.json();
    const saved = await api.patch(`${runtime.url}/api/campaign-revisions/${revisionId}`, { headers, data: {
      name: 'synthetic-mango-702', emailSubject: 'Orchard news', preheader: 'The saved letter', emailBody: '<p>Keep this saved draft.</p>',
    } });
    expect(saved.status()).toBe(200);
    const detail = async () => {
      const response = await api.get(`${runtime.url}/api/campaigns/${campaignId}`);
      expect(response.status()).toBe(200);
      return response.json();
    };
    const draftBefore = await detail();
    const status = async () => {
      const response = await api.get(`${runtime.url}/api/campaigns/${campaignId}/design-jobs`);
      expect(response.status()).toBe(200);
      return response.json();
    };
    const start = async (brief: string) => {
      const response = await api.post(`${runtime.url}/api/campaigns/${campaignId}/design-jobs`, { headers, data: { brief, candidates: 2 } });
      expect(response.status(), await response.text()).toBe(201);
      return (await response.json()).job;
    };
    const earlier = await start('synthetic-mango-703: an earlier orchard design');
    await expect.poll(async () => (await status()).job.state, { timeout: 45000 }).toBe('choosing');
    expect((await status()).job.candidates.map(item => item.slot)).toEqual(['a', 'b']);
    const earlierProvider = fake.issued.find(item => item.kind === 'run')!;
    expect(earlierProvider).toBeDefined();

    // A real 429 from the candidate purchase leaves the newer native run waiting.
    // Its other candidate can land; no persisted wait or clock is manufactured.
    fake.refuseNext('/candidates/b', { status: 429, retryAfter: 600 });
    const later = await start('synthetic-mango-704: the newer orchard design');
    expect(later.id).not.toBe(earlier.id);
    await expect.poll(async () => (await status()).job.waiting?.reason, { timeout: 45000 }).toBe('provider_quota');
    const waiting = (await status()).job;
    expect(waiting).toMatchObject({ id: later.id, state: 'drafting', waiting: { reason: 'provider_quota' } });
    expect(waiting.waiting.retryAt).toBeGreaterThan(Date.now());
    expect((await status()).earlier).toEqual([expect.objectContaining({ id: earlier.id, state: 'choosing' })]);
    const runs = () => runtime.sql('SELECT * FROM design_jobs ORDER BY created_at, id');
    const commands = () => runtime.sql('SELECT kind, payload FROM task_authoring_design_commands ORDER BY rowid');
    const costs = () => runtime.sql('SELECT id, campaign_id, provider, operation, model_or_channel, billable_units FROM external_cost_facts ORDER BY id');
    const rowsBefore = await runs(), commandsBefore = await commands(), costsBefore = await costs();
    expect(rowsBefore).toHaveLength(2);
    const providerIds = fake.issued.filter(item => item.kind === 'run').map(item => item.id);
    expect(providerIds).toHaveLength(2);
    expect(new Set(providerIds).size).toBe(2);
    expect(rowsBefore.map(item => item.provider_run_id)).toEqual(providerIds);
    expect(commandsBefore).toEqual([earlier, later].map(job => ({ kind: 'design.draft', payload: JSON.stringify({ jobId: job.id }) })));
    const creationsBefore = fake.requests.filter(item => item.method === 'POST' && item.path === '/api/v1/create');
    const purchasesBefore = [...fake.purchases];
    expect(creationsBefore).toHaveLength(2);
    expect(purchasesBefore).toHaveLength(3);

    // The public route must refuse even though the UI also disables Generate.
    const refused = await api.post(`${runtime.url}/api/campaigns/${campaignId}/design-jobs`, { headers,
      data: { brief: 'synthetic-mango-705: forbidden concurrent start', candidates: 2 } });
    expect(refused.status()).toBe(409);
    expect(await refused.json()).toMatchObject({ error: 'design_job_active' });
    expect(await runs()).toEqual(rowsBefore);
    expect(await commands()).toEqual(commandsBefore);
    expect(fake.requests.filter(item => item.method === 'POST' && item.path === '/api/v1/create')).toEqual(creationsBefore);
    expect(fake.purchases).toEqual(purchasesBefore);
    expect(await costs()).toEqual(costsBefore);

    await openPage(page, `${runtime.url}/app/campaigns/${campaignId}/review`);
    // The streamed panels can precede the rich editor's hydration recovery in a
    // different browser time zone. Wait for the saved body to mount before
    // clicking a control that recovery can replace, as in the existing journey.
    const mountedBody = () => page.getByLabel('Email body', { exact: true }).evaluate(element =>
      element instanceof HTMLTextAreaElement ? element.value : element.textContent);
    await expect.poll(mountedBody).toContain('Keep this saved draft.');
    const latestPanel = page.getByRole('region', { name: 'Design with 12ui', exact: true });
    const earlierPanel = page.locator('details').filter({ hasText: 'Earlier designs' }).getByRole('region');
    await expect(latestPanel.getByRole('alert')).toContainText('12ui asked Mango to wait');
    await expect(page.getByRole('button', { name: 'Design with 12ui', exact: true })).toBeDisabled();
    const choice = earlierPanel.getByRole('listitem').filter({ has: page.getByRole('img', { name: 'Design B', exact: true }) })
      .getByRole('button', { name: 'Use this design', exact: true });
    await expect(choice).toBeEnabled();
    expect(fake.requests.filter(item => item.method === 'POST' && item.path === '/api/v1/convert')).toEqual([]);
    const conversion = fake.holdNext('POST /api/v1/convert');
    const choosing = page.waitForResponse(response => response.request().method() === 'POST' && response.url() === `${runtime.url}/api/design-jobs/${earlier.id}/choose`, { timeout: 30000 });
    await choice.click();
    const chosen = await choosing;
    expect(chosen.status()).toBe(200);
    expect(chosen.request().postDataJSON()).toEqual({ slot: 'b' });
    expect((await chosen.json()).job).toMatchObject({ id: earlier.id, state: 'preparing', chosenSlot: 'b' });
    let preparing, pendingCosts, pendingPurchases;
    try {
      await expect.poll(() => fake.requests.filter(item => item.method === 'POST' && item.path === '/api/v1/convert').length,
        { timeout: 30000 }).toBe(1);
      await conversion.requested;
      // The earlier layout request is unanswered while the newer run retains its
      // own declared wait. Reload must render both identities in that state.
      await reloadPage(page);
      preparing = await status();
      expect(preparing.job).toEqual(waiting);
      expect(preparing.earlier).toEqual([expect.objectContaining({ id: earlier.id, state: 'preparing', chosenSlot: 'b' })]);
      await expect(latestPanel.getByRole('alert')).toContainText('12ui asked Mango to wait');
      await expect(earlierPanel.getByRole('status')).toContainText('Preparing design B');
      await expect(page.getByRole('button', { name: 'Design with 12ui', exact: true })).toBeDisabled();
      expect(await detail()).toEqual(draftBefore);
      pendingCosts = await costs();
      pendingPurchases = [...fake.purchases];
      expect(pendingCosts).toEqual(costsBefore);
      expect(pendingPurchases).toEqual(purchasesBefore);
      expect(await commands()).toEqual([...commandsBefore, { kind: 'design.layout', payload: JSON.stringify({ jobId: earlier.id }) }]);
      // Browser proof shows the same unanswered preparation on both screen sizes.
      // Behavioural assertions remain at the journey's desktop width.
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await reloadPage(page);
        await earlierPanel.getByRole('status').waitFor();
        await page.screenshot({ path: info.outputPath(`design-concurrency-preparing-${width}.png`), fullPage: true });
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
    } finally { conversion.release(); }
    await expect(earlierPanel.getByRole('button', { name: 'Use design B in the email', exact: true })).toBeVisible({ timeout: 45000 });
    const settled = await status();
    expect(settled.job).toEqual(waiting);
    expect(settled.earlier).toEqual([expect.objectContaining({ id: earlier.id, state: 'ready', chosenSlot: 'b', layerDocUrl: `/api/design-jobs/${earlier.id}/layerdoc` })]);
    const converts = fake.requests.filter(item => item.method === 'POST' && item.path === '/api/v1/convert');
    expect(converts).toHaveLength(1);
    expect(converts[0]).toMatchObject({ authorized: true, idempotencyKey: `mango-design-${earlier.id}-layout-b`,
      fileSha256: createHash('sha256').update(earlierImage).digest('hex'), fields: { output: 'layerdoc', model: 'fast' } });
    expect(fake.purchases).toEqual([...purchasesBefore, `layout:${converts[0].idempotencyKey}`]);
    expect(await commands()).toEqual([...commandsBefore, { kind: 'design.layout', payload: JSON.stringify({ jobId: earlier.id }) }]);
    const issuedLayout = fake.issued.filter(item => item.kind === 'layout');
    expect(issuedLayout).toHaveLength(1);
    const rowsAfter = await runs();
    expect(rowsAfter[0]).toMatchObject({ id: earlier.id, state: 'ready', chosen_slot: 'b', provider_run_id: earlierProvider.id, provider_layout_id: issuedLayout[0].id });
    expect(rowsAfter[1]).toEqual(rowsBefore[1]);
    expect(await costs()).toEqual([...costsBefore, { id: `design:${earlier.id}:layout:b`, campaign_id: campaignId,
      provider: '12ui', operation: 'design-layout', model_or_channel: 'fast', billable_units: 1 }].sort((a, b) => a.id.localeCompare(b.id)));
    const layout = await api.get(runtime.url + settled.earlier[0].layerDocUrl);
    expect(layout.status()).toBe(200);
    expect(await layout.json()).toEqual(JSON.parse(layerDoc));

    await expect(latestPanel.getByRole('alert')).toContainText('12ui asked Mango to wait');
    const retry = latestPanel.getByRole('alert').locator('time').first();
    await expect(retry).toHaveAttribute('datetime', new Date(waiting.waiting.retryAt).toISOString());
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await reloadPage(page);
      await earlierPanel.getByRole('button', { name: 'Use design B in the email', exact: true }).waitFor();
      await page.screenshot({ path: info.outputPath(`design-concurrency-${width}.png`), fullPage: true });
    }
    expect(await status()).toEqual(settled);
    expect(await runs()).toEqual(rowsAfter);
    expect(await detail()).toEqual(draftBefore);
    const authority = await request.post(runtime.url + '/_authoring/state', { headers: { 'X-Test-Token': runtime.token } });
    expect(authority.status()).toBe(200);
    expect(await authority.json()).toEqual({ jobs: [], approvals: [], recipients: [] });
    expect(fake.requests.filter(item => item.method === 'POST' && item.path === '/api/v1/convert')).toEqual(converts);
    expect(fake.requests.filter(item => item.method === 'POST' && item.path === '/api/v1/create')).toEqual(creationsBefore);
    expect(fake.purchases).toEqual([...purchasesBefore, `layout:${converts[0].idempotencyKey}`]);
    writeFileSync(info.outputPath('design-concurrency-receipt.json'), JSON.stringify({
      clause: 'DESIGN-007', acceptance: 6, campaignId, revisionId,
      concurrentStart: { status: refused.status(), error: 'design_job_active', beforeJobCount: rowsBefore.length,
        afterJobCount: rowsAfter.length, unchangedCommands: commandsBefore, unchangedCreationCount: creationsBefore.length,
        unchangedPurchases: purchasesBefore },
      laterRun: { id: later.id, providerRunId: providerIds[1], state: settled.job.state, waiting: settled.job.waiting },
      earlierRun: { id: earlier.id, providerRunId: earlierProvider.id, providerLayoutId: issuedLayout[0].id,
        preparingState: preparing.earlier[0].state, latestWaitDuringPreparation: preparing.job.waiting,
        state: settled.earlier[0].state, chosenSlot: 'b', candidateSha256: converts[0].fileSha256,
        layoutPurchase: converts[0].idempotencyKey },
      costs: await costs(), authority: { campaignState: draftBefore.campaign.state, approvals: [], recipients: [], dispatch: [] },
      unansweredConversion: { purchases: pendingPurchases, costFacts: pendingCosts },
      screenshots: { preparing: [1440, 390], ready: [1440, 390] },
    }, null, 2) + '\n');
    console.log('PROBE DESIGN-007 acceptance-6-start: native start during provider 429 wait -> 409 design_job_active; no new job, command, creation request or purchase');
    console.log('PROBE DESIGN-007 acceptance-6-choice: earlier design B control during latest wait -> earlier layout ready, one matching purchase and cost; latest wait and draft authority unchanged after reload');
  } finally { await runtime.close(); await fake.close(); }
}
