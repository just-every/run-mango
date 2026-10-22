import {createHmac} from 'node:crypto';
import {expect, type Page, type TestInfo} from '@playwright/test';
import {order, customer, id, page as shopifyPage} from '../shopify/fixtures';
import {json, consent, confirmedContact, draftCampaign, approve, dispatch, type Installation} from '../go-live/harness';
import {smsProgramme, smsDisclosure, smsSender} from '../go-live/sms-bindings';
import {syncSource} from '../go-live/source-edge';
import type {providerEdge} from '../go-live/edge';
import type {performanceCommerce} from './performance-fixture';
import {openPage} from '../support/navigation';
import {assertAttributionReports, attributionStoredEvents, saveAttributionPolicy} from './attribution-report-ui';
import {customAttributionJourney} from './custom-attribution';

/** REPORT-003 adds no registration: real consent, two approved native sends,
 * human/automated redirects and signed Shopify updates share the existing runtime. */
export async function crossChannelAttributionJourney(input: {
  site: Installation; edge: Awaited<ReturnType<typeof providerEdge>>; commerce: ReturnType<typeof performanceCommerce>;
  destination: string; page: Page; info: TestInfo;
}) {
  const {site, edge, commerce, destination, page, info} = input;
  const cookie = await site.open();
  await page.context().addCookies([{name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url}]);
  await site.control('/_golive/clock', {hold: true});
  const person = {email: 'synthetic-mango-4@example.test', displayName: 'Mango cross-channel reader', phone: '+61411111111'};
  await confirmedContact(site, edge, cookie, person.email, person.displayName);
  const now = (await site.control('/_golive/clock')).now;
  const programme = smsProgramme(now), disclosure = JSON.parse(smsDisclosure());
  const serviceCount = edge.sms.sends.length;
  const captured = await json(await site.call('/api/contacts/consent', {method: 'POST', cookie, body: {
    ...consent, channel: 'sms', smsProgram: programme.programme, brandOrLegalSender: programme.brand,
    messageCategory: programme.category, frequencyDisclosure: programme.frequency, destinationJurisdiction: programme.jurisdiction,
    consentText: disclosure.text, consentVersion: disclosure.version, captureSource: 'Market stall text sign-up',
    timeZone: 'Australia/Brisbane', locationSource: 'operator-entry', locationRecordedAt: new Date(now).toISOString(),
    contact: person, occurredAt: new Date(now).toISOString(),
  }}), 201);
  await site.control('/_golive/cron');
  await expect.poll(() => edge.sms.sends.length, {timeout: 60000, intervals: [250, 1000]}).toBe(serviceCount + 1);
  const confirmation = /https:\/\/\S+\/consent\/confirm\/\S+/.exec(edge.sms.sends.at(-1)!.body.messages[0].message)![0];
  expect((await fetch(site.local(confirmation), {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: 'confirm=true'})).status).toBe(200);
  const contact = await json(await site.call('/api/contacts/' + captured.contact.id, {cookie}), 200);
  expect(contact.contact).toMatchObject({id: captured.contact.id, email: person.email, smsStatus: 'subscribed'});
  await site.control('/_golive/sender-evidence');
  const emailDue = new Date((await site.control('/_golive/clock')).now + 3600000);
  const email = {...await draftCampaign(site, cookie, 'Cross-channel garden email', [person.email], emailDue), name: 'Cross-channel garden email'};
  await json(await site.call(`/api/campaign-revisions/${email.revisionId}`, {method: 'PATCH', cookie,
    body: {emailBody: `<p><a href="${destination}">Garden collection</a></p>`, trackingEnabled: true}}), 200);
  await approve(site, cookie, email);
  await site.control('/_golive/clock', {advanceMs: 3600001});
  expect((await dispatch(site, email.campaignId, emailDue))[0].transport_disposition).toBe('accepted');
  const message = edge.sends.findLast(send => send.to === person.email && send.body.headers?.['List-Unsubscribe'])!;
  const emailLink = /href="([^"]+\/l\/[^\"]+)"/.exec(message.body.content.find((part: any) => part.type === 'text/html').value)![1];
  const follow = async (link: string, automated = false) => {
    const response = await site.call(new URL(link).pathname, {headers: {'User-Agent': automated ? 'Barracuda LinkProtect' : 'Mozilla/5.0 Garden reader'}});
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(destination);
    expect(response.headers.get('Set-Cookie')).toBeNull();
  };
  await follow(emailLink);
  // Respect the real cross-campaign frequency rule. Both clicks are still within
  // seven days when the order occurs, but neither is within one day.
  await site.control('/_golive/clock', {advanceMs: 86400001});
  const smsDue = new Date((await site.control('/_golive/clock')).now + 3600000);
  const sms = {...await draftCampaign(site, cookie, 'Cross-channel garden SMS', [person.email], smsDue), name: 'Cross-channel garden SMS'};
  await json(await site.call(`/api/campaign-revisions/${sms.revisionId}`, {method: 'PATCH', cookie, body: {
    smsBody: `Garden collection ${destination}`, smsSender, trackingEnabled: true,
    steps: [{channel: 'sms', timezone: 'Australia/Brisbane', scheduledAt: smsDue.toISOString(),
      sendByAt: new Date(smsDue.getTime() + 7200000).toISOString(), whyThisTime: 'Owner chose this time'}],
  }}), 200);
  await approve(site, cookie, sms);
  await site.control('/_golive/clock', {advanceMs: 3600001});
  expect((await dispatch(site, sms.campaignId, smsDue))[0].transport_disposition).toBe('accepted');
  const marketing = edge.sms.sends.findLast(send => send.body.ignore_unsubscribes === false)!;
  const smsLink = /https:\/\/[^\s]+\/l\/[^\s]+/.exec(marketing.body.messages[0].message)![0];
  expect(new URL(smsLink).origin).toBe(site.origin);
  expect(smsLink).not.toBe(emailLink);
  await follow(smsLink);
  await site.control('/_golive/clock', {advanceMs: 1000});
  await follow(emailLink, true); // Newer scanner request cannot steal the SMS win.
  const clickedAudience = async (channel: 'email' | 'sms', expected: number, session = cookie) => {
    const audience = await json(await site.call('/api/campaign-authoring/audience', {method: 'POST', cookie: session, body: {
      inclusionRuleJson: JSON.stringify({version: 1, operator: 'all', predicates: [
        {sourceType: 'contact', field: 'email', comparator: 'eq', value: person.email},
        {sourceType: 'contact', field: 'clicked', channel, lookbackDays: 7, comparator: 'eq', value: true},
      ]}), exclusionRulesJson: '[]', channels: ['email'],
    }}), 200);
    expect(audience).toMatchObject({status: 'ok', candidateCount: expected, eligibleCount: expected, excludedCount: 0});
  };
  await clickedAudience('email', 1);
  await clickedAudience('sms', 1);
  await site.control('/_golive/clock', {advanceMs: 2 * 86400000});
  const money = (amount: string) => ({shopMoney: {amount, currencyCode: 'USD'}, presentmentMoney: {amount, currencyCode: 'USD'}});
  let eventId = 500;
  const deliver = async (value: typeof order) => {
    commerce.orders.set(value.id, value);
    const raw = JSON.stringify({admin_graphql_api_id: value.id}), event = `synthetic-mango-${++eventId}`;
    const headers = {'X-Shopify-Hmac-Sha256': createHmac('sha256', 'synthetic-store-webhook-key').update(raw).digest('base64'),
      'X-Shopify-Shop-Domain': 'mango-test.myshopify.com', 'X-Shopify-Topic': 'orders/updated', 'X-Shopify-Webhook-Id': event, 'X-Shopify-Event-Id': event};
    for (let replay = 0; replay < 2; replay++) expect((await site.call('/webhooks/commerce/shopify', {method: 'POST', raw, headers})).status).toBe(204);
  };
  const purchases = [];
  for (const [index, amount] of ['100.00', '50.00', '30.00'].entries()) {
    const at = new Date((await site.control('/_golive/clock', {advanceMs: 1000})).now).toISOString();
    const purchase = {...structuredClone(order), id: id('Order', 501 + index), createdAt: at, updatedAt: at, processedAt: at,
      displayFinancialStatus: 'PAID', currencyCode: 'USD', customer: {...structuredClone(customer), id: id('Customer', 504), email: person.email, phone: person.phone},
      totalPriceSet: money(amount), currentTotalPriceSet: money(amount), totalReceivedSet: money(amount), totalRefundedSet: money('0'),
      lineItems: shopifyPage([]), refunds: [], returns: shopifyPage([])};
    purchases.push(purchase);
    await deliver(purchase);
  }
  const result = (campaignId: string) => site.call(`/api/campaigns/${campaignId}/results`, {cookie}).then(response => json(response, 200));
  const won = (await result(sms.campaignId)).attribution;
  expect(won).toMatchObject({orders: 3, revenueByCurrency: [{currency: 'USD', orders: 3, grossAmountMinor: 18000, reversedAmountMinor: 0, amountMinor: 18000}]});
  expect(won.events.map((event: any) => event.providerOrderId).sort()).toEqual(purchases.map(purchase => purchase.id).sort());
  expect(won.events.every((event: any) => event.channel === 'sms')).toBe(true);
  expect(new Set(won.events.map((event: any) => event.clickFactId)).size).toBe(1);
  expect((await result(email.campaignId)).engagement).toMatchObject({observedClicks: 1, automatedRequestsRetainedButExcluded: 1});
  expect((await result(email.campaignId)).attribution.orders).toBe(0);
  for (const [index, refunded, cancelled] of [[0, '20.00', false], [2, '0', true]] as const) {
    const purchase = purchases[index], at = new Date((await site.control('/_golive/clock', {advanceMs: 1000})).now).toISOString();
    purchase.updatedAt = at;
    purchase.totalRefundedSet = money(refunded);
    purchase.displayFinancialStatus = cancelled ? 'VOIDED' : 'PARTIALLY_REFUNDED';
    if (cancelled) Object.assign(purchase, {cancelledAt: at, cancelReason: 'CUSTOMER'});
    await deliver(purchase);
  }
  expect((await result(sms.campaignId)).attribution).toMatchObject({orders: 3, revenueByCurrency: [{currency: 'USD', orders: 3, grossAmountMinor: 18000, reversedAmountMinor: 5000, amountMinor: 13000}]});
  await syncSource(site, cookie, 'order');
  await openPage(page, site.runtime.url + '/app/insights');
  const context = {site, cookie, page, info, email, sms};
  const policy = await json(await site.call('/api/insights/attribution-policy', {cookie}), 200);
  expect(policy).toMatchObject({policy: 'campaign.attribution.v1', metric: 'placed-order', metricLabel: 'Placed Order', clickWindowDays: {email: 7, sms: 7}});
  await assertAttributionReports({...context, metric: 'placed-order', metricLabel: 'Placed Order', days: 7, conversions: 3, netMinor: '13000', receipt: 'cross-channel-before'});
  const stored = await attributionStoredEvents(site);
  await saveAttributionPolicy(context, 'placed-order', 1);
  await assertAttributionReports({...context, metric: 'placed-order', metricLabel: 'Placed Order', days: 1, conversions: 0, netMinor: '0', receipt: 'cross-channel-one-day'});
  expect(await attributionStoredEvents(site)).toEqual(stored);
  // Restoring the windows restores the same winners without new store events.
  await saveAttributionPolicy(context, 'placed-order', 7);
  expect((await result(sms.campaignId)).attribution.events.map((event: any) => event.clickFactId)).toEqual(won.events.map((event: any) => event.clickFactId));
  expect(await attributionStoredEvents(site)).toEqual(stored);
  await customAttributionJourney({...context, contactId: captured.contact.id});
  // The real segment resolver ages the same observed clicks out. This remains
  // before the original message's 30-day recording boundary checked by our caller.
  await site.control('/_golive/clock', {advanceMs: 8 * 86400000});
  const agedSession = await site.open();
  await clickedAudience('email', 0, agedSession);
  await clickedAudience('sms', 0, agedSession);
}
