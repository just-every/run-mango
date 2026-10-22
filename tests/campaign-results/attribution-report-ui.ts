import {expect, type Page, type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {json, type Installation} from '../go-live/harness';
import {openPage} from '../support/navigation';
import {parseCsv} from '../../src/core/features/audience/csv';

export type AttributionCampaign = {campaignId: string; revisionId: string; name: string};
export type AttributionBrowser = {site: Installation; cookie: string; page: Page; info: TestInfo};

/** Change the operator's actual policy form; its response drives report refresh. */
export async function saveAttributionPolicy(input: AttributionBrowser, metric: string, days: number) {
  const {site, page} = input;
  const panel = page.getByRole('region', {name: 'Revenue attribution', exact: true});
  await panel.getByLabel('Conversion metric', {exact: true}).selectOption(metric);
  await panel.getByLabel('Email click window (days)', {exact: true}).fill(String(days));
  await panel.getByLabel('SMS click window (days)', {exact: true}).fill(String(days));
  const [saved] = await Promise.all([
    page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname === '/api/insights/attribution-policy'),
    panel.getByRole('button', {name: 'Save attribution and recalculate', exact: true}).click(),
  ]);
  expect(saved.status()).toBe(200);
  expect(await saved.json()).toMatchObject({policy: 'campaign.attribution.v1', metric, clickWindowDays: {email: days, sms: days}});
  await expect(panel.getByRole('status')).toBeVisible();
  expect(await json(await site.call('/api/insights/attribution-policy', {cookie: input.cookie}), 200)).toMatchObject({metric, clickWindowDays: {email: days, sms: days}});
}

/** Read-only evidence: policy edits must leave both raw source events and native
 * click/order histories byte-for-byte intact, including their occurrence times. */
export async function attributionStoredEvents(site: Installation) {
  const [clicks, sources, orders, amounts] = await Promise.all([
    site.rows('SELECT * FROM link_click_facts ORDER BY id'),
    site.rows('SELECT * FROM source_records ORDER BY id'),
    site.rows('SELECT * FROM commerce_orders ORDER BY provider_order_id'),
    site.rows('SELECT * FROM commerce_order_amounts ORDER BY provider_order_id'),
  ]);
  return {clicks, sources, orders, amounts};
}

/** Same policy and money through all three public report doors at both widths. */
export async function assertAttributionReports(input: AttributionBrowser & {
  email: AttributionCampaign; sms: AttributionCampaign;
  metric: string; metricLabel: string; days: number; conversions: number; netMinor: string; receipt: string;
}) {
  const {site, cookie, page, info, email, sms, metric, metricLabel, days, conversions, netMinor, receipt} = input;
  const policy = {policy: 'campaign.attribution.v1', metric, metricLabel, clickWindowDays: {email: days, sms: days}};
  const report = await json(await site.call('/api/insights/campaign-performance', {cookie}), 200);
  expect(report.attributionPolicy).toEqual(policy);
  expect(report.rows.find((row: any) => row.campaignId === email.campaignId)).toMatchObject({channel: 'email', totalClicks: 1, uniqueClicks: 1, conversions: 0, revenueByCurrency: []});
  expect(report.rows.find((row: any) => row.campaignId === sms.campaignId)).toMatchObject({channel: 'sms', totalClicks: 1, uniqueClicks: 1, conversions,
    revenueByCurrency: conversions ? [{currency: 'USD', conversions, netAmountMinor: netMinor}] : []});
  const revenue = conversions ? `USD ${(Number(netMinor) / 100).toFixed(2)}` : '—';
  const perRecipient = conversions ? `USD ${(Number(netMinor) / 100).toFixed(4)}` : '—';
  const csv = parseCsv(await (await site.call('/api/insights/campaign-performance?format=csv', {cookie})).text());
  for (const campaign of [email, sms]) {
    const row = csv.find(row => row['campaign id'] === campaign.campaignId)!;
    expect(row).toMatchObject({'attribution policy': policy.policy, 'conversion metric': metricLabel,
      'email click window (days)': String(days), 'sms click window (days)': String(days),
      'human clicks': '1', 'unique clicked recipient-steps': '1', 'attributed conversions': String(campaign === sms ? conversions : 0),
      'net attributed revenue by currency': campaign === sms ? revenue : '—',
      'net revenue per recipient by currency (rounded)': campaign === sms ? perRecipient : '—'});
  }
  // Inspect the current page first: a policy save must update it without a reload.
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: 1000});
    const table = page.getByRole('table', {name: 'Campaign performance', exact: true});
    for (const campaign of [email, sms]) {
      const row = table.locator('tbody tr').filter({has: page.getByRole('link', {name: campaign.name, exact: true})});
      await expect(row.locator('[data-label="Conversions"]')).toHaveText(String(campaign === sms ? conversions : 0));
      for (const [label, amount] of [['Net revenue', campaign === sms ? revenue : '—'], ['Revenue / recipient', campaign === sms ? perRecipient : '—']]) {
        const cell = row.locator(`[data-label="${label}"]`);
        await expect(cell.locator('.attribution-amount')).toHaveText(amount);
        await expect(cell.locator('.attribution-policy-note')).toHaveText(`${metricLabel} · ${campaign === sms ? 'SMS' : 'Email'} ${days}-day click window`);
      }
    }
    await page.locator('#attribution-settings-title').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({page}).analyze()).violations.filter(violation => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
    await page.getByRole('region', {name: 'Revenue attribution', exact: true}).screenshot({path: info.outputPath(`attribution-policy-${receipt}-${width}.png`)});
    await page.screenshot({path: info.outputPath(`attribution-${receipt}-${width}.png`), fullPage: true});
    await table.locator('tbody tr').filter({has: page.getByRole('link', {name: sms.name, exact: true})}).locator('[data-label="Net revenue"]').scrollIntoViewIfNeeded();
    await page.screenshot({path: info.outputPath(`attribution-money-${receipt}-${width}.png`)});
  }
  const results = await json(await site.call(`/api/campaigns/${sms.campaignId}/results`, {cookie}), 200);
  expect(results.attribution).toMatchObject({orders: conversions, conversions, attributionPolicy: policy,
    method: 'most-recent-non-automated-click-within-channel-window', status: metric === 'placed-order' ? 'observed-store-events' : 'observed-custom-events',
    revenueByCurrency: conversions ? [expect.objectContaining({currency: 'USD', orders: conversions, amountMinor: Number(netMinor)})] : []});
  expect((await json(await site.call(`/api/campaigns/${email.campaignId}/results`, {cookie}), 200)).attribution.orders).toBe(0);
  await openPage(page, `${site.runtime.url}/app/campaigns/${sms.campaignId}/scheduled`);
  const panel = page.getByRole('region', {name: 'Clicks and attributed conversions', exact: true});
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: 1000});
    await expect(panel.locator('p').filter({hasText: 'Current report policy'})).toContainText(`${metricLabel} · Email ${days} days · SMS ${days} days · click windows`);
    if (conversions) {
      await expect(panel.getByRole('table', {name: 'Attributed conversions by currency', exact: true}).locator('[data-label="Net attributed revenue"] .attribution-amount')).toHaveText(revenue);
      await expect(panel.locator('summary')).toHaveCount(conversions);
    } else await expect(panel.getByRole('table', {name: 'Attributed conversions by currency', exact: true})).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({page}).include('section[aria-labelledby="commerce-results-title"]').analyze()).violations.filter(violation => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
    await panel.screenshot({path: info.outputPath(`attribution-events-${receipt}-${width}.png`)});
  }
  await openPage(page, site.runtime.url + '/app/insights');
  return results.attribution;
}
