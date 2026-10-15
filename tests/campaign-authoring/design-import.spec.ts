import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { authoringRuntime } from './browser-runtime.mjs';
import { png } from '../support/images';

test.describe.configure({ mode: 'serial', timeout: 180000 });
test.use({ timezoneId: 'America/Los_Angeles' });

// The real 12ui LayerDoc of the orchard design (signed artifact links redacted). The candidate image is
// synthetic pixels at the LayerDoc's canvas size: the import crops whatever the PNG holds.
const layerdoc = readFileSync(new URL('./fixtures/orchard.layerdoc.json', import.meta.url), 'utf8');
const candidate = Buffer.from(png(JSON.parse(layerdoc).canvas.width, JSON.parse(layerdoc).canvas.height, 5));
const publicOrigin = 'https://mango.example.test', destination = 'https://shop.example.test/season';
const files = (page: Page, doc: string) => Promise.all([
  page.getByLabel('LayerDoc', { exact: true }).setInputFiles({ name: 'B.layerdoc.json', mimeType: 'application/json', buffer: Buffer.from(doc) }),
  page.getByLabel('Design image', { exact: true }).setInputFiles({ name: 'B.png', mimeType: 'image/png', buffer: candidate }),
]);

for (const width of [1440, 390]) test(`[DESIGN-004] a 12ui LayerDoc imports as an unsaved draft body that passes every approval check at ${width}px`, async ({ page, request }, testInfo) => {
  const runtime = await authoringRuntime({ suite: 'design-import', vars: { MANGO_PUBLIC_BASE_URL: publicOrigin, AUTHORING_LINK_HOST: 'shop.example.test' } });
  try {
    await page.setViewportSize({ width, height: 1000 });
    const open = await request.post(runtime.url + '/_authoring/open', { headers: { 'X-Test-Token': runtime.token } });
    expect(open.status(), await open.text()).toBe(200);
    await page.context().addCookies([{ name: 'operator_session_local', value: (await open.json()).token, url: runtime.url }]);
    const outbound: string[] = [], uploads: string[] = [], saves: string[] = [];
    page.on('request', item => {
      if (!item.url().startsWith(runtime.url)) outbound.push(item.url());
      if (item.method() === 'POST' && new URL(item.url()).pathname === '/api/campaign-assets') uploads.push(item.url());
      if (item.method() === 'PATCH' && item.url().includes('/api/campaign-revisions/')) saves.push(item.url());
    });
    // The draft is seeded through the product's own API with the operator's session.
    const api = page.context().request, headers = { Origin: runtime.url };
    const created = await (await api.post(runtime.url + '/api/campaigns', { headers, data: {} })).json();
    const read = async () => (await api.get(`${runtime.url}/api/campaigns/${created.campaignId}`)).json();
    const seeded = await api.patch(`${runtime.url}/api/campaign-revisions/${created.revisionId}`, { headers, data: {
      name: 'Orchard letter', emailSubject: 'Good Things Are Ripening', preheader: 'Seasonal news from the orchard', emailBody: '<p>An earlier draft.</p>',
      inclusionRuleJson: JSON.stringify({ version: 1, operator: 'all', predicates: [{ sourceType: 'contact', field: 'email', comparator: 'contains', value: '@example.test' }] }),
      steps: [{ channel: 'email', timezone: 'Australia/Brisbane', localScheduledAt: '2031-04-07T10:00', whyThisTime: 'Operator time' }] } });
    expect(seeded.status(), await seeded.text()).toBe(200);
    await page.goto(`${runtime.url}/app/campaigns/${created.campaignId}/review`);
    const body = page.getByLabel('Email body', { exact: true });
    await expect(body).toBeVisible();
    const savedBody = (await read()).revision.emailBody;

    await page.getByRole('button', { name: 'Import 12ui design', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Import a 12ui design' });
    await expect(dialog.getByLabel('Brief')).toHaveValue(/Good Things Are Ripening/);
    // An unsupported LayerDoc version and a non-HTTPS button are refused visibly; nothing is uploaded or changed.
    await files(page, layerdoc.replace('"version": "2"', '"version": "3"'));
    await dialog.getByLabel('Button destination', { exact: true }).fill(destination);
    await dialog.getByRole('button', { name: 'Import design', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('version');
    await files(page, layerdoc);
    await dialog.getByLabel('Button destination', { exact: true }).fill('javascript:alert(1)');
    await dialog.getByRole('button', { name: 'Import design', exact: true }).click();
    await expect(dialog.getByRole('alert').first()).toContainText('HTTPS');
    expect(uploads).toEqual([]);

    await dialog.getByLabel('Button destination', { exact: true }).fill(destination);
    const confirm = page.getByRole('alertdialog', { name: 'Replace the email body?' });
    const summaries = page.locator('section.design-import-summary');
    await dialog.getByRole('button', { name: 'Import design', exact: true }).click();
    await confirm.getByRole('button', { name: 'Replace', exact: true }).click();
    // The first import crops and uploads four photos through a cold Worker route; on a loaded machine that takes longer than the default wait.
    await expect(summaries).toHaveCount(1, { timeout: 30000 });
    // Discard changes brings the saved body back, and the summary of the discarded import goes with it.
    await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
    await expect(summaries).toHaveCount(0);
    expect(await body.evaluate(element => element instanceof HTMLTextAreaElement ? element.value : element.innerHTML)).not.toContain('<img');

    await page.getByRole('button', { name: 'Import 12ui design', exact: true }).click();
    await files(page, layerdoc);
    await dialog.getByLabel('Button destination', { exact: true }).fill(destination);
    await dialog.getByRole('button', { name: 'Import design', exact: true }).click();
    await confirm.getByRole('button', { name: 'Replace', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Check the imported email before you save' })).toBeVisible();
    await expect(dialog).toHaveCount(0);
    const summary = page.getByRole('region', { name: 'Check the imported email before you save' });
    await expect(summary.locator('mark').filter({ hasText: 'Our early varieties are ready' })).toBeVisible();
    await expect(summary.locator('mark').filter({ hasText: 'Good Things' })).toHaveCount(0);
    await expect(summary).toContainText('Gold sun ornament');
    // The operator sees the hosted crops themselves, not only the design's descriptions of them.
    const thumbnails = summary.locator('.design-import-images img');
    await expect(thumbnails).toHaveCount(4);
    for (const thumbnail of await thumbnails.all()) {
      await expect(thumbnail).toBeVisible();
      await expect.poll(() => thumbnail.evaluate(element => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      expect(await thumbnail.getAttribute('src')).toMatch(/^\/media\/[0-9a-f]{64}$/);
    }
    await expect(summary).toContainText('123 Orchard Lane');
    await expect(summary).toContainText(destination);
    const imported = await body.inputValue();
    expect(imported).toContain(`href="${destination}"`);
    expect(imported).not.toMatch(/<mark|12ui\.com|123 Orchard Lane/);
    // Two imports of four photos each; the second stores nothing new.
    expect(uploads).toHaveLength(8);
    // Unsaved: nothing saved the draft (the import form's submit stays in its own form), and the saved revision is untouched until Save.
    expect(saves).toEqual([]);
    expect((await read()).revision.emailBody).toBe(savedBody);
    await expect(page.getByRole('status').filter({ hasText: 'Unsaved changes' })).toBeVisible();

    await page.getByRole('button', { name: 'Save full draft', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Draft saved.' })).toBeVisible();
    // Once saved, the summary stops asking for a save and keeps the lines to review.
    await expect(summary).toHaveCount(0);
    await expect(summaries.locator('mark').filter({ hasText: 'Our early varieties are ready' })).toBeVisible();
    const detail = await read();
    expect(detail.campaign.state).toBe('draft');
    expect(detail.revision.emailBody).toBe(imported);
    expect(detail.revision.emailBody.match(/\{\{unsubscribe_url\}\}/g)).toHaveLength(1);
    expect(detail.revision.emailBody.match(/\{\{physical_address\}\}/g)).toHaveLength(1);
    expect(detail.revision.emailText.match(/\{\{unsubscribe_url\}\}/g)).toHaveLength(1);
    expect(detail.links.map((link: { destinationUrl: string }) => link.destinationUrl)).toEqual([destination]);
    const sources = [...detail.revision.emailBody.matchAll(/<img src="([^"]+)"/g)].map(match => match[1]);
    expect(sources).toHaveLength(4);
    for (const source of sources) {
      const url = new URL(source);
      expect(url.origin).toBe(publicOrigin);
      const served = await request.get(runtime.url + url.pathname);
      expect(served.status()).toBe(200);
      expect(url.pathname).toBe(`/media/${createHash('sha256').update(await served.body()).digest('hex')}`);
    }
    const preview = page.getByRole('region', { name: 'Saved revision previews' });
    await expect(preview.getByRole('alert')).toHaveCount(0);
    await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('h1')).toContainText('Good Things');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`design-import-${width}.png`), fullPage: true });

    await page.getByRole('button', { name: 'Approve & schedule', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button',{name:'Approve & schedule'}).click();
    await expect(page.getByRole('status').filter({ hasText: 'exact saved revision is approved and scheduled' })).toBeVisible();
    expect((await read()).campaign.state).toBe('scheduled');
    expect(outbound).toEqual([]);
  } finally { await runtime.close(); }
});
