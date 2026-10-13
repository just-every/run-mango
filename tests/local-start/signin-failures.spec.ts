import { expect } from '@playwright/test';
import { contract } from '../contract';

contract('OPER-001', 'failed sign-in resolves local guidance even when the environment arrives after the failure', async ({page}) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/auth/environment', async route => { await pending; await route.fulfill({json:{local:true}}); });
  await page.route('**/auth/magic-link', route => route.fulfill({status:503,json:{error:'mail_unavailable'}}));
  try {
    const hydrated = page.waitForRequest('**/auth/environment');
    await page.goto('/signin');
    await hydrated; // The effect runs only once React has hydrated this page.
    await page.getByLabel('Email address').fill('owner@example.test');
    await page.getByRole('button',{name:'Email sign-in link'}).click();
    await expect(page.getByRole('alert')).toContainText('Sign-in mail is unavailable');
    await expect(page.getByRole('alert')).not.toContainText('Check the mail settings');
    release();
    await expect(page.getByRole('link',{name:'Open the development outbox'})).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Open the development outbox');
    await expect(page.getByRole('alert')).not.toContainText('Check the mail settings');
  } finally { release(); }
});

contract('OPER-001', 'hydrated deployed sign-in failure names the mail settings and has no outbox', async ({page}) => {
  await page.route('**/auth/environment', route => route.fulfill({json:{local:false}}));
  await page.route('**/auth/magic-link', route => route.fulfill({status:503,json:{error:'mail_unavailable'}}));
  const hydrated = page.waitForResponse('**/auth/environment');
  await page.goto('/signin'); await hydrated;
  await page.getByLabel('Email address').fill('owner@example.test');
  await page.getByRole('button',{name:'Email sign-in link'}).click();
  await expect(page.getByRole('alert')).toContainText('Check the mail settings in the operations guide');
  await expect(page.getByRole('link',{name:'Open the development outbox'})).toHaveCount(0);
});
