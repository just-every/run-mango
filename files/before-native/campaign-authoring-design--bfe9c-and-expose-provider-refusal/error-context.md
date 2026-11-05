# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: campaign-authoring/design-generation.spec.ts >> [DESIGN-001][DESIGN-002][DESIGN-003][DESIGN-007][DESIGN-008][DESIGN-009][DESIGN-010] generate and select a design without saving or spending twice, and expose provider refusal
- Location: tests/campaign-authoring/design-generation.spec.ts:4:1

# Error details

```
Error: expect(received).toMatchObject(expected)

- Expected  - 1
+ Received  + 1

  Object {
    "brief": "Good Things Are Ripening
- Hello and",
+ Hello first_name | fallback: \"friend\" and",
    "campaignId": "01M6PVCEH2HRAZZ28YZNQWK0XV",
    "state": "drafting",
  }
```

# Test source

```ts
  150 |     await expect(summary).toHaveCount(0);
  151 |     await useDesign(run, page, 'B').click();
  152 |     await build();
  153 |     await expect(summary).toBeVisible({ timeout: 30000 });
  154 |     await expect(body).toHaveValue(imported);
  155 |     expect(layouts()).toBe(1);
  156 | 
  157 |     await page.getByRole('button', { name: 'Save full draft', exact: true }).click();
  158 |     await expect(page.getByRole('status').filter({ hasText: 'Draft saved.' })).toBeVisible();
  159 |     const detail = await read();
  160 |     const library=await (await api.get(runtime.url+'/api/campaign-templates')).json();
  161 |     const filed=library.templates.filter((item:any)=>item.kind==='saved');
  162 |     expect(filed).toHaveLength(1);
  163 |     expect(filed[0].name).toBe('Orchard letter');
  164 |     const copy=await api.post(`${runtime.url}/api/campaign-templates/${encodeURIComponent(filed[0].id)}/start`,{headers});
  165 |     expect(copy.status()).toBe(201);
  166 |     const copied=await (await api.get(`${runtime.url}/api/campaigns/${(await copy.json()).campaignId}`)).json();
  167 |     expect(copied.campaign.state).toBe('draft');expect(copied.steps).toEqual([]);
  168 |     expect(copied.revision.emailBody).toBe(detail.revision.emailBody);
  169 | 
  170 |     expect(detail.campaign.state).toBe('draft');
  171 |     expect(detail.revision.emailBody).toBe(imported);
  172 |     // The generated body is saved through the ordinary save path, in the canonical form parsers read (CAMP-022, MSG-009).
  173 |     expect(parseEmailHtml(authoredBody(detail.revision.emailBody)).canonical).toBe(authoredBody(detail.revision.emailBody));
  174 |     expect(detail.links.map((link: { destinationUrl: string }) => link.destinationUrl)).toEqual([destination]);
  175 |     // Nothing was approved, scheduled or sent along the way.
  176 |     const state = await (await request.post(runtime.url + '/_authoring/state', { headers: { 'X-Test-Token': runtime.token } })).json();
  177 |     expect(state.approvals).toEqual([]);
  178 |     expect(state.recipients).toEqual([]);
  179 |     expect(state.jobs).toEqual([]);
  180 |     await expect.poll(() => runtime.sql(`SELECT state FROM design_jobs WHERE campaign_id = '${campaignId}'`), { timeout: 30000 }).toEqual([{ state: 'applied' }]);
  181 |     await expect(run).toHaveCount(0);
  182 |     const appliedRows = (await readDesignRecords(api, runtime)).jobs;
  183 |     const applied = appliedRows[0];
  184 |     for (const slot of ['a', 'b']) {
  185 |       const original = await api.get(`${runtime.url}/api/design-jobs/${applied.id}/candidates/${slot}/image`);
  186 |       expect(original.status()).toBe(200);
  187 |       expect(await original.body()).toEqual(Buffer.from(candidateImage));
  188 |     }
  189 |     const originalLayout = await api.get(`${runtime.url}/api/design-jobs/${applied.id}/layerdoc`);
  190 |     expect(originalLayout.status()).toBe(200);
  191 |     expect(await originalLayout.text()).toBe(layerDoc);
  192 |     await reloadPage(page);
  193 |     expect((await readDesignRecords(api, runtime)).jobs).toEqual(appliedRows);
  194 |     // The browser fetched designs only from Mango; only the Worker spoke to the design service.
  195 |     expect(outbound).toEqual([]);
  196 |     expect(fake.requests.length).toBeGreaterThan(0);
  197 |   } finally { await runtime.close(); await fake.close(); }
  198 | };
  199 | export const walk2 = async ({ page, request }, testInfo) => {
  200 |   const candidateB = png(canvas.width, canvas.height, 17);
  201 |   const imageFor = (slot: string) => slot === 'b' ? candidateB : candidateImage;
  202 |   const fake = await startFakeTwelveUi({ key: designKey, candidateImage, slotImages: { b: candidateB }, layerDoc, drawMs: { c: 3_600_000 }, failedSlots: ['d'], holdDispatch: ['b'], layoutStatus: 'failed', failOnce: { '/candidates/a': 503 } });
  203 |   const runtime = await designRuntime(fake.origin);
  204 |   try {
  205 |     const { api, campaignId, read } = await openDraft(runtime, page, request, '<p>Hello {{first_name | fallback: friend}}, an earlier draft.</p>');
  206 |     const observe = () => readDesignRecords(api, runtime);
  207 |     const operatorResponse = await api.get(`${runtime.url}/api/operator`);
  208 |     expect(operatorResponse.status()).toBe(200);
  209 |     const operator = (await operatorResponse.json()).operator;
  210 |     expect(operator.id).toBe('authoring-operator');
  211 |     await openPage(page, `${runtime.url}/app/campaigns/${campaignId}/review`);
  212 |     const body = page.getByLabel('Email body', { exact: true });
  213 |     await expect(body).toBeVisible();
  214 |     const content = () => body.evaluate(element => element instanceof HTMLTextAreaElement ? element.value : element.innerHTML);
  215 |     // The rich-text body fills in after hydration; compare against the saved draft, not the empty mount.
  216 |     await expect.poll(content).toContain('an earlier draft.');
  217 |     const before = await content();
  218 |     await page.getByRole('button', { name: 'Design with 12ui', exact: true }).click();
  219 |     const dialog = page.getByRole('dialog', { name: 'Design this email with 12ui' });
  220 |     // The prefilled brief already went without the draft's token; one typed in goes too.
  221 |     await expect(dialog.getByLabel('Brief')).not.toHaveValue(/\{\{/);
  222 |     const submittedBrief = 'Good Things Are Ripening\nHello {{first_name | fallback: "{friend}"}} and {{unsubscribe_url}}';
  223 |     await dialog.getByLabel('Brief').fill(submittedBrief);
  224 |     const retainedBrief = 'Good Things Are Ripening\nHello and';
  225 |     const creationResponse = page.waitForResponse(response => response.request().method() === 'POST'
  226 |       && response.url() === `${runtime.url}/api/campaigns/${campaignId}/design-jobs`);
  227 |     const creationBefore = Date.now();
  228 |     await dialog.getByRole('button', { name: 'Generate designs', exact: true }).click();
  229 |     const started = await creationResponse, creationAfter = Date.now();
  230 |     expect(started.status()).toBe(201);
  231 |     expect(started.request().postDataJSON()).toMatchObject({ brief: submittedBrief });
  232 |     const startedJob = (await started.json()).job;
  233 |     expect(startedJob.createdAt).toBeGreaterThanOrEqual(creationBefore);
  234 |     expect(startedJob.createdAt).toBeLessThanOrEqual(creationAfter);
  235 |     const run = page.getByRole('region', { name: 'Design with 12ui' });
  236 |     // Slot A's first purchase meets an outage; the retried pass replays the same key and buys it once.
  237 |     await expect(useDesign(run, page, 'B')).toBeVisible({ timeout: 60000 });
  238 |     await expect(useDesign(run, page, 'A')).toBeVisible({ timeout: 30000 });
  239 |     const candidatesAfter = Date.now();
  240 | 
  241 |     const posts = fake.requests.filter(item => item.method === 'POST');
  242 |     expect(fake.requests.every(item => item.authorized)).toBe(true);
  243 |     expect(posts.every(item => item.idempotencyKey)).toBe(true);
  244 |     const created = posts.filter(item => item.path === '/api/v1/create');
  245 |     expect(created).toHaveLength(1);
  246 |     // Preserve the native door and actual provider-edge request before asserting token removal.
  247 |     writeFileSync(testInfo.outputPath('design-generation-r1-probe.json'), JSON.stringify({
  248 |       submittedBrief, expectedRetainedBrief: retainedBrief, retainedBrief: startedJob.brief, outbound: created[0],
  249 |     }, null, 2));
> 250 |     expect(startedJob).toMatchObject({ brief: retainedBrief, campaignId, state: 'drafting' });
      |                        ^ Error: expect(received).toMatchObject(expected)
  251 |     const concept = (created[0].json as { concept: string }).concept;
  252 |     expect(concept).toContain('Good Things Are Ripening');
  253 |     // Tokens never leave, and nothing from the audience is added: the request carries the brief and Mango's own words only.
  254 |     expect(concept).not.toMatch(/\{|\}|first_name|fallback|friend|unsubscribe_url/);
  255 |     expect(JSON.stringify(created[0].json)).not.toMatch(/@example\.test|An earlier draft|Seasonal news/);
  256 |     const slotA = posts.filter(item => item.path.endsWith('/candidates/a'));
  257 |     expect(slotA).toHaveLength(2);
  258 |     expect(new Set(slotA.map(item => item.idempotencyKey)).size).toBe(1);
  259 |     expect(fake.purchases.filter(item => item.startsWith('draft:'))).toHaveLength(2);
  260 |     const issuedRun = fake.issued.filter(item => item.kind === 'run');
  261 |     expect(issuedRun).toHaveLength(1);
  262 |     const candidates = async () => (await observe()).candidates.map(row => ({ slot: row.slot, state: row.state, sha256: row.sha256, bytes: row.bytes, createdAt: row.created_at }));
  263 |     const stored = await candidates();
  264 |     expect(stored.map(({ createdAt, ...candidate }) => candidate)).toEqual(['a', 'b'].map(slot => ({ slot, state: 'succeeded',
  265 |       sha256: createHash('sha256').update(imageFor(slot)).digest('hex'), bytes: imageFor(slot).byteLength })));
  266 |     for (const candidate of stored) {
  267 |       expect(candidate.createdAt).toBeGreaterThanOrEqual(issuedRun[0].at);
  268 |       expect(candidate.createdAt).toBeLessThanOrEqual(candidatesAfter);
  269 |     }
  270 |     const retained = async () => {
  271 |       const rows = (await observe()).jobs.filter(row => row.id === startedJob.id).map(row => ({
  272 |         id: row.id, campaignId: row.campaign_id, state: row.state, brief: row.brief, providerRunId: row.provider_run_id,
  273 |         providerLayoutId: row.provider_layout_id, chosenSlot: row.chosen_slot, createdBy: row.created_by, createdAt: row.created_at,
  274 |         updatedAt: row.updated_at, deadlineAt: row.deadline_at, errorCode: row.error_code,
  275 |       }));
  276 |       expect(rows).toHaveLength(1);
  277 |       const record = rows[0];
  278 |       expect(record).toMatchObject({ id: startedJob.id, campaignId, brief: retainedBrief, providerRunId: issuedRun[0].id,
  279 |         createdBy: operator.id, createdAt: startedJob.createdAt });
  280 |       const response = await api.get(`${runtime.url}/api/campaigns/${campaignId}/design-jobs`);
  281 |       expect(response.status()).toBe(200);
  282 |       const status = (await response.json()).job;
  283 |       expect(status).toMatchObject({ id: record.id, campaignId, state: record.state, brief: retainedBrief,
  284 |         createdAt: record.createdAt, updatedAt: record.updatedAt, deadlineAt: record.deadlineAt, chosenSlot: record.chosenSlot,
  285 |         ...(record.errorCode ? { errorCode: record.errorCode } : {}) });
  286 |       expect(status.candidates).toEqual(['a', 'b'].map(slot => ({ slot, state: 'succeeded', width: canvas.width, height: canvas.height,
  287 |         bytes: imageFor(slot).byteLength, imageUrl: `/api/design-jobs/${startedJob.id}/candidates/${slot}/image` })));
  288 |       expect(await candidates()).toEqual(stored);
  289 |       return { record, status };
  290 |     };
  291 | 
  292 |     // The layout fails at the service: the run says so in Mango's words, keeps both paid designs on offer (also after a
  293 |     // reload) and leaves the draft untouched. Nothing asks for a new brief.
  294 |     const layoutBefore = Date.now();
  295 |     await useDesign(run, page, 'A').click();
  296 |     const failure = run.getByRole('alert');
  297 |     await expect(failure.getByRole('button', { name: 'Try the layout again', exact: true })).toBeVisible({ timeout: 45000 });
  298 |     const failureAfter = Date.now();
  299 |     await expect(failure).not.toContainText('Injected');
  300 |     const issuedFailedLayout = fake.issued.filter(item => item.kind === 'layout');
  301 |     expect(issuedFailedLayout).toHaveLength(1);
  302 |     expect(issuedFailedLayout[0].at).toBeGreaterThanOrEqual(layoutBefore);
  303 |     const failedRecord = await retained();
  304 |     expect(failedRecord.record).toMatchObject({ state: 'failed', chosenSlot: 'a', errorCode: 'provider_failed', providerLayoutId: issuedFailedLayout[0].id });
  305 |     expect(failedRecord.record.updatedAt).toBeGreaterThanOrEqual(issuedFailedLayout[0].at);
  306 |     expect(failedRecord.record.updatedAt).toBeLessThanOrEqual(failureAfter);
  307 |     await reloadPage(page);
  308 |     expect(await retained()).toEqual(failedRecord);
  309 |     expect(await retained()).toEqual(failedRecord);
  310 |     await expect(failure).toBeVisible();
  311 |     await expect(useDesign(run, page, 'A')).toBeVisible({ timeout: 30000 });
  312 |     await expect(useDesign(run, page, 'B')).toBeVisible();
  313 |     const converts = () => fake.requests.filter(item => item.method === 'POST' && item.path === '/api/v1/convert');
  314 |     expect(converts()).toHaveLength(1);
  315 |     expect(converts()[0].fields).toMatchObject({ output: 'layerdoc', model: 'fast' });
  316 |     expect(converts()[0].fileSha256).toBe(createHash('sha256').update(candidateImage).digest('hex'));
  317 |     await expect.poll(content).toBe(before);
  318 |     expect((await read()).revision.emailBody).toContain('an earlier draft.');
  319 |     const costs = async () => (await observe()).costs.filter(row => row.campaignId === campaignId).map(({ campaignId: ignored, ...cost }) => cost);
  320 |     const draftCost = { provider: '12ui', operation: 'design-draft', tier: 'standard', units: 1 }, layoutCost = { provider: '12ui', operation: 'design-layout', tier: 'fast', units: 1 };
  321 |     expect(await costs()).toEqual([draftCost, draftCost, layoutCost]);
  322 |     const firstRun = async () => { const row = (await observe()).jobs.filter(row => row.campaign_id === campaignId).sort((a,b) => a.created_at-b.created_at)[0]; return {state: row.state, code: row.error_code, slot: row.chosen_slot}; };
  323 |     expect(await firstRun()).toEqual({ state: 'failed', code: 'provider_failed', slot: 'a' });
  324 | 
  325 |     // Trying again is a new layout under a new key (a replayed key would only replay the failure). Here 12ui says the
  326 |     // wallet is empty: the run names that, and the designs stay on offer.
  327 |     fake.refuseNext('POST /api/v1/convert', { status: 402 });
  328 |     await failure.getByRole('button', { name: 'Try the layout again', exact: true }).click();
  329 |     await expect.poll(firstRun, { timeout: 30000 }).toEqual({ state: 'failed', code: 'provider_quota', slot: 'a' });
  330 |     await expect(failure.getByRole('button', { name: 'Try the layout again', exact: true })).toBeVisible();
  331 |     expect(converts()).toHaveLength(2);
  332 |     expect(new Set(converts().map(item => item.idempotencyKey)).size).toBe(2);
  333 | 
  334 |     // Choosing a different design moves focus to it. The operator chooses it and waits: as the continuation of that
  335 |     // choice the import path opens on its destination field; closing it leaves the ready design on offer.
  336 |     fake.setLayoutStatus('succeeded');
  337 |     await failure.getByRole('button', { name: 'Choose a different design', exact: true }).click();
  338 |     await expect(useDesign(run, page, 'B')).toBeFocused();
  339 |     const completionBefore = Date.now();
  340 |     await page.keyboard.press('Enter');
  341 |     const apply = page.getByRole('dialog', { name: 'Use this design in the email' });
  342 |     await expect(apply.getByLabel('Button destination')).toBeFocused({ timeout: 45000 });
  343 |     const completionAfter = Date.now();
  344 |     await apply.getByRole('button', { name: 'Cancel', exact: true }).click();
  345 |     await expect(run.getByRole('button', { name: 'Use design B in the email', exact: true })).toBeVisible();
  346 |     await expect(page.getByRole('dialog')).toHaveCount(0);
  347 |     await expect.poll(content).toBe(before);
  348 |     // The refused try bought nothing: two designs and two layouts.
  349 |     expect(await costs()).toEqual([draftCost, draftCost, layoutCost, layoutCost]);
  350 |     const issuedLayouts = fake.issued.filter(item => item.kind === 'layout');
```