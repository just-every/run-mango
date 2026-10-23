import AxeBuilder from '@axe-core/playwright';
import {test,expect} from '@playwright/test';
import {contract} from '../contract.js';
import {authoringRuntime} from '../campaign-authoring/browser-runtime.mjs';
import {localSessionCookieName} from '../support/local-session';
import {openPage} from '../support/navigation';
import type {ContactTimelineEntry} from '../../src/core/features/audience/contact-timeline';

test.use({launchOptions:{args:['--use-mock-keychain','--password-store=basic']}});
contract('CONT-008','[CONT-017] a contact profile combines identities, properties, segments and original source, consent, suppression, eligibility, delivery and operator facts with masked role views',async({page,request},testInfo)=>{
  test.setTimeout(180000);
  const hydrationErrors:string[]=[];
  page.on('console',message=>{if(/hydration|hydrated.*match/i.test(message.text())&&message.type()==='error')hydrationErrors.push(message.text());});
  page.on('pageerror',error=>hydrationErrors.push(error.message));
  const runtime=await authoringRuntime({suite:'contact-history',fixtureWorker:'tests/audience-controls/history-worker.ts',vars:(url:string)=>({MANGO_PUBLIC_BASE_URL:url})});
  try {
    const open=await request.post(`${runtime.url}/_authoring/open`,{headers:{'X-Test-Token':runtime.token}});
    expect(open.status()).toBe(200);
    await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:(await open.json()).token,url:runtime.url}]);
    const seed=await request.post(`${runtime.url}/_history/seed`,{headers:{'X-Test-Token':runtime.token}});
    expect(seed.status()).toBe(200);
    const fixture=await seed.json(),url=`${runtime.url}/api/contacts/${fixture.contactId}`;
    expect((await request.get(url)).status()).toBe(401);
    const response=await page.context().request.get(url);
    expect(response.status()).toBe(200);
    const detail=await response.json(),timeline:ContactTimelineEntry[]=detail.timeline;
    expect(detail.phones).toEqual(expect.arrayContaining([expect.objectContaining({phoneE164:'+15555550123'})]));
    expect(detail.emails.map((row:any)=>row.email)).toEqual(expect.arrayContaining(['nadia@example.test','nadia-merged@example.test']));
    expect(detail.profile).toMatchObject({properties:{favourite:'Autumn linen'},tags:['harvest-vip'],segments:[{id:'history-segment',name:'Harvest VIP',state:'member'}]});
    expect(detail.profile.mergedIdentities).toEqual(expect.arrayContaining([expect.objectContaining({id:fixture.mergedId})]));
    expect(detail.history.some((entry:{kind:string})=>entry.kind==='opt-out')).toBe(true);
    expect(detail.sourceActivity.length).toBeGreaterThan(0);
    expect(detail.campaignHistory).toHaveLength(2);
    const kinds=new Set(timeline.map(row=>row.kind));
    for(const kind of ['conversion','form-submitted','sms-reply','message-clicked','order','consent-captured','consent-confirmed','channel-suppressed','campaign-eligible','campaign-skipped','message-handed-off','message-delivered','operator-action','opt-out'])expect(kinds.has(kind),kind).toBe(true);
    expect(timeline.map(row=>Date.parse(row.occurredAt))).toEqual(timeline.map(row=>Date.parse(row.occurredAt)).sort((a,b)=>b-a));
    expect(new Set(timeline.map(row=>row.id)).size).toBe(timeline.length);
    expect(timeline.find(row=>row.kind==='form-submitted')).toMatchObject({source:'hosted-signup-form · https://harvest.example.test/signup'});
    expect(timeline.find(row=>row.kind==='conversion')).toMatchObject({source:'Campaign attribution',detail:'Autumn harvest · attributed order'});
    expect(timeline.find(row=>row.kind==='sms-reply')).toMatchObject({source:'Signed SMS inbound receipt',detail:'SMS · HELP'});
    expect(timeline.find(row=>row.kind==='message-clicked')).toMatchObject({source:'First-party link tracking'});
    expect(timeline.find(row=>row.id.startsWith('source:')&&row.kind==='order'&&row.occurredAt===fixture.orderAt)).toMatchObject({occurredAt:fixture.orderAt,source:'shopify · order'});
    expect(timeline.find(row=>row.kind==='message-delivered')).toMatchObject({occurredAt:fixture.deliveryAt,source:'sendgrid',campaignId:fixture.campaignId});
    expect(timeline.find(row=>row.kind==='campaign-skipped')?.detail).toContain('channel-not-subscribed');
    expect(timeline.find(row=>row.id==='action:history-operator')?.detail).toContain('Author');
    for(const marker of ['source-marker','source-payload-marker','provider-payload-marker','audit-payload-marker','other-contact-marker','unrelated-person@example.test'])expect(JSON.stringify(timeline)).not.toContain(marker);
    expect(JSON.stringify(detail)).not.toContain('other-contact-marker');
    expect((await page.context().request.get(`${runtime.url}/api/contacts/missing`)).status()).toBe(404);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await openPage(page,`${runtime.url}/app/audience/${fixture.contactId}`);
      await expect(page.getByRole('region',{name:'Contact identities'})).toContainText('nadia-merged@example.test');
      await expect(page.getByRole('region',{name:'Contact properties'})).toContainText('Autumn linen');
      await expect(page.getByRole('region',{name:'Segment membership'})).toContainText('Harvest VIP');
      await expect(page.getByRole('region',{name:'Topics and channel consent'})).toContainText('newsletter');
      await expect(page.getByRole('region',{name:'Flow enrollments'})).toContainText('No flow enrollments.');
      await expect(page.getByRole('region',{name:'Contact predictions'})).toContainText('Predictions not available.');
      const region=page.locator('section[aria-labelledby="timeline-title"]');
      await expect(region.locator('[data-timeline-kind="message-delivered"]')).toBeVisible();
      // Older facts stay reachable rather than being silently truncated.
      while(await region.getByRole('button',{name:/Show more activity/}).count())await region.getByRole('button',{name:/Show more activity/}).click();
      await expect(region.locator('[data-timeline-id]')).toHaveCount(timeline.length);
      expect(await region.locator('time').evaluateAll(elements=>elements.map(element=>element.getAttribute('datetime')))).toEqual(timeline.map(row=>row.occurredAt));
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await expect(region.getByRole('link',{name:'View campaign'}).first()).toHaveAttribute('href',/\/app\/campaigns\//);
      expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
      await page.evaluate(()=>window.scrollTo(0,0));
      const screenshot=testInfo.outputPath(`contact-history-${width}.png`);
      await page.screenshot({path:screenshot,fullPage:true});
      await testInfo.attach(`contact-history-${width}`,{path:screenshot,contentType:'image/png'});
    }
    for(const identity of fixture.restricted) {
      await page.context().clearCookies();
      await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:identity.token,url:runtime.url}]);
      const masked=await (await page.context().request.get(url)).json();
      expect(masked.masked).toBe(true);expect(masked.profile).toBeUndefined();
      for(const marker of ['nadia@example.test','nadia-merged@example.test','+15555550123','Autumn linen','harvest-vip','source-marker','private'])expect(JSON.stringify(masked)).not.toContain(marker);
      for(const width of [1440,390]) {
        await page.setViewportSize({width,height:1000});await openPage(page,`${runtime.url}/app/audience/${fixture.contactId}`);
        await expect(page.getByRole('region',{name:'Contact identities'})).toContainText('restricted');
        for(const marker of ['nadia@example.test','nadia-merged@example.test','+15555550123','Autumn linen','harvest-vip'])await expect(page.locator('main').first()).not.toContainText(marker);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
        await page.screenshot({path:testInfo.outputPath(`contact-${identity.role}-${width}.png`),fullPage:true});
      }
    }
    expect(hydrationErrors).toEqual([]);
  } finally {await runtime.close();}
});
