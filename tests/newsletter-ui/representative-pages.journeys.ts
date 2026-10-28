import { expect, test, type Page } from '@playwright/test';
import { signInAsLocalOperator, expectDocumentToFit, expectNoSeriousAxeViolations, expectWithinViewportWidth, expectReason, expectOutcomeInView } from './browser-checks';
import { expectCampaignAxe } from './campaign-axe';
import { localBootstrapToken } from '../local-bootstrap.js';
import { localSessionCookieName } from '../support/local-session';
import { openPage } from '../support/navigation';

type PhoneState = { name: string; visit: () => Promise<unknown>; check?: () => Promise<void> };

async function audit(page: Page, name: string) {
  await expect(page.locator('main h1').first()).toBeVisible();
  if (await page.locator('.insights-page').count()) {
    await expect(page.locator('[data-overview-period]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Export campaign performance CSV', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Customer retention', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Daily list growth by source', exact: true })).toBeVisible();
  }
  if (await page.getByRole('region', { name: 'Activity entries', exact: true }).count()) {
    await expect(page.getByRole('region', { name: 'Activity entries', exact: true })).toHaveAttribute('aria-busy', 'false');
  }
  if (await page.locator('.flow-page').count()) await expect(page.getByRole('status')).toHaveCount(1);
  const outcome = page.locator('.page-head__lead, .page-head__meta, .flow-page .page-head [role="status"], .load-state[role="alert"]').first();
  if (await outcome.count()) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await expectOutcomeInView(outcome);
    await expectReason(outcome);
  }
  await expectDocumentToFit(page, 390);
  if (await page.locator('iframe[title="Saved email preview"]').count()) await expectCampaignAxe(page, name);
  else await expectNoSeriousAxeViolations(page, name);
  await test.info().attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  console.log(`MOBILE_STATE ${name} fit=390 axe=clear`);
}

async function menuStates(page: Page): Promise<PhoneState[]> {
  await expect(page.locator('main h1').first()).toBeVisible();
  const menu = page.getByRole('button', { name: /^Menu/ });
  const navigation = page.getByRole('navigation', { name: 'Operator navigation' });
  await menu.focus();
  await menu.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('link').first()).toBeFocused();
  const destinations = await navigation.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')!));
  await expectDocumentToFit(page, 390);
  await expectNoSeriousAxeViolations(page, 'operator-menu-open');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
  return destinations.map(href => ({
    name: `menu ${href}`,
    visit: async () => {
      await menu.focus();
      await menu.press('Enter');
      await navigation.locator(`a[href="${href}"]`).click();
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await expect(page).toHaveURL(url => url.pathname === href);
    },
  }));
}

// One data-driven phone smoke retains the public doors and visits every menu destination and detail page.
test('[BASE-ACCESS-002] [MOBILE-001] representative public and every operator page fit with accessible phone states', async ({ page, request }) => {
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/docs', '/docs/install', '/docs/getting-started', '/signin']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectDocumentToFit(page, 390);
    await expectNoSeriousAxeViolations(page, route);
    await test.info().attach(route === '/' ? 'lobby-390' : route.replaceAll('/', '-'), { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    if (route === '/docs/getting-started') {
      const contents = page.getByRole('navigation', { name: 'Documentation' }).locator('summary').filter({ visible: true });
      await contents.focus();
      await contents.press('Enter');
      await expect(page.locator('details[open] [aria-current="page"]')).toBeVisible();
      await expectDocumentToFit(page, 390);
      await expectNoSeriousAxeViolations(page, 'docs-contents-open');
    }
  }
  async function* phoneStates(): AsyncGenerator<PhoneState> {
    await signInAsLocalOperator(page, request);
    await openPage(page, '/app');
    const states = await menuStates(page);
    const draft = '/app/campaigns/campaign_table_runner_draft_v4';
    const contact = '/app/audience/contact_alex_v4';
    states.push(
      { name: 'subscribe', visit: () => openPage(page, '/subscribe') },
      { name: 'campaign starters open', visit: async () => {
        await openPage(page, '/app/campaigns');
        await page.getByRole('button', { name: 'New campaign', exact: true }).click();
        await expect(page.getByRole('region', { name: 'Choose a campaign starter' })).toBeVisible();
      } },
      { name: 'draft detail', visit: () => openPage(page, draft) },
      { name: 'draft template panel open', visit: async () => {
        await page.getByRole('button', { name: 'Save as a template', exact: true }).click();
        await expect(page.getByLabel('Template name', { exact: true })).toBeVisible();
      } },
      { name: 'draft mobile email preview', visit: async () => {
        await page.getByRole('button', { name: 'Mobile email', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Mobile email', exact: true })).toHaveAttribute('aria-pressed', 'true');
      } },
      { name: 'review blocked', visit: () => openPage(page, `${draft}/review`), check: async () => {
        await expectReason(page.locator('#approval-blocked-reason[role="status"]'));
        await expect(page.getByRole('button', { name: 'Approve & schedule', exact: true })).toBeDisabled();
      } },
      { name: 'review test panel open', visit: async () => {
        const disclosure = page.getByRole('button', { name: 'Send a test', exact: true });
        await disclosure.click();
        await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
        await expect(page.getByRole('form', { name: 'Send a test', exact: true })).toBeVisible();
      } },
      { name: 'scheduled view', visit: () => openPage(page, '/app/campaigns/campaign_sample_scheduled_v4/scheduled') },
      { name: 'audience property fields', visit: async () => {
        await openPage(page, '/app/audience');
        await page.getByRole('button', { name: 'Add property', exact: true }).click();
        await expect(page.getByLabel('Property 1 name', { exact: true })).toBeVisible();
      } },
      { name: 'contact detail', visit: () => openPage(page, contact) },
      { name: 'contact merge dialog', visit: async () => {
        await page.getByRole('button', { name: 'Merge into another contact', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
      } },
      { name: 'import form', visit: () => openPage(page, '/app/audience/import') },
      { name: 'import validation refusal', visit: async () => {
        const form = page.getByRole('form', { name: 'Audience import mapping' });
        await form.getByRole('button', { name: 'Preview import', exact: true }).click();
        await expectReason(form.getByRole('alert'));
      } },
      { name: 'settings disclosures open', visit: async () => {
        await openPage(page, '/app/settings');
        for (const control of await page.locator('main button[aria-expanded="false"]').all()) await control.click();
        for (const summary of await page.locator('main details:not([open]) > summary').all()) await summary.click();
      } },
    );
    yield* states;

    const token = await localBootstrapToken();
    const headers = { 'X-Mango-Authoring-Fixture': token, 'X-Test-Token': token, Origin: new URL(page.url()).origin };
    await page.context().setExtraHTTPHeaders(headers);
    const open = await page.request.get('/_authoring/open', { headers });
    await expect(open).toBeOK();
    const session = await open.json();
    await page.context().addCookies([{ name: localSessionCookieName(open.url()), value: session.token, domain: '127.0.0.1', path: '/' }]);
    yield { name: 'store without synced records', visit: async () => {
      await openPage(page, '/app/store');
      await expect(page.locator('.store-source').first()).toBeVisible();
      for (const card of await page.locator('.store-source').all()) {
        await expectReason(card.getByRole('status'));
        await expectReason(card.locator('.store-source__meta'));
        await expect(card.locator('.status-pill--needs-sync')).toBeVisible();
      }
    } };
    const source = await page.request.get('/_authoring/source', { headers });
    await expect(source).toBeOK();
    await openPage(page, '/app');
    const fixtureStates = await menuStates(page);
    let approvedCampaign: { campaignId: string; revisionId: string };
    fixtureStates.push(
      { name: 'dashboard empty', visit: () => openPage(page, '/app'), check: async () => {
        await expect(page.locator('.desk-empty')).toBeVisible();
      } },
      { name: 'dashboard populated', visit: async () => {
        await expect(await page.request.get('/_authoring/proposal', { headers })).toBeOK();
        await openPage(page, '/app');
        await expect(page.locator('.decision-desk__proposals')).toBeVisible();
      } },
      { name: 'review approval dialog', visit: async () => {
        const defaults = await page.request.get('/api/campaign-authoring', { headers });
        await expect(defaults).toBeOK();
        const { sender } = await defaults.json();
        const created = await page.request.post('/api/campaigns', { headers, data: { composition: {
          ...sender, name: 'synthetic-mango-175', emailSubject: 'synthetic-mango-176', preheader: 'synthetic-mango-177',
          emailBody: '<p>synthetic-mango-178</p>', emailText: 'synthetic-mango-178', messageCategory: 'newsletter',
          audienceRule: 'Subscribed contacts',
          inclusionRuleJson: JSON.stringify({ version: 1, operator: 'all', predicates: [{ sourceType: 'contact', field: 'emailStatus', comparator: 'eq', value: 'subscribed' }] }),
          exclusionRulesJson: '[]', steps: [{ channel: 'email', timezone: 'UTC', scheduledAt: '2031-10-28T10:00:00.000Z', sendByAt: '2031-10-28T12:00:00.000Z', whyThisTime: 'Operator selected time' }],
        } } });
        await expect(created).toBeOK();
        approvedCampaign = await created.json();
        await openPage(page, `/app/campaigns/${approvedCampaign.campaignId}/review`);
        const approve = page.getByRole('button', { name: 'Approve & schedule', exact: true });
        await expect(approve).toBeEnabled();
        await approve.click();
        await expect(page.getByRole('alertdialog')).toBeVisible();
        await expectWithinViewportWidth(page.getByRole('alertdialog'));
      } },
      { name: 'scheduled cancellation dialog', visit: async () => {
        await page.keyboard.press('Escape');
        const approved = await page.request.post(`/api/campaigns/${approvedCampaign.campaignId}/approve`, { headers, data: { revisionId: approvedCampaign.revisionId, idempotencyKey: 'synthetic-mango-179' } });
        await expect(approved).toBeOK();
        await openPage(page, `/app/campaigns/${approvedCampaign.campaignId}/scheduled`);
        await page.getByRole('button', { name: 'Cancel campaign', exact: true }).click();
        await expect(page.getByRole('alertdialog')).toBeVisible();
        await expectWithinViewportWidth(page.getByRole('alertdialog'));
      } },
      { name: 'insights empty figures and report preview', visit: async () => {
        await openPage(page, '/app/insights');
        await page.getByRole('button', { name: 'Preview last 7 UTC days', exact: true }).click();
        await expect(page.getByRole('region', { name: 'Saved report preview' })).toBeVisible();
        await expectReason(page.locator('#saved-reports').getByRole('status'));
      } },
      { name: 'insights invalid period', visit: async () => {
        await page.getByLabel('Overview from (UTC)', { exact: true }).fill('2031-10-10');
        await page.getByLabel('Overview through (UTC)', { exact: true }).fill('2031-10-09');
        await page.getByRole('button', { name: 'Apply overview dates', exact: true }).click();
        await expectReason(page.getByRole('region', { name: 'Marketing overview' }).getByRole('alert'));
      } },
      { name: 'store stale source', visit: async () => {
        await expect(await page.request.get('/_authoring/stale', { headers })).toBeOK();
        await openPage(page, '/app/store');
        const product = page.getByRole('article', { name: 'Product sync' });
        await expectReason(product.getByRole('status'));
        await expect(product.locator('.status-pill--needs-sync')).toBeVisible();
      } },
      { name: 'flow empty draft', visit: () => openPage(page, '/app/flows'), check: async () => {
        await expect(page.getByRole('combobox', { name: 'Saved revision', exact: true }).locator('option[value]:not([value=""])')).toHaveCount(0);
        await expectOutcomeInView(page.locator('.flow-page .page-head p'));
      } },
      { name: 'flow validation refusal', visit: async () => {
        await page.getByRole('button', { name: 'Save draft revision', exact: true }).click();
        await expectReason(page.getByRole('alert'));
        await expectOutcomeInView(page.getByRole('alert'));
      } },
      { name: 'flow populated keyboard canvas and details', visit: async () => {
        const graph = { name: 'synthetic-mango-171', trigger: 'Subscription confirmed', nodes: [
          { id: 'synthetic-mango-172', kind: 'trigger', label: 'synthetic-mango-172', next: ['synthetic-mango-173'] },
          { id: 'synthetic-mango-173', kind: 'exit', label: 'synthetic-mango-173', next: [] },
        ] };
        const saved = await page.request.post('/api/flow-drafts', { headers, data: graph });
        await expect(saved).toBeOK();
        const { revisionId } = await saved.json();
        await openPage(page, '/app/flows');
        await page.getByRole('combobox', { name: 'Saved revision', exact: true }).selectOption(revisionId);
        const canvas = page.getByRole('region', { name: 'Flow canvas', exact: true });
        const details = page.getByRole('group', { name: 'Node details', exact: true });
        await expectWithinViewportWidth(canvas);
        await expectWithinViewportWidth(details);
        await canvas.focus();
        const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
        const start = await canvas.evaluate(element => ({ x: element.scrollLeft, y: element.scrollTop }));
        await canvas.press('ArrowRight');
        await expect.poll(() => canvas.evaluate(element => element.scrollLeft)).toBeGreaterThan(start.x);
        await canvas.press('ArrowDown');
        await expect.poll(() => canvas.evaluate(element => element.scrollTop)).toBeGreaterThan(start.y);
        expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(scroll);
        await canvas.press('Tab');
        await expect(canvas.getByRole('button').first()).toBeFocused();
        await page.keyboard.press('Tab');
        const selected = canvas.getByRole('button').nth(1);
        await expect(selected).toBeFocused();
        await selected.press('Enter');
        await expect(selected).toHaveAttribute('aria-pressed', 'true');
        await expect(selected).toBeInViewport({ ratio: 1 });
        await details.scrollIntoViewIfNeeded();
        await expect(details.getByLabel('Node name', { exact: true })).toHaveValue(await selected.innerText());
        await expectWithinViewportWidth(details.getByLabel('Node name', { exact: true }));
        await expectReason(details.locator(':scope > p').first());
        await expect(details.getByLabel('Node name', { exact: true })).toBeInViewport({ ratio: 1 });
        await expect(details.locator(':scope > p').first()).toBeInViewport({ ratio: 1 });
        await expectReason(page.getByRole('status'));
      } },
      { name: 'flow saved draft clears an obsolete refusal', visit: async () => {
        await page.getByRole('button', { name: 'Add node', exact: true }).click();
        await page.getByRole('button', { name: 'Save draft revision', exact: true }).click();
        await expectReason(page.getByRole('alert'));
        const response = await page.request.get('/api/flow-drafts', { headers });
        await expect(response).toBeOK();
        const { revisions } = await response.json();
        await page.getByRole('combobox', { name: 'Saved revision', exact: true }).selectOption(revisions[0].id);
        await expect(page.getByLabel('Flow name', { exact: true })).toHaveValue(revisions[0].graph.name);
        await expect(page.getByRole('alert')).toHaveCount(0);
        await expectReason(page.getByRole('status'));
      } },
      { name: 'activity populated', visit: () => openPage(page, '/app/settings/activity'), check: async () => {
        await expect(page.getByRole('region', { name: 'Activity entries' })).toHaveAttribute('aria-busy', 'false');
        await expect(page.getByRole('region', { name: 'Activity log table' })).toBeVisible();
      } },
      { name: 'activity empty filter', visit: async () => {
        await page.getByRole('textbox', { name: 'Action', exact: true }).fill('synthetic-mango-174');
        await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
        await expect(page.getByRole('region', { name: 'Activity entries' })).toHaveAttribute('aria-busy', 'false');
        await expect(page.getByRole('region', { name: 'Activity log table' })).toHaveCount(0);
        await expectReason(page.getByRole('region', { name: 'Activity entries' }).locator('p'));
      } },
    );
    for (const [route, resource] of [
      ['/app', '/api/decision-desk'], ['/app/flows', '/api/flow-drafts'], ['/app/insights', '/api/insights'],
      ['/app/store', '/api/store'], ['/app/settings/activity', '/api/activity'],
    ]) fixtureStates.push({ name: `unavailable ${route}`, visit: async () => {
      await page.context().setExtraHTTPHeaders({ ...headers, 'X-Test-Unavailable-Resource': resource });
      await openPage(page, route);
      await expectReason(page.getByRole('alert').first());
    } });
    const unavailableDetails: Array<[string, () => string, () => string]> = [
      ['campaign list', () => '/app/campaigns', () => '/api/campaigns'],
      ['campaign detail', () => '/app/campaigns/' + approvedCampaign.campaignId, () => '/api/campaigns/' + approvedCampaign.campaignId],
      ['campaign review', () => '/app/campaigns/' + approvedCampaign.campaignId + '/review', () => '/api/campaigns/' + approvedCampaign.campaignId + '/review'],
      ['campaign schedule', () => '/app/campaigns/' + approvedCampaign.campaignId + '/scheduled', () => '/api/campaigns/' + approvedCampaign.campaignId],
      ['audience list', () => '/app/audience', () => '/api/audience'],
      ['import presets', () => '/app/audience/import', () => '/api/audience/import-presets'],
      ['settings identity', () => '/app/settings', () => '/api/operator'],
    ];
    for (const [name, route, resource] of unavailableDetails) fixtureStates.push({ name: 'unavailable ' + name, visit: async () => {
      await page.context().setExtraHTTPHeaders({ ...headers, 'X-Test-Unavailable-Resource': resource() });
      await openPage(page, route());
      await expectReason(page.getByRole('alert').first());
    } });
    yield* fixtureStates.map(state => ({ ...state, visit: async () => {
      await page.context().setExtraHTTPHeaders(headers);
      await state.visit();
    } }));

    await page.context().setExtraHTTPHeaders(headers);
    const colleague = await page.request.get('/_advisory/second-operator', { headers });
    await expect(colleague).toBeOK();
    const reader = await colleague.json();
    const role = await page.request.put(`/api/operators/${reader.operator.id}/role`, { headers, data: { role: 'analyst' } });
    await expect(role).toBeOK();
    await page.context().addCookies([{ name: localSessionCookieName(colleague.url()), value: reader.token, domain: '127.0.0.1', path: '/' }]);
    const contacts = await page.request.get('/api/audience', { headers });
    await expect(contacts).toBeOK();
    const contactRecord = (await contacts.json()).contacts[0];
    const readOnlyStates: PhoneState[] = [
      { name: 'dashboard redirects a reader to reports', visit: () => openPage(page, '/app'), check: async () => {
        await expect(page).toHaveURL(url => url.pathname === '/app/insights');
      } },
      { name: 'flow read only', visit: () => openPage(page, '/app/flows'), check: async () => {
        await page.getByRole('combobox', { name: 'Saved revision', exact: true }).selectOption({ index: 1 });
        await expect(page.getByRole('group', { name: 'Node details', exact: true }).getByLabel('Node name', { exact: true })).toHaveAttribute('readonly', '');
        await expect(page.getByLabel('Flow name', { exact: true })).toHaveAttribute('readonly', '');
        await expect(page.getByRole('button', { name: 'Save draft revision', exact: true })).toBeDisabled();
        await expectOutcomeInView(page.locator('.flow-page .page-head p'));
      } },
      { name: 'insights read only', visit: () => openPage(page, '/app/insights'), check: async () => {
        await expect(page.getByRole('button', { name: 'Save attribution and recalculate', exact: true })).toHaveCount(0);
      } },
      ...['/app/campaigns', '/app/audience', '/app/settings'].map(route => ({ name: 'reader ' + route, visit: () => openPage(page, route) })),
      { name: 'reader campaign detail', visit: () => openPage(page, '/app/campaigns/' + approvedCampaign.campaignId) },
      { name: 'reader campaign review', visit: () => openPage(page, '/app/campaigns/' + approvedCampaign.campaignId + '/review'), check: async () => {
        await expect(page.locator('#campaign-composer')).toHaveCount(0);
        await expect(page.locator('iframe[title="Saved email preview"]')).toBeVisible();
      } },
      { name: 'reader campaign schedule', visit: () => openPage(page, '/app/campaigns/' + approvedCampaign.campaignId + '/scheduled') },
      { name: 'reader masked contact', visit: () => openPage(page, '/app/audience/' + contactRecord.id), check: async () => {
        await expect(page.getByRole('button', { name: 'Merge into another contact', exact: true })).toHaveCount(0);
      } },
      ...['/app/store', '/app/settings/activity', '/app/audience/import'].map(route => ({ name: `role refusal ${route}`, visit: async () => {
        await openPage(page, route);
        await expectReason(page.getByRole('alert').first());
      } })),
    ];
    yield* readOnlyStates;
  }
  for await (const state of phoneStates()) await test.step(state.name, async () => {
    await state.visit();
    await state.check?.();
    await audit(page, state.name);
  });
});
