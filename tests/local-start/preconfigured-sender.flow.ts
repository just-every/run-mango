import { expect, type Browser } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { authorityRuntime } from './authority-runtime.mjs';
import { nativeDatabase } from './authority-data.mjs';
import { openGate } from './dev-gate.mjs';

// This installation has never saved the setup form: its valid identity comes
// from the existing installation configuration before its first app request.
export async function preconfiguredSenderJourney(browser: Browser) {
  const runtime=await authorityRuntime();
  const address=(local: string)=>[local,'example.test'].join(String.fromCharCode(64));
  const identity={displayName:'synthetic-mango-901',fromEmail:address('synthetic-mango-901'),
    replyToEmail:address('synthetic-mango-902'),physicalAddress:'901 Market Street, Brisbane QLD 4000, Australia'};
  try {
    await runtime.setup(false);
    const path=join(runtime.checkout,'.dev.vars');
    const settings=await readFile(path,'utf8');
    const fields={MAIL_SENDER_NAME:identity.displayName,MAIL_AUTH_FROM:identity.fromEmail,
      MAIL_REPLY_TO:identity.replyToEmail,MAIL_PHYSICAL_ADDRESS:identity.physicalAddress};
    const retained=settings.split('\n').filter(line=>!Object.keys(fields).some(key=>line.startsWith(key+'=')));
    await writeFile(path,retained.join('\n')+'\n'+Object.entries(fields).map(([key,value])=>key+'='+JSON.stringify(value)).join('\n')+'\n',{mode:0o600});
    await runtime.variables();
    const db=await nativeDatabase(runtime.checkout);
    try {expect(db.prepare('SELECT count(*) AS n FROM sender_settings').get()).toEqual({n:0});}
    finally {db.close();}
    await runtime.start();
    const context=await browser.newContext({viewport:{width:1440,height:900}});
    try {
      await openGate(context,runtime.url);
      const page=await context.newPage();
      let writes=0;
      page.on('request',request=>{if(new URL(request.url()).pathname==='/api/settings/sender'&&request.method()==='PUT')writes++;});
      await page.goto(runtime.url+'/signin?returnTo=%2Fsetup');
      await page.getByRole('link',{name:'Sign in as Owner'}).click();
      await expect(page).toHaveURL(runtime.url+'/app');
      await page.reload();
      await expect(page).toHaveURL(runtime.url+'/app');
      const setup=await page.request.get(runtime.url+'/setup',{maxRedirects:0});
      expect(setup.status()).toBe(303);
      expect(setup.headers().location).toBe('/app');
      expect(await (await page.request.get(runtime.url+'/setup/state')).json()).toEqual({state:'claimed'});
      const sender=await page.request.get(runtime.url+'/api/settings/sender');
      expect(sender.status()).toBe(200);
      expect(await sender.json()).toMatchObject({identity,validation:{state:'unavailable',ready:false},canSendCheck:false,
        evidence:{provider:{state:'unknown'},dns:{state:'unknown'},observation:{state:'missing'}}});
      await page.goto(runtime.url+'/app/settings');
      await expect(page.getByRole('region',{name:identity.displayName,exact:true}).getByLabel('From email',{exact:true})).toHaveValue(identity.fromEmail);
      expect(writes).toBe(0);
    } finally {await context.close();}
    await runtime.stop();
    const saved=await nativeDatabase(runtime.checkout);
    try {expect(saved.prepare('SELECT count(*) AS n FROM sender_settings').get()).toEqual({n:0});}
    finally {saved.close();}
  } finally {await runtime.close();}
}
