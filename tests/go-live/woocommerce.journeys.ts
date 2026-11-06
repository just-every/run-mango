import {builtConnectionsSourceJourney} from './built-source-journey';
import {wooPluginJourney, wooBrowserConsent} from './woocommerce-plugin-journey';
import {test, expect} from '@playwright/test';
import {createHmac} from 'node:crypto';
import {providerEdge} from './edge';
import {wooCommerceEdge} from './woocommerce-edge';
import {eventSigner} from './sendgrid-events';
import {installation, json, sender, confirmedContact, draftCampaign} from './harness';
import {openPage} from '../support/navigation';

test('[INT-002] WooCommerce owner connection syncs store facts and signed replay preserves identity, consent and failed-operation recovery', async ({page}, info) => {
  const catalogUrl = 'https://catalog.woo.example.test/harvest', operatorUrl = 'https://operator.example.test/offer';
  const catalogHost = new URL(catalogUrl).hostname, operatorHost = new URL(operatorUrl).hostname;
  const woo = wooCommerceEdge({catalogUrl}), edge = await providerEdge({woo: woo.handle, links: {'https://woo.example.test/': {}, [catalogUrl]: {}, [operatorUrl]: {}}});
  const site = await installation(edge, eventSigner(), {networkHosts: ['woo.example.test', catalogHost, operatorHost]});
  try {
    const cookie = await site.open();
    const connection = {url: 'https://woo.example.test/', key: 'synthetic-mango-1', secret: 'synthetic-mango-2', signingSecret: 'synthetic-mango-3', exclusiveSecret: true, pluginEnabled: true};
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
    await page.getByLabel('Enable the installed Mango WordPress plugin').check();
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
    const plugin = await wooPluginJourney(site, page, cookie, webhookPath, connection.signingSecret);
    woo.state.order.date_paid_gmt = new Date(Date.now()-1800000).toISOString().replace('Z','');
    woo.state.order.date_modified_gmt = new Date().toISOString().replace('Z','');
    await json(await webhook({id: 31}, 'synthetic-mango-8'), 204);
    await json(await plugin.send({...plugin.event, id: crypto.randomUUID(), checkoutId: crypto.randomUUID()}), 204);
    expect(await site.count('woocommerce_flow_enrollments')).toBe(1);
    woo.state.observations.push(plugin.event);
    const cartSync = await queue('cart'); await finished(cartSync.runId);
    const browsingSync = await queue('browsing-event'); await finished(browsingSync.runId);
    expect(await site.count('woocommerce_flow_enrollments')).toBe(1);
    // Later store reads cannot undo Mango's native opt-out.
    const contactId = records.find(row => row.source_type === 'customer')!.contact_id;
    await json(await site.call(`/api/contacts/${contactId}/opt-out`, {method: 'POST', cookie, body: {channel: 'email'}}), 200);
    await json(await webhook({id: 31}, 'synthetic-mango-7'), 204);
    await json(await plugin.send({...plugin.event, id: crypto.randomUUID(), checkoutId: crypto.randomUUID(), checkoutStartedAt: new Date(Date.now()-1000).toISOString(), occurredAt: new Date().toISOString()}), 204);
    expect(await site.count('woocommerce_flow_enrollments')).toBe(1);
    expect((await site.rows("SELECT email_status FROM contacts WHERE email='woo-reader@example.test'"))[0].email_status).toBe('unsubscribed');
    expect(await site.rows('SELECT * FROM consent_evidence ORDER BY id')).toEqual(consentBefore);
    const credential = await json(await site.call('/api/settings/integrations', {method: 'POST', cookie, body: {name: 'Store suppression control', scopes: ['contacts:write']}}), 201);
    await json(await site.call('/api/integrations/v1/suppressions', {method: 'POST', headers: {Authorization: 'Bearer ' + credential.token}, body: {email: 'woo-reader@example.test', reason: 'Owner restriction', idempotencyKey: 'synthetic-mango-9'}}), 200);
    expect((await site.rows("SELECT email_status FROM contacts WHERE email='woo-reader@example.test'"))[0].email_status).toBe('suppressed');
    await json(await plugin.send({...plugin.event, id: crypto.randomUUID(), checkoutId: crypto.randomUUID(), checkoutStartedAt: new Date(Date.now()-1000).toISOString(), occurredAt: new Date().toISOString()}), 204);
    expect(await site.count('woocommerce_flow_enrollments')).toBe(1);
    expect(await site.rows('SELECT * FROM consent_evidence ORDER BY id')).toEqual(consentBefore);
    // A later API page failing keeps the last completed source and its cursor.
    woo.state.secondPageFailure = true;
    const failed = await queue('product'); await finished(failed.runId, 'failed');
    const last = (await site.rows("SELECT last_successful_at FROM source_syncs WHERE source_type='product'"))[0].last_successful_at;
    expect(last).not.toBeNull();
    woo.state.secondPageFailure = false;
    await queue('product', failed.runId); await finished(failed.runId);
    expect((await site.rows(`SELECT * FROM source_records WHERE provider='${provider}' AND source_type='product'`))).toHaveLength(2);
    for (const width of [1440]) {
      await page.setViewportSize({width, height: 1000});
      await openPage(page, site.runtime.url + '/app/settings');
      await expect(page.locator('#woocommerce')).toContainText(connection.url);
      await page.evaluate(() => {window.scrollTo(0, 0); (document.activeElement as HTMLElement)?.blur();});
      await page.screenshot({path: info.outputPath(`woocommerce-settings-${width}.png`), fullPage: true});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await openPage(page, site.runtime.url + '/app/store');
      await expect(page.getByRole('article', {name: 'Order sync', exact: true})).toContainText('completed');
      await page.screenshot({path: info.outputPath(`woocommerce-store-${width}.png`), fullPage: true});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    // MSG-014: the catalog allowance belongs to the live source, not its retained rows.
    const hostsBefore = await json(await site.call('/api/settings/link-hosts', {cookie}), 200);
    expect(hostsBefore.sources).toContainEqual({host: catalogHost, source: 'WooCommerce catalog'});
    await json(await site.call('/api/settings/link-hosts', {method: 'PUT', cookie, body: {hosts: [...hostsBefore.hosts, operatorHost].join(',')}}), 200);
    const hostDraft = await draftCampaign(site, cookie, 'Synthetic Mango disconnected catalog', [woo.state.customer.email], new Date(Date.now() + 7200000));
    await json(await site.call(`/api/campaign-revisions/${hostDraft.revisionId}`, {method: 'PATCH', cookie, body: {
      emailBody: `<p><a href="${catalogUrl}">Catalog harvest</a> and <a href="${operatorUrl}">Operator offer</a></p>`,
    }}), 200);
    const reviewPath = `/api/campaigns/${hostDraft.campaignId}/review`;
    const inspectHosts = async () => {
      await json(await site.call(`/api/campaigns/${hostDraft.campaignId}/checks`, {method: 'POST', cookie, body: {revisionId: hostDraft.revisionId}}), 200);
      return json(await site.call(reviewPath, {cookie}), 200);
    };
    const connectedReview = await inspectHosts();
    expect(connectedReview.links.map((link: any) => link.destinationUrl).sort()).toEqual([catalogUrl, operatorUrl].sort());
    for (const kind of ['message.links', 'message.links.resolved']) expect(connectedReview.checks).toContainEqual(expect.objectContaining({kind, status: 'passed', blocking: false}));
    expect(connectedReview.blockedHosts).toEqual([]);
    const catalogRows = await site.rows(`SELECT * FROM source_records WHERE provider='${provider}' AND source_type='product' ORDER BY provider_source_id`);
    expect(catalogRows).toHaveLength(2);
    expect(catalogRows.map(row => JSON.parse(row.payload).url)).toEqual([catalogUrl, catalogUrl]);
    expect(await site.rows(`SELECT host,source_id,source FROM link_host_sources WHERE host='${catalogHost}'`)).toEqual([{host: catalogHost, source_id: provider + ':catalog', source: 'WooCommerce catalog'}]);
    const authority = async () => ({
      campaign: await site.rows(`SELECT * FROM campaigns WHERE id='${hostDraft.campaignId}'`),
      revision: await site.rows(`SELECT * FROM campaign_revisions WHERE id='${hostDraft.revisionId}'`),
      approvals: await site.rows(`SELECT * FROM campaign_approval_requests WHERE campaign_id='${hostDraft.campaignId}'`),
      recipients: await site.rows(`SELECT * FROM recipient_steps WHERE campaign_id='${hostDraft.campaignId}'`),
      dispatch: (await site.control('/_golive/emissions')).filter((entry: any) => entry.command.kind === 'campaign.dispatch'),
      marketing: edge.sends.filter(send => send.body.headers?.['List-Unsubscribe']),
    });
    const unapproved = await authority();
    expect(unapproved.campaign).toEqual([expect.objectContaining({state: 'draft'})]);
    expect(unapproved.revision).toEqual([expect.objectContaining({approved_at: null, approved_by_operator_id: null})]);
    for (const rows of [unapproved.approvals, unapproved.recipients, unapproved.dispatch, unapproved.marketing]) expect(rows).toEqual([]);
    await page.context().clearCookies();
    await page.context().addCookies([{name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url}]);
    await openPage(page, site.runtime.url + '/app/settings');
    await page.getByRole('button', {name: 'Disconnect WooCommerce', exact: true}).click();
    await expect(page.locator('#woocommerce [role=status]').filter({hasText: 'No WooCommerce connection.'})).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Abandoned-checkout flows', exact: true})).toHaveCount(0);
    expect((await webhook()).status).toBe(409);
    expect((await site.call('/api/store/sync', {method: 'POST', cookie, body: {sourceType: 'order'}})).status).toBe(409);
    // A fresh signed catalog notification and an explicit refresh cannot revive a disconnected source.
    const retiredSource = {
      requests: [...woo.state.requests],
      receipts: await site.rows('SELECT * FROM commerce_receipts ORDER BY id'),
      runs: await site.rows('SELECT * FROM source_sync_runs ORDER BY id'),
    };
    const productUpdate = await json(await webhook({id: woo.state.product.id}, 'synthetic-mango-disconnected-product', {'X-WC-Webhook-Topic': 'product.updated'}), 409);
    expect(productUpdate).toEqual({error: 'woocommerce_not_connected'});
    const productRefresh = await json(await site.call('/api/store/sync', {method: 'POST', cookie, body: {sourceType: 'product'}}), 409);
    expect(productRefresh.error).toBe('source_unavailable');
    expect(woo.state.requests).toEqual(retiredSource.requests);
    expect(await site.rows('SELECT * FROM commerce_receipts ORDER BY id')).toEqual(retiredSource.receipts);
    expect(await site.rows('SELECT * FROM source_sync_runs ORDER BY id')).toEqual(retiredSource.runs);
    expect(await site.count('woocommerce_connection')).toBe(0);
    expect((await site.rows(`SELECT * FROM source_records WHERE provider='${provider}' AND source_type<>'cart'`))).toHaveLength(5);
    expect((await site.rows(`SELECT * FROM source_records WHERE provider='${provider}' AND source_type='cart'`))).toHaveLength(6);
    expect((await site.rows('SELECT state FROM woocommerce_flows'))).toEqual([{state: 'paused'}]);
    const disconnectedReview = await inspectHosts();
    expect(disconnectedReview.blockedHosts).toEqual([{host: catalogHost, links: [catalogUrl]}]);
    for (const kind of ['message.links', 'message.links.resolved']) {
      const check = disconnectedReview.checks.find((entry: any) => entry.kind === kind);
      expect(check).toMatchObject({status: 'blocked', blocking: true});
      expect(check.detail).toContain(catalogUrl);
      expect(check.detail).not.toContain(operatorUrl);
    }
    const disconnectedHosts = await json(await site.call('/api/settings/link-hosts', {cookie}), 200);
    expect(disconnectedHosts.hosts).not.toContain(catalogHost);
    expect(disconnectedHosts.sources.some((entry: any) => entry.host === catalogHost)).toBe(false);
    expect(disconnectedHosts.sources).toContainEqual({host: operatorHost, source: 'Operator entry'});
    expect(disconnectedHosts.hosts).toContain(operatorHost);
    expect(await site.rows(`SELECT * FROM link_host_sources WHERE host='${catalogHost}'`)).toEqual([]);
    const removals = await json(await site.call('/api/activity?action=link-host.source-removed', {cookie}), 200);
    const catalogRemoval = removals.entries.filter((entry: any) => entry.objectId === catalogHost);
    expect(catalogRemoval).toEqual([expect.objectContaining({action: 'link-host.source-removed', actorType: 'system', operatorId: 'link-host-sources', detail: {host: catalogHost, source: 'WooCommerce catalog'}})]);
    // Repeated public reads and checks cannot resurrect the disconnected allowance.
    await inspectHosts();
    const removalReadback = await json(await site.call('/api/activity?action=link-host.source-removed', {cookie}), 200);
    expect(removalReadback.entries.filter((entry: any) => entry.objectId === catalogHost)).toEqual(catalogRemoval);
    const operatorSettings = await site.rows('SELECT hosts FROM link_host_settings WHERE id=1');
    expect(operatorSettings[0].hosts.split(',')).toContain(operatorHost);
    expect(operatorSettings[0].hosts.split(',')).not.toContain(catalogHost);
    expect(await site.rows(`SELECT * FROM source_records WHERE provider='${provider}' AND source_type='product' ORDER BY provider_source_id`)).toEqual(catalogRows);
    expect((await json(await site.call('/api/settings/link-hosts', {cookie}), 200)).hosts).not.toContain(catalogHost);
    await page.setViewportSize({width: 1440, height: 1000});
    await openPage(page, site.runtime.url + '/app/settings');
    const sources = page.getByRole('region', {name: 'Link host sources', exact: true});
    await expect(sources).not.toContainText(catalogHost);
    await expect(sources).toContainText(operatorHost);
    await openPage(page, site.runtime.url + `/app/campaigns/${hostDraft.campaignId}/review`);
    const blocked = page.locator(`[aria-label="Blocked host ${catalogHost}"]`);
    await expect(blocked).toContainText('Catalog harvest');
    await expect(page.locator('[aria-label^="Blocked host "]')).toHaveCount(1);
    await expect(page.locator(`[aria-label="Blocked host ${operatorHost}"]`)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // The same saved draft is captured at both release widths; assertions run at 1440.
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await openPage(page, site.runtime.url + '/app/settings');
      await sources.evaluate(panel => panel.scrollIntoView({block: 'center', behavior: 'instant'}));
      await page.waitForFunction(() => {
        const panel = document.getElementById('link-host-sources-title')!.parentElement!.getBoundingClientRect();
        return panel.top >= 0 && panel.bottom <= innerHeight;
      });
      await page.screenshot({path: info.outputPath(`woocommerce-disconnected-hosts-${width}.png`)});
      await openPage(page, site.runtime.url + `/app/campaigns/${hostDraft.campaignId}/review`);
      await blocked.waitFor({state: 'visible'});
      await page.screenshot({path: info.outputPath(`woocommerce-disconnected-review-${width}.png`), fullPage: true});
    }
    const refused = await json(await site.call(`/api/campaigns/${hostDraft.campaignId}/approve`, {method: 'POST', cookie, body: {revisionId: hostDraft.revisionId, idempotencyKey: 'synthetic-mango-disconnected-catalog'}}), 409);
    expect(refused.blockers).toContainEqual(expect.objectContaining({kind: 'message.links.resolved', detail: expect.stringContaining(catalogHost)}));
    expect(await authority()).toEqual(unapproved);
    await wooBrowserConsent(page);
    expect(woo.state.authorizations.every(value => value === 'Basic ' + Buffer.from(connection.key + ':' + connection.secret).toString('base64'))).toBe(true);
    expect(edge.unexpected).toEqual([]);
    // The cross-connection owner-export proof owns a separate native runtime.
    // Keep it with the built-store journey, outside Shopify's signed-cart budget.
    await builtConnectionsSourceJourney();
  } finally {await site.runtime.close(); await edge.close();}
});
