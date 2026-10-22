import {createHmac} from 'node:crypto';
import {expect, type Page, type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {order, customer, id, page as shopifyPage} from '../shopify/fixtures';
import {sourceEdge, syncSource} from '../go-live/source-edge';
import {json, draftCampaign, approve, dispatch, type Installation} from '../go-live/harness';
import {providerEdge} from '../go-live/edge';
import {openPage} from '../support/navigation';
import {parseCsv} from '../../src/core/features/audience/csv';

/** Shopify-format HTTP responses; money always enters Mango through signed
 * webhooks and the ordinary sync queue, never inserts into commerce tables. */
export function performanceCommerce() {
  const fallback = sourceEdge();
  const orders = new Map<string, typeof order>();
  return {orders, commerce(request: Record<string, unknown>) {
    const query = String(request.query), variables = request.variables as {id?: string};
    if (query.includes('MangoNode')) return {data: {node: structuredClone(orders.get(variables.id!)!)}};
    if (query.includes('orders(first:')) return {data: {orders: shopifyPage(structuredClone([...orders.values()]))}};
    return fallback.commerce(request);
  }};
}
export async function attributionJourney(input: {
  site: Installation; edge: Awaited<ReturnType<typeof providerEdge>>; commerce: ReturnType<typeof performanceCommerce>;
  cookie: string; campaign: {campaignId: string; revisionId: string}; links: string[];
  people: {email: string; name: string}[]; destination: string; page: Page; info: TestInfo; width: number;
}) {
  const {site, edge, commerce, campaign, links, people, destination, page, info, width} = input;
  let cookie = input.cookie;
  const result = (campaignId: string) => site.call(`/api/campaigns/${campaignId}/results`, {cookie}).then(response => json(response, 200));
  const unchangedAttribution = (actual: any, expected: any) => {
    expect(actual).toEqual({...expected, events: expected.events.map((event: any) => ({...event, observedAt: expect.any(Number)}))});
    for (const event of actual.events) expect(event.observedAt).toBeGreaterThanOrEqual(expected.events.find((before: any) => before.providerOrderId === event.providerOrderId).observedAt);
  };
  let event = 0;
  const deliver = async (value: typeof order, replay = false) => {
    commerce.orders.set(value.id, value);
    const raw = JSON.stringify({admin_graphql_api_id: value.id});
    const eventId = `synthetic-mango-${++event}`;
    const headers = {'X-Shopify-Hmac-Sha256': createHmac('sha256', 'synthetic-store-webhook-key').update(raw).digest('base64'),
      'X-Shopify-Shop-Domain': 'mango-test.myshopify.com', 'X-Shopify-Topic': 'orders/updated', 'X-Shopify-Webhook-Id': eventId, 'X-Shopify-Event-Id': eventId};
    expect((await site.call('/webhooks/commerce/shopify', {method: 'POST', raw, headers})).status).toBe(204);
    if (replay) expect((await site.call('/webhooks/commerce/shopify', {method: 'POST', raw, headers})).status).toBe(204);
  };
  const makeOrder = async (number: number, person: number, amount: string, currency = 'USD') => {
    const at = new Date((await site.control('/_golive/clock', {advanceMs: 1000})).now).toISOString();
    const money = (value: string) => ({shopMoney: {amount: value, currencyCode: currency}, presentmentMoney: {amount: value, currencyCode: currency}});
    return {...structuredClone(order), id: id('Order', number), createdAt: at, updatedAt: at, processedAt: at, displayFinancialStatus: 'PAID', currencyCode: currency,
      customer: {...structuredClone(customer), id: id('Customer', person + 100), email: people[person].email, phone: null},
      totalPriceSet: money(amount), currentTotalPriceSet: money(amount), totalReceivedSet: money(amount), totalRefundedSet: money('0'),
      lineItems: shopifyPage([]), refunds: [], returns: shopifyPage([])};
  };
  // A scanner-only click and a message sent with tracking off cannot win an order.
  for (const person of [1, 2]) await deliver(await makeOrder(100 + person, person, '99.00'), true);
  expect((await result(campaign.campaignId)).attribution.orders).toBe(0);
  const first = await makeOrder(110, 0, '10.00');
  await deliver(first, true);
  expect((await result(campaign.campaignId)).attribution).toMatchObject({orders: 1, revenueByCurrency: [{currency: 'USD', amountMinor: 1000}]});

  // Both campaigns have genuine clicks inside seven days. Frequency policy
  // requires a day between their sends; elapsed time uses the existing clock.
  await site.control('/_golive/clock', {advanceMs: 86400001});
  await site.control('/_golive/sender-evidence');
  const due = new Date((await site.control('/_golive/clock')).now + 3600000);
  const latest = await draftCampaign(site, cookie, 'Latest garden letter', [people[0].email], due);
  await json(await site.call(`/api/campaign-revisions/${latest.revisionId}`, {method: 'PATCH', cookie, body: {emailBody: `<p><a href="${destination}">Garden collection</a></p>`, trackingEnabled: true}}), 200);
  await approve(site, cookie, latest);
  await site.control('/_golive/clock', {advanceMs: 3600001});
  expect((await dispatch(site, latest.campaignId, due))[0].transport_disposition).toBe('accepted');
  const sent = edge.sends.findLast(send => send.to === people[0].email && send.body.headers?.['List-Unsubscribe'])!;
  const latestLink = /href="([^"]+\/l\/[^\"]+)"/.exec(sent.body.content.find((part: any) => part.type === 'text/html').value)![1];
  expect(latestLink).not.toBe(links[0]);
  expect((await site.call(new URL(latestLink).pathname, {headers: {'User-Agent': 'Mozilla/5.0 Garden reader'}})).status).toBe(302);
  const purchases = [await makeOrder(201, 0, '100.00'), await makeOrder(202, 0, '50.00'), await makeOrder(203, 0, '1200', 'JPY'), await makeOrder(204, 0, '30.00')];
  for (const purchase of purchases) await deliver(purchase, true);
  const beforeSync = (await result(latest.campaignId)).attribution;
  expect(beforeSync.orders).toBe(4);
  expect(beforeSync.events.map((event: any) => event.providerOrderId).sort()).toEqual(purchases.map(purchase => purchase.id).sort());
  await syncSource(site, cookie, 'order');
  unchangedAttribution((await result(latest.campaignId)).attribution, beforeSync);
  expect((await result(campaign.campaignId)).attribution.orders).toBe(1);
  const revise = async (index: number, refunded: string, cancelled = false) => {
    const purchase = purchases[index], at = new Date((await site.control('/_golive/clock', {advanceMs: 1000})).now).toISOString();
    const currency = purchase.currencyCode, money = {shopMoney: {amount: refunded, currencyCode: currency}, presentmentMoney: {amount: refunded, currencyCode: currency}};
    purchase.updatedAt = at;
    purchase.totalRefundedSet = money;
    purchase.displayFinancialStatus = cancelled ? 'VOIDED' : refunded === purchase.totalReceivedSet.shopMoney.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    if (cancelled) Object.assign(purchase, {cancelledAt: at, cancelReason: 'CUSTOMER'});
    await deliver(purchase, true);
  };
  await revise(0, '20.00');
  expect((await result(latest.campaignId)).attribution.revenueByCurrency).toContainEqual(expect.objectContaining({currency: 'USD', amountMinor: 16000}));
  await revise(1, '50.00');
  expect((await result(latest.campaignId)).attribution.revenueByCurrency).toContainEqual(expect.objectContaining({currency: 'USD', amountMinor: 11000}));
  await revise(2, '200');
  await revise(3, '0', true);
  const final = (await result(latest.campaignId)).attribution;
  expect(final).toMatchObject({orders: 4, status: 'observed-store-events', method: 'most-recent-non-automated-click-within-seven-days', revenueByCurrency: [
    {currency: 'JPY', orders: 1, grossAmountMinor: 1200, reversedAmountMinor: 200, amountMinor: 1000},
    {currency: 'USD', orders: 3, grossAmountMinor: 18000, reversedAmountMinor: 10000, amountMinor: 8000},
  ]});
  await syncSource(site, cookie, 'order');
  unchangedAttribution((await result(latest.campaignId)).attribution, final);
  // Real clicks expire by elapsed time; there is no backdated row insertion.
  await site.control('/_golive/clock', {advanceMs: 8 * 86400000});
  cookie = await site.open();
  await page.context().addCookies([{name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url}]);
  await deliver(await makeOrder(301, 0, '999.00'), true);
  unchangedAttribution((await result(latest.campaignId)).attribution, final);
  expect((await result(campaign.campaignId)).attribution.orders).toBe(1);
  const report = await json(await site.call('/api/insights/campaign-performance', {cookie}), 200);
  expect(report.rows.find((row: any) => row.campaignId === latest.campaignId)).toMatchObject({conversions: 4, revenueByCurrency: [
    {currency: 'JPY', conversions: 1, netAmountMinor: '1000'}, {currency: 'USD', conversions: 3, netAmountMinor: '8000'},
  ]});
  const csv = parseCsv(await (await site.call('/api/insights/campaign-performance?format=csv', {cookie})).text());
  expect(csv.find(row => row['campaign id'] === latest.campaignId)).toMatchObject({'attributed conversions': '4', 'net attributed revenue by currency': 'JPY 1000; USD 80.00'});
  expect(csv.find(row => row['campaign id'] === campaign.campaignId)).toMatchObject({'human clicks': '1', 'unique clicked recipient-steps': '1', 'attributed conversions': '1'});
  await openPage(page, site.runtime.url + '/app/insights');
  const row = page.getByRole('table', {name: 'Campaign performance', exact: true}).locator('tbody tr').filter({hasText: 'Latest garden letter'});
  await expect(row.locator('[data-label="Net revenue"]')).toHaveText('JPY 1000; USD 80.00');
  await expect(row.locator('[data-label="Revenue / recipient"]')).toHaveText('JPY 1000.0000; USD 80.0000');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.screenshot({path: info.outputPath(`attribution-insights-${width}.png`), fullPage: true});
  await row.getByRole('link', {name: 'Latest garden letter', exact: true}).click();
  await page.getByRole('link', {name: 'View schedule and results', exact: true}).click();
  const panel = page.locator('section').filter({has: page.getByRole('heading', {name: 'Clicks and store orders', exact: true})});
  await expect(panel).toContainText(/seven days/);
  await expect(panel).toContainText(/observed Shopify events, separate from forecasts/);
  for (const purchase of purchases) await expect(panel.locator('summary').filter({hasText: purchase.id})).toBeVisible();
  await expect(panel.getByRole('table', {name: 'Attributed store orders by currency'})).toContainText('USD 80.00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.screenshot({path: info.outputPath(`attribution-events-${width}.png`), fullPage: true});
}
