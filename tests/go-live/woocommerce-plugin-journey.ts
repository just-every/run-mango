import {expect, type Page, type Route, type TestInfo} from '@playwright/test';
import {createHmac, randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {installation, json} from './harness';
import {openPage} from '../support/navigation';
type Site = Awaited<ReturnType<typeof installation>>;
export async function wooPluginJourney(site: Site, page: Page, cookie: string, webhookPath: string, signingSecret: string) {
  const at = new Date(Date.now()-1000).toISOString();
  const event = {version: 1, id: randomUUID(), kind: 'abandoned_checkout', occurredAt: at, customerId: '11', checkoutId: randomUUID(), checkoutStartedAt: new Date(Date.now()-3600000).toISOString(), products: ['21'], consent: {analytics: true, marketing: true}, gpc: false};
  const send = (value: unknown, signature?: string, timestamp = String(Math.floor(Date.now()/1000))) => {
    const raw = JSON.stringify(value);
    return site.call(webhookPath + '/plugin', {method: 'POST', raw, headers: {'Content-Type': 'application/json', 'X-Mango-Timestamp': timestamp,
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
export async function wooBrowserConsent(page: Page, info: TestInfo) {
  const context = page.context(), other = await context.newPage(), unrelated = await context.newPage();
  const stores = [
    {page, origin: 'https://orchard.example.test', nonce: 'synthetic-mango-101', login: 'synthetic-mango-102', session: randomUUID(), productId: '21'},
    {page: other, origin: 'https://market.example.invalid', nonce: 'synthetic-mango-103', login: 'synthetic-mango-104', session: randomUUID(), productId: '22'},
  ];
  const unrelatedOrigin = 'https://unrelated.example.test';
  type Traffic = {source: string; url: string; method: string; navigation: boolean; headers: Record<string, string>; body: string};
  const traffic: Traffic[] = [];
  // Capture every host, including unexpected egress, independently of the AJAX stub.
  const boundary = async (route: Route) => {
    const request = route.request(), url = new URL(request.url());
    const entry = {source: new URL(request.frame().url()).origin, url: request.url(), method: request.method(), navigation: request.isNavigationRequest(), headers: await request.allHeaders(), body: request.postData() ?? ''};
    traffic.push(entry);
    const store = stores.find(value => value.origin === url.origin);
    if (store && url.pathname === '/wp-admin/admin-ajax.php') {
      const body = new URLSearchParams(entry.body);
      const granted = body.get('analytics') === 'true' && body.get('marketing') === 'true' && body.get('gpc') === 'false';
      // WordPress is the network edge: its response sets or expires the host-only cookie.
      await route.fulfill({status: granted ? 200 : 403, contentType: 'application/json', body: '{}', headers: {
        'Set-Cookie': `mango_session=${granted ? store.session : ''}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${granted ? 2592000 : 0}`,
      }});
    } else await route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><html><body>Harvest checkout</body></html>'});
  };
  const observations = (origin: string) => traffic.filter(value => value.source === origin && value.method === 'POST');
  const kinds = (origin: string) => observations(origin).map(value => new URLSearchParams(value.body).get('kind'));
  const activity = (target: Page) => target.evaluate(() => {
    document.dispatchEvent(new Event('wc-blocks_added_to_cart'));
    document.dispatchEvent(new Event('change'));
  });
  const grant = (target: Page) => target.evaluate(() => window.dispatchEvent(new CustomEvent('mango:consent', {detail: {analytics: true, marketing: true}})));
  const withdraw = (target: Page) => target.evaluate(() => {
    Object.defineProperty(navigator, 'globalPrivacyControl', {value: true, configurable: true});
    window.dispatchEvent(new CustomEvent('mango:consent', {detail: {analytics: true, marketing: true}}));
    document.dispatchEvent(new Event('wc-blocks_added_to_cart'));
    document.dispatchEvent(new Event('change'));
  });
  const assertIsolation = () => {
    for (const entry of traffic) {
      const destination = new URL(entry.url);
      expect([stores[0].origin, stores[1].origin, unrelatedOrigin]).toContain(destination.origin);
      const store = stores.find(value => value.origin === entry.source);
      if (!entry.navigation) {
        expect(store, 'every observation originates in a storefront').toBeDefined();
        expect(entry.method).toBe('POST');
        expect(entry.url).toBe(store!.origin + '/wp-admin/admin-ajax.php');
        expect(entry.headers.origin).toBe(store!.origin);
        const body = new URLSearchParams(entry.body);
        expect(body.get('action')).toBe('mango_observation');
        expect(body.get('nonce')).toBe(store!.nonce);
        expect(body.has('customerId') || body.has('email')).toBe(false);
        expect(entry.headers.cookie).toContain('wordpress_logged_in_mango=' + store!.login);
      } else expect(entry.method).toBe('GET');
      for (const foreign of stores.filter(value => value.origin !== destination.origin)) {
        const outbound = JSON.stringify(entry);
        for (const identity of [foreign.login, foreign.session, foreign.nonce]) expect(outbound).not.toContain(identity);
      }
    }
  };
  await context.route('**/*', boundary);
  try {
    await context.addCookies(stores.map(store => ({name: 'wordpress_logged_in_mango', value: store.login, url: store.origin, secure: true, httpOnly: true, sameSite: 'Lax' as const})));
    for (const store of stores) {
      await store.page.goto(store.origin + '/checkout');
      await store.page.evaluate(config => {Object.assign(window, {mangoPlugin: config});}, {ajaxUrl: store.origin + '/wp-admin/admin-ajax.php', nonce: store.nonce, checkout: true, productId: store.productId});
      await store.page.addScriptTag({content: readFileSync('extensions/mango-woocommerce/observations.js', 'utf8')});
      await expect.poll(() => kinds(store.origin)).toEqual(['privacy_withdrawal']);
      expect((await context.cookies(store.origin)).some(value => value.name === 'mango_session')).toBe(false);
      await activity(store.page);
    }
    await page.waitForTimeout(3200); // Include the checkout change debounce, if wrongly enabled.
    for (const store of stores) expect(kinds(store.origin)).toEqual(['privacy_withdrawal']);
    assertIsolation();

    await grant(page);
    await expect.poll(() => kinds(stores[0].origin).slice(1).sort()).toEqual(['active_on_site', 'started_checkout', 'viewed_product']);
    await expect.poll(async () => (await context.cookies(stores[0].origin)).find(value => value.name === 'mango_session')?.value).toBe(stores[0].session);
    await page.evaluate(() => document.dispatchEvent(new Event('wc-blocks_added_to_cart')));
    await expect.poll(() => kinds(stores[0].origin)).toHaveLength(5);
    expect(observations(stores[0].origin).at(-1)!.headers.cookie).toContain('mango_session=' + stores[0].session);
    await activity(other);
    await unrelated.goto(unrelatedOrigin + '/');
    await page.waitForTimeout(3200);
    expect(kinds(stores[1].origin)).toEqual(['privacy_withdrawal']);
    expect((await context.cookies(stores[1].origin)).some(value => value.name === 'mango_session')).toBe(false);
    expect(traffic.find(value => value.url === unrelatedOrigin + '/')!.headers.cookie).toBeUndefined();
    assertIsolation();

    await grant(other);
    await expect.poll(() => kinds(stores[1].origin).slice(1).sort()).toEqual(['active_on_site', 'started_checkout', 'viewed_product']);
    await expect.poll(async () => (await context.cookies(stores[1].origin)).find(value => value.name === 'mango_session')?.value).toBe(stores[1].session);
    await other.evaluate(() => document.dispatchEvent(new Event('wc-blocks_added_to_cart')));
    await expect.poll(() => kinds(stores[1].origin)).toHaveLength(5);
    expect(observations(stores[1].origin).at(-1)!.headers.cookie).toContain('mango_session=' + stores[1].session);
    assertIsolation();

    await withdraw(page);
    await expect.poll(() => kinds(stores[0].origin)).toHaveLength(6);
    // The other store retains only its own grant while the first refuses cart activity.
    await other.evaluate(() => document.dispatchEvent(new Event('wc-blocks_added_to_cart')));
    await expect.poll(() => kinds(stores[1].origin)).toHaveLength(6);
    await withdraw(other);
    await expect.poll(() => kinds(stores[1].origin)).toHaveLength(7);
    await Promise.all(stores.map(store => activity(store.page)));
    await page.waitForTimeout(3200);
    for (const [index, store] of stores.entries()) {
      expect(kinds(store.origin)).toHaveLength(index === 0 ? 6 : 7);
      const withdrawal = new URLSearchParams(observations(store.origin).at(-1)!.body);
      expect(withdrawal.get('kind')).toBe('privacy_withdrawal');
      expect(withdrawal.get('gpc')).toBe('true');
      expect((await context.cookies(store.origin)).some(value => value.name === 'mango_session')).toBe(false);
    }
    assertIsolation();
  } finally {
    await info.attach('woocommerce-observation-traffic', {body: JSON.stringify(traffic, null, 2), contentType: 'application/json'});
    await context.unroute('**/*', boundary);
    await other.close(); await unrelated.close();
  }
}
