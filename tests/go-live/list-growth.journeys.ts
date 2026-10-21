import {eraseHttp} from '../audience-import/erase';
import {test,expect} from '@playwright/test';
import {providerEdge} from './edge';
import {event,eventSigner} from './sendgrid-events';
import {installation,json,sender,confirmedContact,signedPost} from './harness';
import {openPage} from '../support/navigation';
import {publicFormCaptures,retainedHistoryUpgrade} from './list-growth-support';

test('[REPORT-005] native membership changes reconcile by day and consent source without repeat growth',async({page},info)=>{
  page.setDefaultTimeout(15000);
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
    const publicEvidence=await publicFormCaptures(page,site,edge,cookie);
    const captured=await report();
    const formRows=captured.rows.filter((row:any)=>row.source===publicEvidence.capture_source&&row.version===publicEvidence.consent_version);
    expect(formRows.filter((row:any)=>row.kind==='capture').reduce((n:number,row:any)=>n+row.count,0)).toBe(2);
    expect(formRows.filter((row:any)=>row.kind==='confirmation').reduce((n:number,row:any)=>n+row.count,0)).toBe(2);
    expect(formRows.reduce((n:number,row:any)=>n+row.net,0)).toBe(2);
    expect(formRows.every((row:any)=>row.consentText===publicEvidence.consent_text)).toBe(true);
    expect(captured.channels.find((row:any)=>row.channel==='email').closing).toBe(2);
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
    const upgrade=await retainedHistoryUpgrade(site);
    const history=()=>site.call(`/api/insights/list-growth?from=${upgrade.from}&to=${upgrade.to}`,{cookie}).then(response=>json(response,200));
    const recovered=await history();
    expect(recovered.effectiveFrom).toBeNull();
    expect(recovered.channels.every((row:any)=>row.opening===null&&row.closing===null&&row.net===0)).toBe(true);
    expect(recovered.rows.every((row:any)=>row.recording==='retained-evidence'&&row.net===0)).toBe(true);
    expect(recovered.rows.filter((row:any)=>row.kind==='capture').reduce((n:number,row:any)=>n+row.count,0)).toBe(upgrade.retained.length);
    expect(recovered.rows.filter((row:any)=>row.kind==='confirmation').reduce((n:number,row:any)=>n+row.count,0)).toBe(upgrade.retained.filter(row=>row.confirmed_at!==null).length);
    expect(recovered.retainedHistoryFrom.slice(0,10)).toBe(upgrade.from);
    expect((await report()).channels.find((row:any)=>row.channel==='email')).toMatchObject({opening:2,net:0,closing:2});
    // Recovered anonymous facts survive a later erasure just like live counts.
    const hostedId=(await site.rows("SELECT id FROM contacts WHERE email='hosted-growth@example.test'"))[0].id;
    expect((await eraseHttp(site,cookie,hostedId)).state).toBe('complete');
    const erased=await history();
    expect(erased.rows.reduce((n:number,row:any)=>n+row.count,0)).toBe(recovered.rows.reduce((n:number,row:any)=>n+row.count,0));
    expect(JSON.stringify(erased)).not.toContain(hostedId);
    expect((await site.rows(`SELECT count(*) n FROM list_growth_attribution WHERE contact_id='${hostedId}'`))[0].n).toBe(0);
    expect((await report()).channels.find((row:any)=>row.channel==='email')).toMatchObject({opening:2,net:-1,closing:1});
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});await openPage(page,`${site.runtime.url}/app/insights`);
      const panel=page.locator('section[aria-labelledby="list-growth-title"]');
      // The document can hydrate before this streamed panel. Wait for its
      // client-loaded report so hydration cannot discard the entered dates.
      await expect(panel.getByRole('table',{name:'Subscribed membership totals'})).toBeVisible();
      await panel.getByLabel('From (UTC)').fill(upgrade.from);await panel.getByLabel('Through (UTC)').fill(upgrade.to);
      await panel.getByRole('button',{name:'Apply dates'}).click();
      await expect(panel).toContainText(`Selected period: ${upgrade.from} through ${upgrade.to} (UTC).`);
      await expect(panel.getByRole('table',{name:'Subscribed membership totals'})).toHaveCount(0);
      const rows=panel.getByRole('table',{name:'Daily list growth by source'});
      await expect(rows.locator('tbody tr')).toHaveCount(erased.rows.length);
      await panel.getByRole('button',{name:`Consent version: ${publicEvidence.consent_version}`,exact:true}).first().click();
      await panel.screenshot({path:info.outputPath(`list-growth-history-${width}.png`)});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  } finally {await site.runtime.close();await edge.close();}
});
