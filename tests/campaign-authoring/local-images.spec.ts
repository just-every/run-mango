import { openPage } from '../support/navigation';
import { localSessionCookieName } from '../support/local-session';
import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { authoringRuntime } from './browser-runtime.mjs';
import { png } from '../support/images';
import { imageSendingJourney } from './image-sending-journey';

test.describe.configure({ timeout: 360000 });

// A copy running on a computer, as `rer dev` starts it: the public origin is the runtime's own http address.
test('[CAMP-023] Insert image requires a description, previews only own HTTP media and requires HTTPS for every sending door', async ({ page, request }, info) => {
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
    const body = page.getByLabel('Email body', { exact: true });
    const beforeImage = '<p>Harvest news.</p>', afterImage = '<p>Until next time.</p>';
    await body.fill(beforeImage + afterImage);
    await body.press('ControlOrMeta+Home');
    for (let at = 0; at < beforeImage.length; at++) await body.press('ArrowRight');
    const readDraft = async () => {
      const response = await api.get(`${runtime.url}/api/campaigns/${created.campaignId}`, { headers });
      expect(response.status(), await response.text()).toBe(200);
      const { campaign, revision, steps, links } = await response.json();
      return { campaign, revision, steps, links };
    };
    const persisted = await readDraft();
    expect(persisted.revision.emailBody).toContain('<p>Harvest news.</p>');
    expect(persisted.revision.emailBody).not.toContain(afterImage);
    const uploads: string[] = [];
    page.on('request', item => {
      if (item.method() === 'POST' && new URL(item.url()).pathname === '/api/campaign-assets') uploads.push(item.url());
    });
    await page.getByRole('button', { name: 'Insert image', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Insert an image' });
    const file = dialog.getByLabel('Image file', { exact: true });
    const description = dialog.getByLabel('Image description', { exact: true });
    await file.setInputFiles({ name: 'orchard.png', mimeType: 'image/png', buffer: Buffer.from(image) });
    for (const missing of ['', '   ']) {
      await description.fill(missing);
      await dialog.getByRole('button', { name: 'Upload and insert', exact: true }).click();
      await expect(dialog).toBeVisible();
      await expect(description).toHaveAttribute('aria-invalid', 'true');
      await expect(description).toBeFocused();
      const errorId = await description.getAttribute('aria-describedby');
      expect(errorId).toBeTruthy();
      await expect(dialog.locator(`[id="${errorId}"]`)).toHaveText('Complete image description.');
      const errorLink = dialog.getByRole('link', { name: 'Image description: Complete image description.', exact: true });
      await expect(errorLink).toHaveAttribute('href', `#${await description.getAttribute('id')}`);
      await file.focus();
      await errorLink.click();
      await expect(description).toBeFocused();
      expect(await file.evaluate(element => Array.from((element as HTMLInputElement).files ?? [], selected => ({ name: selected.name, size: selected.size, type: selected.type })))).toEqual([{ name: 'orchard.png', size: image.byteLength, type: 'image/png' }]);
      await expect(body).toHaveValue(beforeImage + afterImage);
      expect(await readDraft()).toEqual(persisted);
      expect(uploads).toEqual([]);
    }
    await dialog.screenshot({ path: info.outputPath(`image-description-required-${page.viewportSize()!.width}.png`) });
    await description.fill('Orchard rows');
    const uploaded = page.waitForResponse(response => new URL(response.url()).pathname === '/api/campaign-assets' && response.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Upload and insert', exact: true }).click();
    const response = await uploaded;
    expect(response.status(), await response.text()).toBe(201);
    expect((await response.json()).asset).toMatchObject({ sha256: hash, url: `${runtime.url}/media/${hash}`, width: 800, height: 400 });
    const publicImage = await request.get(`${runtime.url}/media/${hash}.png`);
    expect(publicImage.status()).toBe(200);
    expect(publicImage.headers()['content-type']).toBe(['image', 'png'].join('/'));
    expect(await publicImage.body()).toEqual(Buffer.from(image));
    expect((await request.get(`${runtime.url}/media/${hash}.jpg`)).status()).toBe(404);
    await expect(dialog).toHaveCount(0);
    expect(uploads).toEqual([`${runtime.url}/api/campaign-assets`]);
    const tag = `<img src="${runtime.url}/media/${hash}" width="600" height="300" alt="Orchard rows">`;
    await expect(body).toHaveValue(new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await expect(body).toHaveValue(beforeImage + tag + afterImage);
    expect(await readDraft()).toEqual(persisted);

    await page.getByRole('button', { name: 'Save full draft', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Draft saved.' })).toBeVisible();
    expect((await readDraft()).revision.emailBody).toContain(beforeImage + tag + afterImage);
    const preview = page.getByRole('region', { name: 'Saved revision previews' });
    await expect(preview.getByRole('alert')).toHaveCount(0);
    const frame = page.frameLocator('iframe[title="Saved email preview"]');
    await expect(frame.locator('img')).toHaveCount(0);
    await preview.getByRole('button', { name: 'Load 1 remote image', exact: true }).click();
    // The preview's policy admits the deployment's own http origin once the operator opts in.
    await expect.poll(() => frame.locator('img').evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(800);
    await expect(frame.locator('img')).toHaveAttribute('alt', 'Orchard rows');
    // Validated presentation survives the local image exception.
    const styled = `<p style="color:#242821;font-size:16px">Harvest news.</p>${tag}${afterImage}`;
    await body.fill(styled);
    await page.getByRole('button', { name: 'Save full draft', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Draft saved.' })).toBeVisible();
    await expect(frame.locator('p').filter({ hasText: 'Harvest news.' })).toHaveCSS('font-size', '16px');
    await expect(frame.locator('p').filter({ hasText: 'Harvest news.' })).toHaveCSS('color', 'rgb(36, 40, 33)');
    await preview.screenshot({ path: info.outputPath(`local-image-preview-${page.viewportSize()!.width}.png`) });

    // The same media path on another HTTP origin is never an authoring exception.
    const otherOrigin = new URL(runtime.url); otherOrigin.hostname = 'localhost';
    const foreignTag = tag.replace(runtime.url, otherOrigin.origin);
    await body.fill(styled + foreignTag);
    await page.getByRole('button', { name: 'Save full draft', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Draft saved.' })).toBeVisible();
    await expect(preview.getByRole('alert')).toContainText('images at an HTTPS address');
    // The safe own image remains available; the foreign one is removed even after opt-in.
    const load = preview.getByRole('button', { name: 'Load 1 remote image', exact: true });
    if (await load.isVisible()) await load.click();
    await expect(frame.locator('img')).toHaveCount(1);
    await expect(frame.locator('img')).toHaveAttribute('src', `${runtime.url}/media/${hash}`);
    await preview.screenshot({ path: info.outputPath(`foreign-image-refused-${page.viewportSize()!.width}.png`) });
    expect(outbound).toEqual([]);
    await body.fill(styled);
    await page.getByRole('button', { name: 'Save full draft', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Draft saved.' })).toBeVisible();

    const checks = await (await api.post(`${runtime.url}/api/campaigns/${created.campaignId}/checks`, { headers, data: { revisionId: created.revisionId } })).json();
    const kinds = checks.blockers.map((blocker: { kind: string }) => blocker.kind);
    expect(kinds).toContain('message.content');
    // The own image is verified from storage, without a request to the deployment's own host.
    expect(kinds).not.toContain('message.links.resolved');
    const saved = (await readDraft()).revision;
    const approval = await api.post(`${runtime.url}/api/campaigns/${created.campaignId}/approve`, {
      headers, data: { revisionId: created.revisionId, idempotencyKey: 'synthetic-mango-494' },
    });
    expect(approval.status(), await approval.text()).toBe(409);
    expect((await approval.json()).blockers).toContainEqual(expect.objectContaining({ kind: 'message.content', detail: expect.stringContaining('images at an HTTPS address') }));
    const testSend = await api.post(`${runtime.url}/api/campaigns/${created.campaignId}/test-send`, {
      headers, data: { revisionId: created.revisionId, channel: 'email', to: ['author', 'example.test'].join('@') },
    });
    expect(testSend.status(), await testSend.text()).toBe(409);
    expect((await testSend.json()).blockers).toContainEqual(expect.objectContaining({ kind: 'test-send', detail: expect.stringContaining('images at an HTTPS address') }));
    expect((await readDraft()).revision).toEqual(saved);
    const authority = await (await api.get(`${runtime.url}/_authoring/state`, { headers: { 'X-Test-Token': runtime.token } })).json();
    expect(authority.approvals).toEqual([]);
    expect(authority.recipients).toEqual([]);
    expect(authority.jobs.filter((job: {kind: string}) => job.kind === 'campaign.dispatch')).toEqual([]);
    expect(outbound).toEqual([]);
  } finally { await runtime.close(); }
  await imageSendingJourney();
});
