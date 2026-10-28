import {complianceJourney} from './compliance-journey';
import {test,expect} from '@playwright/test';
import {providerEdge} from './edge';
import {event,eventSigner} from './sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,approve,dispatch,signedPost} from './harness';
import {openPage} from '../support/navigation';

test('[DELIV-005][DELIV-003] signed mailbox outcomes and diagnostic categories survive replay without multiplying clicks',async({page},info)=>{
  const edge=await providerEdge(),signer=eventSigner(),site=await installation(edge,signer);
  try {
    const cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    await json(await site.call('/api/settings/link-hosts',{method:'PUT',cookie,body:{hosts:'mango.example.test,shop.example.test'}}),200);
    expect((await site.call('/api/insights/deliverability')).status).toBe(401);
    const initial=await json(await site.call('/api/insights/deliverability',{cookie}),200);expect(initial.mailboxes.hasSignedOutcomes).toBe(false);
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});await openPage(page,`${site.runtime.url}/app/insights`);
      const section=page.locator('section').filter({has:page.getByRole('heading',{name:'Recipient mailbox providers',exact:true})});
      await expect(section.getByText('Delivery events not connected: no signed email outcomes have been recorded.')).toBeVisible();
      await section.screenshot({path:info.outputPath(`mailbox-empty-${width}.png`)});
      const compliance=page.locator('section').filter({has:page.getByRole('heading',{name:'Bulk-sender compliance',exact:true})});
      if(width===1440){const row=compliance.locator('[data-requirement=complaints]');await expect(row).toHaveAttribute('data-state','unknown');await expect(row).toContainText('delivery events not connected');await expect(row.locator('td').last()).not.toContainText(/\d+(?:\.\d+)?%/);}
      const capture=info.outputPath(`bulk-compliance-unconnected-${width}.png`);
      if(width===1440)await compliance.screenshot({path:capture});
      else {await compliance.locator('[data-requirement=complaints]').scrollIntoViewIfNeeded();await page.screenshot({path:capture});}
    }
    await page.goto('about:blank');

    // Generate per-run destinations; only the local network edge receives mail.
    const syntheticEmail=(domain:string)=>`${crypto.randomUUID()}@${domain}`;
    const cases=[
      {email:syntheticEmail('gmail.com'),classification:'Invalid Address',reason:'550 5.1.1 User unknown',category:'invalid-address',provider:'Gmail'},
      {email:syntheticEmail('outlook.com'),classification:'Mailbox Unavailable',reason:'552 5.2.2 Mailbox full',category:'mailbox-full',provider:'Outlook and Hotmail'},
      {email:syntheticEmail('yahoo.com'),classification:'Blocked',reason:'550 5.7.1 Policy block',category:'policy-block',provider:'Yahoo and AOL'},
      {email:syntheticEmail('icloud.com'),classification:'Reputation',reason:'550 Reputation blocked',category:'reputation',provider:'Apple iCloud'},
      {email:syntheticEmail('newsletter.example.test'),classification:'Content',reason:'550 Content rejected',category:'content',provider:'Other'},
      {email:syntheticEmail('googlemail.com'),classification:'Technical Failure',reason:'451 Provider technical fault',category:'other',provider:'Gmail'},
    ];
    const reader=syntheticEmail('gmail.com'),emails=[...cases.map(row=>row.email),reader];
    for(const email of emails)await confirmedContact(site,edge,cookie,email,email.split('@')[0]);
    const clock=await site.control('/_golive/clock',{hold:true}),due=new Date(clock.now+3600000);
    const campaign=await draftCampaign(site,cookie,'Autumn market newsletter',emails,due);
    await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body:{emailBody:'<p>See you at the <a href="https://shop.example.test/market">autumn market</a>.</p>',trackingEnabled:true}}),200);
    await approve(site,cookie,campaign);await site.control('/_golive/clock',{advanceMs:3600001,hold:false});
    await dispatch(site,campaign.campaignId,due);
    const sent=(email:string)=>edge.sends.findLast(row=>row.to===email&&row.body.headers?.['List-Unsubscribe'])!;
    const now=(await site.control('/_golive/clock',{advanceMs:1000})).now;
    const batch=Buffer.from(JSON.stringify([
      ...cases.map(row=>event('bounce',row.email,now,sent(row.email).messageId,sent(row.email).body.personalizations[0].custom_args,{type:'bounce',bounce_classification:row.classification,reason:row.reason,status:row.reason.match(/\d\.\d\.\d/)?.[0]})),
      event('delivered',reader,now,sent(reader).messageId,sent(reader).body.personalizations[0].custom_args),
      event('spamreport',reader,now+1,sent(reader).messageId,sent(reader).body.personalizations[0].custom_args),
    ]));
    await site.control('/_golive/clock',{advanceMs:1000});
    const headers=signer.headers(batch,String(Math.floor(now/1000)));
    expect(await signedPost(site,'/webhooks/mail/sendgrid',batch,headers)).toBe(204);
    const sentHtml=sent(reader).body.content.find((part:any)=>part.type==='text/html').value;
    const tracked=/href="(https:\/\/[^" ]+\/l\/[^" ]+)"/.exec(sentHtml)![1].replaceAll('&amp;','&');
    for(let i=0;i<2;i++)expect((await site.call(new URL(tracked).pathname,{headers:{'User-Agent':'Mozilla/5.0 Mango reader'}})).status).toBe(302);
    expect((await site.call(new URL(tracked).pathname,{headers:{'User-Agent':'Proofpoint URL scanner'}})).status).toBe(302);
    const report=await json(await site.call('/api/insights/deliverability',{cookie}),200);
    const byProvider=(name:string)=>report.mailboxes.rows.find((row:any)=>row.provider===name);
    expect(byProvider('Gmail')).toMatchObject({delivered:1,bounced:2,complained:1,clicked:1,clicks:2});
    for(const row of cases)expect(byProvider(row.provider).bounceReasons[row.category]).toBe(1);
    for(const row of report.mailboxes.rows)expect(Object.values(row.bounceReasons).reduce((a:any,b:any)=>a+b,0)).toBe(row.bounced);
    expect(JSON.stringify(report.mailboxes)).not.toContain(reader);
    expect(await signedPost(site,'/webhooks/mail/sendgrid',batch,headers)).toBe(204);
    expect((await json(await site.call('/api/insights/deliverability',{cookie}),200)).mailboxes.rows).toEqual(report.mailboxes.rows);
    const diagnostics=await site.rows("SELECT detail_json FROM delivery_facts WHERE kind='bounced'");expect(diagnostics.some(row=>JSON.parse(row.detail_json).reason==='552 5.2.2 Mailbox full')).toBe(true);
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});await openPage(page,`${site.runtime.url}/app/insights`);
      const section=page.locator('section').filter({has:page.getByRole('heading',{name:'Recipient mailbox providers',exact:true})});
      await expect(section.getByRole('table',{name:'Recipient mailbox outcomes',exact:true})).toBeVisible();
      const gmail=section.getByRole('table',{name:'Recipient mailbox outcomes',exact:true}).getByRole('row').filter({has:page.getByRole('rowheader',{name:'Gmail',exact:true})});
      await expect(gmail.locator('td')).toHaveText(['1','2','1','1','2']);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await section.scrollIntoViewIfNeeded();await page.waitForLoadState('networkidle');await section.screenshot({path:info.outputPath(`mailbox-providers-${width}.png`)});
    }
    await complianceJourney(page,info,site,cookie,signer,campaign.revisionId);
    expect(edge.unexpected).toEqual([]);
  } finally {await site.runtime.close();await edge.close();}
});
