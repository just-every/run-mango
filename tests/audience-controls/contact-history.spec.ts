import {test,expect} from '@playwright/test';
import {contract} from '../contract.js';
import {authoringRuntime} from '../campaign-authoring/browser-runtime.mjs';
import {localSessionCookieName} from '../support/local-session';
import {openPage} from '../support/navigation';
import type {ContactTimelineEntry} from '../../src/core/features/audience/contact-timeline';

test.use({launchOptions:{args:['--use-mock-keychain','--password-store=basic']}});
contract('CONT-008','a contact timeline combines original source, consent, suppression, eligibility, delivery and operator facts without another contact or private payload',async({page,request},testInfo)=>{
  test.setTimeout(180000);
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
    expect(detail.history.some((entry:{kind:string})=>entry.kind==='opt-out')).toBe(true);
    expect(detail.sourceActivity.length).toBeGreaterThan(0);
    expect(detail.campaignHistory).toHaveLength(2);
    const kinds=new Set(timeline.map(row=>row.kind));
    for(const kind of ['order','consent-captured','consent-confirmed','channel-suppressed','campaign-eligible','campaign-skipped','message-handed-off','message-delivered','operator-action','opt-out'])expect(kinds.has(kind),kind).toBe(true);
    expect(timeline.map(row=>Date.parse(row.occurredAt))).toEqual(timeline.map(row=>Date.parse(row.occurredAt)).sort((a,b)=>b-a));
    expect(new Set(timeline.map(row=>row.id)).size).toBe(timeline.length);
    expect(timeline.find(row=>row.kind==='order')).toMatchObject({occurredAt:fixture.orderAt,source:'shopify · order'});
    expect(timeline.find(row=>row.kind==='message-delivered')).toMatchObject({occurredAt:fixture.deliveryAt,source:'sendgrid',campaignId:fixture.campaignId});
    expect(timeline.find(row=>row.kind==='campaign-skipped')?.detail).toContain('channel-not-subscribed');
    expect(timeline.find(row=>row.id==='action:history-operator')?.detail).toContain('Author');
    for(const marker of ['source-marker','source-payload-marker','provider-payload-marker','audit-payload-marker','other-contact-marker','unrelated-person@example.test'])expect(JSON.stringify(timeline)).not.toContain(marker);
    expect(JSON.stringify(detail)).not.toContain('other-contact-marker');
    expect((await page.context().request.get(`${runtime.url}/api/contacts/missing`)).status()).toBe(404);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await openPage(page,`${runtime.url}/app/audience/${fixture.contactId}`);
      const region=page.locator('section[aria-labelledby="timeline-title"]');
      await expect(region.locator('[data-timeline-kind="message-delivered"]')).toBeVisible();
      // Older facts stay reachable rather than being silently truncated.
      while(await region.getByRole('button',{name:/Show more activity/}).count())await region.getByRole('button',{name:/Show more activity/}).click();
      await expect(region.locator('[data-timeline-id]')).toHaveCount(timeline.length);
      expect(await region.locator('time').evaluateAll(elements=>elements.map(element=>element.getAttribute('datetime')))).toEqual(timeline.map(row=>row.occurredAt));
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await expect(region.getByRole('link',{name:'View campaign'}).first()).toHaveAttribute('href',/\/app\/campaigns\//);
      await page.evaluate(()=>window.scrollTo(0,0));
      const screenshot=testInfo.outputPath(`contact-history-${width}.png`);
      await page.screenshot({path:screenshot,fullPage:true});
      await testInfo.attach(`contact-history-${width}`,{path:screenshot,contentType:'image/png'});
    }
  } finally {await runtime.close();}
});
