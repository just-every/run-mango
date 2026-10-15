import { localSessionCookieName } from './support/local-session';
import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { localBootstrapToken } from './local-bootstrap.js';

test('[BASE-ACCESS-002] Start renders owner HTML, hydrates navigation, and authenticates its actual generated operator transport', async ({page, request, baseURL}, testInfo) => {
  const html = await request.get('/docs');
  expect(html.status()).toBe(200);
  expect(await html.text()).toContain('Your store');
  expect(await html.text()).toContain('Sign in');
  expect(await html.text()).toContain('<html lang="en"');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text())});
  await page.goto('/docs');
  await page.waitForFunction(() => document.documentElement.dataset.mangoHydrated === 'true');
  const publicOrigin = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole('link', {name: 'Sign in', exact: true}).click();
  await expect(page).toHaveURL(/\/signin$/);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(publicOrigin);
  const bootstrap = await request.post('/api/_local/bootstrap', {headers: {'X-Mango-Local-Bootstrap-Token': await localBootstrapToken()}, data: {testSession: true}});
  expect(bootstrap.ok()).toBe(true);
  const {session} = await bootstrap.json();
  await page.context().addCookies([{name: localSessionCookieName(baseURL!), value: session.token, url: baseURL!}]);
  const completedSetup = await page.request.get('/setup', {maxRedirects: 0});
  expect(completedSetup.status()).toBe(303);
  expect(completedSetup.headers().location).toBe('/app');
  await page.goto('/app');
  await expect(page.getByRole('heading', {name: 'Nothing sends until you approve it.'})).toBeVisible();
  const privateOrigin = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole('link', {name: 'Audience', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Consent stays visible at every decision.'})).toBeVisible();
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(privateOrigin);
  const wire = page.waitForRequest(request => new URL(request.url()).pathname.startsWith('/_serverFn/'));
  // Invoke the Vite-transformed wrapper itself. This exercises the installed
  // public client encoder instead of inventing a generated transport payload.
  const identity = await page.evaluate(async () => {
    const module = await import('/src/core/app/loaders.ts');
    return module.loadOperator();
  });
  expect(identity.displayName).toBe('Store owner');
  const wireRequest = await wire;
  const headers = {...wireRequest.headers()};
  delete headers.cookie;
  headers.Cookie = '';
  const denied = await request.get(wireRequest.url(), {headers});
  expect(await denied.text()).not.toContain('Store owner');
  expect(await denied.text()).toContain('unauthenticated');
  const setupWire = page.waitForRequest(request => new URL(request.url()).pathname.startsWith('/_serverFn/'));
  await page.evaluate(async () => {
    const module = await import('/src/core/app/loaders.ts');
    await module.loadSetup().catch(() => undefined);
  });
  const setupRequest = await setupWire;
  const matrix: Array<Record<string, unknown>> = [];
  for (const state of ['missing', 'expired', 'revoked', 'valid'] as const) {
    let token = state === 'valid' ? session.token : '';
    if (state === 'expired' || state === 'revoked') {
      const response = await request.post('/api/_local/bootstrap', {headers: {'X-Mango-Local-Bootstrap-Token': await localBootstrapToken()}, data: {testSession: true, testSessionState: state}});
      expect(response.ok()).toBe(true);
      token = (await response.json()).session.token;
    }
    const stateHeaders = {...headers, Cookie: token ? `${localSessionCookieName(baseURL!)}=${token}` : ''};
    const nativeHeaders = {Cookie: stateHeaders.Cookie};
    const known = await request.get('/api/operator', {headers: nativeHeaders});
    const unknown = await request.get('/api/unknown-private-route', {headers: nativeHeaders});
    const document = await request.get('/app/audience', {headers: nativeHeaders, maxRedirects: 0});
    const functionResponse = await request.get(wireRequest.url(), {headers: stateHeaders});
    const functionBody = await functionResponse.text();
    const setupFunction = await request.get(setupRequest.url(), {headers: stateHeaders});
    const setupBody = await setupFunction.text();
    expect(setupBody).not.toContain('Store owner');
    if (state === 'valid') {
      expect(known.status()).toBe(200);
      expect(unknown.status()).toBe(404);
      expect(document.status()).toBe(200);
      expect(await document.text()).toContain('Store owner');
      expect(functionBody).toContain('Store owner');
      expect(setupBody).toContain('/app');
    } else {
      expect(known.status()).toBe(401);
      expect(unknown.status()).toBe(401);
      expect(document.status()).toBe(303);
      expect(document.headers().location).toBe('/signin?reason=session-required');
      expect(await document.text()).not.toContain('Store owner');
      expect(functionBody).toContain('unauthenticated');
      expect(setupBody).toContain('/signin');
      expect(functionBody).not.toContain('Store owner');
    }
    matrix.push({state, knownApiStatus: known.status(), unknownApiStatus: unknown.status(), documentStatus: document.status(), documentLocation: document.headers().location ?? null, serverFunctionStatus: functionResponse.status(), serverFunctionType: functionResponse.headers()['content-type'], denial: state === 'valid' ? null : 'unauthenticated'});
  }
  const matrixPath = testInfo.outputPath('session-matrix.json');
  await writeFile(matrixPath, JSON.stringify({clause: 'BASE-ACCESS-002', surface: 'loadOperator', matrix}, null, 2));
  await testInfo.attach('BASE-ACCESS-002-session-matrix', {path: matrixPath, contentType: 'application/json'});
  const hostile = await request.get(wireRequest.url(), {headers: {...headers, Origin: 'https://hostile.example.test', 'sec-fetch-site': 'cross-site'}});
  expect(hostile.status()).toBe(403);
  expect(await hostile.text()).not.toContain('Store owner');
  expect(errors).toEqual([]);
});
