# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: campaign-authoring/design-generation.spec.ts >> [DESIGN-001][DESIGN-002][DESIGN-003][DESIGN-007][DESIGN-008][DESIGN-009][DESIGN-010][DESIGN-011] generate and select a design without saving or spending twice, expose provider refusal and keep retained artifacts private and byte-exact across sign-out
- Location: tests/campaign-authoring/design-generation.spec.ts:4:1

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByLabel('Email body', { exact: true })
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" getByLabel('Email body', { exact: true }) with timeout 5000ms
  - waiting for getByLabel('Email body', { exact: true })
    14 × locator resolved to <div role="textbox" aria-required="true" aria-disabled="false" aria-multiline="true" contenteditable="true" aria-label="Email body" id="field-_R_9jj9gbb6_" class="rich-email-editor">…</div>
       - unexpected value "inactive"

```

```yaml
- textbox "Email body":
  - paragraph: An earlier draft.
```

# Test source

```ts
  19  | const canvas = JSON.parse(layerDoc).canvas as { width: number; height: number };
  20  | const candidateImage = png(canvas.width, canvas.height, 9);
  21  | const designKey = 'test-design-key';
  22  | const publicOrigin = 'https://mango.example.test', destination = 'https://shop.example.test/season';
  23  | 
  24  | async function openDraft(runtime: Awaited<ReturnType<typeof authoringRuntime>>, page: Page, request: APIRequestContext, emailBody = '<p>An earlier draft.</p>') {
  25  |   const open = await request.post(runtime.url + '/_authoring/open', { headers: { 'X-Test-Token': runtime.token } });
  26  |   expect(open.status(), await open.text()).toBe(200);
  27  |   await page.context().addCookies([{ name: localSessionCookieName(runtime.url), value: (await open.json()).token, url: runtime.url }]);
  28  |   const api = page.context().request, headers = { Origin: runtime.url };
  29  |   const created = await (await api.post(runtime.url + '/api/campaigns', { headers, data: {} })).json();
  30  |   const seeded = await api.patch(`${runtime.url}/api/campaign-revisions/${created.revisionId}`, { headers, data: {
  31  |     name: 'Orchard letter', emailSubject: 'Good Things Are Ripening', preheader: 'Seasonal news from the orchard', emailBody,
  32  |     inclusionRuleJson: JSON.stringify({ version: 1, operator: 'all', predicates: [{ sourceType: 'contact', field: 'email', comparator: 'contains', value: '@example.test' }] }),
  33  |     steps: [{ channel: 'email', timezone: 'Australia/Brisbane', localScheduledAt: '2031-04-07T10:00', whyThisTime: 'Operator time' }] } });
  34  |   expect(seeded.status(), await seeded.text()).toBe(200);
  35  |   const read = async () => (await api.get(`${runtime.url}/api/campaigns/${created.campaignId}`)).json();
  36  |   return { api, headers, campaignId: created.campaignId as string, read };
  37  | }
  38  | 
  39  | /** The candidate's own control: "Use this design" beside its image. */
  40  | const useDesign = (run: ReturnType<Page['getByRole']>, page: Page, slot: string) =>
  41  |   run.getByRole('listitem').filter({ has: page.getByRole('img', { name: `Design ${slot}`, exact: true }) }).getByRole('button', { name: 'Use this design', exact: true });
  42  | 
  43  | const designRuntime = (origin: string) => authoringRuntime({ suite: 'design-generation', queueConsumers: true, vars: {
  44  |   MANGO_PUBLIC_BASE_URL: publicOrigin, AUTHORING_LINK_HOST: 'shop.example.test', DESIGN_PROVIDER_API_KEY: designKey, DESIGN_PROVIDER_ORIGIN: origin } });
  45  | 
  46  | 
  47  | 
  48  | 
  49  | 
  50  | 
  51  | 
  52  | export const walk0 = async ({ page, request }) => {
  53  |   const runtime = await authoringRuntime({ suite: 'design-generation', vars: { MANGO_PUBLIC_BASE_URL: publicOrigin } });
  54  |   try {
  55  |     const outbound: string[] = [];
  56  |     page.on('request', item => { if (!item.url().startsWith(runtime.url)) outbound.push(item.url()); });
  57  |     const { api, headers, campaignId } = await openDraft(runtime, page, request);
  58  |     await openPage(page, `${runtime.url}/app/campaigns/${campaignId}/review`);
  59  |     const status = await api.get(`${runtime.url}/api/campaigns/${campaignId}/design-jobs`);
  60  |     expect(status.ok()).toBe(true);
  61  |     expect((await status.json()).enabled).toBe(false);
  62  |     await expect(page.getByRole('button', { name: 'Import 12ui design', exact: true })).toBeVisible();
  63  |     await expect(page.getByRole('button', { name: 'Design with 12ui' })).toHaveCount(0);
  64  |     const refused = await api.post(`${runtime.url}/api/campaigns/${campaignId}/design-jobs`, { headers, data: { brief: 'A seasonal letter', candidates: 2 } });
  65  |     expect(refused.status()).toBe(409);
  66  |     expect(await refused.json()).toMatchObject({ error: 'design_unavailable', detail: expect.stringContaining('DESIGN_PROVIDER_API_KEY') });
  67  |     expect(await runtime.sql('SELECT count(*) AS n FROM design_jobs')).toEqual([{ n: 0 }]);
  68  |     expect(outbound).toEqual([]);
  69  |   } finally { await runtime.close(); }
  70  | };
  71  | export const walk1 = async ({ page, request }, testInfo) => {
  72  |   const fake = await startFakeTwelveUi({ key: designKey, candidateImage, layerDoc, drawMs: { a: 0, b: 15000 }, layoutMs: 12000 });
  73  |   const runtime = await designRuntime(fake.origin);
  74  |   try {
  75  |     await page.setViewportSize({ width: 1440, height: 1000 });
  76  |     const outbound: string[] = [], saves: string[] = [];
  77  |     page.on('request', item => {
  78  |       if (!item.url().startsWith(runtime.url)) outbound.push(item.url());
  79  |       if (item.method() === 'PATCH' && item.url().includes('/api/campaign-revisions/')) saves.push(item.url());
  80  |     });
  81  |     const { api, headers, campaignId, read } = await openDraft(runtime, page, request);
  82  |     const review = `${runtime.url}/app/campaigns/${campaignId}/review`;
  83  |     await openPage(page, review);
  84  |     const body = page.getByLabel('Email body', { exact: true });
  85  |     await expect(body).toBeVisible();
  86  |     const savedBody = (await read()).revision.emailBody;
  87  | 
  88  |     await page.getByRole('button', { name: 'Design with 12ui', exact: true }).click();
  89  |     const brief = page.getByRole('dialog', { name: 'Design this email with 12ui' });
  90  |     // The brief starts from the draft itself, and the paid step shows its estimate first.
  91  |     await expect(brief.getByLabel('Brief')).toHaveValue(/Good Things Are Ripening[\s\S]*An earlier draft\./);
  92  |     await expect(brief.getByRole('note')).toBeVisible();
  93  |     await brief.getByRole('button', { name: 'Generate designs', exact: true }).click();
  94  |     await expect(brief).toHaveCount(0);
  95  | 
  96  |     // Candidates appear as they land, and the run survives a reload.
  97  |     const run = page.getByRole('region', { name: 'Design with 12ui' });
  98  |     await expect(run.getByRole('img', { name: 'Design A' })).toBeVisible({ timeout: 30000 });
  99  |     await expect(run.getByRole('img', { name: 'Design B' })).toHaveCount(0);
  100 |     await reloadPage(page);
  101 |     await expect(run.getByRole('img', { name: 'Design A' })).toBeVisible();
  102 |     await expect(run.getByRole('img', { name: 'Design B' })).toBeVisible({ timeout: 45000 });
  103 |     await page.screenshot({ path: testInfo.outputPath('design-generation-candidates.png'), fullPage: true });
  104 | 
  105 |     // Choosing prepares the layout in the background, across a reload. The operator keeps typing in the body: when the
  106 |     // layout is ready the run says so with a notice, and nothing opens or takes focus until the operator asks.
  107 |     await useDesign(run, page, 'B').click();
  108 |     await expect(run.getByRole('status')).toBeVisible();
  109 |     await reloadPage(page);
  110 |     const apply = page.getByRole('dialog', { name: 'Use this design in the email' });
  111 |     const ready = run.getByRole('button', { name: 'Use design B in the email', exact: true });
  112 |     await expect(run.getByRole('status')).toBeVisible();
  113 |     await expect(ready).toHaveCount(0);
  114 |     await body.click();
  115 |     for (let typed = 0; typed < 400 && !await ready.isVisible(); typed++) await page.keyboard.type(' orchard', { delay: 20 });
  116 |     await expect(ready).toBeVisible();
  117 |     await page.keyboard.type(' still typing');
  118 |     await expect(apply).toHaveCount(0);
> 119 |     await expect(body).toBeFocused();
      |                        ^ Error: expect(locator).toBeFocused() failed
  120 |     expect(await body.evaluate(element => element instanceof HTMLTextAreaElement ? element.value : element.textContent)).toContain('orchard still typing');
  121 |     await ready.click();
  122 |     const build = async () => {
  123 |       await apply.getByLabel('Button destination').fill(destination, { timeout: 45000 });
  124 |       await apply.getByRole('button', { name: 'Build the email', exact: true }).click();
  125 |       await page.getByRole('alertdialog', { name: 'Replace the email body?' }).getByRole('button', { name: 'Replace', exact: true }).click();
  126 |     };
  127 |     await build();
  128 | 
  129 |     // The same summary as an import: lines not in the brief are highlighted; the body is an unsaved edit.
  130 |     const summary = page.getByRole('region', { name: 'Check the imported email before you save' });
  131 |     await expect(summary).toBeVisible({ timeout: 30000 });
  132 |     await expect(summary.locator('mark').filter({ hasText: 'Our early varieties are ready' })).toBeVisible();
  133 |     await expect(summary.locator('mark').filter({ hasText: 'Good Things' })).toHaveCount(0);
  134 |     await expect(summary).toContainText(destination);
  135 |     const imported = await body.inputValue();
  136 |     expect(imported).toContain(`href="${destination}"`);
  137 |     expect(imported).not.toMatch(/<mark|127\.0\.0\.1:\d+\/api\/v1|123 Orchard Lane/);
  138 |     expect(saves).toEqual([]);
  139 |     expect((await read()).revision.emailBody).toBe(savedBody);
  140 |     await page.screenshot({ path: testInfo.outputPath('design-generation-applied.png'), fullPage: true });
  141 | 
  142 |     // Until the draft is saved with it, the run stays: discarding the edit offers the same design again, bought once.
  143 |     const layouts = () => fake.requests.filter(item => item.method === 'POST' && item.path === '/api/v1/convert').length;
  144 |     expect(layouts()).toBe(1);
  145 |     await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  146 |     await expect(summary).toHaveCount(0);
  147 |     await useDesign(run, page, 'B').click();
  148 |     await build();
  149 |     await expect(summary).toBeVisible({ timeout: 30000 });
  150 |     await expect(body).toHaveValue(imported);
  151 |     expect(layouts()).toBe(1);
  152 | 
  153 |     await page.getByRole('button', { name: 'Save full draft', exact: true }).click();
  154 |     await expect(page.getByRole('status').filter({ hasText: 'Draft saved.' })).toBeVisible();
  155 |     const detail = await read();
  156 |     const library=await (await api.get(runtime.url+'/api/campaign-templates')).json();
  157 |     const filed=library.templates.filter((item:any)=>item.kind==='saved');
  158 |     expect(filed).toHaveLength(1);
  159 |     expect(filed[0].name).toBe('Orchard letter');
  160 |     const copy=await api.post(`${runtime.url}/api/campaign-templates/${encodeURIComponent(filed[0].id)}/start`,{headers});
  161 |     expect(copy.status()).toBe(201);
  162 |     const copied=await (await api.get(`${runtime.url}/api/campaigns/${(await copy.json()).campaignId}`)).json();
  163 |     expect(copied.campaign.state).toBe('draft');expect(copied.steps).toEqual([]);
  164 |     expect(copied.revision.emailBody).toBe(detail.revision.emailBody);
  165 | 
  166 |     expect(detail.campaign.state).toBe('draft');
  167 |     expect(detail.revision.emailBody).toBe(imported);
  168 |     // The generated body is saved through the ordinary save path, in the canonical form parsers read (CAMP-022, MSG-009).
  169 |     expect(parseEmailHtml(authoredBody(detail.revision.emailBody)).canonical).toBe(authoredBody(detail.revision.emailBody));
  170 |     expect(detail.links.map((link: { destinationUrl: string }) => link.destinationUrl)).toEqual([destination]);
  171 |     // Nothing was approved, scheduled or sent along the way.
  172 |     const state = await (await request.post(runtime.url + '/_authoring/state', { headers: { 'X-Test-Token': runtime.token } })).json();
  173 |     expect(state.approvals).toEqual([]);
  174 |     expect(state.recipients).toEqual([]);
  175 |     expect(state.jobs).toEqual([]);
  176 |     await expect.poll(() => runtime.sql(`SELECT state FROM design_jobs WHERE campaign_id = '${campaignId}'`)).toEqual([{ state: 'applied' }]);
  177 |     await expect(run).toHaveCount(0);
  178 |     // The browser fetched designs only from Mango; only the Worker spoke to the design service.
  179 |     expect(outbound).toEqual([]);
  180 |     expect(fake.requests.length).toBeGreaterThan(0);
  181 |   } finally { await runtime.close(); await fake.close(); }
  182 | };
  183 | export const walk2 = async ({ page, request }, testInfo) => {
  184 |   const candidateImages = { a: candidateImage, b: png(canvas.width, canvas.height, 27) };
  185 |   const fake = await startFakeTwelveUi({ key: designKey, candidateImage, slotImages: candidateImages, layerDoc, drawMs: { c: 3_600_000 }, holdDispatch: ['b'], layoutStatus: 'failed', failOnce: { '/candidates/a': 503 } });
  186 |   const runtime = await designRuntime(fake.origin);
  187 |   try {
  188 |     const { api, campaignId, read } = await openDraft(runtime, page, request, '<p>Hello {{first_name | fallback: friend}}, an earlier draft.</p>');
  189 |     const operatorResponse = await api.get(`${runtime.url}/api/operator`);
  190 |     expect(operatorResponse.status()).toBe(200);
  191 |     const operator = (await operatorResponse.json()).operator;
  192 |     expect(operator.id).toBe('authoring-operator');
  193 |     await openPage(page, `${runtime.url}/app/campaigns/${campaignId}/review`);
  194 |     const body = page.getByLabel('Email body', { exact: true });
  195 |     await expect(body).toBeVisible();
  196 |     const content = () => body.evaluate(element => element instanceof HTMLTextAreaElement ? element.value : element.innerHTML);
  197 |     // The rich-text body fills in after hydration; compare against the saved draft, not the empty mount.
  198 |     await expect.poll(content).toContain('an earlier draft.');
  199 |     const before = await content();
  200 |     await page.getByRole('button', { name: 'Design with 12ui', exact: true }).click();
  201 |     const dialog = page.getByRole('dialog', { name: 'Design this email with 12ui' });
  202 |     // The prefilled brief already went without the draft's token; one typed in goes too.
  203 |     await expect(dialog.getByLabel('Brief')).not.toHaveValue(/\{\{/);
  204 |     const submittedBrief = 'Good Things Are Ripening\nHello {{first_name | fallback: friend}} and {{unsubscribe_url}}';
  205 |     await dialog.getByLabel('Brief').fill(submittedBrief);
  206 |     const retainedBrief = 'Good Things Are Ripening\nHello and';
  207 |     const creationResponse = page.waitForResponse(response => response.request().method() === 'POST'
  208 |       && response.url() === `${runtime.url}/api/campaigns/${campaignId}/design-jobs`);
  209 |     const creationBefore = Date.now();
  210 |     await dialog.getByRole('button', { name: 'Generate designs', exact: true }).click();
  211 |     const started = await creationResponse, creationAfter = Date.now();
  212 |     expect(started.status()).toBe(201);
  213 |     expect(started.request().postDataJSON()).toMatchObject({ brief: submittedBrief });
  214 |     const startedJob = (await started.json()).job;
  215 |     expect(startedJob).toMatchObject({ brief: retainedBrief, campaignId, state: 'drafting' });
  216 |     expect(startedJob.createdAt).toBeGreaterThanOrEqual(creationBefore);
  217 |     expect(startedJob.createdAt).toBeLessThanOrEqual(creationAfter);
  218 |     const run = page.getByRole('region', { name: 'Design with 12ui' });
  219 |     // Slot A's first purchase meets an outage; the retried pass replays the same key and buys it once.
```