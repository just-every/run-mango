import {test, expect} from '@playwright/test';
import {createHmac} from 'node:crypto';
import {providerEdge} from './edge';
import {wooCommerceEdge} from './woocommerce-edge';
import {eventSigner} from './sendgrid-events';
import {installation, json, sender, confirmedContact} from './harness';
import {openPage} from '../support/navigation';

test('[INT-002] WooCommerce owner connection syncs store facts and signed replay preserves identity, consent and failed-operation recovery', async ({page}, info) => {
  const woo = wooCommerceEdge(), edge = await providerEdge({woo: woo.handle, links: {'https://woo.example.test/': {}}});
  const site = await installation(edge, eventSigner(), {networkHosts: ['woo.example.test']});
  try {
    const cookie = await site.open();
    const connection = {url: 'https://woo.example.test/', key: 'synthetic-mango-1', secret: 'synthetic-mango-2', signingSecret: 'synthetic-mango-3', exclusiveSecret: true};
    await json(await site.call('/api/settings/sender', {method: 'PUT', cookie, body: sender}), 200);
    await site.control('/_golive/sender-evidence');
    await confirmedContact(site, edge, cookie, 'woo-reader@example.test', 'Alex Orchard');
    const consentBefore = await site.rows('SELECT * FROM consent_evidence ORDER BY id');
    expect((await site.call('/api/settings/woocommerce', {method: 'PUT', body: connection})).status).toBe(401);
    for (const role of ['admin', 'manager', 'author']) {
      const other = await site.open(role + '@example.test', 'woo-' + role);
      await json(await site.call('/api/operators/woo-' + role + '/role', {method: 'PUT', cookie, body: {role}}), 200);
      expect((await site.call('/api/settings/woocommerce', {method: 'PUT', cookie: other, body: connection})).status).toBe(403);
      expect((await site.call('/api/settings/woocommerce', {method: 'DELETE', cookie: other})).status).toBe(403);
    }
    expect(woo.state.requests).toEqual([]);
    for (const url of ['http://woo.example.test/', 'https://127.0.0.1/', 'https://user:pass@woo.example.test/']) expect((await site.call('/api/settings/woocommerce', {method: 'PUT', cookie, body: {...connection, url}})).status).toBe(400);
    await page.context().addCookies([{name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url}]);
    await openPage(page, site.runtime.url + '/app/settings');
    await page.getByLabel('WooCommerce store URL').fill(connection.url);
    await page.getByLabel('Consumer key', {exact: true}).fill(connection.key);
    await page.getByLabel('Consumer secret', {exact: true}).fill(connection.secret);
    await page.getByLabel('WooCommerce webhook secret', {exact: true}).fill(connection.signingSecret);
    await page.getByLabel('This webhook secret is used only for this store’s Mango connection.').check();
    await page.getByRole('button', {name: 'Connect WooCommerce', exact: true}).click();
    await expect(page.locator('#woocommerce [role=status]').filter({hasText: 'Connected to'})).toBeVisible();
    await expect(page.getByLabel('Consumer key', {exact: true})).toHaveValue('');
    const status = await json(await site.call('/api/settings/woocommerce', {cookie}), 200);
    expect(JSON.stringify(status)).not.toContain(connection.key);
    const stored = await site.rows('SELECT * FROM woocommerce_connection');
    for (const secret of [connection.key, connection.secret, connection.signingSecret]) expect(JSON.stringify(stored)).not.toContain(secret);
    const provider = 'woocommerce:' + status.connection.id;
    const queue = async (sourceType: string, runId?: string) => json(await site.call('/api/store/sync', {method: 'POST', cookie, body: {sourceType, runId}}), 202);
    const finished = async (id: string, state = 'completed') => expect.poll(async () => (await site.rows(`SELECT state FROM source_sync_runs WHERE id='${id}'`))[0]?.state, {timeout: 60000}).toBe(state);
    for (const sourceType of ['customer', 'product', 'order', 'refund']) {const run = await queue(sourceType); await finished(run.runId);}
    const records = await site.rows(`SELECT source_type,provider_source_id,occurred_at,payload,contact_id FROM source_records WHERE provider='${provider}' ORDER BY source_type,provider_source_id`);
    expect(records.map(row => row.source_type)).toEqual(['customer', 'order', 'product', 'product', 'refund']);
    expect(records.find(row => row.source_type === 'order')?.occurred_at).toBe(Date.parse('2026-10-20T10:00:00Z'));
    expect(records.find(row => row.source_type === 'refund')?.occurred_at).toBe(Date.parse('2026-10-21T10:00:00Z'));
    expect(new Set(records.filter(row => row.contact_id).map(row => row.contact_id)).size).toBe(1);
    expect(JSON.stringify(records)).not.toContain('never-import-this');
    expect(JSON.parse(records.find(row => row.source_type === 'refund')!.payload)).toMatchObject({amount: '12.00', currency: 'AUD', paymentRefundedViaApi: true});
    expect(await site.rows('SELECT * FROM consent_evidence ORDER BY id')).toEqual(consentBefore);
    expect((await site.rows("SELECT email_status FROM contacts WHERE email='woo-reader@example.test'"))[0].email_status).toBe('subscribed');
    const webhookPath = new URL(status.webhookUrl).pathname;
    const webhook = (body: unknown = {id: 31}, delivery = 'synthetic-mango-4', extra: Record<string, string> = {}) => {
      const raw = JSON.stringify(body);
      return site.call(webhookPath, {method: 'POST', raw, headers: {'Content-Type': 'application/json', 'X-WC-Webhook-Topic': 'order.updated', 'X-WC-Webhook-Source': connection.url,
        'X-WC-Webhook-Delivery-ID': delivery, 'X-WC-Webhook-Signature': createHmac('sha256', connection.signingSecret).update(raw).digest('base64'), ...extra}});
    };
    await json(await webhook(), 204); await json(await webhook(), 204);
    expect(await site.rows(`SELECT source_type,provider_source_id,occurred_at,payload,contact_id FROM source_records WHERE provider='${provider}' ORDER BY source_type,provider_source_id`)).toEqual(records);
    expect(await site.count('commerce_receipts')).toBe(1);
    expect(await site.rows('SELECT gross_amount_minor,reported_refund_minor,currency FROM commerce_orders')).toEqual([{gross_amount_minor: 4800, reported_refund_minor: 1200, currency: 'AUD'}]);
    expect(await site.rows('SELECT amount_minor,currency FROM commerce_refunds')).toEqual([{amount_minor: 1200, currency: 'AUD'}]);
    expect((await webhook({id: 31, changed: true})).status).toBe(409);
    expect((await webhook({id: 31}, 'synthetic-mango-5', {'X-WC-Webhook-Signature': 'invalid'})).status).toBe(401);
    expect((await webhook({id: 31}, 'synthetic-mango-5', {'X-WC-Webhook-Source': 'https://other.example.test/'})).status).toBe(401);
    woo.state.outage = true;
    expect((await webhook({id: 31}, 'synthetic-mango-6')).status).toBe(422);
    expect((await webhook({id: 31}, 'synthetic-mango-6')).status).toBe(422);
    expect((await site.rows("SELECT * FROM source_sync_runs WHERE operation='webhook' AND state='failed'"))).toHaveLength(1);
    expect(JSON.stringify(await site.rows("SELECT last_error FROM source_sync_runs WHERE operation='webhook'"))).not.toContain('never-import-this');
    woo.state.outage = false;
    await json(await webhook({id: 31}, 'synthetic-mango-6'), 204);
    expect((await site.rows("SELECT * FROM source_sync_runs WHERE operation='webhook' AND state='failed'"))).toHaveLength(0);
    // Later store reads cannot undo Mango's native opt-out.
    const contactId = records.find(row => row.source_type === 'customer')!.contact_id;
    await json(await site.call(`/api/contacts/${contactId}/opt-out`, {method: 'POST', cookie, body: {channel: 'email'}}), 200);
    await json(await webhook({id: 31}, 'synthetic-mango-7'), 204);
    expect((await site.rows("SELECT email_status FROM contacts WHERE email='woo-reader@example.test'"))[0].email_status).toBe('unsubscribed');
    expect(await site.rows('SELECT * FROM consent_evidence ORDER BY id')).toEqual(consentBefore);
    // A later API page failing keeps the last completed source and its cursor.
    woo.state.secondPageFailure = true;
    const failed = await queue('product'); await finished(failed.runId, 'failed');
    const last = (await site.rows("SELECT last_successful_at FROM source_syncs WHERE source_type='product'"))[0].last_successful_at;
    expect(last).not.toBeNull();
    woo.state.secondPageFailure = false;
    await queue('product', failed.runId); await finished(failed.runId);
    expect((await site.rows(`SELECT * FROM source_records WHERE provider='${provider}' AND source_type='product'`))).toHaveLength(2);
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await openPage(page, site.runtime.url + '/app/settings');
      await expect(page.locator('#woocommerce')).toContainText(connection.url);
      await page.locator('#woocommerce').screenshot({path: info.outputPath(`woocommerce-settings-${width}.png`)});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await openPage(page, site.runtime.url + '/app/store');
      await expect(page.getByRole('article', {name: 'Order sync', exact: true})).toContainText('completed');
      await page.screenshot({path: info.outputPath(`woocommerce-store-${width}.png`), fullPage: true});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await json(await site.call('/api/settings/woocommerce', {method: 'DELETE', cookie}), 200);
    expect((await webhook()).status).toBe(409);
    expect((await site.call('/api/store/sync', {method: 'POST', cookie, body: {sourceType: 'order'}})).status).toBe(409);
    expect(await site.count('woocommerce_connection')).toBe(0);
    expect((await site.rows(`SELECT * FROM source_records WHERE provider='${provider}'`))).toHaveLength(5);
    expect(woo.state.authorizations.every(value => value === 'Basic ' + Buffer.from(connection.key + ':' + connection.secret).toString('base64'))).toBe(true);
    expect(edge.unexpected).toEqual([]);
  } finally {await site.runtime.close(); await edge.close();}
});
