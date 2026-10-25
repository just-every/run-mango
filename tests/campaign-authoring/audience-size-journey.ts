import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,approve,dispatch,rule} from '../go-live/harness';
import {openPage} from '../support/navigation';

/** Saved selection, refusal and frozen approval all bound the actual provider hand-off. */
export async function audienceSizeJourney(page:Page,info:TestInfo){
  const edge=await providerEdge(),site=await installation(edge,eventSigner());
  try{
    const cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    const short='synthetic-mango-171@example.test',long='synthetic-mango-172@example.test';
    await confirmedContact(site,edge,cookie,short,'Iris & Renée');
    await confirmedContact(site,edge,cookie,long,'synthetic-mango-172');
    // Arrange a recorded extreme name without bypassing any save or approval door.
    await site.runtime.sql(`UPDATE contacts SET display_name='${'&'.repeat(180)}' WHERE email='${long}'`);
    const clock=await site.control('/_golive/clock',{hold:true}),due=new Date(clock.now+3600000);
    const draft=await draftCampaign(site,cookie,'synthetic-mango-173',[short],due);
    const emailBody='<h1>Garden news</h1>'+[1,2,3].map(n=>'<p>'+`Garden ${n}: `+'{{displayName | fallback: friend}} '.repeat(80)+'</p>').join('');
    const patch=(body:unknown)=>site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body});
    const measure=(inclusionRuleJson?:string)=>site.call('/api/campaign-authoring/email-size',{method:'POST',cookie,body:{emailBody,physicalAddress:sender.physicalAddress,...(inclusionRuleJson?{inclusionRuleJson,exclusionRulesJson:'[]'}:{})}});
    const global=await json(await measure(),200);expect(global.exceedsLimit).toBe(true);
    await json(await patch({emailBody}),200);
    const read=async()=>json(await site.call(`/api/campaigns/${draft.campaignId}`,{cookie}),200);
    const before=(await read()).revision;
    const measured=await json(await measure(rule([short])),200);
    expect(measured.exceedsLimit).toBe(false);expect(measured.htmlBytes).toBeLessThan(global.htmlBytes);
    const refused=await json(await patch({inclusionRuleJson:rule([short,long]),emailBody}),400);
    expect(refused).toMatchObject({error:'email_too_large',size:{exceedsLimit:true,limitBytes:measured.limitBytes}});
    expect(refused.size.htmlBytes).toBeGreaterThan(refused.size.limitBytes);
    expect(refused.size.largestBlocks).toHaveLength(3);
    for(const block of refused.size.largestBlocks)expect(refused.detail).toContain(`${block.location}: ${block.bytes} bytes`);
    expect(refused.detail).toContain(`${refused.size.htmlBytes} bytes`);expect(refused.detail).toContain(`${refused.size.limitBytes} bytes`);
    expect((await read()).revision).toEqual(before);
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:1000});
      const response=page.waitForResponse(r=>r.url().endsWith('/api/campaign-authoring/email-size')&&r.request().method()==='POST');
      await openPage(page,`${site.runtime.url}/app/campaigns/${draft.campaignId}/review`);
      expect(await (await response).json()).toMatchObject({htmlBytes:measured.htmlBytes,exceedsLimit:false});
      await expect(page.getByRole('status',{name:'Email sent size'})).toContainText('Sent size upper bound');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect((await new AxeBuilder({page}).exclude('iframe').analyze()).violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
      await page.locator('.editor-panel').screenshot({path:info.outputPath(`audience-size-${width}.png`)});
    }
    expect(errors).toEqual([]);
    await approve(site,cookie,draft);
    await site.control('/_golive/clock',{advanceMs:3600001});
    const recipients=await dispatch(site,draft.campaignId,due);
    expect(recipients).toHaveLength(1);expect(recipients[0].transport_disposition).toBe('accepted');expect(recipients[0].email).toBe(short);
    const sends=edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe']);expect(sends).toHaveLength(1);
    for(const send of sends){const html=send.body.content.find((part:any)=>part.type==='text/html').value;expect(Buffer.byteLength(html)).toBeLessThanOrEqual(measured.htmlBytes);expect(html).toContain('Iris &amp; Renée');}
    console.log(`Audience size proof: bound=${measured.htmlBytes}; deployment=${global.htmlBytes}; handoffs=${sends.length}`);
  }finally{await site.runtime.close();await edge.close();}
}
