import { expect, test } from '@playwright/test';
import { signInAsLocalOperator, expectDocumentToFit, expectNoSeriousAxeViolations } from './browser-checks';
import { expectCampaignAxe } from './campaign-axe';

// One phone smoke opens the main public and operator screens at 390 pixels.
// Product journeys cover mutations and authorization separately.
test('[BASE-ACCESS-002] fourteen representative pages fit and have no serious accessibility violations', async ({ page, request }) => {
  test.setTimeout(180_000);
  for (const width of [390] as const) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectDocumentToFit(page, width);
    await expectNoSeriousAxeViolations(page, `lobby-${width}`);
    await test.info().attach(`lobby-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/docs', '/docs/install']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectDocumentToFit(page, 390);
    await expectNoSeriousAxeViolations(page, route);
    await test.info().attach(route.replaceAll('/', '-'), { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  }
  // On a phone the docs' section list is behind the Contents disclosure, which opens from the keyboard.
  const contents = page.getByRole('navigation', { name: 'Documentation' }).locator('summary').filter({ visible: true });
  await contents.focus();
  await contents.press('Enter');
  await expect(page.locator('details[open] [aria-current="page"]')).toBeVisible();
  await page.goto('/signin');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectDocumentToFit(page, 390);
  await expectNoSeriousAxeViolations(page, 'sign-in');
  await test.info().attach('sign-in', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  await signInAsLocalOperator(page, request);
  const pages = [
    ['/subscribe', 390],
    ['/app/campaigns', 390],
    ['/app/campaigns/campaign_table_runner_draft_v4', 390],
    ['/app/campaigns/campaign_table_runner_draft_v4/review', 390],
    ['/app/campaigns/campaign_sample_scheduled_v4/scheduled', 390],
    ['/app/audience', 390],
    ['/app/audience/contact_alex_v4', 390],
    ['/app/audience/import', 390],
    ['/app/settings', 390],
  ] as const;
  for (const [route, width] of pages) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(route);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expectDocumentToFit(page, width);
    if (await page.locator('iframe[title="Saved email preview"]').count()) {
      await expectCampaignAxe(page, route);
    } else {
      await expectNoSeriousAxeViolations(page, route);
    }
    await test.info().attach(route.replaceAll('/', '-'), { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const menu = page.getByRole('button', { name: /^Menu ·/ });
  await menu.focus();
  await menu.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation').getByRole('link').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
});
