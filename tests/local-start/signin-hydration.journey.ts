import {chosenSizeJourney} from '../campaign-authoring/chosen-size-journey';
import {openGate} from './dev-gate.mjs';
import {expect, test} from '@playwright/test';
import {authorityRuntime} from './authority-runtime.mjs';
let runtime: Awaited<ReturnType<typeof authorityRuntime>>;
test.beforeAll(async () => {test.setTimeout(600000);runtime=await authorityRuntime();await runtime.setup(false);await runtime.variables();await runtime.start();});
test.afterAll(async () => {await runtime?.close();});
test('[OPER-001][BUILD-011][BUILD-012] one-click local owner sign-in works before JavaScript at 390px; chosen catalog promotions bound configured items and recheck handoff',async ({browser,page:catalogPage},info) => {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}}),page=await context.newPage();
  try {
    await openGate(context,runtime.url);
    await page.goto(runtime.url+'/signin?returnTo=%2Fsetup');
    await page.getByRole('link',{name:'Sign in as Owner'}).click();
    await expect(page).toHaveURL(runtime.url+'/setup');
    await expect(page.getByRole('heading',{name:'Set up your sender identity'})).toBeVisible();
    await expect(page.getByLabel('Your name',{exact:true})).toHaveCount(0);
    await expect(page.getByLabel('Business display name',{exact:true})).toBeVisible();
    expect((await page.request.get(runtime.url+'/__dev/outbox')).status()).toBe(404);
  } finally {await context.close();}
  await chosenSizeJourney(catalogPage,info);
});
