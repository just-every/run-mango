import {openGate} from './dev-gate.mjs';
import {expect, test} from '@playwright/test';
import {authorityRuntime} from './authority-runtime.mjs';
let runtime: Awaited<ReturnType<typeof authorityRuntime>>;
test.beforeAll(async () => {test.setTimeout(600000);runtime=await authorityRuntime();await runtime.setup(false);await runtime.variables();await runtime.start();});
test.afterAll(async () => {await runtime?.close();});
test('[OPER-001] one-click local owner sign-in works before JavaScript at 390px',async ({browser}) => {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}}),page=await context.newPage();
  try {
    await openGate(context,runtime.url);
    await page.goto(runtime.url+'/signin?returnTo=%2Fsetup');
    await page.getByRole('link',{name:'Sign in as Owner'}).click();
    await expect(page).toHaveURL(runtime.url+'/setup');
    await expect(page.getByRole('heading',{name:'Set up your sender identity'})).toBeVisible();
    expect((await page.request.get(runtime.url+'/__dev/outbox')).status()).toBe(404);
  } finally {await context.close();}
});
