import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {eraseHttp} from '../audience-import/erase';
import seed from '../../seed.json' with {type:'json'};
import {providerEdge} from './edge';
import {event,eventSigner} from './sendgrid-events';
import {installation,json,sender,draftCampaign,availableTransport,signedPost,confirmedContact} from './harness';
import {openPage} from '../support/navigation';

test('[CAMP-019] typed email tests enforce restrictions, daily allowance and recorded destinations',async({page},info)=>{
  page.setDefaultTimeout(15000);
  const edge=await providerEdge(),signer=eventSigner(),site=await installation(edge,signer);
  try {
    let cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    const clock=await site.control('/_golive/clock');
    const campaign=await draftCampaign(site,cookie,'Autumn harvest preview',['garden-reader@example.test'],new Date(clock.now+86400000));
    const path=`/api/campaigns/${campaign.campaignId}/test-send`;
    const allowance=async()=> (await json(await site.call(`/api/campaigns/${campaign.campaignId}/test-sends`,{cookie}),200)).allowance;
    const send=(to:string|string[],auth=cookie)=>site.call(path,{method:'POST',cookie:auth,body:{revisionId:campaign.revisionId,channel:'email',to}});
    expect((await send('alice@example.test','')).status).toBe(401);
    expect((await send(Array.from({length:6},(_,i)=>`extra${i}@example.test`))).status).toBe(400);
    expect((await send('not-an-address')).status).toBe(409);
    for(const [kind,email] of [['unsubscribe','declined@example.test'],['spamreport','blocked@example.test']]) {
      const body=Buffer.from(JSON.stringify([event(kind,email,clock.now,'outside-message')]));
      expect(await signedPost(site,'/webhooks/mail/sendgrid',body,signer.headers(body))).toBe(204);
      expect(await json(await send(email),409)).toMatchObject({status:'blocked',blockers:[{detail:expect.stringContaining('unsubscribed or suppressed')}]});
    }
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
      const panel=page.locator('.test-send-panel');await panel.getByRole('button',{name:'Send a test',exact:true}).click();
      await panel.getByLabel('Test destination',{exact:true}).fill(`design${width}@example.test, copy${width}@example.test`);
      const before=await allowance();
      await expect(panel.getByRole('status',{name:'Daily test allowance'})).toContainText(String(before.remaining));
      await availableTransport(site);
      await panel.getByRole('button',{name:'Send test',exact:true}).click();
      await expect(page.getByRole('status').filter({hasText:'The test send was accepted'})).toBeVisible();
      await expect(panel.getByRole('region',{name:'Test send history'})).toContainText(`copy${width}@example.test`);
      expect((await allowance()).remaining).toBe(before.remaining-2);
      await expect(panel.getByRole('status',{name:'Daily test allowance'})).toContainText(String(before.remaining-2));
      await panel.screenshot({path:info.outputPath(`typed-tests-${width}.png`)});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    const sent=edge.sends.filter(item=>item.to.startsWith('design')||item.to.startsWith('copy'));
    expect(sent).toHaveLength(4);
    for(const item of sent) expect(item.body.subject).toContain('MANGO TEST');
    expect(await site.count('recipient_steps')).toBe(0);
    expect((await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200)).campaign.state).toBe('draft');
    const history=await json(await site.call(`/api/campaigns/${campaign.campaignId}/test-sends`,{cookie}),200);
    expect(history.tests.map((item:any)=>item.destination).sort()).toEqual(sent.map(item=>item.to).sort());
    const activityPath=`/api/activity?action=test-send&object=${campaign.revisionId}`;
    const activity=async()=>json(await site.call(activityPath,{cookie}),200);
    const entries=(await activity()).entries;
    expect(entries.map((entry:any)=>entry.detail.destination).sort()).toEqual(sent.map(item=>item.to).sort());
    for(const entry of entries) {
      expect(entry).toMatchObject({actorType:'operator',operatorId:'go-live-owner',objectType:'campaign-revision',objectId:campaign.revisionId,action:'test-send'});
      expect(entry.occurredAt).toBeGreaterThanOrEqual(clock.now);
      expect(entry.occurredAt).toBeLessThanOrEqual((await site.control('/_golive/clock')).now);
    }
    const exportActivity=async()=>{
      const response=await site.call(`/api/activity/export?action=test-send&object=${campaign.revisionId}`,{cookie});
      expect(response.status).toBe(200);return response.text();
    };
    const csv=await exportActivity();
    for(const item of sent)expect(csv).toContain(item.to);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await openPage(page,site.runtime.url+'/app/settings/activity');
      await page.getByLabel('Action',{exact:true}).fill('test-send');
      await page.getByLabel('Object',{exact:true}).fill(campaign.revisionId);
      await page.getByRole('button',{name:'Apply filters',exact:true}).click();
      const region=page.getByRole('region',{name:'Activity entries',exact:true});
      await expect(region).toHaveAttribute('aria-busy','false');
      await expect(region.locator('tbody tr')).toHaveCount(4);
      for(const item of sent)await expect(region).toContainText(item.to);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
      expect((await new AxeBuilder({page}).include('.activity-page').analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
      await page.screenshot({path:info.outputPath(`typed-test-activity-${width}.png`),fullPage:true});
    }
    await site.open('colleague@example.test','colleague');
    await site.runtime.sql("UPDATE oa_operators SET role='member' WHERE id='go-live-owner' RETURNING id");
    cookie=await site.open();
    expect((await send(['forbidden@example.test'])).status).toBe(403);
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
      const panel=page.locator('.test-send-panel');await panel.getByRole('button',{name:'Send a test',exact:true}).click();
      await expect(panel.getByLabel('Configured test destination',{exact:true})).toBeVisible();
      await expect(panel.getByLabel('Test destination',{exact:true})).toHaveCount(0);
      await panel.screenshot({path:info.outputPath(`configured-tests-${width}.png`)});
    }
    await site.runtime.sql("UPDATE oa_operators SET role='owner' WHERE id='go-live-owner' RETURNING id");
    cookie=await site.open();
    edge.loseResponseFor('uncertain-preview@example.test');
    await availableTransport(site);
    const beforeUnknown=await allowance();
    expect(await json(await send(['uncertain-preview@example.test']),200)).toMatchObject({disposition:'handoff-unknown'});
    expect((await allowance()).remaining).toBe(beforeUnknown.remaining-1);
    const day=new Date((await site.control('/_golive/clock')).now).toISOString().slice(0,10);
    await site.runtime.sql(`UPDATE test_send_allowances SET used=${seed.limits.maxTestSendsPerDay-1} WHERE day='${day}' RETURNING used`);
    const beforeRefusal=edge.sends.length;
    const refused=await json(await send(['too-many-a@example.test','too-many-b@example.test']),409);
    expect(refused).toMatchObject({results:[],blockers:[{detail:expect.stringContaining('1 remaining')}]});
    expect(edge.sends).toHaveLength(beforeRefusal);
    expect((await allowance()).remaining).toBe(1);
    await availableTransport(site);
    const competing=await Promise.all([send('last-a@example.test'),send('last-b@example.test')]);
    expect(competing.map(response=>response.status).sort()).toEqual([200,409]);
    expect((await json(await send('tomorrow@example.test'),409)).blockers[0].detail).toContain('Daily test-send allowance');
    expect(edge.sends.filter(item=>item.to.startsWith('last-'))).toHaveLength(1);
    const now=(await site.control('/_golive/clock')).now;
    const midnight=Date.parse(new Date(now).toISOString().slice(0,10))+86400000;
    await site.control('/_golive/clock',{advanceMs:midnight-now+100});
    cookie=await site.open();
    expect((await allowance()).remaining).toBe(seed.limits.maxTestSendsPerDay);
    expect((await send('tester@example.test')).status).toBe(200);
    expect((await allowance()).remaining).toBe(seed.limits.maxTestSendsPerDay-1);
    await availableTransport(site);
    expect((await send(['new-day@example.test'])).status).toBe(200);
    expect((await allowance()).remaining).toBe(seed.limits.maxTestSendsPerDay-2);
    // Erasure redacts a typed destination without removing its actor/time receipt.
    const erasedAddress='design1440@example.test';
    await confirmedContact(site,edge,cookie,erasedAddress,'Synthetic Mango 25');
    const contact=(await site.rows(`SELECT id FROM contacts WHERE email='${erasedAddress}'`))[0];
    expect((await eraseHttp(site,cookie,contact.id)).state).toBe('complete');
    const retained=(await activity()).entries;
    expect(retained).toHaveLength((await json(await site.call(`/api/campaigns/${campaign.campaignId}/test-sends`,{cookie}),200)).tests.length);
    expect(JSON.stringify(retained)).not.toContain(erasedAddress);
    expect(await exportActivity()).not.toContain(erasedAddress);
    expect(retained.find((entry:any)=>entry.id===entries.find((entry:any)=>entry.detail.destination===erasedAddress).id)).toMatchObject({operatorId:'go-live-owner',occurredAt:entries.find((entry:any)=>entry.detail.destination===erasedAddress).occurredAt});
  } finally {await site.runtime.close();await edge.close();}
});
