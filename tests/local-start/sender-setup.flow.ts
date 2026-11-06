import { expect, test, type Browser } from '@playwright/test';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { finishSetup } from './finish-setup.mjs';
import { openGate } from './dev-gate.mjs';
import type { SenderStatus } from '../../src/core/features/settings/types';

// Both fresh dependency installation and push Verify exercise the same public doors.
export async function senderSetupJourney(browser: Browser, runtime: {checkout: string; url: string}) {
  const width=1440;
  const context=await browser.newContext({viewport:{width,height:900}}), page=await context.newPage();
  try {
    expect((await stat(join(runtime.checkout,'.dev.vars'))).mode & 0o777).toBe(0o600);
    expect((await page.request.get(runtime.url+'/__dev/outbox')).status()).toBe(404);
    await openGate(context,runtime.url);
    // The private development key opens local sign-in; configuration still
    // requires the native operator session established below.
    for (const path of ['/api/settings/sender','/api/settings/providers']) {
      expect((await page.request.get(runtime.url+path)).status()).toBe(401);
    }
    await page.goto(runtime.url+'/signin?returnTo=%2Fsetup');
    await page.getByRole('link',{name:'Sign in as Owner'}).click();
    await expect(page).toHaveURL(runtime.url+'/setup');
    const readUnreadyConfiguration = async (request=page.request) => {
      const senderResponse=await request.get(runtime.url+'/api/settings/sender');
      expect(senderResponse.status()).toBe(200);
      const sender: SenderStatus=await senderResponse.json();
      expect(sender.validation).toMatchObject({state:'unavailable',ready:false});
      expect(sender.readiness.filter(item=>['domain','dns','receipt','authentication'].includes(item.key)))
        .toEqual(['domain','dns','receipt','authentication'].map(key=>expect.objectContaining({key,state:'unavailable'})));
      const providersResponse=await request.get(runtime.url+'/api/settings/providers');
      expect(providersResponse.status()).toBe(200);
      const {providers}=await providersResponse.json();
      expect(providers).toEqual([expect.objectContaining({id:'mail',configured:false,status:'unavailable'})]);
      return sender;
    };
    // Configuration remains readable with the native owner session before setup admits documents.
    const initialSender=await readUnreadyConfiguration();
    expect(initialSender.identity.displayName).toBe('');
    expect(initialSender.identity.physicalAddress).toBe('');
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
    await expect(page.getByRole('heading',{name:'Set up your sender identity'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    // Assertions run at 1440; the phone capture is browser evidence of the same screen.
    for (const viewportWidth of [1440,390]) {
      await page.setViewportSize({width:viewportWidth,height:900});
      const capture=test.info().outputPath(`setup-${viewportWidth}.png`);
      await page.screenshot({path:capture,fullPage:true});
      await test.info().attach(`setup-${viewportWidth}`,{path:capture,contentType:'image/png'});
    }
    await page.setViewportSize({width,height:900});
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
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Business display name',{exact:true})).toBeFocused();
    expect(senderWrites).toBe(0);
    await finishSetup(page);
    expect(senderWrites).toBe(1);
    // Once setup is saved the installation is claimed, and the Lobby's one action is Sign in.
    expect(await (await page.request.get(runtime.url+'/setup/state')).json()).toEqual({state:'claimed'});
    await page.goto(runtime.url+'/');
    await expect(page.getByRole('link',{name:'Sign in'})).toHaveAttribute('href','/signin');
    await page.goto(runtime.url+'/setup');
    await expect(page).toHaveURL(runtime.url+'/app');
    // A reload reads the persisted sender identity and preserves access.
    await page.reload(); await expect(page).toHaveURL(runtime.url+'/app');
    const savedSender=await readUnreadyConfiguration();
    expect(savedSender.identity).toMatchObject({displayName:'Mango Test Newsletter',
      physicalAddress:'123 Test Street, Brisbane QLD 4000, Australia'});
    expect(savedSender.canSendCheck).toBe(false);
    expect(savedSender.evidence).toMatchObject({provider:{state:'unknown'},dns:{state:'unknown'},observation:{state:'missing'}});
    for (const viewportWidth of [1440,390]) {
      await page.setViewportSize({width:viewportWidth,height:900});
      const capture=test.info().outputPath(`configured-app-${viewportWidth}.png`);
      await page.screenshot({path:capture,fullPage:true});
      await test.info().attach(`configured-app-${viewportWidth}`,{path:capture,contentType:'image/png'});
    }
    await page.setViewportSize({width,height:900});
    // A new native session must recover the identity without repeating setup or
    // treating configuration as a successful provider check.
    const reopenedContext=await browser.newContext({viewport:{width,height:900}});
    try {
      await openGate(reopenedContext,runtime.url);
      const reopened=await reopenedContext.newPage();
      await reopened.goto(runtime.url+'/signin?returnTo=%2Fsetup');
      await reopened.getByRole('link',{name:'Sign in as Owner'}).click();
      await expect(reopened).toHaveURL(runtime.url+'/app');
      await reopened.goto(runtime.url+'/app/settings');
      await reopened.reload();
      await expect(reopened).toHaveURL(runtime.url+'/app/settings');
      const identity={displayName:'Mango Test Newsletter',
        fromEmail:['newsletter','example.test'].join(String.fromCharCode(64)),
        replyToEmail:['reply','example.test'].join(String.fromCharCode(64)),
        physicalAddress:'123 Test Street, Brisbane QLD 4000, Australia'};
      const reopenedSender=await readUnreadyConfiguration(reopened.request);
      expect(reopenedSender.identity).toEqual(identity);
      expect(reopenedSender.canSendCheck).toBe(false);
      expect(reopenedSender.evidence).toMatchObject({provider:{state:'unknown'},dns:{state:'unknown'},observation:{state:'missing'}});
      const senderPanel=reopened.getByRole('region',{name:identity.displayName,exact:true});
      await expect(senderPanel.getByLabel('Business display name',{exact:true})).toHaveValue(identity.displayName);
      await expect(senderPanel.getByLabel('From email',{exact:true})).toHaveValue(identity.fromEmail);
      await expect(senderPanel.getByLabel('Reply-to email',{exact:true})).toHaveValue(identity.replyToEmail);
      await expect(senderPanel.getByLabel('Physical postal address',{exact:true})).toHaveValue(identity.physicalAddress);
      await expect(senderPanel.getByRole('heading',{name:'Sender check unavailable',exact:true})).toBeVisible();
      await expect(senderPanel.getByRole('definition').filter({hasText:'Unavailable'})).toHaveCount(4);
      for (const viewportWidth of [1440,390]) {
        await reopened.setViewportSize({width:viewportWidth,height:900});
        const capture=test.info().outputPath(`reopened-settings-${viewportWidth}.png`);
        await reopened.screenshot({path:capture,fullPage:true});
        await test.info().attach(`reopened-settings-${viewportWidth}`,{path:capture,contentType:'image/png'});
      }
    } finally {await reopenedContext.close();}
    await page.goto(runtime.url+'/app/campaigns');
    expect((await (await page.request.get(runtime.url+'/api/campaigns')).json()).campaigns).toEqual([]);
    await expect(page.getByRole('button',{name:'New campaign',exact:true})).toBeVisible();
    expect((await page.request.post(runtime.url+'/api/_local/bootstrap',{data:{testSession:true}})).status()).toBe(404);
    await page.goto(runtime.url+'/auth/confirm?token='+'x'.repeat(43));
    await expect(page.getByRole('link',{name:'Request a new link'})).toHaveAttribute('href','/signin');
  } finally {await context.close();}
}
