import {expect, test} from '@playwright/test';
import {contract} from '../contract.js';
import {openGate} from './dev-gate.mjs';
import {authorityRuntime} from './authority-runtime.mjs';
let runtime: Awaited<ReturnType<typeof authorityRuntime>>;
test.beforeAll(async () => {test.setTimeout(600000);runtime=await authorityRuntime();await runtime.setup(false);await runtime.variables();await runtime.start();});
test.afterAll(async () => {await runtime?.close();});
contract('OPER-001','native sign-in before JavaScript writes one durable mail at 390px',async ({browser}) => {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}}),page=await context.newPage();
  try {
    await openGate(context,runtime.url);
    const before=(await (await page.request.get(runtime.url+'/__dev/outbox')).text()).match(/Read message/g)?.length ?? 0;
    await page.goto(runtime.url+'/setup');
    await expect(page).toHaveURL(runtime.url+'/signin?reason=session-required&returnTo=%2Fsetup');
    await page.getByRole('textbox',{name:'Email address'}).fill('owner@example.test');
    await expect(page.getByRole('button',{name:'Email sign-in link'})).toBeEnabled();
    const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/auth/magic-link'&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Email sign-in link'}).click();
    expect((await response).status()).toBe(202);
    expect(new URL(page.url()).search).toBe('');
    const html=await (await page.request.get(runtime.url+'/__dev/outbox')).text();
    expect(html.match(/Read message/g)?.length ?? 0).toBe(before+1);
    await page.goto(runtime.url+'/__dev/outbox');
    await page.getByRole('link',{name:'Read message'}).first().click();
    await page.getByRole('link',{name:'Open this link'}).click();
    const confirmation=page.waitForResponse(r=>new URL(r.url()).pathname==='/auth/confirm'&&r.request().method()==='POST');
    await page.getByRole('button',{name:/Confirm/}).click();
    expect((await confirmation).headers().location).toBe('/setup');
    await expect(page).toHaveURL(runtime.url+'/setup');
    await expect(page.getByRole('heading',{name:'Set up your sender identity'})).toBeVisible();
  } finally {await context.close();}
});
