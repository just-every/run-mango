import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectNoSeriousAxeViolations } from './browser-checks';

/**
 * Chromium blocks axe's async rule callbacks inside sandbox="". Keep that
 * production boundary intact: audit the operator document (including the
 * iframe element), then every rule against an exact srcdoc copy in a test
 * iframe that permits the audit engine to execute.
 */
export async function expectCampaignAxe(page: Page, name: string) {
  const original = page.locator('iframe[title="Saved email preview"]');
  await expect(original).toHaveAttribute('sandbox', '');
  await expect(original).toHaveAttribute('title', 'Saved email preview');
  const source = await original.getAttribute('srcdoc');
  expect(source).toBeTruthy();
  const size = await original.evaluate((iframe) => ({ width: iframe.clientWidth, height: iframe.clientHeight }));
  const results = await new AxeBuilder({ page }).setLegacyMode(true).options({ iframes: false }).analyze();
  const violations = results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');
  await test.info().attach(`axe-${name}-operator`, { body: JSON.stringify({ url: page.url(), seriousOrCritical: violations.length, violations }), contentType: 'application/json' });
  expect(violations, `${name} operator document: ${JSON.stringify(violations)}`).toEqual([]);

  const auditPage = await page.context().newPage();
  try {
    await auditPage.setViewportSize({ width: size.width, height: size.height });
    await auditPage.setContent('<!doctype html><html lang="en"><head><title>Saved email accessibility audit</title><style>html,body{margin:0}iframe{display:block;border:0;width:100vw;height:100vh}</style></head><body><main><iframe title="Saved email preview"></iframe></main></body></html>');
    await auditPage.locator('iframe').evaluate((iframe, html) => { (iframe as HTMLIFrameElement).srcdoc = html; }, source!);
    await expectNoSeriousAxeViolations(auditPage, `${name} exact email preview`);
  } finally {
    await auditPage.close();
  }
  await expect(original).toHaveAttribute('sandbox', '');
  await expect(original).toHaveAttribute('title', 'Saved email preview');
  await expect(original).toHaveAttribute('srcdoc', source!);
}
