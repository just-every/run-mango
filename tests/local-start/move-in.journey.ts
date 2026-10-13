import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { authorityRuntime, signIn } from './authority-runtime.mjs';

// The native command, real files and real import routes also prove the guide's
// operator path. Attach screenshots to the caller's external evidence folder.
test('move-in guide and documented CSV mapping work at desktop and mobile widths in native dev', async ({ browser }) => {
  test.setTimeout(600000);
  const runtime = await authorityRuntime();
  const context = await browser.newContext(), page = await context.newPage();
  const screenshot = async (name: string) => {
    const path = test.info().outputPath(`${name}.png`);
    await page.screenshot({ path, fullPage: name.startsWith('guide') });
    await test.info().attach(name, { path, contentType: 'image/png' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  };
  try {
    await runtime.setup(false); await runtime.variables(); await runtime.start(); await signIn(page, runtime.url);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto(runtime.url + '/docs/moving-in');
      await expect(page.getByRole('heading', { name: 'Moving in from an email tool', exact: true })).toBeVisible();
      const navigation = page.locator(width === 390 ? '.docs-menu' : '.docs-sidebar');
      if (width === 390) await navigation.locator('summary').click();
      await expect(navigation.getByRole('link', { name: 'Moving in from an email tool', exact: true })).toBeVisible();
      await screenshot(`guide-navigation-${width}`);
      if (width === 390) await navigation.locator('summary').click();
      await screenshot(`guide-${width}`);
      await page.goto(runtime.url + '/app/audience/import');
      await expect(page.getByRole('heading', { name: 'Import contacts', exact: true })).toBeVisible();
      const fileName = `audience-export-${width}.csv`;
      await page.getByLabel('Choose CSV files').setInputFiles({ name: fileName, mimeType: 'text/csv',
        buffer: Buffer.from(await readFile('tests/audience-import/fixtures/source-b-unconfirmed.csv', 'utf8')) });
      await page.getByLabel(`Preset for ${fileName}`).selectOption('csv-subscribed');
      await screenshot(`import-select-${width}`);
      await page.getByRole('button', { name: 'Preview import', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Start import', exact: true })).toBeEnabled();
      await expect(page.getByLabel(`Email in ${fileName}`, { exact: true })).toHaveValue('Email address');
      await expect(page.getByLabel(`First Name in ${fileName}`, { exact: true })).toHaveValue('First name');
      await expect(page.getByLabel(`Email marketing status in ${fileName}`, { exact: true })).toHaveValue('Status');
      await expect(page.getByLabel(`Occurred At in ${fileName}`, { exact: true })).toHaveValue('');
      await expect(page.getByLabel(`Confirmed At in ${fileName}`, { exact: true })).toHaveValue('');
      await page.getByRole('heading', { name: 'Field mapping', exact: true }).scrollIntoViewIfNeeded();
      await screenshot(`import-mapping-${width}`);
      await expect(page.locator('.audience-import-table')).toContainText('Pending');
      await page.getByRole('heading', { name: 'Preview totals', exact: true }).scrollIntoViewIfNeeded();
      await screenshot(`import-preview-${width}`);
      await page.locator('.audience-import-table').scrollIntoViewIfNeeded();
      await screenshot(`import-rows-${width}`);
      expect((await (await page.request.get(runtime.url + '/api/audience')).json()).contacts).toHaveLength(0);
      await page.getByRole('button', { name: 'Start import', exact: true }).click();
      const job = page.locator('.audience-import-job').first();
      await expect(job).toContainText('completed');
      await job.scrollIntoViewIfNeeded(); await screenshot(`import-complete-${width}`);
      const contacts = (await (await page.request.get(runtime.url + '/api/audience')).json()).contacts;
      expect(contacts).toHaveLength(1); expect(contacts[0].emailStatus).toBe('pending');
      await job.getByRole('button', { name: 'Undo import', exact: true }).click();
      await job.getByRole('group', { name: /Confirm undo/ }).scrollIntoViewIfNeeded();
      await screenshot(`import-undo-confirm-${width}`);
      await job.getByRole('button', { name: 'Confirm undo', exact: true }).click();
      await expect(job).toContainText('undone'); await screenshot(`import-undone-${width}`);
      expect((await (await page.request.get(runtime.url + '/api/audience')).json()).contacts).toHaveLength(0);
    }
  } finally { await context.close(); await runtime.close(); }
});
