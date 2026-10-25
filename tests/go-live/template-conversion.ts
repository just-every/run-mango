import { createRequire } from 'node:module';
const localRequire = createRequire(import.meta.url);
const axeSource = createRequire(localRequire.resolve('@axe-core/playwright'))('axe-core').source as string;
async function shellAccessibility(page: Page) {
  await page.evaluate(axeSource);
  return page.evaluate(async () => (await (window as any).axe.run(document.querySelector('main'), { iframes: false })).violations.filter((row: any) => ['serious', 'critical'].includes(row.impact)));
}
import { expect, type Page, type TestInfo } from '@playwright/test';
import { json, type Installation } from './harness';
import { importArchive } from '../move-in/support';
import { zip } from '../move-in/archive';
import { openPage } from '../support/navigation';

/** Original fixtures authored from MOVE-011's behavioral description. No
 * incumbent markup is copied or adapted. Extend the existing host journey. */
export async function templateConversionJourney(site: Installation, owner: string, page: Page, info: TestInfo) {
  const source = `<html><head><title>synthetic-mango-151</title><style>.intro { color: #202020; font-size: 18px; display: none; } @media screen and (max-width: 480px) { .intro { font-size: 16px; } }</style></head><body><p class="intro">Hello *|FNAME|*. *|FOO|* *|ARCHIVE|*</p><p>*|LIST:ADDRESS|*</p><p><a href="*|UNSUB|*">Unsubscribe</a></p></body></html>`;
  const fixture = zip([
    { name: 'templates/synthetic-mango-151.html', data: source },
    { name: 'templates/synthetic-mango-152.html', data: '<html><head><title>synthetic-mango-152</title></head><body><p style="color:#999999">Our original synthetic footer.</p></body></html>' },
    { name: 'templates/synthetic-mango-153.html', data: '<p>' + 'synthetic-mango-153 '.repeat(9000) + '</p>' },
    { name: 'templates/synthetic-mango-154.html', data: '<p>Hello {{ first_name }}. *|LNAME|* *|UPDATE_PROFILE|* *|DATE|* *|CURRENT_YEAR|* *|LIST:ADDRESSLINE|*</p>' },
  ]);
  await page.context().clearCookies();
  await page.context().addCookies([{ name: owner.split('=')[0], value: owner.split('=')[1], url: site.runtime.url }]);
  await openPage(page, site.runtime.url + '/app/audience/import');
  await page.getByLabel('Choose CSV files').setInputFiles({ name: 'synthetic-mango-151.zip', mimeType: 'application/zip', buffer: Buffer.from(fixture) });
  await page.getByRole('button', { name: 'Preview import', exact: true }).click();
  const changes = page.getByRole('status', { name: 'Content changes', exact: true });
  await expect(changes).toContainText('Mapped *|FNAME|*');
  await expect(changes).toContainText('display: none');
  await expect(changes).toContainText('Mapped mobile');
  await expect(changes).toContainText('Recolored #999999 to #767676');
  await expect(changes).toContainText('Sent size:');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => window.__rerHydration?.count ?? 0)).toBe(0);
    expect(await shellAccessibility(page)).toEqual([]);
    await page.screenshot({ path: info.outputPath(`template-conversion-report-${width}.png`), fullPage: true });
  }
  console.log('Conversion proof: apply archive');
  const moved = await importArchive(site, owner, fixture);
  console.log('Conversion proof: read archive');
  const archive = await json(await site.call(`/api/audience/archives/${moved.archive.id}`, { cookie: owner }), 200);
  const item = (number: number) => archive.content.find((row: any) => row.source_path === `templates/synthetic-mango-${number}.html`);
  const report = await (await site.call(`/api/audience/archives/${moved.archive.id}/report`, { cookie: owner })).text();
  expect(report).toContain('MSG-012 checker: pass; personalization: blocked');
  expect(report).toContain('Recolored #999999 to #767676');
  expect(report).toContain('Mapped mobile');
  expect(report).toContain('Held conversion');
  expect(item(153)).toMatchObject({ state: 'held', campaign_id: null });
  expect(item(153).outcome).toContain('Largest blocks:');
  for (const tag of ['*|LNAME|*', '*|UPDATE_PROFILE|*', '*|DATE|*', '*|CURRENT_YEAR|*']) expect(JSON.parse(item(154).removed_json).join(' ')).toContain(`Unmapped ${tag}`);
  expect(JSON.parse(item(154).removed_json).join(' ')).toContain('Mapped *|LIST:ADDRESSLINE|*');
  const body = async (number: number) => {
    console.log('Conversion proof: start template ' + number);
    const started = await json(await site.call(`/api/campaign-templates/${item(number).id}/start`, { method: 'POST', cookie: owner }), 201);
    const detail = await json(await site.call(`/api/campaigns/${started.campaignId}`, { cookie: owner }), 200);
    return { ...started, revision: detail.revision };
  };
  const a = await body(151);
  console.log('Conversion proof: inspect mapped body');
  expect(a.revision.emailBody).toContain('{{displayName | fallback: "there"}}');
  expect(a.revision.emailBody).toContain('{{physical_address}}');
  expect(a.revision.emailBody).toContain('{{unsubscribe_url}}');
  expect(a.revision.emailBody).toContain('color: #202020');
  expect(a.revision.emailBody).toContain('font-size: 18px');
  expect(a.revision.emailBody).toContain('data-mango-mobile=');
  expect(a.revision.emailBody).not.toContain('class="intro"');
  console.log('Conversion proof: run mapped checks');
  const checks = await json(await site.call(`/api/campaigns/${a.campaignId}/checks`, { method: 'POST', cookie: owner, body: { revisionId: a.revisionId } }), 200);
  expect(checks.checks.find((row: any) => row.kind === 'message.personalisation')).toMatchObject({ status: 'blocked', detail: expect.stringContaining('*|FOO|*') });
  expect(checks.checks.find((row: any) => row.kind === 'message.content')).toMatchObject({ status: 'passed' });
  console.log('Conversion proof: open mapped preview');
  await openPage(page, `${site.runtime.url}/app/campaigns/${a.campaignId}/review`);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    console.log('Conversion proof: mapped preview ' + width);
    await expect(page.getByRole('button', { name: width === 390 ? 'Mobile email' : 'Desktop email', exact: true })).toBeVisible();
    await page.getByRole('button', { name: width === 390 ? 'Mobile email' : 'Desktop email', exact: true }).press('Enter');
    const frame = page.frameLocator('iframe[title="Saved email preview"]');
    await expect(frame.getByText('Hello Alex Example.', { exact: false })).toBeVisible();
    await expect(frame.locator('p').first()).toHaveCSS('color', 'rgb(32, 32, 32)');
    await expect(frame.locator('p').first()).toHaveCSS('font-size', width === 390 ? '16px' : '18px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => window.__rerHydration?.count ?? 0)).toBe(0);
    expect(await shellAccessibility(page)).toEqual([]);
    await page.screenshot({ path: info.outputPath(`template-conversion-tokens-${width}.png`), fullPage: true });
  }
  console.log('Conversion proof: corrected footer');
  const d = await body(152);
  expect(d.revision.emailBody).toContain('color: #767676');
  await openPage(page, `${site.runtime.url}/app/campaigns/${d.campaignId}/review`);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator('iframe[title="Saved email preview"]')).toBeVisible();
    await expect(page.frameLocator('iframe[title="Saved email preview"]').getByText('Our original synthetic footer.')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => window.__rerHydration?.count ?? 0)).toBe(0);
    expect(await shellAccessibility(page)).toEqual([]);
    await page.screenshot({ path: info.outputPath(`template-conversion-preview-${width}.png`), fullPage: true });
  }
  const dChecks = await json(await site.call(`/api/campaigns/${d.campaignId}/checks`, { method: 'POST', cookie: owner, body: { revisionId: d.revisionId } }), 200);
  expect(dChecks.checks.find((row: any) => row.kind === 'message.content')).toMatchObject({ status: 'passed' });
  // A manual builder/HTML edit can undo a correction, with the ordinary check
  // blocking again. A dedicated per-correction undo control remains a named gap.
  await json(await site.call(`/api/campaign-revisions/${d.revisionId}`, { method: 'PATCH', cookie: owner, body: { emailBody: d.revision.emailBody.replace('#767676', '#999999') } }), 200);
  const undone = await json(await site.call(`/api/campaigns/${d.campaignId}/checks`, { method: 'POST', cookie: owner, body: { revisionId: d.revisionId } }), 200);
  expect(undone.checks.find((row: any) => row.kind === 'message.content')).toMatchObject({ status: 'blocked', detail: expect.stringContaining('contrast') });
}
