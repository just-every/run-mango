import { expect, test } from '@playwright/test';
import { stat, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { contract } from '../contract';
import { finishSetup } from './finish-setup.mjs';
import { freshCopy } from './fresh-copy.mjs';
import { openGate } from './dev-gate.mjs';
let runtime: Awaited<ReturnType<typeof freshCopy>>;
test.beforeAll(async()=>{test.setTimeout(600000);runtime=await freshCopy();});
test.afterAll(async()=>{await runtime?.close();});
const width=390;
contract('OPER-001', 'fresh install completes sender setup via the Base outbox at 1440 and 390', async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:900}}), page=await context.newPage();
  try {
    expect((await stat(join(runtime.checkout,'.dev.vars'))).mode & 0o777).toBe(0o600);
    await page.goto(runtime.url+'/setup');
    await expect(page).toHaveURL(runtime.url+'/signin?reason=session-required&returnTo=%2Fsetup');
    // Use the ordinary sign-in message requested by the real rer dev command.
    expect((await page.request.get(runtime.url+'/__dev/outbox')).status()).toBe(404);
    await openGate(context,runtime.url);
    await page.goto(runtime.url+'/__dev/outbox');
    await page.getByRole('link',{name:'Read message'}).first().click();
    await page.getByRole('link',{name:'Open this link'}).click();
    await expect(page.getByRole('heading',{level:1})).toContainText('Mango');
    const confirmation=page.waitForResponse(r=>new URL(r.url()).pathname==='/auth/confirm'&&r.request().method()==='POST');
    await page.getByRole('button',{name:/Confirm/}).click();
    expect((await confirmation).headers().location).toBe('/setup');
    await expect(page).toHaveURL(runtime.url+'/setup');
    for (const path of ['/app','/app/campaigns','/app/settings','/app/audience']) {
      const response=await page.request.get(runtime.url+path,{maxRedirects:0});
      expect(response.status()).toBe(303); expect(response.headers().location).toBe('/setup');
    }
    await page.waitForFunction(() => document.documentElement.dataset.mangoHydrated === 'true');
    // Use TanStack's public navigation API so the document dispatcher cannot mask a missing client gate.
    for (const path of ['/app/campaigns','/app/settings','/app/audience/import']) {
      await page.evaluate(async to => {await window.__TSR_ROUTER__!.navigate({to});},path);
      await expect(page).toHaveURL(runtime.url+'/setup');
    }
    // Exercise hydrated sign-in with a supplied return path.

    await page.getByRole('link',{name:'Back to Mango'}).click();
    await page.getByRole('link',{name:'Sign in',exact:true}).click();
    await page.evaluate(async () => {await window.__TSR_ROUTER__!.navigate({to:'/signin',search:{returnTo:'/setup'}});});
    await page.waitForFunction(() => document.documentElement.dataset.mangoHydrated === 'true');
    await page.getByLabel('Email address').fill('owner@example.test');
    const issued=page.waitForRequest(r=>new URL(r.url()).pathname==='/auth/magic-link'&&r.method()==='POST');
    await page.getByRole('button',{name:'Email sign-in link'}).click();
    expect((await issued).postDataJSON().returnTo).toBe('/setup');
    await expect(page.getByRole('status')).toContainText('Open it and press Confirm');
    await page.getByRole('link',{name:'Open the development outbox'}).click();
    await page.getByRole('link',{name:'Read message'}).first().click();
    await page.getByRole('link',{name:'Open this link'}).click();
    await page.getByRole('button',{name:/Confirm/}).click();
    await expect(page).toHaveURL(runtime.url+'/setup');
    await page.waitForFunction(() => document.documentElement.dataset.mangoHydrated === 'true');
    for (const viewportWidth of [1440,390]) {
      await page.setViewportSize({width:viewportWidth,height:900});
      await expect(page.getByRole('heading',{name:'Set up your sender identity'})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const capture=test.info().outputPath(`setup-${viewportWidth}.png`);
      await page.screenshot({path:capture,fullPage:true});
      await test.info().attach(`setup-${viewportWidth}`,{path:capture,contentType:'image/png'});
    }
    let senderWrites=0;
    page.on('request',request=>{if(new URL(request.url()).pathname==='/api/settings/sender'&&request.method()==='PUT')senderWrites++;});
    await page.getByRole('button',{name:'Save sender details',exact:true}).click();
    await expect(page).toHaveURL(runtime.url+'/setup');
    // Local setup supplies a display name; its missing email addresses need feedback.
    for(const label of ['From email','Reply-to email']) {
      const field=page.getByLabel(label,{exact:true});
      await expect(field).toHaveAttribute('aria-invalid','true');
      await expect(field).toHaveAccessibleDescription(/\S/);
    }
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('From email',{exact:true})).toBeFocused();
    expect(senderWrites).toBe(0);
    await finishSetup(page);
    expect(senderWrites).toBe(1);
    await page.goto(runtime.url+'/setup');
    await expect(page).toHaveURL(runtime.url+'/app');
    // A reload reads the persisted sender identity and preserves access.
    await page.reload(); await expect(page).toHaveURL(runtime.url+'/app');
    await page.goto(runtime.url+'/app/campaigns');
    expect((await (await page.request.get(runtime.url+'/api/campaigns')).json()).campaigns).toEqual([]);
    await expect(page.getByRole('button',{name:'New campaign',exact:true})).toBeVisible();
    expect((await page.request.post(runtime.url+'/api/_local/bootstrap',{data:{testSession:true}})).status()).toBe(404);
    await page.goto(runtime.url+'/auth/confirm?token='+'x'.repeat(43));
    await expect(page.getByRole('link',{name:'Request a new link'})).toHaveAttribute('href','/signin');
  } finally {await context.close();}
});
contract('OPER-001','sign-in failures explain the correct local and deployed next step',async({page})=>{
  for(const local of [true,false]) {
    await page.route('**/auth/environment',route=>route.fulfill({json:{local}}));
    await page.route('**/auth/magic-link',route=>route.fulfill({status:503,json:{error:'mail_unavailable'}}));
    const hydrated=page.waitForResponse('**/auth/environment');
    await page.goto(runtime.url+'/signin');await hydrated;
    if(local)await expect(page.getByRole('link',{name:'Open the development outbox'})).toBeVisible();
    await page.getByLabel('Email address').fill('owner@example.test');await page.getByRole('button',{name:'Email sign-in link'}).click();
    await expect(page.getByRole('alert')).toContainText(local?'Open the development outbox':'Check the mail settings in the operations guide');
    await page.unroute('**/auth/environment');await page.unroute('**/auth/magic-link');
  }
});

contract('OPER-001','a production build with local credentials present emits no local variable file or secret',async()=>{
  test.setTimeout(600000);
  const vars=await readFile(join(runtime.checkout,'.dev.vars'),'utf8');
  const secrets=vars.split('\n').filter(line=>/SECRET=|KEY=|TOKEN=|SALT=/.test(line)).map(line=>line.slice(line.indexOf('=')+1)).filter(Boolean);
  expect(secrets.length).toBeGreaterThan(0);
  await runtime.stop();
  await runtime.command(['build']);
  const files=(await readdir(join(runtime.checkout,'dist'),{recursive:true,withFileTypes:true})).filter(entry=>entry.isFile());
  expect(files.some(entry=>entry.name.startsWith('.dev.vars'))).toBe(false);
  for(const entry of files){
    const text=await readFile(join(entry.parentPath,entry.name)).then(bytes=>bytes.toString('latin1'));
    for(const secret of secrets) expect(text.includes(secret),`${entry.name} must not contain a local secret`).toBe(false);
  }
  expect(await readFile(join(runtime.checkout,'.dev.vars'),'utf8') === vars).toBe(true);
});
