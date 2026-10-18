import {expect} from '@playwright/test';
import {contract} from '../contract.js';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation, json} from './harness';
import {sourceEdge, syncSource} from './source-edge';
import {openPage, reloadPage} from '../support/navigation';

contract('STORE-003', 'Decision Desk retains each completed sync through a later failed page and recovery', async ({page}, info) => {
  const commerce = sourceEdge(), edge = await providerEdge(commerce), site = await installation(edge, eventSigner(), {commerce: true});
  try {
    const cookie = await site.open();
    await site.control('/_golive/clock', {hold: true});
    const desk = async () => json(await site.call('/api/decision-desk', {cookie}), 200);
    const initial = await desk();
    expect(initial.sourceStatus.sourceSyncs).toHaveLength(8);
    expect(initial.sourceStatus.sourceSyncs.every((source: any) => source.lastSuccessfulAt === null)).toBe(true);
    for (const source of ['customer','product','variant','inventory','order','refund']) await syncSource(site, cookie, source);
    const completed = (await desk()).sourceStatus.sourceSyncs;
    const product = completed.find((source: any) => source.sourceType === 'product');
    const order = completed.find((source: any) => source.sourceType === 'order');
    expect(product.lastSuccessfulAt).toBeTruthy();
    await site.control('/_golive/clock', {advanceMs: 1000});
    commerce.fail(true);
    await syncSource(site, cookie, 'product', true);
    const failed = (await desk()).sourceStatus.sourceSyncs;
    expect(failed.find((source: any) => source.sourceType === 'product')).toMatchObject({lastSuccessfulAt: product.lastSuccessfulAt, lastError: expect.stringContaining('sync failed')});
    expect(failed.find((source: any) => source.sourceType === 'order')).toEqual(order);
    expect(JSON.stringify(await desk())).not.toContain('private upstream diagnostic');
    const stored = await site.rows("SELECT last_successful_at,last_error FROM source_syncs WHERE source_type='product'");
    expect(stored[0]).toMatchObject({last_successful_at: Date.parse(product.lastSuccessfulAt), last_error: expect.stringContaining('GraphQL')});
    await page.context().addCookies([{name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url}]);
    const cards = page.getByRole('region', {name: 'Store data'});
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await openPage(page, `${site.runtime.url}/app`);
      const source = page.getByRole('article', {name: 'Product source', exact: true});
      await expect(source).toContainText(/needs sync/i);
      await expect(source).toContainText('sync failed');
      await expect(source.locator('time').first()).toHaveAttribute('datetime', product.lastSuccessfulAt);
      await expect(page.getByRole('article', {name: 'Order source', exact: true})).toContainText(/fresh/i);
      await expect(page.getByRole('article', {name: 'Cart source', exact: true})).toContainText('No successful sync');
      await cards.screenshot({path: info.outputPath(`source-failed-${width}.png`)});
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    commerce.fail(false);
    await site.control('/_golive/clock', {advanceMs: 1000});
    await syncSource(site, cookie, 'product');
    const recovered = (await desk()).sourceStatus.sourceSyncs.find((source: any) => source.sourceType === 'product');
    expect(Date.parse(recovered.lastSuccessfulAt)).toBeGreaterThan(Date.parse(product.lastSuccessfulAt));
    expect(recovered.lastError).toBeNull();
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await reloadPage(page);
      const source = page.getByRole('article', {name: 'Product source', exact: true});
      await expect(source).toContainText(/fresh/i);
      await expect(source).not.toContainText('sync failed');
      await cards.screenshot({path: info.outputPath(`source-recovered-${width}.png`)});
    }
    expect(await site.count('recipient_steps')).toBe(0);
    expect(edge.sends).toHaveLength(0);
    expect(edge.unexpected).toEqual([]);
  } finally {await page.close(); await site.runtime.close(); await edge.close();}
});
