import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { localBootstrapToken } from '../local-bootstrap.js';

async function signInAsLocalOperator(page, request) {
  const response = await request.post('/api/_local/bootstrap', {
    headers: { 'X-Mango-Local-Bootstrap-Token': await localBootstrapToken() },
    data: { testSession: true },
  });
  await expect(response).toBeOK();
  const { session } = await response.json();
  await page.context().addCookies([
    { name: 'operator_session_local', value: session.token, domain: '127.0.0.1', path: '/' },
  ]);
}

async function expectDocumentToFit(page, width) {
  const measurements = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(measurements.viewport).toBe(width);
  expect(Math.max(measurements.document, measurements.body)).toBeLessThanOrEqual(width);
}

async function expectCampaignRows(page, campaigns) {
  const rows = page.locator('a.campaign-row');
  await expect(rows).toHaveCount(campaigns.length);
  const paths = await rows.evaluateAll((links) => links.map((link) => new URL(link.href).pathname));
  expect(paths).toEqual(campaigns.map((campaign) => (
    `/app/campaigns/${encodeURIComponent(campaign.id)}${campaign.state === 'draft' ? '/review' : ''}`
  )));

  for (const [index, row] of (await rows.all()).entries()) {
    await expect(row).toBeVisible();
    await expect(row.locator('strong')).toBeVisible();
    await expect(row.locator('strong')).toHaveText(campaigns[index].name);
    await expect(row.locator('.campaign-row__content > span')).toBeVisible();
    await expect(row.locator('.status-pill')).toBeVisible();
    await expect(row.locator('small')).toBeVisible();
    expect((await row.locator('small').innerText()).trim()).not.toBe('');
  }
}

async function expectTitleAndMetadataSeparated(row) {
  const layout = await row.evaluate((link) => {
    const title = link.querySelector('strong');
    const metadata = link.querySelector('.campaign-row__meta');
    const titleBounds = title.getBoundingClientRect();
    const metadataBounds = metadata.getBoundingClientRect();
    return {
      textFits: title.scrollWidth <= title.clientWidth,
      overlaps: !(
        titleBounds.right <= metadataBounds.left
        || titleBounds.left >= metadataBounds.right
        || titleBounds.bottom <= metadataBounds.top
        || titleBounds.top >= metadataBounds.bottom
      ),
    };
  });
  expect(layout.textFits).toBe(true);
  expect(layout.overlaps).toBe(false);
}

test('campaign history wraps saved names and long identifiers at desktop and mobile widths', async ({ page, request }, testInfo) => {
  await signInAsLocalOperator(page, request);
  const captures = [];

  // The collection response carries every name, so rows never wait on per-campaign
  // detail requests and never show an identifier in place of a name.
  const detailRequests = [];
  page.on('request', (observed) => {
    if (observed.method() === 'GET' && /^\/api\/campaigns\/[^/]+$/.test(new URL(observed.url()).pathname)) detailRequests.push(observed.url());
  });

  for (const { width, height } of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize({ width, height });
    detailRequests.length = 0;
    const collectionResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === 'GET' && url.pathname === '/api/campaigns';
    });
    await page.goto(`/app/campaigns?responsive-proof=${width}`);
    const collection = await collectionResponse;
    expect(collection.ok()).toBe(true);
    const { campaigns } = await collection.json();
    expect(campaigns.length).toBeGreaterThan(0);
    await expect(page.getByRole('heading', { name: 'Campaigns', exact: true })).toBeVisible();
    await expect(page.getByText(`${campaigns.length} saved campaigns`, { exact: true })).toBeVisible();
    await expectCampaignRows(page, campaigns);
    expect(detailRequests).toEqual([]);

    const longIdentifierIndex = campaigns.reduce((longestIndex, campaign, index) => (
      longestIndex < 0 || campaign.id.length > campaigns[longestIndex].id.length ? index : longestIndex
    ), -1);
    const longNameIndex = campaigns.reduce((longestIndex, campaign, index) => (
      campaign.name && (longestIndex < 0 || campaign.name.length > campaigns[longestIndex].name.length) ? index : longestIndex
    ), -1);
    expect(campaigns[longIdentifierIndex].id.length).toBeGreaterThan(20);
    expect(longNameIndex).toBeGreaterThanOrEqual(0);
    expect(campaigns[longNameIndex].name.length).toBeGreaterThan(20);

    for (const row of await page.locator('a.campaign-row').all()) {
      await expectTitleAndMetadataSeparated(row);
    }
    await expectDocumentToFit(page, width);

    const nameRow = page.locator('a.campaign-row').nth(longNameIndex);
    await expect(nameRow.locator('strong')).toHaveText(campaigns[longNameIndex].name);
    await expectTitleAndMetadataSeparated(nameRow);

    const screenshotPath = testInfo.outputPath(`campaigns-${width}-revision.jpg`);
    await page.screenshot({ path: screenshotPath, type: 'jpeg', quality: 88, fullPage: true });
    await testInfo.attach(`campaigns-${width}-revision`, { path: screenshotPath, contentType: 'image/jpeg' });
    captures.push({ file: `campaigns-${width}-revision.jpg`, state: 'saved-revision-name', viewport: { width, height } });

    const identifierRow = page.locator('a.campaign-row').nth(longIdentifierIndex);
    await identifierRow.click();
    const campaign = campaigns[longIdentifierIndex];
    const expectedPath = `/app/campaigns/${encodeURIComponent(campaign.id)}${campaign.state === 'draft' ? '/review' : ''}`;
    await expect.poll(() => new URL(page.url()).pathname).toBe(expectedPath);
    await expect(page.getByText(campaign.name, { exact: true }).first()).toBeVisible();
  }

  const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const manifestPath = testInfo.outputPath('manifest.json');
  await writeFile(manifestPath, `${JSON.stringify({ sourceSha, page: '/app/campaigns', captures }, null, 2)}\n`);
  await testInfo.attach('campaigns-responsive-manifest', { path: manifestPath, contentType: 'application/json' });
});
