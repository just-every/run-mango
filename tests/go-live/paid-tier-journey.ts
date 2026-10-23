import {expect, type Page, type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {type Installation, json, confirmedContact, draftCampaign, approve, dispatch} from './harness';
import type {providerEdge} from './edge';
import {openPage} from '../support/navigation';

/** PUB-002 through Mango's settings, checkout, signed webhook and review doors;
 * only the Stripe network edge is faked. Payment never creates consent. */
export async function paidTierJourney(input: {site: Installation; page: Page; info: TestInfo; owner: string; admin: string; author: string; restrictedKey: string;
  edge: Awaited<ReturnType<typeof providerEdge>>; post: (event: unknown) => Promise<Response>}) {
  const {site, page, info, owner, edge, post} = input;
  const tier = {paidTopic: 'Members', freeTopic: 'newsletter', priceId: 'price_synthetic', automaticTax: true};
  for (const cookie of [input.admin, input.author]) expect((await site.call('/api/settings/stripe/paid-tier', {method: 'PUT', cookie, body: tier})).status).toBe(403);
  expect((await site.call('/api/settings/stripe/paid-tier', {method: 'PUT', cookie: owner, body: {...tier, automaticTax: false}})).status).toBe(400);
  expect((await site.call('/paid/checkout', {method: 'POST', body: {email: 'paid-reader@example.test'}})).status).toBe(409);
  await page.setViewportSize({width: 1440, height: 1000});
  await openPage(page, site.runtime.url + '/app/settings');
  await page.getByLabel('Paid topic', {exact: true}).fill(tier.paidTopic);
  await page.getByLabel('Free topic', {exact: true}).fill(tier.freeTopic);
  await page.getByLabel('Stripe price ID', {exact: true}).fill(tier.priceId);
  await page.getByRole('button', {name: 'Save paid tier', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Paid tier saved.'})).toBeVisible();
  expect((await json(await site.call('/api/settings/stripe', {cookie: owner}), 200)).paidTier).toEqual(tier);

  // The public checkout door creates a subscription-mode session with Stripe Tax
  // through the stored restricted key; Mango never handles card data.
  const checkout = await json(await site.call('/paid/checkout', {method: 'POST', body: {email: 'paid-reader@example.test'}}), 200);
  expect(checkout.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
  const session = edge.stripe.sessions.at(-1)!;
  expect(session.authorization).toBe(`Bearer ${input.restrictedKey}`);
  expect(Object.fromEntries(session.form)).toMatchObject({'mode': 'subscription', 'line_items[0][price]': 'price_synthetic', 'line_items[0][quantity]': '1',
    'automatic_tax[enabled]': 'true', 'payment_method_types[0]': 'card', 'customer_email': 'paid-reader@example.test', 'subscription_data[metadata][mango_paid_tier]': '1'});
  expect([...session.form.keys()].filter(key => /card|payment_method/.test(key))).toEqual(['payment_method_types[0]']);

  const people = {paid: 'paid-reader@example.test', optout: 'paid-optout@example.test', free: 'free-reader@example.test', unconsented: 'unconsented-payer@example.test'};
  for (const key of ['paid', 'optout', 'free'] as const) await confirmedContact(site, edge, owner, people[key], `Garden ${key} reader`);
  let created = Math.floor(Date.now() / 1000);
  const event = (id: string, type: string, object: Record<string, unknown>) => ({id, type, created: ++created, livemode: false, data: {object}});
  const deliver = async (value: ReturnType<typeof event>) => {for (let attempt = 0; attempt < 2; attempt++) expect((await post(value)).status, value.id).toBe(204);};
  const subscription = (key: keyof typeof people) => ({id: `sub_${key}`, ...edge.stripe.subscriptions[`sub_${key}`]});
  for (const key of ['paid', 'optout', 'unconsented'] as const) {
    edge.stripe.customers[`cus_${key}`] = {email: people[key], name: `Garden ${key} reader`};
    edge.stripe.subscriptions[`sub_${key}`] = {status: 'active', customer: `cus_${key}`, metadata: {mango_paid_tier: '1'}};
    await deliver(event(`evt_checkout_${key}`, 'checkout.session.completed', {id: `cs_${key}`, mode: 'subscription', subscription: `sub_${key}`, customer: `cus_${key}`,
      customer_details: {email: people[key]}, amount_total: 1080, currency: 'usd', total_details: {amount_tax: 80}}));
    await deliver(event(`evt_started_${key}`, 'customer.subscription.created', subscription(key)));
  }

  const contacts: Record<string, string> = {};
  for (const [key, email] of Object.entries(people)) contacts[key] = (await site.rows(`SELECT id FROM contacts WHERE email='${email}'`))[0].id;
  let due = new Date((await site.control('/_golive/clock')).now + 3600000);
  let campaign = await draftCampaign(site, owner, 'Members-only garden notes', Object.values(people), due);
  const paidOnly = {version: 1, operator: 'all', predicates: [{sourceType: 'contact', field: 'paidMember', channel: 'email', comparator: 'eq', value: true}]};
  const setRules = async (rule: unknown) => json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`, {method: 'PATCH', cookie: owner, body: {inclusionRuleJson: JSON.stringify(rule)}}), 200);
  const review = async () => json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`, {method: 'POST', cookie: owner, body: {revisionId: campaign.revisionId}}), 200);
  const readers = async () => (await json(await site.call('/api/settings/stripe', {cookie: owner}), 200)).paidReaders;
  // Review's exact count, intersected with every reader, for the paid-only audience.
  async function members(expected: string[]) {
    await setRules(paidOnly);
    expect(await review()).toMatchObject({candidateCount: expected.length, eligibleCount: expected.length});
    for (const [key, id] of Object.entries(contacts)) {
      await setRules({...paidOnly, predicates: [...paidOnly.predicates, {sourceType: 'contact', field: 'id', comparator: 'eq', value: id}]});
      const count = expected.includes(key) ? 1 : 0;
      expect(await review(), key).toMatchObject({candidateCount: count, eligibleCount: count});
    }
    await setRules(paidOnly);
  }
  // A payer without consent is recorded as paying but never joins the paid topic.
  await members(['paid', 'optout']);
  expect(await readers()).toEqual({paidTopic: 2, consentMissing: 1, paymentFailed: 0, canceled: 0});
  expect(await site.rows('SELECT subscription_id,customer_id,state,tax_amount,currency FROM paid_subscriptions ORDER BY subscription_id')).toEqual(
    ['optout', 'paid', 'unconsented'].map(key => ({subscription_id: `sub_${key}`, customer_id: `cus_${key}`, state: 'active', tax_amount: 80, currency: 'usd'})));
  // Opt-out wins over payment.
  await json(await site.call(`/api/contacts/${contacts.optout}/opt-out`, {method: 'POST', cookie: owner, body: {channel: 'email'}}), 200);
  await members(['paid']);

  // Stripe's current status governs membership on every verified event.
  const failure = (id: string) => event(id, 'invoice.payment_failed', {id: `in_${id}`, customer: 'cus_paid', subscription: 'sub_paid', currency: 'usd', tax: 80});
  await deliver(failure('evt_failed_retrying'));
  await members(['paid']);
  edge.stripe.subscriptions.sub_paid.status = 'past_due';
  await deliver(event('evt_past_due', 'customer.subscription.updated', subscription('paid')));
  await members([]);
  await deliver(failure('evt_failed_past_due'));
  await members([]);
  expect(await readers()).toMatchObject({paidTopic: 0, paymentFailed: 1});
  edge.stripe.subscriptions.sub_paid.status = 'active';
  await deliver(event('evt_recovered', 'customer.subscription.updated', subscription('paid')));
  await members(['paid']);

  for (const status of ['unpaid', 'paused', 'incomplete', 'incomplete_expired', 'canceled']) {
    edge.stripe.subscriptions.sub_paid.status = status;
    await deliver(event(`evt_status_${status}`, status === 'paused' ? 'customer.subscription.paused' : 'customer.subscription.updated', subscription('paid')));
    await members([]);
    edge.stripe.subscriptions.sub_paid.status = 'active';
    await deliver(event(`evt_resume_${status}`, status === 'paused' ? 'customer.subscription.resumed' : 'invoice.paid',
      status === 'paused' ? subscription('paid') : {id: `in_resume_${status}`, customer: 'cus_paid', subscription: 'sub_paid'}));
    await members(['paid']);
  }
  // A current paid reader receives the approved issue, and the free reader does not.
  await approve(site, owner, campaign);
  await site.control('/_golive/clock', {advanceMs: 3600001});
  const accepted = (await dispatch(site, campaign.campaignId, due)).filter(row => row.transport_disposition === 'accepted');
  expect(accepted.map(row => row.email)).toEqual([people.paid]);
  expect(edge.sends.filter(send => String(send.body.subject).startsWith('Members-only garden notes')).map(send => send.to)).toEqual([people.paid]);
  // Start the cancellation campaign beyond the channel's ordinary frequency window.
  await site.control('/_golive/clock', {advanceMs: 86400001});
  due = new Date((await site.control('/_golive/clock')).now + 3600000);
  campaign = await draftCampaign(site, owner, 'Cancelled paid garden notes', Object.values(people), due);
  await setRules(paidOnly);

  // An approved paid-only send is rechecked at hand-off: cancellation moves the
  // reader back to the free topic before it, and replays change nothing.
  await approve(site, owner, campaign);
  edge.stripe.subscriptions.sub_paid.status = 'canceled';
  await deliver(event('evt_canceled', 'customer.subscription.deleted', subscription('paid')));
  expect(await readers()).toEqual({paidTopic: 0, consentMissing: 2, paymentFailed: 0, canceled: 1});
  await site.control('/_golive/clock', {advanceMs: 3600001});
  expect((await dispatch(site, campaign.campaignId, due)).filter(row => row.transport_disposition === 'accepted')).toEqual([]);
  expect(edge.sends.filter(send => String(send.body.subject).startsWith('Cancelled paid garden notes'))).toEqual([]);
  const timeline = (await json(await site.call(`/api/contacts/${contacts.paid}`, {cookie: owner}), 200)).timeline.map((entry: any) => entry.detail);
  for (const detail of ['checkout-session · checkout.session.completed', 'subscription · subscription.started', 'payment · invoice.payment_failed', 'subscription · subscription.past_due', 'subscription · subscription.canceled']) expect(timeline).toContain(detail);

  const freeDue = new Date((await site.control('/_golive/clock')).now + 3600000);
  const freeCampaign = await draftCampaign(site, owner, 'Free garden notes after cancellation', [people.paid, people.free], freeDue);
  await approve(site, owner, freeCampaign);
  await site.control('/_golive/clock', {advanceMs: 3600001});
  expect((await dispatch(site, freeCampaign.campaignId, freeDue)).filter(row => row.transport_disposition === 'accepted').map(row => row.email).sort()).toEqual([people.free, people.paid].sort());
  expect(edge.sends.filter(send => String(send.body.subject).startsWith('Free garden notes after cancellation')).map(send => send.to).sort()).toEqual([people.free, people.paid].sort());

  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: 1000});
    await openPage(page, site.runtime.url + '/app/settings');
    const readersList = page.getByRole('list', {name: 'Paid readers', exact: true});
    await expect(readersList).toContainText('2 paid, consent missing');
    await expect(readersList).toContainText('1 back on the free topic after cancellation');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({page}).include('#stripe').analyze()).violations).toEqual([]);
    await page.locator('#stripe').screenshot({path: info.outputPath(`paid-tier-settings-${width}.png`)});
    await openPage(page, `${site.runtime.url}/app/audience/${contacts.paid}`);
    for (const state of ['Cancelled paid garden notes · email · audience-no-longer-matches', 'subscription.canceled', 'subscription.past_due']) await expect(page.locator('.timeline')).toContainText(state);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({page}).include('.timeline').analyze()).violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    await page.locator('.timeline').screenshot({path: info.outputPath(`paid-tier-timeline-${width}.png`)});
  }
}
