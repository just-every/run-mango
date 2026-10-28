import type {Response as BrowserResponse} from '@playwright/test';
import {authoredBody} from '../../src/core/features/campaigns/authoring-content';
import {expect,type Page,type TestInfo} from '@playwright/test';
import {createRequire} from 'node:module';
const localRequire=createRequire(import.meta.url);
const axeSource=createRequire(localRequire.resolve('@axe-core/playwright'))('axe-core').source as string;
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
    await confirmedContact(site,edge,cookie,long,'synthetic-mango-172'+'&'.repeat(160));
    const clock=await site.control('/_golive/clock',{hold:true}),due=new Date(clock.now+3600000);
    const draft=await draftCampaign(site,cookie,'synthetic-mango-173',[short],due);
    const emailBody='<h1>Garden news</h1>'+[1,2,3].map(n=>'<p>'+`Garden ${n}: `+'{{displayName | fallback: friend}} '.repeat(80)+'</p>').join('');
    const patch=(body:unknown)=>site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body});
    const measure=(inclusionRuleJson?:string)=>site.call('/api/campaign-authoring/email-size',{method:'POST',cookie,body:{emailBody,preheader:'Seeds, beds and a spring market',physicalAddress:sender.physicalAddress,...(inclusionRuleJson?{inclusionRuleJson,exclusionRulesJson:'[]'}:{})}});
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
    const savedMeter=(response:BrowserResponse)=>{if(response.url()!==site.runtime.url+'/api/campaign-authoring/email-size'||response.request().method()!=='POST')return false;const data=response.request().postDataJSON();return data.campaignId===draft.campaignId&&data.emailBody===before.emailBody&&data.inclusionRuleJson===before.inclusionRuleJson;};
    for(const width of [1440]){
      await page.setViewportSize({width,height:1000});
      const response=page.waitForResponse(savedMeter);
      await openPage(page,`${site.runtime.url}/app/campaigns/${draft.campaignId}/review`);
      expect(await (await response).json()).toMatchObject({htmlBytes:measured.htmlBytes,exceedsLimit:false});
      await expect(page.getByRole('status',{name:'Email sent size'})).toContainText('Sent size upper bound');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.evaluate(axeSource);const audit=await page.evaluate(async()=>(window as any).axe.run(document,{iframes:false}));
      expect(audit.violations.filter((v:any)=>['serious','critical'].includes(v.impact??''))).toEqual([]);
      expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
      await page.locator('.editor-panel').screenshot({path:info.outputPath(`audience-size-${width}.png`)});
      await page.getByRole('button',{name:'HTML mode',exact:true}).click();
      const unsaved=emailBody+'<p>synthetic-mango-174 unsaved audience edit</p>';
      await page.getByRole('textbox',{name:'Email body',exact:true}).fill(unsaved);
      await page.getByRole('button',{name:'Add inclusion condition',exact:true}).click();
      await page.getByRole('combobox',{name:'Include 2 field',exact:true}).selectOption('contact:email');
      await page.getByRole('textbox',{name:'Include 2 value',exact:true}).fill(long);
      const refusal=page.waitForResponse(response=>response.url()===`${site.runtime.url}/api/campaign-revisions/${draft.revisionId}?review=true`&&response.request().method()==='PATCH');
      await page.getByRole('button',{name:'Save full draft',exact:true}).click();
      const refusedResponse=await refusal;expect(refusedResponse.status()).toBe(400);
      const retained=await refusedResponse.json();expect(retained).toMatchObject({error:'email_too_large',size:{exceedsLimit:true}});expect(retained.size.htmlBytes).toBeGreaterThan(retained.size.limitBytes);expect(retained.size.largestBlocks).toHaveLength(3);
      await expect(page.getByRole('textbox',{name:'Email body',exact:true})).toHaveValue(unsaved);
      await expect(page.getByRole('textbox',{name:'Include 2 value',exact:true})).toHaveValue(long);
      expect((await read()).revision).toEqual(before);
      await page.locator('.editor-panel').screenshot({path:info.outputPath(`audience-size-refused-${width}.png`)});
      const restoredMeter=page.waitForResponse(savedMeter);
      await page.getByRole('button',{name:'Discard changes',exact:true}).click();
      expect(await (await restoredMeter).json()).toMatchObject({htmlBytes:measured.htmlBytes,exceedsLimit:false});
      await expect(page.getByRole('textbox',{name:'Email body',exact:true})).toHaveValue(authoredBody(before.emailBody));

    }
    expect(errors).toEqual([]);
    const advisoryBytes=Math.floor(measured.limitBytes*0.95),padding=advisoryBytes-measured.htmlBytes-7;
    const advisoryBody=emailBody+'<p>'+'Synthetic garden notes. '.repeat(Math.ceil(padding/24)).slice(0,padding)+'</p>';
    await json(await patch({emailBody:advisoryBody}),200);
    await json(await site.call(`/api/campaigns/${draft.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:draft.revisionId}}),200);
    const warning=(await read()).checks.find((check:any)=>check.kind==='message.email-size-advisory');expect(warning).toBeTruthy();expect(warning.detail).toContain(`${advisoryBytes} bytes`);expect(warning.findingIdentity).toMatch(/^[a-f0-9]{64}$/);
    await json(await site.call(`/api/campaigns/${draft.campaignId}/checks/${warning.id}/acknowledge`,{method:'POST',cookie,body:{revisionId:draft.revisionId,findingIdentity:warning.findingIdentity}}),200);
    await json(await patch({emailBody}),200);expect((await read()).revision.emailBody).toBe(before.emailBody);
    await approve(site,cookie,draft);
    await site.control('/_golive/clock',{advanceMs:3600001});
    const recipients=await dispatch(site,draft.campaignId,due);
    expect(recipients).toHaveLength(1);expect(recipients[0].transport_disposition).toBe('accepted');expect(recipients[0].email).toBe(short);
    const sends=edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe']);expect(sends).toHaveLength(1);
    for(const send of sends){const html=send.body.content.find((part:any)=>part.type==='text/html').value;expect(Buffer.byteLength(html)).toBeLessThanOrEqual(measured.htmlBytes);expect(html).toContain('Iris &amp; Renée');}
    console.log(`Audience size proof: bound=${measured.htmlBytes}; deployment=${global.htmlBytes}; handoffs=${sends.length}`);
  }finally{await site.runtime.close();await edge.close();}
}
