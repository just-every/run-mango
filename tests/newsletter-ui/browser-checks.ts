import { localSessionCookieName } from '../support/local-session';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { localBootstrapToken } from '../local-bootstrap.js';

export async function signInAsLocalOperator(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
  const response = await request.post('/api/_local/bootstrap', {
    headers: { 'X-Mango-Local-Bootstrap-Token': await localBootstrapToken() },
    data: { testSession: true },
  });
  await expect(response).toBeOK();
  const { session } = await response.json();
  await page.context().addCookies([
    { name: localSessionCookieName(response.url()), value: session.token, domain: '127.0.0.1', path: '/' },
  ]);
}

export async function expectDocumentToFit(page: import('@playwright/test').Page, width: number) {
  const measurements = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(measurements.viewport).toBe(width);
  expect(Math.max(measurements.document, measurements.body)).toBeLessThanOrEqual(width);
  await test.info().attach(`viewport-${width}`, { body: JSON.stringify({ url: page.url(), ...measurements }), contentType: 'application/json' });
}

export async function expectNoSeriousAxeViolations(page: import('@playwright/test').Page, name: string) {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious');
  await test.info().attach(`axe-${name}`, { body: JSON.stringify({ url: page.url(), seriousOrCritical: violations.length, violations }), contentType: 'application/json' });
  expect(violations, `${name}: ${JSON.stringify(violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })), null, 2)}`).toEqual([]);
}
