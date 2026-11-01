import {expect, type Locator, type Page, type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {json, type Installation} from './harness';
import {openPage} from '../support/navigation';

export const deskWidths: Array<[number, number]> = [[1440, 900], [390, 844]];

type Campaign = {campaignId: string; revisionId: string};
export type DeskFixture = {site: Installation; cookie: string; draft: Campaign; later: Campaign; planned: Campaign; sent: Campaign; future: Date; retainedSuccess: string};

const region = (page: Page, name: string) => page.getByRole('region', {name, exact: true});

/** True when `first` comes before `second` in the document. */
async function precedes(first: Locator, second: Locator) {
  const [a, b] = await Promise.all([first.elementHandle(), second.elementHandle()]);
  return a!.evaluate((node, other) => Boolean(node.compareDocumentPosition(other as Node) & Node.DOCUMENT_POSITION_FOLLOWING), b!);
}

async function fits(page: Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const audit = await new AxeBuilder({page}).analyze();
  expect(audit.violations.filter(violation => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);
}

/** MG1 A1-A8 on the owner's Desk with a failed store sync: the line, the work, then everything else, at one width. */
export async function failedDesk(page: Page, info: TestInfo, url: string, fixture: DeskFixture, [width, height]: [number, number]) {
  const {site, cookie, draft, later, planned, sent, future} = fixture;
  await page.setViewportSize({width, height});
  await openPage(page, `${url}/app`);
  const line = page.getByRole('alert', {name: 'Store sync', exact: true});
  await expect(line).toContainText('Product');
  const waiting = region(page, 'Waiting for approval'), scheduled = region(page, 'Scheduled'), done = region(page, 'Sent');
  const order = [line, waiting, scheduled, done, region(page, 'Suggestions'), region(page, 'Store data')];
  for (let index = 1; index < order.length; index++) expect(await precedes(order[index - 1], order[index])).toBe(true);

  const first = waiting.getByRole('link', {name: /Saved garden draft/}), second = waiting.getByRole('link', {name: /Later garden draft/});
  await expect(first).toHaveAttribute('href', `/app/campaigns/${draft.campaignId}/review`);
  expect(await precedes(first, second)).toBe(true);
  await expect(first.locator('time').first()).toHaveAttribute('datetime', future.toISOString());
  const letter = scheduled.getByRole('link', {name: /Scheduled garden letter/});
  await expect(letter).toHaveAttribute('href', `/app/campaigns/${planned.campaignId}`);
  await expect(letter.locator('time').first()).toHaveAttribute('datetime', future.toISOString());

  // The dispatched letter was only accepted by the provider: it reads Accepted, never Delivered, wherever its state puts it.
  const rows = (await json(await site.call('/api/campaigns', {cookie}), 200)).campaigns;
  const history = rows.find((row: any) => row.id === sent.campaignId);
  const home = history.state === 'completed' ? done : scheduled;
  const retained = home.getByRole('link', {name: /Retained garden history/});
  await expect(retained).toHaveAttribute('href', `/app/campaigns/${sent.campaignId}`);
  await expect(retained).toContainText('Accepted');
  await expect(retained).not.toContainText('Delivered');
  if (history.state === 'completed') await expect(done.getByRole('link', {name: 'All sent', exact: true})).toHaveAttribute('href', '/app/campaigns?state=completed');

  // The first screen: at 1440 every group heading and the first row of each non-empty group; at 390 the first Waiting row.
  const visible = async (target: Locator) => expect((await target.boundingBox())!.y + (await target.boundingBox())!.height).toBeLessThanOrEqual(height);
  if (width >= 1200) {
    for (const group of [waiting, scheduled, done]) {
      await visible(group.getByRole('heading').first());
      if (await group.getByRole('link', {name: /./}).count()) await visible(group.locator('.desk-row').first());
    }
  } else await visible(first);

  const source = page.getByRole('article', {name: 'Product source', exact: true});
  await expect(source).toContainText(/needs sync/i);
  await expect(source).toContainText('sync failed');
  await expect(source.locator('time').first()).toHaveAttribute('datetime', fixture.retainedSuccess);
  await expect(page.getByRole('article', {name: 'Order source', exact: true})).toContainText(/fresh/i);
  await expect(page.getByRole('article', {name: 'Cart source', exact: true})).toContainText('No successful sync');
  await fits(page, width);
  await page.screenshot({path: info.outputPath(`desk-failed-${width}.png`), fullPage: true});
  await region(page, 'Store data').screenshot({path: info.outputPath(`source-failed-${width}.png`)});
}

/** An Author sees the same work and the Store rows, but no "Manage sync" anywhere (A5, A6, A8). */
export async function authorDesk(page: Page, info: TestInfo, url: string, fixture: DeskFixture) {
  const {site, cookie, draft} = fixture;
  const author = await site.open('author@example.test', 'role-author');
  expect((await site.call('/api/operators/role-author/role', {method: 'PUT', cookie, body: {role: 'author'}})).status).toBe(200);
  const jar = (value: string) => ({name: value.split('=')[0], value: value.split('=')[1], url});
  await page.setViewportSize({width: 1440, height: 900});
  await page.context().clearCookies();
  await page.context().addCookies([jar(author)]);
  await openPage(page, `${url}/app`);
  await expect(region(page, 'Store data').getByRole('article')).toHaveCount(8);
  await expect(page.getByRole('link', {name: 'Manage sync'})).toHaveCount(0);
  await expect(page.getByRole('alert', {name: 'Store sync', exact: true})).toContainText('Product');
  await expect(region(page, 'Waiting for approval').getByRole('link', {name: /Saved garden draft/})).toHaveAttribute('href', `/app/campaigns/${draft.campaignId}/review`);
  await page.screenshot({path: info.outputPath('desk-author-1440.png'), fullPage: true});
  await page.context().clearCookies();
  await page.context().addCookies([jar(cookie)]);
}

/** After recovery: Product is fresh and no line stands above the work, though Cart and Browsing Event never synced. */
export async function recoveredDesk(page: Page, info: TestInfo, url: string, [width, height]: [number, number]) {
  await page.setViewportSize({width, height});
  await openPage(page, `${url}/app`);
  const source = page.getByRole('article', {name: 'Product source', exact: true});
  await expect(source).toContainText(/fresh/i);
  await expect(source).not.toContainText('sync failed');
  await expect(page.getByRole('alert', {name: 'Store sync'})).toHaveCount(0);
  for (const name of ['Waiting for approval', 'Scheduled', 'Sent', 'Suggestions']) expect(await precedes(region(page, name), region(page, 'Store data'))).toBe(true);
  await fits(page, width);
  await page.screenshot({path: info.outputPath(`desk-recovered-${width}.png`), fullPage: true});
  await region(page, 'Store data').screenshot({path: info.outputPath(`source-recovered-${width}.png`)});
}
