import {test,expect} from '/workspace/run-mango/node_modules/@playwright/test/index.mjs';
import {writeFile} from 'node:fs/promises';
import {providerEdge} from '/workspace/run-mango/tests/go-live/edge';
import {eventSigner} from '/workspace/run-mango/tests/go-live/sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,approve} from '/workspace/run-mango/tests/go-live/harness';
const packet='/home/agent/rer-consolidation/work/sd-mango-hydration-date-3/packet';
test('saved newsletter dates format after reload without any interaction',async({page})=>{
 const edge=await providerEdge(),site=await installation(edge,eventSigner());
 const errors:string[]=[]; page.on('pageerror',error=>errors.push(String(error)));
 try {
  const cookie=await site.open();
  await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
  await site.control('/_golive/sender-evidence');
  await confirmedContact(site,edge,cookie,'date-reader@example.test','Garden Reader');
  const clock=await site.control('/_golive/clock',{hold:true});
  const campaign=await draftCampaign(site,cookie,'Garden date proof',['date-reader@example.test'],new Date(clock.now+3600000));
  await approve(site,cookie,campaign);
  await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  await page.addInitScript(()=>{(window as any).proofInteractions=[]; for(const name of ['pointerdown','click','keydown','touchstart']) window.addEventListener(name,event=>{if(event.isTrusted)(window as any).proofInteractions.push(name);},true);});
  const records=[];
  for(const preference of [null,'America/New_York']) {
   if(preference) await page.evaluate(zone=>localStorage.setItem('mango-time-zone',zone),preference);
   await page.goto(`${site.runtime.url}/app/campaigns/${campaign.campaignId}`);
   await page.waitForFunction(()=>document.documentElement.dataset.mangoHydrated==='true');
   const expected=await page.evaluate(({at,zone})=>new Intl.DateTimeFormat('en-AU',{dateStyle:'medium',timeStyle:'short',timeZone:zone??'Australia/Brisbane'}).format(new Date(at)),{at:clock.now,zone:preference});
   const heading=page.locator('.audience-snapshot').getByRole('heading',{level:2});
   await expect(heading).toHaveText(`Saved ${expected}`,{timeout:10000});
   for(let reload=0;reload<10;reload++) {
    await page.reload();
    await expect(heading).toHaveText(`Saved ${expected}`,{timeout:10000});
   }
   const state=await page.evaluate(()=>({hydrated:document.documentElement.dataset.mangoHydrated,readyState:document.readyState,interactions:(window as any).proofInteractions,zone:localStorage.getItem('mango-time-zone')}));
   expect(state.interactions).toEqual([]);
   records.push({preference,heading:await heading.textContent(),...state});
   if(preference===null) for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await page.locator('.audience-snapshot').screenshot({path:`${packet}/date-${width}.png`});
    await page.screenshot({path:`${packet}/saved-newsletter-${width}.png`,fullPage:true});
   }
  }
  await page.setViewportSize({width:1440,height:1000});
  const heading=page.locator('.audience-snapshot').getByRole('heading',{level:2});
  await page.getByLabel('Times shown in').selectOption('Europe/London');
  const formatted=(zone:string)=>new Intl.DateTimeFormat('en-AU',{dateStyle:'medium',timeStyle:'short',timeZone:zone}).format(new Date(clock.now));
  await expect(heading).toHaveText(`Saved ${formatted('Europe/London')}`);
  records.push({kind:'picker change',heading:await heading.textContent()});
  const tab=await page.context().newPage();
  await tab.goto(`${site.runtime.url}/signin`);
  await tab.evaluate(()=>localStorage.setItem('mango-time-zone','Europe/Berlin'));
  await expect(heading).toHaveText(`Saved ${formatted('Europe/Berlin')}`);
  records.push({kind:'cross-tab storage',heading:await heading.textContent()});
  await tab.close();
  expect(errors).toEqual([]);
  await writeFile(`${packet}/date-proof-receipt.json`,JSON.stringify({records,errors},null,2)+'\n');
 }finally {await page.close();await site.runtime.close();await edge.close();}
});
