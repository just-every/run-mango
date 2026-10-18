import {expect} from '@playwright/test';
import {page, product, customer} from '../shopify/fixtures';
import type {Installation} from './harness';
import {json} from './harness';

/** Shopify GraphQL boundary only; ingestion, persistence and jobs stay native. */
export function sourceEdge() {
  let failing = false;
  let failingSource = 'product';
  const access = {shop: {myshopifyDomain: 'mango-test.myshopify.com'}, currentAppInstallation: {
    accessScopes: ['read_customers','read_products','read_inventory','read_locations','read_orders','read_all_orders','read_returns'].map(handle => ({handle})),
  }};
  return {
    fail: (value: boolean, source = 'product') => {failing = value; failingSource = source;},
    commerce(request: Record<string, unknown>) {
      const query = String(request.query), variables = request.variables as {cursor?: string};
      if (query.includes('MangoAccess')) return {data: access};
      if (query.includes('products(first:')) {
        if (failing && failingSource === 'product' && variables.cursor) return {errors: [{message: 'private upstream diagnostic'}]};
        return {data: {products: page([product(variables.cursor ? 22 : 21)], failing && failingSource === 'product' && !variables.cursor ? 'next-products' : undefined)}};
      }
      if (query.includes('customers(first:')) return failing && failingSource === 'customer'
        ? {errors: [{message: 'private upstream diagnostic'}]} : {data: {customers: page([customer])}};
      for (const field of ['orders','productVariants','inventoryItems']) {
        if (query.includes(`${field}(first:`)) return {data: {[field]: page([])}};
      }
      throw new Error('Unexpected Shopify query in source journey.');
    },
  };
}

export async function syncSource(site: Installation, cookie: string, sourceType: string, failed = false) {
  const queued = await json(await site.call('/api/store/sync', {method: 'POST', cookie, body: {sourceType}}), 202);
  await expect.poll(async () => {
    const status = await json(await site.call('/api/store', {cookie}), 200);
    return status.syncRuns.find((run: {id: string}) => run.id === queued.runId)?.state;
  }, {timeout: 60000, intervals: [250, 500, 1000]}).toBe(failed ? 'failed' : 'completed');
  return json(await site.call('/api/store', {cookie}), 200);
}
