const width = 1440;
import {createHmac} from 'node:crypto';
import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {contract} from '../contract.js';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation, json, sender, confirmedContact, draftCampaign, approve, dispatch} from './harness';
import {sourceEdge, syncSource} from './source-edge';
import {openPage, reloadPage} from '../support/navigation';



export const walk0 = async ({page}, info) => {
  const commerce = sourceEdge(), edge = await providerEdge(commerce), site = await installation(edge, eventSigner(), {commerce: true, ai: true, providerKey: 'synthetic-mango-4'});
  try {
    const cookie = await site.open();
    const desk = async () => json(await site.call('/api/decision-desk', {cookie}), 200);
    const store = async () => json(await site.call('/api/store', {cookie}), 200);
    const operations = async (operation: string) => (await store()).syncRuns.filter((run: any) => run.operation === operation);
    const webhook = (delivery: string, secret = 'synthetic-store-webhook-key') => {
      const raw = JSON.stringify({admin_graphql_api_id: 'gid://shopify/Product/23'});
      return site.call('/webhooks/commerce/shopify', {method: 'POST', raw, headers: {'X-Shopify-Hmac-Sha256': createHmac('sha256', secret).update(raw).digest('base64'),
        'X-Shopify-Shop-Domain': 'mango-test.myshopify.com', 'X-Shopify-Topic': 'products/update', 'X-Shopify-Webhook-Id': delivery, 'X-Shopify-Event-Id': delivery}});
    };
    const initial = await desk();
    expect(initial.sourceStatus.sourceSyncs).toHaveLength(8);
    expect(initial.sourceStatus.sourceSyncs.every((source: any) => source.lastSuccessfulAt === null)).toBe(true);
    await json(await site.call('/api/settings/sender', {method: 'PUT', cookie, body: sender}), 200);
    await site.control('/_golive/sender-evidence');
    await confirmedContact(site, edge, cookie, 'synthetic-mango-4@example.test', 'Garden reader');
    await confirmedContact(site, edge, cookie, 'synthetic-mango-5@example.test', 'Future reader');
    const clock = await site.control('/_golive/clock');
    const due = new Date(clock.now + 3600000);
    const sent = await draftCampaign(site, cookie, 'Retained garden history', ['synthetic-mango-4@example.test'], due);
    await approve(site, cookie, sent);
    await site.control('/_golive/clock', {advanceMs: 3600001});
    expect((await dispatch(site, sent.campaignId, due))[0].transport_disposition).toBe('accepted');
    const future = new Date((await site.control('/_golive/clock')).now + 86400000);
    const planned = await draftCampaign(site, cookie, 'Scheduled garden letter', ['synthetic-mango-5@example.test'], future);
    await approve(site, cookie, planned);
    const draft = await draftCampaign(site, cookie, 'Saved garden draft', ['synthetic-mango-4@example.test'], future);
    const history = await json(await site.call(`/api/campaigns/${sent.campaignId}/results`, {cookie}), 200);
    const handoffs = edge.sends.length;
    const costsBefore = await site.count('external_cost_facts');
    await site.control('/_golive/clock', {hold: true});
    for (const source of ['customer','product','variant','inventory','order','refund']) await syncSource(site, cookie, source);
    const completed = (await desk()).sourceStatus.sourceSyncs;
    const product = completed.find((source: any) => source.sourceType === 'product');
    const order = completed.find((source: any) => source.sourceType === 'order');
    expect(product.lastSuccessfulAt).toBeTruthy();
    await site.control('/_golive/clock', {advanceMs: 1000});
    commerce.fail(true);
    const failedStore = await syncSource(site, cookie, 'product', true);
    expect(failedStore.syncRuns.find((run: any) => run.sourceType === 'product')).toMatchObject({state: 'failed', lastError: expect.stringContaining('GraphQL')});
    // Generation uses stored evidence and refuses the failed-source gate before AI.
    const generated = await json(await site.call('/api/proposals/generate', {method: 'POST', cookie, body: {}}), 409);
    expect(generated).toMatchObject({kind: 'unavailable', detail: expect.stringMatching(/product.*sync failed/i)});
    expect(await site.count('proposals')).toBe(0);
    expect(await site.count('external_cost_facts')).toBe(costsBefore);
    // The refused generation is itself a failed operation carrying the adapter's error.
    expect(await operations('generation')).toEqual([expect.objectContaining({provider: 'shopify', sourceType: 'product', state: 'failed', lastError: expect.stringContaining('GraphQL')})]);
    // During an Admin API outage a verified webhook keeps its answer and records
    // one failed operation per delivery; a forged delivery records nothing.
    commerce.outage(true);
    expect((await webhook('synthetic-mango-delivery-1', 'synthetic-forged-key')).status).toBe(401);
    expect(await operations('webhook')).toEqual([]);
    for (let attempt = 0; attempt < 2; attempt++) expect((await webhook('synthetic-mango-delivery-1')).status).toBe(401);
    expect(await operations('webhook')).toEqual([expect.objectContaining({provider: 'shopify', sourceType: 'product', state: 'failed', lastError: expect.stringContaining('GraphQL')})]);
    commerce.outage(false);
    const storeText = JSON.stringify(await store());
    for (const secret of ['private upstream diagnostic', 'synthetic-store-webhook-key', 'synthetic-store-edge-key', 'Product 23']) expect(storeText).not.toContain(secret);
    await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`, {method: 'PATCH', cookie, body: {emailSubject: 'Saved during the outage'}}), 200);
    expect((await json(await site.call(`/api/campaigns/${draft.campaignId}`, {cookie}), 200)).revision.emailSubject).toBe('Saved during the outage');
    expect(await json(await site.call(`/api/campaigns/${sent.campaignId}/results`, {cookie}), 200)).toEqual(history);
    expect((await json(await site.call(`/api/campaigns/${planned.campaignId}`, {cookie}), 200)).campaign.state).toBe('scheduled');
    expect(edge.sends).toHaveLength(handoffs);
    const failed = (await desk()).sourceStatus.sourceSyncs;
    expect(failed.find((source: any) => source.sourceType === 'product')).toMatchObject({lastSuccessfulAt: product.lastSuccessfulAt, lastError: expect.stringContaining('sync failed')});
    expect(failed.find((source: any) => source.sourceType === 'order')).toEqual(order);
    expect(JSON.stringify(await desk())).not.toContain('private upstream diagnostic');
    const stored = await site.rows("SELECT last_successful_at,last_error FROM source_syncs WHERE source_type='product'");
    expect(stored[0]).toMatchObject({last_successful_at: Date.parse(product.lastSuccessfulAt), last_error: expect.stringContaining('GraphQL')});
    await page.context().addCookies([{name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url}]);
    const cards = page.getByRole('region', {name: 'Store data'});
     {
      await page.setViewportSize({width, height: 1000});
      await openPage(page, `${site.runtime.url}/app`);
      const source = page.getByRole('article', {name: 'Product source', exact: true});
      await expect(source).toContainText(/needs sync/i);
      await expect(source).toContainText('sync failed');
      await expect(source.locator('time').first()).toHaveAttribute('datetime', product.lastSuccessfulAt);
      await expect(page.getByRole('article', {name: 'Order source', exact: true})).toContainText(/fresh/i);
      await expect(page.getByRole('article', {name: 'Cart source', exact: true})).toContainText('No successful sync');
      await cards.screenshot({path: info.outputPath(`source-failed-${width}.png`)});
      await openPage(page, `${site.runtime.url}/app/store`);
      const sync = page.getByRole('article', {name: 'Product sync', exact: true});
      await expect(sync).toContainText(/failed/i);
      await expect(sync).toContainText('GraphQL');
      const failures = page.getByRole('region', {name: 'Failed operations', exact: true});
      for (const name of ['Suggestion generation: Product', 'Webhook ingestion: Product']) {
        await expect(failures.getByRole('article', {name, exact: true})).toContainText(/failed/i);
        await expect(failures.getByRole('article', {name, exact: true})).toContainText('GraphQL');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
      await page.screenshot({path: info.outputPath(`source-operation-failed-${width}.png`), fullPage: true});
      await openPage(page, `${site.runtime.url}/app/campaigns/${draft.campaignId}/review`);
      await expect(page.getByRole('button', {name: 'Save full draft', exact: true})).toBeEnabled();
      await page.screenshot({path: info.outputPath(`source-saved-draft-${width}.png`), fullPage: true});
      await openPage(page, `${site.runtime.url}/app/campaigns/${sent.campaignId}`);
      await expect(page.getByRole('heading', {name: 'Retained garden history', exact: true})).toBeVisible();
      await page.screenshot({path: info.outputPath(`source-retained-history-${width}.png`), fullPage: true});
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    commerce.fail(false);
    // Shopify's retry after recovery ingests the delivery once and completes its operation.
    for (let attempt = 0; attempt < 2; attempt++) expect((await webhook('synthetic-mango-delivery-1')).status).toBe(204);
    expect(await site.rows("SELECT provider_source_id FROM source_records WHERE provider_source_id='gid://shopify/Product/23'")).toHaveLength(1);
    expect(await operations('webhook')).toEqual([expect.objectContaining({state: 'completed', lastError: expect.stringContaining('GraphQL')})]);
    await site.control('/_golive/clock', {advanceMs: 1000});
    await syncSource(site, cookie, 'product');
    const recovered = (await desk()).sourceStatus.sourceSyncs.find((source: any) => source.sourceType === 'product');
    expect(Date.parse(recovered.lastSuccessfulAt)).toBeGreaterThan(Date.parse(product.lastSuccessfulAt));
    expect(recovered.lastError).toBeNull();
     {
      await page.setViewportSize({width, height: 1000});
      await openPage(page, `${site.runtime.url}/app`);
      const source = page.getByRole('article', {name: 'Product source', exact: true});
      await expect(source).toContainText(/fresh/i);
      await expect(source).not.toContainText('sync failed');
      await cards.screenshot({path: info.outputPath(`source-recovered-${width}.png`)});
    }
    expect(await site.count('recipient_steps')).toBe(2);
    expect(edge.sends).toHaveLength(handoffs);
    expect(edge.unexpected).toEqual([]);
  } finally {await page.close(); await site.runtime.close(); await edge.close();}
};
