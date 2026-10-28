import { openPage } from '../support/navigation';
import { localSessionCookieName } from '../support/local-session';
import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { authoringRuntime } from './browser-runtime.mjs';
import { png } from '../support/images';

test.describe.configure({ timeout: 180000 });

// A copy running on a computer, as `rer dev` starts it: the public origin is the runtime's own http address.
test('[CAMP-023] on a local copy, Insert image adds an own-origin image that saves, previews after opt-in and blocks only approval', async ({ page, request }) => {
  const runtime = await authoringRuntime({ suite: 'local-images', vars: (url: string) => ({ MANGO_PUBLIC_BASE_URL: url }) });
  try {
    const open = await request.post(runtime.url + '/_authoring/open', { headers: { 'X-Test-Token': runtime.token } });
    expect(open.status(), await open.text()).toBe(200);
    await page.context().addCookies([{ name: localSessionCookieName(runtime.url), value: (await open.json()).token, url: runtime.url }]);
    const outbound: string[] = [];
    page.on('request', item => { if (!item.url().startsWith(runtime.url)) outbound.push(item.url()); });
    const api = page.context().request, headers = { Origin: runtime.url };
    const created = await (await api.post(runtime.url + '/api/campaigns', { headers, data: {} })).json();
    const seeded = await api.patch(`${runtime.url}/api/campaign-revisions/${created.revisionId}`, { headers, data: { name: 'Orchard letter', emailBody: '<p>Harvest news.</p>' } });
    expect(seeded.status(), await seeded.text()).toBe(200);
    await openPage(page, `${runtime.url}/app/campaigns/${created.campaignId}/review`);

    // A photo wider than the email is shown at the email's width, keeping its proportions.
    const image = png(800, 400, 3), hash = createHash('sha256').update(image).digest('hex');
    await page.getByRole('button', { name: 'HTML mode', exact: true }).click();
    await page.getByRole('button', { name: 'Insert image', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Insert an image' });
    await dialog.getByLabel('Image file', { exact: true }).setInputFiles({ name: 'orchard.png', mimeType: 'image/png', buffer: Buffer.from(image) });
    await dialog.getByLabel('Image description', { exact: true }).fill('Orchard rows');
    await dialog.getByRole('button', { name: 'Upload and insert', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const body = page.getByLabel('Email body', { exact: true });
    const tag = `<img src="${runtime.url}/media/${hash}" width="600" height="300" alt="Orchard rows">`;
    await expect(body).toHaveValue(new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    await page.getByRole('button', { name: 'Save full draft', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Draft saved.' })).toBeVisible();
    const preview = page.getByRole('region', { name: 'Saved revision previews' });
    await expect(preview.getByRole('alert')).toHaveCount(0);
    const frame = page.frameLocator('iframe[title="Saved email preview"]');
    await expect(frame.locator('img')).toHaveCount(0);
    await preview.getByRole('button', { name: 'Load 1 remote image', exact: true }).click();
    // The preview's policy admits the deployment's own http origin once the operator opts in.
    await expect.poll(() => frame.locator('img').evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(800);

    const checks = await (await api.post(`${runtime.url}/api/campaigns/${created.campaignId}/checks`, { headers, data: { revisionId: created.revisionId } })).json();
    const kinds = checks.blockers.map((blocker: { kind: string }) => blocker.kind);
    expect(kinds).toContain('message.content');
    // The own image is verified from storage, without a request to the deployment's own host.
    expect(kinds).not.toContain('message.links.resolved');
    expect(outbound).toEqual([]);
  } finally { await runtime.close(); }
});
