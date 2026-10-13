import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');

for (const conflict of [false, true]) test(`operator Settings ${conflict ? 'refetches authority after a racing confirmation' : 'names pending cancellation and removes the row'}`, async () => {
  const output = await build({ entryPoints: [resolve('operations/fixtures/settings-invitation-client.tsx')], bundle: true, write: false,
    format: 'iife', platform: 'browser', jsx: 'automatic', alias: { '@': resolve('src') } });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    let status = 'invited', reads = 0;
    await page.route('http://mango-ui.test/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="root"></div><script src="/client.js"></script>' });
      if (url.pathname === '/client.js') return route.fulfill({ contentType: 'text/javascript', body: output.outputFiles[0].text });
      if (url.pathname === '/auth/environment') {
        assert.equal(route.request().method(), 'GET');
        return route.fulfill({ json: { local: false } });
      }
      if (url.pathname === '/api/operators') {
        reads++;
        return route.fulfill({ json: { operators: status === 'inactive' ? [] : [{ id: 'pending', email: 'pending@example.test', displayName: 'Pending', isInitial: false, status }] } });
      }
      assert.equal(url.pathname, '/api/operators/pending');
      assert.equal(route.request().method(), 'DELETE');
      status = conflict ? 'active' : 'inactive';
      return conflict ? route.fulfill({ status: 409, json: { error: 'authority_changed' } }) : route.fulfill({ status: 204 });
    });
    await page.goto('http://mango-ui.test/');
    await page.getByText('Invitation pending', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Remove pending@example.test', exact: true }).click();
    await page.getByText('Their pending invitation and confirmation links will be cancelled.', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Confirm removal', exact: true }).click();
    if (conflict) {
      await page.getByRole('alert').filter({ hasText: 'Review the refreshed list before trying again.' }).waitFor();
      await page.getByText('Active', { exact: true }).waitFor();
      assert.equal(await page.getByText('Invitation pending', { exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Confirm removal', exact: true }).count(), 0);
      assert.equal(await page.getByRole('status').filter({ hasText: 'cancelled' }).count(), 0);
      await page.getByRole('button', { name: 'Remove pending@example.test', exact: true }).click();
      await page.getByText('Their access and active sessions will be revoked.', { exact: false }).waitFor();
    } else {
      await page.getByRole('status').filter({ hasText: 'Invitation cancelled for pending@example.test. Their confirmation links no longer work.' }).waitFor();
      await page.getByRole('button', { name: 'Remove pending@example.test', exact: true }).waitFor({state: 'detached'});
    }
    assert.ok(reads >= 2, 'Removal outcome must refresh the operator list');
  } finally { await browser.close(); }
});
