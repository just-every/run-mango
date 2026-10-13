import { evidenceDirectory } from '../tests/support/artifacts.mjs';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { rejectedPresentation } from '../tests/support/adversarial-email.mjs';
const output = evidenceDirectory('email-preview');
await mkdir(output, {recursive:true});
const access = new URL((await readFile('.seed/review-access', 'utf8')).trim());
const scenario = `synthetic-review-preview-${Date.now()}`;
access.searchParams.set('scenario', scenario);
const browser = await chromium.launch({headless: true});
const errors = [], external = [];
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1050}});
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    external.push(url.href);
    // Local fixture response only: no network request leaves this browser.
    return route.fulfill({status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')});
  });
  await page.goto(access.href);
  const frame = page.frameLocator('iframe[title="Saved email preview"]');
  await expect(frame.locator('body')).toContainText('Synthetic offer');
  await expect(frame.locator('body')).toContainText('1 Synthetic Street');
  await expect(frame.locator('a')).not.toHaveAttribute('href');
  const initialUrl = page.url();
  await frame.getByText('Unsubscribe', {exact: true}).click();
  expect(page.url()).toBe(initialUrl);
  expect(external).toEqual([]);
  const footer = '<p>{{physical_address}}</p><a href="{{unsubscribe_url}}">Unsubscribe</a>';
  const malicious = `<p>Adversarial saved content</p><script>parent.__mangoAttack=1</script><form action="https://attack.example.test"><input name="secret"></form><svg onload="parent.__mangoAttack=1"><a href="javascript:alert(1)">Bad SVG</a></svg><link rel="stylesheet" href="https://attack.example.test/style.css"><img src="https://attack.example.test/pixel" width="1" height="1"><img src="https://example.test/offer.png" width="320" height="160" alt="Offer image" onerror="parent.__mangoAttack=1"><a href="jav&#x61;script:alert(1)">Bad link</a>${footer}`;
  async function save() {
    const response = page.waitForResponse(response => response.request().method() === 'PATCH');
    await page.getByRole('button', {name: 'Save full draft', exact: true}).click();
    expect((await response).status()).toBe(200);
    await expect(page.getByRole('status').filter({hasText: 'Draft saved.'})).toBeVisible();
  }
  // Raw HTML is written in HTML mode; the rich editor would type it as text.
  await page.getByRole('button', {name: 'HTML mode', exact: true}).click();
  await page.getByLabel('Email body', {exact: true}).fill(malicious);
  // Unsaved changes must not replace the approved-content preview input.
  await expect(frame.locator('body')).not.toContainText('Adversarial saved content');
  // Its script links are not valid destinations, so the editor refuses to save it; a direct save stores it in canonical form.
  const stored = await page.request.patch(new URL(`/api/campaign-revisions/${scenario}-v1`, access.origin).href, {data: {emailBody: malicious}});
  expect(stored.status()).toBe(200);
  await page.reload();
  await expect(frame.locator('body')).toContainText('Adversarial saved content');
  await expect(frame.locator('script,form,svg,link,input,[onerror],[href]')).toHaveCount(0);
  await expect(frame.locator('img')).toHaveCount(0);
  expect(external).toEqual([]);
  expect(await page.evaluate(() => window.__mangoAttack)).toBeUndefined();
  await page.getByRole('button', {name: 'Load 1 remote image', exact: true}).click();
  await expect(frame.locator('img')).toHaveCount(1);
  await expect.poll(() => external.length).toBe(1);
  expect(external).toEqual(['https://example.test/offer.png']);
  const blocked = await page.request.post(new URL(`/api/campaigns/${scenario}/approve`, access.origin).href, {data: {revisionId: `${scenario}-v1`, idempotencyKey: `blocked-${scenario}`}});
  expect(blocked.status()).toBe(409);
  expect((await blocked.json()).blockers.some(check => check.kind === 'message.content')).toBe(true);
  const safe = `<h2>Hello {{displayName | fallback: "Friend"}}</h2><p><strong>Saved offer</strong></p><p><a href="https://example.test/offer">Offer details</a></p>${footer}`;
  // The adversarial body saved its script links; remove them before adding the real destination.
  const removeLink = page.getByRole('button', {name: /^Remove link \d+$/});
  while (await removeLink.count()) await removeLink.first().click();
  await page.getByRole('button', {name: 'Add destination link', exact: true}).click();
  await page.getByLabel('Link 1 label', {exact: true}).fill('Offer details');
  await page.getByLabel('Link 1 destination', {exact: true}).fill('https://example.test/offer');
  await page.getByRole('button', {name: 'Add destination link', exact: true}).click();
  await page.getByRole('button', {name: 'Remove link 2', exact: true}).click();
  await page.getByLabel('Email body', {exact: true}).fill(safe);
  // The plain-text part is derived from the HTML with the same destinations (read-only in the editor).
  await expect(page.getByLabel('Plain-text email', {exact: true})).toHaveValue(/Offer details \(https:\/\/example\.test\/offer\)/);
  await save();
  await expect(frame.locator('h2')).toHaveText('Hello Alex Example');
  await expect(frame.locator('body')).toContainText('1 Synthetic Street');
  await expect(frame.locator('a').first()).not.toHaveAttribute('href');
  await page.getByRole('button', {name: 'Desktop email', exact: true}).click();
  await page.locator('.message-preview--email').screenshot({path: join(output, 'email-preview-desktop.png'), style: 'header { visibility: hidden !important; }'});
  await page.setViewportSize({width: 390, height: 844});
  await page.getByRole('button', {name: 'Mobile email', exact: true}).click();
  expect(await page.locator('.email-preview-frame').evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(360);
  const subject = 'Saved from mobile';
  await page.getByLabel('Email subject', {exact: true}).fill(subject);
  await page.getByLabel('Email preheader', {exact: true}).fill('Mobile preheader for {{displayName | fallback: "Friend"}}');
  await page.getByLabel('Physical postal address', {exact: true}).fill('2 Saved Street');
  await save();
  await page.reload();
  await expect(page.getByLabel('Email subject', {exact: true})).toHaveValue(subject);
  await expect(frame.locator('h2')).toHaveText('Hello Alex Example');
  await page.getByRole('button', {name: 'Mobile email', exact: true}).click();
  await expect(frame.locator('body')).toContainText('2 Saved Street');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  const wrongIdentity = await page.request.post(new URL(`/api/campaigns/${scenario}/approve`, access.origin).href, {data: {revisionId: `${scenario}-v1`, idempotencyKey: `wrong-identity-${scenario}`}});
  expect(wrongIdentity.status()).toBe(409);
  expect((await wrongIdentity.json()).blockers.some(check => check.kind === 'message.email-configured-identity')).toBe(true);
  await page.getByLabel('Physical postal address', {exact: true}).fill('1 Synthetic Street');
  await save();
  await expect(frame.locator('body')).toContainText('1 Synthetic Street');
  const savedDraft = await (await page.request.get(new URL(`/api/campaigns/${scenario}`, access.origin).href)).json();
  expect(savedDraft.audience.eligibleCount).toBe(1);
  expect(savedDraft.revision.state).toBe('draft');
  await page.getByRole('button', {name: 'Mobile email', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Mobile email', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.message-preview--email').screenshot({path: join(output, 'email-preview-mobile.png'), style: 'header { visibility: hidden !important; }'});
  await page.getByRole('button', {name: 'Approve & schedule', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'approved and scheduled'})).toBeVisible();
  const detail = await (await page.request.get(new URL(`/api/campaigns/${scenario}`, access.origin).href)).json();
  expect(detail.revision.emailBody).toBe(safe);
  expect(detail.revision.emailSubject).toBe(subject);
  expect(detail.revision.state).toBe('approved');
  expect(detail.audience.eligibleCount).toBe(1);
  const edit = await page.request.patch(new URL(`/api/campaign-revisions/${scenario}-v1`, access.origin).href, {data: {emailBody: '<p>Changed after approval</p>'}});
  expect(edit.status()).toBe(409);
  await page.reload();
  await expect(frame.locator('h2')).toHaveText('Hello Alex Example');
  // Hidden, deceptive or remote-loading presentation (MSG-009, MSG-012), on a second synthetic draft: each case,
  // saved in canonical form, previews with its warning and without any presentation, loads nothing, and blocks approval.
  const presentation = `${scenario}-presentation`, presentationAccess = new URL(access);
  presentationAccess.searchParams.set('scenario', presentation);
  await page.goto(presentationAccess.href);
  await expect(frame.locator('body')).toContainText('Synthetic offer');
  const refusedPresentation = [];
  for (const [name, html] of rejectedPresentation) {
    const saved = await page.request.patch(new URL(`/api/campaign-revisions/${presentation}-v1`, access.origin).href, {data: {emailBody: `${html}${footer}`}});
    expect(saved.status(), name).toBe(200);
    await page.reload();
    await expect(page.getByRole('region', {name: 'Saved revision previews'}).getByRole('alert'), name).toBeVisible();
    // The preview's own stylesheet sits in its head; nothing from the body may carry presentation.
    await expect(frame.locator('body').locator('style,link,[style],[class],[id],[background],[bgcolor],[role],[cellpadding],[cellspacing],[align],[valign],[dir]'), name).toHaveCount(0);
    const checks = await page.request.post(new URL(`/api/campaigns/${presentation}/checks`, access.origin).href, {data: {revisionId: `${presentation}-v1`}});
    expect(checks.status(), name).toBe(200);
    expect((await checks.json()).blockers.some(check => check.kind === 'message.content'), name).toBe(true);
    refusedPresentation.push(name);
  }
  expect(external).toEqual(['https://example.test/offer.png']);
  expect(errors).toEqual([]);
  await writeFile(join(output, 'email-preview.json'), JSON.stringify({scenario, savedRevisionOnly: true, adversarialMarkupRemoved: true, initialExternalRequests: 0, explicitImageRequestInterceptedLocally: external, unsafeApprovalBlocked: true, mobileEditRecovered: true, mismatchedPostalIdentityBlocked: true, draftAudienceRefreshed: true, approvedSourcePreserved: true, approvedEligibleCount: detail.audience.eligibleCount, refusedPresentation, errors}, null, 2));
  console.log(JSON.stringify({scenario, state: detail.revision.state, errors}));
} finally {await browser.close();}
