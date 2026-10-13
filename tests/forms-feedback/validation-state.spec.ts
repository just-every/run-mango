import { expect, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { contract } from '../contract.js';
import { expectFieldError, expectSummary } from '../newsletter-ui/form-feedback-helpers';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('wrangler'))('esbuild');

async function mountForm(page: Page) {
  const output = await build({entryPoints: [resolve('tests/forms-feedback/validation-state-client.tsx')], bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic'});
  await page.setContent('<main id="root"></main>');
  await page.addScriptTag({content: output.outputFiles[0].text});
}

contract('CAMP-002', 'client guidance survives empty server feedback and merges named refusals without background focus theft', async ({page}) => {
  await mountForm(page);
  const form = page.getByRole('form', {name: 'Draft'}), subject = page.getByLabel('Subject'), sender = page.getByLabel('Sender');
  await subject.focus(); await subject.blur(); await expectFieldError(subject);
  await page.getByRole('button', {name: 'Background read'}).click();
  await expectFieldError(subject); await expectSummary(form, 1);
  await page.getByRole('button', {name: 'Receive named refusal'}).click();
  await expectFieldError(sender, /verified sender/); await expectFieldError(subject); await expect(subject).toBeFocused();
  await expectSummary(form, 2);
  const background = page.getByRole('button', {name: 'Background read'});
  await background.click(); await expect(page.getByRole('status')).toHaveText('2 reads'); await expect(background).toBeFocused();
  await expectFieldError(subject);
});

contract('CAMP-002', 'a completed incomplete-draft save restores guidance and focus after a form remount', async ({page}) => {
  await mountForm(page);
  await page.getByLabel('Remount during save').check();
  await page.getByRole('button', {name: 'Save draft'}).click();
  await expect(page.getByRole('form', {name: 'Draft'})).toHaveCount(0);
  await page.getByRole('button', {name: 'Finish save'}).click();
  const subject = page.getByLabel('Subject');
  await expectFieldError(subject); await expect(subject).toBeFocused();
  await expectSummary(page.getByRole('form', {name: 'Draft'}), 1);
  const background = page.getByRole('button', {name: 'Background read'});
  await background.click(); await expect(page.getByRole('status')).toHaveText('1 reads'); await expect(background).toBeFocused();
  await expectFieldError(subject);
});

for (const width of [1440, 390]) contract('CAMP-002', `clicking submit from an invalid field validates once and focuses the first DOM error at ${width}px`, async ({page}) => {
  await page.setViewportSize({width, height: 900});
  await mountForm(page);
  const form = page.getByRole('form', {name: 'Draft'}), subject = page.getByLabel('Subject'), sender = page.getByLabel('Sender');
  // No preliminary blur: the same press must survive feedback inserted above the button.
  await sender.fill('invalid');
  await form.getByRole('button', {name: 'Save draft'}).click();
  await expectFieldError(subject); await expectFieldError(sender, /valid email/);
  await expect(subject).toBeFocused(); await expectSummary(form, 2);
  await expect(page.getByText('Valid submissions: 0', {exact: true})).toBeVisible();
  await subject.fill('A complete subject'); await sender.fill('sender@example.test');
  await form.getByRole('button', {name: 'Save draft'}).click();
  await expect(page.getByText('Valid submissions: 1', {exact: true})).toBeVisible();
  await expect(form.getByRole('button', {name: 'Save draft'})).toBeDisabled();
});

contract('CAMP-002', 'named server feedback survives blur and summary navigation until its field changes', async ({page}) => {
  await mountForm(page);
  await page.getByLabel('Subject').fill('A complete subject');
  await page.getByRole('button', {name: 'Receive named refusal'}).click();
  const sender = page.getByLabel('Sender'), form = page.getByRole('form', {name: 'Draft'});
  await expectFieldError(sender, /verified sender/); await expect(sender).toBeFocused();
  await expectSummary(form, 1);
  await page.getByRole('button', {name: 'Background read'}).click();
  await expectFieldError(sender, /verified sender/); await expectSummary(form, 1);
  await sender.fill('updated@example.test'); await sender.blur();
  await expect(sender).not.toHaveAttribute('aria-invalid', 'true'); await expect(form.locator('.validation-summary')).toHaveCount(0);
});
