import {test,expect} from '@playwright/test';
import seed from '../../seed.json' with {type:'json'};
import {providerEdge} from './edge';
import {event,eventSigner} from './sendgrid-events';
import {installation,json,sender,draftCampaign,availableTransport,signedPost} from './harness';
import {openPage} from '../support/navigation';

test('[CAMP-019] typed email tests enforce restrictions, daily allowance and recorded destinations',async({page},info)=>{
  const edge=await providerEdge(),signer=eventSigner(),site=await installation(edge,signer);
  try {
    let cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    const clock=await site.control('/_golive/clock');
    const campaign=await draftCampaign(site,cookie,'Autumn harvest preview',['garden-reader@example.test'],new Date(clock.now+86400000));
    const path=`/api/campaigns/${campaign.campaignId}/test-send`;
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
      await availableTransport(site);
      await panel.getByRole('button',{name:'Send test',exact:true}).click();
      await expect(page.getByRole('status').filter({hasText:'The test send was accepted'})).toBeVisible();
      await expect(panel.getByRole('region',{name:'Test send history'})).toContainText(`copy${width}@example.test`);
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
    await site.open('colleague@example.test','colleague');
    await site.runtime.sql("UPDATE oa_operators SET role='member' WHERE id='go-live-owner' RETURNING id");
    expect((await send(['forbidden@example.test'],await site.open())).status).toBe(403);
    await site.runtime.sql("UPDATE oa_operators SET role='owner' WHERE id='go-live-owner' RETURNING id");
    cookie=await site.open();
    const day=new Date((await site.control('/_golive/clock')).now).toISOString().slice(0,10);
    await site.runtime.sql(`UPDATE test_send_allowances SET used=${seed.limits.maxTestSendsPerDay-1} WHERE day='${day}' RETURNING used`);
    await availableTransport(site);
    const competing=await Promise.all([send('last-a@example.test'),send('last-b@example.test')]);
    expect(competing.map(response=>response.status).sort()).toEqual([200,409]);
    expect((await json(await send('tomorrow@example.test'),409)).blockers[0].detail).toContain('Daily test-send allowance');
    expect(edge.sends.filter(item=>item.to.startsWith('last-'))).toHaveLength(1);
  } finally {await site.runtime.close();await edge.close();}
});
