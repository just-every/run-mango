import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {json} from '../go-live/harness';
import {openPage} from '../support/navigation';
import {assertAttributionReports, attributionStoredEvents, saveAttributionPolicy, type AttributionBrowser, type AttributionCampaign} from './attribution-report-ui';

/** Custom metric facts use a scoped integration credential and immutable native
 * events, then the very same operator policy/report path as Shopify orders. */
export async function customAttributionJourney(input: AttributionBrowser & {
  email: AttributionCampaign; sms: AttributionCampaign; contactId: string;
}) {
  const {site, cookie, page, sms, contactId} = input;
  await openPage(page, site.runtime.url + '/app/settings');
  const integration = page.getByRole('region', {name: 'Integration credentials', exact: true});
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: 1000});
    await integration.getByRole('checkbox', {name: /Write conversion events/}).check();
    await expect(integration.getByRole('checkbox', {name: /Write conversion events/})).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({page}).include('#integrations').analyze()).violations).toEqual([]);
    // Capture the scope chooser before creating any one-time credential.
    await integration.screenshot({path: input.info.outputPath(`attribution-integration-${width}.png`)});
  }

  const credential = await json(await site.call('/api/settings/integrations', {method: 'POST', cookie,
    body: {name: 'Synthetic Mango conversion source', scopes: ['events:write']}}), 201);
  const reader = await json(await site.call('/api/settings/integrations', {method: 'POST', cookie,
    body: {name: 'Synthetic Mango read only source', scopes: ['events:read']}}), 201);
  const metric = 'synthetic-mango-1';
  const base = {metric, contactId, currency: 'USD'};
  const occurredAt = async () => new Date((await site.control('/_golive/clock', {advanceMs: 1000})).now).toISOString();
  const first = {...base, eventId: 'synthetic-mango-601', occurredAt: await occurredAt(), valueMinor: 1000, kind: 'conversion'};
  const post = (body: unknown, token = credential.token) => site.call('/api/integrations/v1/events', {method: 'POST', headers: {Authorization: `Bearer ${token}`}, body});
  expect((await post(first, reader.token)).status).toBe(403);
  expect(await json(await post(first), 200)).toMatchObject({eventId: first.eventId, status: 'recorded'});
  const second = {...base, eventId: 'synthetic-mango-602', occurredAt: await occurredAt(), valueMinor: 500, kind: 'conversion'};
  expect(await json(await post(second), 200)).toMatchObject({eventId: second.eventId, status: 'recorded'});
  const beforeReplay = await attributionStoredEvents(site);
  expect(await json(await post(first), 200)).toMatchObject({eventId: first.eventId, status: 'replayed'});
  expect((await post({...first, valueMinor: 1001})).status).toBe(409);
  expect(await attributionStoredEvents(site)).toEqual(beforeReplay);
  const settings = await json(await site.call('/api/insights/attribution-policy', {cookie}), 200);
  expect(settings.availableMetrics).toContainEqual({id: `custom:${metric}`, label: metric});
  // Recording custom events cannot silently change the selected conversion metric.
  expect(settings.metric).toBe('placed-order');
  expect((await json(await site.call(`/api/campaigns/${sms.campaignId}/results`, {cookie}), 200)).attribution.orders).toBe(3);
  await openPage(page, site.runtime.url + '/app/insights');
  await saveAttributionPolicy(input, `custom:${metric}`, 7);
  expect(await attributionStoredEvents(site)).toEqual(beforeReplay);
  const conversions = await assertAttributionReports({...input, metric: `custom:${metric}`, metricLabel: metric,
    days: 7, conversions: 2, netMinor: '1500', receipt: 'custom-before-reversal'});
  expect(conversions.events.map((event: any) => event.providerEventId).sort()).toEqual([first.eventId, second.eventId]);
  expect(conversions.events.every((event: any) => event.source === 'Native integration' && event.channel === 'sms')).toBe(true);
  const refund = {...base, eventId: 'synthetic-mango-603', occurredAt: await occurredAt(), valueMinor: 200, kind: 'refund', conversionId: first.eventId};
  const cancellation = {...base, eventId: 'synthetic-mango-604', occurredAt: await occurredAt(), valueMinor: 0, kind: 'cancellation', conversionId: second.eventId};
  for (const reversal of [refund, cancellation]) {
    expect(await json(await post(reversal), 200)).toMatchObject({eventId: reversal.eventId, status: 'recorded'});
    expect(await json(await post(reversal), 200)).toMatchObject({eventId: reversal.eventId, status: 'replayed'});
  }
  await openPage(page, site.runtime.url + '/app/insights');
  const reversed = await assertAttributionReports({...input, metric: `custom:${metric}`, metricLabel: metric,
    days: 7, conversions: 2, netMinor: '800', receipt: 'custom-after-reversal'});
  expect(reversed.revenueByCurrency).toEqual([{currency: 'USD', orders: 2, grossAmountMinor: 1500, reversedAmountMinor: 700, amountMinor: 800}]);
  expect(reversed.events.find((event: any) => event.providerEventId === first.eventId)).toMatchObject({financialStatus: 'PARTIALLY_REFUNDED',
    reversals: [expect.objectContaining({eventId: refund.eventId, kind: 'refund', amountMinor: 200})]});
  expect(reversed.events.find((event: any) => event.providerEventId === second.eventId)).toMatchObject({financialStatus: 'CANCELLED',
    reversals: [expect.objectContaining({eventId: cancellation.eventId, kind: 'cancellation', amountMinor: 0})]});
  const stored = await attributionStoredEvents(site);
  await saveAttributionPolicy(input, `custom:${metric}`, 1);
  await assertAttributionReports({...input, metric: `custom:${metric}`, metricLabel: metric,
    days: 1, conversions: 0, netMinor: '0', receipt: 'custom-one-day'});
  expect(await attributionStoredEvents(site)).toEqual(stored);
  await saveAttributionPolicy(input, 'placed-order', 7);
  expect((await json(await site.call(`/api/campaigns/${sms.campaignId}/results`, {cookie}), 200)).attribution).toMatchObject({orders: 3,
    revenueByCurrency: [{currency: 'USD', orders: 3, grossAmountMinor: 18000, reversedAmountMinor: 5000, amountMinor: 13000}]});
  expect(await attributionStoredEvents(site)).toEqual(stored);
  await json(await site.call(`/api/settings/integrations/${credential.credential.id}`, {method: 'DELETE', cookie}), 200);
  await json(await site.call(`/api/settings/integrations/${reader.credential.id}`, {method: 'DELETE', cookie}), 200);
}
