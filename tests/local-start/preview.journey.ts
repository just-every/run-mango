import { expect, test } from '@playwright/test';
import { contract } from '../contract';
import { authorityRuntime, signIn } from './authority-runtime.mjs';

contract('OPER-001', 'a production build leaves dev working, and preview serves the same installation signed in', async ({ browser }) => {
  test.setTimeout(900000);
  const runtime = await authorityRuntime();
  try {
    await runtime.setup(false);
    await runtime.command(['build']);
    await runtime.start();
    expect((await fetch(runtime.url + '/health')).status).toBe(200);
    await runtime.stop();
    await runtime.start('preview');
    expect((await fetch(runtime.url + '/health')).status).toBe(200);
    const page = await browser.newPage();
    try {
      await signIn(page, runtime.url);
      await expect(page).toHaveURL(runtime.url + '/app');
    } finally { await page.close(); }
  } finally { await runtime.close(); }
});
