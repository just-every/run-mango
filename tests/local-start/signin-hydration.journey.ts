import {expect, test} from '@playwright/test';
import {authorityRuntime} from './authority-runtime.mjs';
let runtime: Awaited<ReturnType<typeof authorityRuntime>>;
test.beforeAll(async () => {test.setTimeout(600000);runtime=await authorityRuntime();await runtime.setup(false);await runtime.variables();await runtime.start();});
test.afterAll(async () => {await runtime?.close();});
test('[OPER-001] native local sign-in before JavaScript reports unavailable email at 390px',async ({browser}) => {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}}),page=await context.newPage();
  try {
    await page.goto(runtime.url+'/setup');
    await expect(page).toHaveURL(runtime.url+'/signin?reason=session-required&returnTo=%2Fsetup');
    await page.getByRole('textbox',{name:'Email address'}).fill('owner@example.test');
    await expect(page.getByRole('button',{name:'Email sign-in link'})).toBeEnabled();
    const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/auth/magic-link'&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Email sign-in link'}).click();
    expect((await response).status()).toBe(503);
    expect(new URL(page.url()).search).toBe('');
    await expect(page.getByRole('heading',{name:'Sign-in unavailable'})).toBeVisible();
    await expect(page.getByText(/RER_OPEN/)).toBeVisible();
    expect((await page.request.get(runtime.url+'/api/operator')).status()).toBe(401);
  } finally {await context.close();}
});
