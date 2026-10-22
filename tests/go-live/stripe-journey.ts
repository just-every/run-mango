import {createHmac} from 'node:crypto';
import {expect, type Page, type TestInfo} from '@playwright/test';
import {type Installation, json} from './harness';
import type {providerEdge} from './edge';
import {openPage} from '../support/navigation';
export async function stripeJourney(site: Installation, page: Page, info: TestInfo, owner: string, admin: string, author: string, edge: Awaited<ReturnType<typeof providerEdge>>) {
  const testMode = ['_', 'test', '_'].join('');
  const body = {key: 'rk' + testMode + 'SyntheticStripe1234', signingSecret: 'whsec_SyntheticSigning'};
  expect((await site.call('/api/settings/stripe', {method: 'PUT', cookie: owner, body: {...body, key: 'sk' + testMode + 'UnrestrictedKey'}})).status).toBe(400);
  for (const cookie of [admin, author]) expect((await site.call('/api/settings/stripe', {method: 'PUT', cookie, body})).status).toBe(403);
  expect((await site.call('/api/settings/stripe', {method: 'PUT', body})).status).toBe(401);
  const [name, value] = owner.split('=');
  await page.context().addCookies([{name, value, url: site.runtime.url}]);
  await page.setViewportSize({width: 1440, height: 1000});
  await openPage(page, site.runtime.url + '/app/settings');
  await page.getByLabel('Restricted Stripe key', {exact: true}).fill(body.key);
  await page.getByLabel('Webhook signing secret', {exact: true}).fill(body.signingSecret);
  await page.getByRole('button', {name: 'Connect Stripe', exact: true}).click();
  await expect(page.locator('#stripe')).toContainText('Test mode');
  await expect(page.getByLabel('Restricted Stripe key', {exact: true})).toHaveValue('');
  const status = await json(await site.call('/api/settings/stripe', {cookie: owner}), 200);
  expect(status.connection).toMatchObject({mode: 'test', lastFour: '1234', connectedBy: 'owner@example.test'});
  expect(JSON.stringify(status)).not.toContain(body.key);
  const stored = await site.rows('SELECT key_cipher,signing_cipher FROM stripe_connection');
  expect(JSON.stringify(stored)).not.toContain(body.key); expect(JSON.stringify(stored)).not.toContain(body.signingSecret);
  const now = Math.floor(Date.now() / 1000);
  const events = ['created', 'deleted'].map((action, index) => ({id: 'evt_stripe' + index, type: 'customer.subscription.' + action, created: now, livemode: false,
    data: {object: {id: 'sub_synthetic', customer: {id: 'cus_synthetic', email: 'stripe-reader@example.test', name: 'Taylor Orchard'}, status: action === 'deleted' ? 'canceled' : 'active'}}}));
  async function post(event: unknown, secret = body.signingSecret, at = now) {
    const raw = JSON.stringify(event), signature = createHmac('sha256', secret).update(at + '.' + raw).digest('hex');
    return site.call('/webhooks/commerce/stripe', {method: 'POST', raw, headers: {'Stripe-Signature': `t=${at},v1=${signature}`}});
  }
  for (const event of events) {expect((await post(event)).status).toBe(204); expect((await post(event)).status).toBe(204);}
  expect((await post({...events[0], id: 'evt_forged'}, 'wrong')).status).toBe(401);
  expect((await post({...events[0], id: 'evt_expired'}, body.signingSecret, now - 301)).status).toBe(401);
  expect((await post({...events[0], id: 'evt_wrong_mode', livemode: true})).status).toBe(401);
  const rows = await site.rows("SELECT id FROM contacts WHERE email='stripe-reader@example.test'");
  const detail = await json(await site.call('/api/contacts/' + rows[0].id, {cookie: owner}), 200);
  expect(detail.timeline.filter((entry: any) => entry.source === 'stripe · subscription').map((entry: any) => entry.detail).sort()).toEqual(['subscription · subscription.canceled', 'subscription · subscription.started']);
  expect((await site.rows("SELECT count(*) AS n FROM source_records WHERE provider='stripe'"))[0].n).toBe(2);
  const additional = [
    {id:'evt_customer', type:'customer.created', object:{id:'cus_fixture', email:'stripe-reader@example.test'}},
    {id:'evt_payment', type:'payment_intent.succeeded', object:{id:'pi_fixture', customer:'cus_fixture', amount_received:1200, currency:'usd', client_secret:'not-for-storage'}},
    {id:'evt_checkout', type:'checkout.session.completed', object:{id:'cs_fixture', customer:'cus_fixture', amount_total:1200, currency:'usd'}},
    {id:'evt_renewal', type:'invoice.paid', object:{id:'in_fixture', customer:'cus_fixture', billing_reason:'subscription_cycle', amount_paid:1200, currency:'usd'}},
    {id:'evt_pastdue', type:'invoice.payment_failed', object:{id:'in_late', customer:'cus_fixture'}},
    {id:'evt_refund', type:'refund.created', object:{id:'re_fixture', charge:'ch_fixture', amount:1200, currency:'usd'}},
  ];
  for (const fixture of additional) {
    const event={id:fixture.id, type:fixture.type, created:now, livemode:false, data:{object:fixture.object}};
    expect((await post(event)).status).toBe(204); expect((await post(event)).status).toBe(204);
  }
  const expanded=await json(await site.call('/api/contacts/' + rows[0].id, {cookie:owner}),200);
  expect(expanded.timeline.filter((entry:any)=>entry.source.startsWith('stripe · '))).toHaveLength(8);
  for(const state of ['payment.succeeded','subscription.renewed','subscription.past_due','refund.created'])expect(expanded.timeline.some((entry:any)=>entry.detail.includes(state))).toBe(true);
  expect((await site.rows("SELECT count(*) AS n FROM source_records WHERE provider='stripe'"))[0].n).toBe(8);
  expect(JSON.stringify(await site.rows("SELECT payload FROM source_records WHERE provider='stripe'"))).not.toContain('not-for-storage');
  expect(expanded.contact.emailStatus).toBe('non-subscribed');
  // A verified event whose Stripe read fails during an outage keeps its answer and
  // records one failed operation per event; Stripe's retry after recovery ingests it once.
  const failed = async () => (await json(await site.call('/api/store', {cookie: owner}), 200)).syncRuns.filter((run: any) => run.operation === 'webhook');
  const outage = {id: 'evt_outage', type: 'payment_intent.succeeded', created: now, livemode: false, data: {object: {id: 'pi_outage', customer: 'cus_fixture', amount_received: 900, currency: 'usd'}}};
  edge.stripe.outage = true;
  expect((await post(outage, 'wrong')).status).toBe(401);
  expect(await failed()).toEqual([]);
  for (let attempt = 0; attempt < 2; attempt++) expect((await post(outage)).status).toBe(422);
  expect(await failed()).toEqual([expect.objectContaining({provider: 'stripe', sourceType: 'payment', state: 'failed', lastError: 'Stripe API request failed (503).'})]);
  edge.stripe.outage = false;
  for (let attempt = 0; attempt < 2; attempt++) expect((await post(outage)).status).toBe(204);
  expect(await failed()).toEqual([expect.objectContaining({state: 'completed', lastError: 'Stripe API request failed (503).'})]);
  expect((await site.rows("SELECT count(*) AS n FROM source_records WHERE provider='stripe'"))[0].n).toBe(9);
  expect(JSON.stringify(await failed())).not.toContain('private detail');
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: 1000});
    await openPage(page, site.runtime.url + '/app/settings');
    await expect(page.locator('#stripe')).toContainText('Test mode');
    await page.locator('#stripe').screenshot({path: info.outputPath(`stripe-settings-${width}.png`)});
    await openPage(page, site.runtime.url + '/app/audience/' + rows[0].id);
    await expect(page.locator('.timeline')).toContainText('subscription.started');
    await expect(page.locator('.timeline')).toContainText('subscription.canceled');
    await page.locator('.timeline').screenshot({path: info.outputPath(`stripe-timeline-${width}.png`)});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
}
