import { expect, test } from '@playwright/test';
import { localSessionCookieName } from '../support/local-session';
import { authoringRuntime } from './browser-runtime.mjs';

test('[CONT-003][CONT-010][CAMP-004] imported category choices match the saved draft and explain approval mismatches', async ({ page, request }) => {
  test.setTimeout(180000);
  const runtime = await authoringRuntime({ suite: 'import-category' });
  try {
    const opened = await request.post(`${runtime.url}/_authoring/open`, { headers: { 'X-Test-Token': runtime.token } });
    expect(opened.status()).toBe(200);
    await page.context().addCookies([{ name: localSessionCookieName(runtime.url), value: (await opened.json()).token, url: runtime.url }]);
    const api = page.context().request, headers = { Origin: runtime.url };
    const email = 'orchard-reader@example.test', category = 'Orchard notes';
    await page.goto(`${runtime.url}/app/campaigns`);
    await page.getByRole('button', { name: 'New campaign', exact: true }).click();
    await page.getByRole('button', { name: 'Blank newsletter', exact: true }).click();
    await expect(page.getByLabel('Campaign name', { exact: true })).toBeVisible();
    const campaignId = new URL(page.url()).pathname.split('/')[3];
    const read = async () => (await api.get(`${runtime.url}/api/campaigns/${campaignId}`)).json();
    await page.getByLabel('Campaign name', { exact: true }).fill('October orchard letter');
    await page.getByLabel('Consent message category', { exact: true }).fill(category);
    await page.getByLabel('Email subject', { exact: true }).fill('This month at the orchard');
    await page.getByLabel('Email preheader', { exact: true }).fill('News for our orchard readers');
    await page.getByLabel('Email body', { exact: true }).fill('The harvest is ready. Thank you for reading our orchard news.');
    await page.getByLabel('Include 1 field').selectOption('contact:email');
    await page.getByLabel('Include 1 value', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Add email step', exact: true }).click();
    await page.getByLabel('Local send date and time', { exact: true }).fill('2031-04-07T10:00');
    await page.getByRole('button', { name: 'Save full draft', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Draft saved.' })).toBeVisible();

    await page.goto(`${runtime.url}/app/audience/import`);
    await page.getByLabel('Choose CSV files').setInputFiles({ name: 'orchard-readers.csv', mimeType: 'text/csv', buffer: Buffer.from(
      `Email Address,First Name,Optin Time,Confirm Time\r\n${email},Avery,2026-10-06 12:00:00,2026-10-06 12:01:00`,
    ) });
    await page.getByLabel('Preset for orchard-readers.csv').selectOption('csv-subscribed');
    await page.getByLabel('Brand or legal sender').fill('Authoring test');
    await page.getByLabel('Message category', { exact: true }).selectOption(category);
    await page.getByLabel('Disclosed frequency').fill('Monthly');
    await page.getByLabel('Destination jurisdiction').fill('Australia');
    await page.getByLabel('Consent version').fill('orchard-v1');
    await page.getByLabel('Original consent text').fill('I agree to receive monthly orchard notes from Authoring test.');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.getByLabel('Message category', { exact: true })).toHaveValue(category);
    }
    await page.getByRole('button', { name: 'Preview import', exact: true }).click();
    await page.getByRole('button', { name: 'Start import', exact: true }).click();
    await expect(page.locator('.audience-import-job').filter({ hasText: 'completed' })).toHaveCount(1);
    await expect(page.locator('.audience-import-final-action button')).toBeDisabled();

    await page.goto(`${runtime.url}/app/campaigns/${campaignId}/review`);
    const scopeFinding = page.locator('.check-list__item').filter({ has: page.getByText('Match email consent category and sender', { exact: true }) });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      // A case change is a real mismatch: the page must show both exact values.
      const wrongCategory = category.toUpperCase();
      await page.getByLabel('Consent message category', { exact: true }).fill(wrongCategory);
      await page.getByRole('button', { name: 'Save full draft', exact: true }).click();
      await expect(scopeFinding).toBeVisible();
      await expect(scopeFinding).toContainText(JSON.stringify(wrongCategory));
      await expect(scopeFinding).toContainText(JSON.stringify(category));
      await expect(scopeFinding).toContainText('Authoring test');
      const revisionId = (await read()).revision.id;
      const blocked = await api.post(`${runtime.url}/api/campaigns/${campaignId}/approve`, { headers, data: { revisionId, idempotencyKey: crypto.randomUUID() } });
      expect(blocked.status()).toBe(409);
      expect((await blocked.json()).blockers).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'message.email-consent-scope' })]));

      const checked = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/campaigns/${campaignId}/checks`);
      await page.getByLabel('Consent message category', { exact: true }).fill(category);
      await page.getByRole('button', { name: 'Save full draft', exact: true }).click();
      const result = await (await checked).json();
      expect(result.checks).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'message.email-consent-scope', status: 'passed', blocking: false })]));
      await expect(scopeFinding).toBeHidden();
    }
  } finally { await runtime.close(); }
});
