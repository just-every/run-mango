import {expect} from '@playwright/test';
import {contract} from '../contract.js';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,approve,dispatch} from './harness';
import {openPage,reloadPage} from '../support/navigation';

contract('BUILD-012','large newsletters save by transmitted bytes, retain refused edits and recheck expansion at handoff',async({page},info)=>{
  const edge=await providerEdge(),site=await installation(edge,eventSigner());
  try {
    const cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    await json(await site.call('/api/settings/link-hosts',{method:'PUT',cookie,body:{hosts:'shop.example.test'}}),200);
    const email='summer-reader@example.test',name='Iris & Renée <Garden>';
    await confirmedContact(site,edge,cookie,email,name);
    const clock=await site.control('/_golive/clock',{hold:true}),due=new Date(clock.now+3600000);
    const campaign=await draftCampaign(site,cookie,'Summer garden journal',[email],due);
    const patch=(body:unknown)=>site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body});
    const body='<h1>Summer garden journal</h1><p>Hello {{displayName | fallback: Garden friend}}</p>'+('<p>Garden notes: herbs, seedlings and the summer market. </p>'.repeat(500))+'<p><a href="https://shop.example.test/market">Market details</a></p>';
    await json(await patch({emailBody:body,trackingEnabled:true}),200);
    const detail=await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);
    expect(detail.revision.emailBody.length).toBeGreaterThan(20000);
    const measured=await json(await site.call('/api/campaign-authoring/email-size',{method:'POST',cookie,body:{emailBody:body,preheader:detail.revision.preheader,physicalAddress:sender.physicalAddress,trackingEnabled:true}}),200);
    expect(measured.exceedsLimit).toBe(false);
    expect(measured.largestBlocks.length).toBeGreaterThan(0);
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
      await page.getByRole('button',{name:'HTML mode',exact:true}).click();
      await expect(page.getByRole('textbox',{name:'Email body',exact:true})).toHaveValue(body);
      await expect(page.getByRole('status',{name:'Email sent size'})).toContainText('Sent size upper bound');
      await page.locator('.editor-panel').screenshot({path:info.outputPath(`large-email-${width}.png`)});
      await page.getByRole('status',{name:'Email sent size'}).screenshot({path:info.outputPath(`email-size-meter-${width}.png`)});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    const oversized='<h1>Summer garden journal</h1><p>'+'🌱'.repeat(28160)+'</p>';
    const refused=await json(await patch({emailBody:oversized}),400);
    expect(refused).toMatchObject({error:'email_too_large',size:{exceedsLimit:true}});
    expect(refused.detail).toContain('Largest blocks');
    expect(refused.size.htmlBytes).toBeGreaterThan(refused.size.limitBytes);
    expect((await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200)).revision.emailBody).toBe(detail.revision.emailBody);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await page.getByRole('textbox',{name:'Email body',exact:true}).fill(oversized);
      await page.getByRole('button',{name:'Save full draft',exact:true}).click();
      await expect(page.getByText(/Email is too large\./).first()).toBeVisible();
      await expect(page.getByRole('textbox',{name:'Email body',exact:true})).toHaveValue(oversized);
      await page.locator('.editor-panel').screenshot({path:info.outputPath(`email-refused-${width}.png`)});
    }
    await page.getByRole('textbox',{name:'Email body',exact:true}).fill(body);
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();
    await expect(page.getByText('Draft saved. Preview and checks are up to date.',{exact:true})).toBeVisible();
    await approve(site,cookie,campaign);
    await site.control('/_golive/clock',{advanceMs:3600001});
    const recipients=await dispatch(site,campaign.campaignId,due);
    expect(recipients[0].transport_disposition).toBe('accepted');
    const sent=edge.sends.findLast(send=>send.body.headers?.['List-Unsubscribe']);
    const html=sent!.body.content.find((part:any)=>part.type==='text/html').value;
    expect(Buffer.byteLength(html)).toBeLessThanOrEqual(measured.htmlBytes);
    expect(html).toContain('Iris &amp; Renée &lt;Garden&gt;');
    expect(html).toContain('/l/');
    expect(html).not.toContain('{{');
    // A new saved name after approval must not allow an oversized handoff.
    await site.control('/_golive/clock',{advanceMs:25*3600000});
    await site.control('/_golive/sender-evidence');
    const nextClock=await site.control('/_golive/clock'),nextDue=new Date(nextClock.now+3600000);
    const next=await draftCampaign(site,cookie,'Personal garden journal',[email],nextDue);
    await json(await site.call(`/api/campaign-revisions/${next.revisionId}`,{method:'PATCH',cookie,body:{emailBody:'<p>'+'{{displayName | fallback: friend}} '.repeat(1000)+'</p>'}}),200);
    await approve(site,cookie,next);
    // Fresh affirmative evidence changes the name, then the same reader confirms it.
    await site.control('/_golive/clock',{advanceMs:10000});
    await confirmedContact(site,edge,cookie,email,'A very long garden reader name & family '.repeat(4));
    await site.control('/_golive/clock',{advanceMs:3600001});
    const skipped=await dispatch(site,next.campaignId,nextDue);
    expect(skipped[0]).toMatchObject({transport_disposition:'skipped',skip_reason:'email-too-large'});
    expect(edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe'])).toHaveLength(1);
  } finally {await page.close();await site.runtime.close();await edge.close();}
});
