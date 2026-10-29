import { expect, test } from '@playwright/test';
import { stat, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { finishSetup } from './finish-setup.mjs';
import { freshCopy } from './fresh-copy.mjs';
import { openGate } from './dev-gate.mjs';
let runtime: Awaited<ReturnType<typeof freshCopy>>;
test.beforeAll(async()=>{test.setTimeout(600000);runtime=await freshCopy();});
test.afterAll(async()=>{await runtime?.close();});
const width=1440;
test('[OPER-001] fresh install completes sender setup after one-click owner sign-in at 1440', async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:900}}), page=await context.newPage();
  try {
    expect((await stat(join(runtime.checkout,'.dev.vars'))).mode & 0o777).toBe(0o600);
    expect((await page.request.get(runtime.url+'/__dev/outbox')).status()).toBe(404);
    await openGate(context,runtime.url);
    await page.goto(runtime.url+'/signin?returnTo=%2Fsetup');
    await page.getByRole('link',{name:'Sign in as Owner'}).click();
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

    // HOME-001: before the owner saves the sender identity, the home page is the Lobby, whose one action finishes setup.
    await page.getByRole('link',{name:'Back to Mango'}).click();
    await expect(page).toHaveURL(runtime.url+'/');
    expect(await (await page.request.get(runtime.url+'/setup/state')).json()).toEqual({state:'unclaimed'});
    await expect(page.getByRole('link',{name:'Finish setup'})).toHaveAttribute('href','/setup');
    await page.goto(runtime.url+'/signin?returnTo=%2Fsetup');
    await page.getByRole('link',{name:'Sign in as Owner'}).click();
    await expect(page).toHaveURL(runtime.url+'/setup');
    await page.waitForFunction(() => document.documentElement.dataset.mangoHydrated === 'true');
    for (const viewportWidth of [1440]) {
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
    // Setup starts with the owner's own address as sender and reply-to; the business name and postal address are theirs to give.
    await expect(page.getByLabel('From email',{exact:true})).toHaveValue('owner@example.test');
    await expect(page.getByLabel('Business display name',{exact:true})).toHaveValue('');
    for(const label of ['Business display name','Physical postal address']) {
      const field=page.getByLabel(label,{exact:true});
      await expect(field).toHaveAttribute('aria-invalid','true');
      await expect(field).toHaveAccessibleDescription(/\S/);
    }
    await expect(page.getByText('Enter your business name.',{exact:true})).toBeVisible();
    await expect(page.getByLabel('Business display name',{exact:true})).toBeFocused();
    expect(senderWrites).toBe(0);
    await finishSetup(page);
    expect(senderWrites).toBe(1);
    // Once setup is saved the installation is claimed, and for the signed-in owner the Lobby's one action is Open app, never Sign in.
    expect(await (await page.request.get(runtime.url+'/setup/state')).json()).toEqual({state:'claimed'});
    await page.goto(runtime.url+'/');
    await expect(page.getByRole('link',{name:'Open app'})).toHaveAttribute('href','/app');
    await expect(page.getByRole('link',{name:'Sign in'})).toHaveCount(0);
    await page.goto(runtime.url+'/setup');
    await expect(page).toHaveURL(runtime.url+'/app');
    // A reload reads the persisted sender identity and preserves access.
    await page.reload(); await expect(page).toHaveURL(runtime.url+'/app');
    await page.goto(runtime.url+'/app/campaigns');
    expect((await (await page.request.get(runtime.url+'/api/campaigns')).json()).campaigns).toEqual([]);
    await expect(page.getByRole('button',{name:'Blank newsletter',exact:true})).toBeVisible();
    // Local mail is suppressed and succeeds quietly, so a draft's email step meets no sender or authentication blocker.
    const headers={Origin:runtime.url};
    const draft=await (await page.request.post(runtime.url+'/api/campaigns',{headers,data:{}})).json();
    expect((await page.request.patch(runtime.url+`/api/campaign-revisions/${draft.revisionId}`,{headers,data:{emailSubject:'Local letter',emailBody:'<p>Local letter</p>',
      steps:[{channel:'email',timezone:'UTC',scheduledAt:'2031-10-28T10:00:00.000Z',sendByAt:'2031-10-28T12:00:00.000Z',whyThisTime:'Owner chose this time'}]}})).status()).toBe(200);
    const checks=await (await page.request.post(runtime.url+`/api/campaigns/${draft.campaignId}/checks`,{headers,data:{revisionId:draft.revisionId}})).json();
    expect(checks.checks.map((check:{kind:string})=>check.kind)).toContain('message.email-sender');
    expect(checks.blockers.map((check:{kind:string})=>check.kind).filter((kind:string)=>/^mail\.|sender|authentication/.test(kind))).toEqual([]);
    expect((await page.request.post(runtime.url+'/api/_local/bootstrap',{data:{testSession:true}})).status()).toBe(404);
    await page.goto(runtime.url+'/auth/confirm?token='+'x'.repeat(43));
    await expect(page.getByRole('link',{name:'Request a new link'})).toHaveAttribute('href','/signin');
  } finally {await context.close();}
});
test('[OPER-001] a production build with local credentials present emits no local variable file or secret',async()=>{
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
