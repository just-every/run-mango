import {expect, type Page} from '@playwright/test';
import {createHmac, randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {installation, json} from './harness';
import {openPage} from '../support/navigation';
type Site = Awaited<ReturnType<typeof installation>>;
export async function wooPluginJourney(site: Site, page: Page, cookie: string, webhookPath: string, signingSecret: string) {
  const at = new Date(Date.now()-1000).toISOString();
  const event = {version: 1, id: randomUUID(), kind: 'abandoned_checkout', occurredAt: at, customerId: '11', checkoutId: randomUUID(), checkoutStartedAt: new Date(Date.now()-3600000).toISOString(), products: ['21'], consent: {analytics: true, marketing: true}, gpc: false};
  const send = (value: unknown, signature?: string, timestamp = String(Math.floor(Date.now()/1000)), origin = site.origin) => {
    const raw = JSON.stringify(value);
    return site.call(webhookPath + '/plugin', {method: 'POST', raw, headers: {'Content-Type': 'application/json', Origin: origin, 'X-GoLive-Host': new URL(site.origin).host, 'X-Test-Token':site.runtime.token, 'X-Mango-Timestamp': timestamp,
      'X-Mango-Signature': signature ?? createHmac('sha256', signingSecret).update('mango-plugin-v1\n' + timestamp + '.' + raw).digest('base64')}});
  };
  await openPage(page, site.runtime.url + '/app/settings');
  await page.getByLabel('Flow name', {exact: true}).fill('Harvest checkout follow-up');
  await page.getByLabel('Contact tag', {exact: true}).fill('checkout-follow-up');
  await page.getByRole('button', {name: 'Save checkout flow draft', exact: true}).click();
  const card = page.getByRole('article', {name: 'Harvest checkout follow-up', exact: true});
  await expect(card).toContainText('State: draft');
  await json(await send({...event, id: randomUUID(), checkoutId: randomUUID()}), 204);
  expect(await site.count('woocommerce_flow_enrollments')).toBe(0);
  const flow = (await json(await site.call('/api/flows', {cookie}), 200)).flows[0];
  const author = await site.open('author@example.test', 'woo-author');
  expect((await site.call(`/api/flows/${flow.id}/activate`, {method: 'POST', cookie: author, body: {revisionId: flow.id}})).status).toBe(403);
  expect((await site.call(`/api/flows/${flow.id}/activate`, {method: 'POST', cookie, body: {revisionId: randomUUID()}})).status).toBe(409);
  await card.getByRole('button', {name: 'Activate this revision', exact: true}).click();
  await expect(card).toContainText('State: live');
  event.occurredAt = new Date().toISOString();
  expect((await send(event, 'invalid')).status).toBe(401);
  expect((await send({...event, gpc: true})).status).toBe(401);
  expect((await send({...event, consent: {analytics: true, marketing: false}})).status).toBe(401);
  expect((await send(event, undefined, String(Math.floor(Date.now()/1000)-600))).status).toBe(401);
  expect(await site.count('woocommerce_flow_enrollments')).toBe(0);
  await json(await send(event), 204); await json(await send(event), 204);
  expect(await site.rows('SELECT revision_id,event_id,current_node,state FROM woocommerce_flow_enrollments')).toEqual([{revision_id: flow.id, event_id: event.id, current_node: 'exit', state: 'completed'}]);
  expect(await site.rows('SELECT tags_json FROM integration_contact_profiles')).toEqual([{tags_json: '["checkout-follow-up"]'}]);
  expect(await site.rows("SELECT kind FROM contact_history WHERE kind='flow-completed'")).toEqual([{kind: 'flow-completed'}]);
  expect((await send({...event, products: ['22']})).status).toBe(409);
  await json(await send({...event, id: randomUUID(), checkoutId: randomUUID(), occurredAt: at}), 204);
  expect(await site.count('woocommerce_flow_enrollments')).toBe(1);
  await openPage(page, site.runtime.url + '/app/settings');
  await expect(page.getByRole('article', {name: 'Harvest checkout follow-up', exact: true})).toContainText('Enrollments: 1');
  return {event, send, flow};
}

/** WordPress is the network edge here. Run the shipped browser script, not a copy. */
export async function wooBrowserConsent(page: Page) {
  const observations: URLSearchParams[] = [];
  await page.route('https://store.example.test/**', async route => {
    if (route.request().url().endsWith('/ajax')) {observations.push(new URLSearchParams(route.request().postData() ?? '')); await route.fulfill({status: 200, body: '{}'});}
    else await route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><html><body>Harvest checkout</body></html>'});
  });
  await page.goto('https://store.example.test/checkout');
  await page.evaluate(() => {Object.assign(window, {mangoPlugin: {ajaxUrl: '/ajax', nonce: 'synthetic-mango-8', checkout: true, productId: '21'}});});
  await page.addScriptTag({content: readFileSync('extensions/mango-woocommerce/observations.js', 'utf8')});
  await expect.poll(() => observations.length).toBe(1);
  expect(observations[0].get('kind')).toBe('privacy_withdrawal');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('mango:consent', {detail: {analytics: true, marketing: true}})));
  await expect.poll(() => observations.length).toBe(4);
  expect(observations.slice(1).map(value => value.get('kind')).sort()).toEqual(['active_on_site','started_checkout','viewed_product']);
  expect(observations.every(value => !value.has('customerId') && !value.has('email'))).toBe(true);
  await page.evaluate(() => {Object.defineProperty(navigator, 'globalPrivacyControl', {value: true, configurable: true}); window.dispatchEvent(new CustomEvent('mango:consent', {detail: {analytics: true, marketing: true}})); document.dispatchEvent(new Event('wc-blocks_added_to_cart'));});
  await expect.poll(() => observations.length).toBe(5);
  expect(observations[4].get('kind')).toBe('privacy_withdrawal'); expect(observations[4].get('gpc')).toBe('true');
  const insecureRequests:string[]=[];
  await page.route('http://store.example.test/**',async route=>{if(route.request().url().endsWith('/ajax'))insecureRequests.push(route.request().url());await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body>Insecure store page</body></html>'});});
  await page.goto('http://store.example.test/checkout');
  await page.evaluate(()=>Object.assign(window,{mangoConsent:{analytics:true,marketing:true},mangoPlugin:{ajaxUrl:'http://store.example.test/ajax',nonce:'synthetic-mango-8',checkout:true,productId:'21'}}));
  await page.addScriptTag({content:readFileSync('extensions/mango-woocommerce/observations.js','utf8')});
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mango:consent',{detail:{analytics:true,marketing:true}})));
  expect(observations).toHaveLength(5);
  expect(insecureRequests).toEqual([]);
  expect(await page.context().cookies('http://store.example.test')).toEqual([]);
  await page.unroute('http://store.example.test/**');
  await page.unroute('https://store.example.test/**');
}
