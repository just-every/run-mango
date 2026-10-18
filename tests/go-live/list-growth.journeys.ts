import {eraseHttp} from '../audience-import/erase';
import {test,expect} from '@playwright/test';
import {providerEdge} from './edge';
import {event,eventSigner} from './sendgrid-events';
import {installation,json,sender,confirmedContact,signedPost} from './harness';
import {openPage} from '../support/navigation';

test('[REPORT-005] native membership changes reconcile by day and consent source without repeat growth',async({page},info)=>{
  const edge=await providerEdge(),signer=eventSigner(),site=await installation(edge,signer);
  try {
    const cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    const report=()=>site.call('/api/insights/list-growth',{cookie}).then(response=>json(response,200));
    expect((await site.call('/api/insights/list-growth')).status).toBe(401);
    expect((await site.call('/api/insights/list-growth?from=2026-02-30&to=2026-03-02',{cookie})).status).toBe(400);
    const initial=await report();
    expect(initial.channels.map((row:any)=>row.closing)).toEqual([0,0]);
    const alice=await confirmedContact(site,edge,cookie,'alice@example.test','Alice Gardener');
    await confirmedContact(site,edge,cookie,'bob@example.test','Bob Grower');
    await confirmedContact(site,edge,cookie,'carla@example.test','Carla Fields');
    const before=await report();
    expect(before.channels.find((row:any)=>row.channel==='email')).toMatchObject({opening:0,closing:3,net:3});
    expect(before.rows.filter((row:any)=>row.kind==='confirmation').reduce((n:number,row:any)=>n+row.count,0)).toBe(3);
    // Replaying an actual confirmation can never add another membership change.
    expect((await fetch(site.local(alice),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(410);
    expect((await report()).channels).toEqual(before.channels);
    const aliceId=(await site.rows("SELECT id FROM contacts WHERE email='alice@example.test'"))[0].id;
    const unsubscribe=await site.control('/_golive/unsubscribe-link',{contactId:aliceId});
    expect((await fetch(site.local(unsubscribe.url),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
    const body=Buffer.from(JSON.stringify([event('spamreport','bob@example.test',Date.now(),'other-message')]));
    expect(await signedPost(site,'/webhooks/mail/sendgrid',body,signer.headers(body))).toBe(204);
    const carlaId=(await site.rows("SELECT id FROM contacts WHERE email='carla@example.test'"))[0].id;
    const erasure=await eraseHttp(site,cookie,carlaId);
    expect(erasure.state).toBe('complete');
    const after=await report();
    const total=after.channels.find((row:any)=>row.channel==='email');
    expect(total).toMatchObject({opening:0,closing:0,net:0});
    expect(after.rows.reduce((n:number,row:any)=>n+row.net,0)).toBe(total.net);
    expect(after.rows.filter((row:any)=>row.kind==='unsubscribe').reduce((n:number,row:any)=>n+row.net,0)).toBe(-1);
    expect(after.rows.filter((row:any)=>row.kind==='suppression').reduce((n:number,row:any)=>n+row.net,0)).toBe(-1);
    expect(after.rows.filter((row:any)=>row.kind==='erasure').reduce((n:number,row:any)=>n+row.net,0)).toBe(-1);
    expect(after.rows.some((row:any)=>row.source==='Market stall sign-up sheet'&&row.version==='v1'&&row.consentText)).toBe(true);
    expect(JSON.stringify(after)).not.toMatch(/alice@example|bob@example|carla@example|Carla Fields/);
    expect((await site.rows(`SELECT count(*) n FROM list_growth_attribution WHERE contact_id='${carlaId}'`))[0].n).toBe(0);
    const old=await json(await site.call('/api/insights/list-growth?from=2000-01-01&to=2000-01-02',{cookie}),200);
    expect(old.effectiveFrom).toBeNull();expect(old.rows).toEqual([]);
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});await openPage(page,`${site.runtime.url}/app/insights`);
      const panel=page.locator('section[aria-labelledby="list-growth-title"]');
      await expect(panel.getByRole('table',{name:'Subscribed membership totals'})).toBeVisible();
      await expect(panel).toContainText('Market stall sign-up sheet');
      await panel.getByRole('button',{name:'Consent version: v1',exact:true}).first().click();
      await panel.screenshot({path:info.outputPath(`list-growth-${width}.png`)});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  } finally {await site.runtime.close();await edge.close();}
});
