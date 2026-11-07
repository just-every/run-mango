import {expect,type Page,type TestInfo} from '@playwright/test';
import {providerEdge} from '../go-live/edge';
import {sourceEdge,syncSource} from '../go-live/source-edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {installation,json,sender,confirmedContact} from '../go-live/harness';
import {openPage} from '../support/navigation';

const address=(name:string)=>[name,'example.test'].join('@');

/** Only paid AI, commerce, DNS and mail boundaries are doubled. */
export async function ownerControlBrowser(page:Page,info:TestInfo) {
  page.setDefaultTimeout(30000);
  const edge=await providerEdge({...sourceEdge(),async incumbent(url,request,response){
    if(url.hostname!=='api.openai.com')return false;
    let raw='';for await(const chunk of request)raw+=chunk;
    const evidence=JSON.parse(JSON.parse(raw).input),item=evidence.items[0],at=Date.parse(evidence.now);
    const claim={text:item.allowedClaim,citations:[{key:item.key,observedValueJson:item.observedValueJson}]};
    const output={summary:claim,audience:{inclusion:{version:1,operator:'all',predicates:[{sourceType:'contact',field:'email',comparator:'contains',value:'@example.test',lookbackDays:null}]},exclusions:[],explanation:claim},
      email:{subject:'Synthetic Mango harvest letter',html:'<p>Choose a fresh planter for your spring garden.</p>',text:'Choose a fresh planter for your spring garden.',preheader:'A garden update'},sms:null,
      sender:{...sender,smsSender:'MANGO'},messageCategory:'newsletter',links:[],steps:[{channel:'email',scheduledAt:new Date(at+3600000).toISOString(),sendByAt:new Date(at+7200000).toISOString(),timezone:'Australia/Brisbane',whyThisTime:claim}],forecast:null};
    response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify({output_text:JSON.stringify(output),usage:{total_tokens:100}}));return true;
  }});
  const site=await installation(edge,eventSigner(),{commerce:true,ai:true,networkHosts:['api.openai.com']});
  try {
    console.log('Owner control browser: runtime ready');
    const owner=await site.open();
    const approver=await site.open(address('synthetic-mango-207'),'synthetic-mango-207');
    await site.runtime.sql("UPDATE oa_operators SET display_name=CASE id WHEN 'go-live-owner' THEN 'Jordan Green' ELSE 'Casey River' END RETURNING id");
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie:owner,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    await confirmedContact(site,edge,owner,address('synthetic-mango-208'),'Leila Garden');
    await syncSource(site,owner,'product');
    await page.context().setExtraHTTPHeaders({Cookie:owner});
    await openPage(page,site.runtime.url+'/app/settings');
    await page.getByLabel('Required approver',{exact:true}).selectOption('synthetic-mango-207');
    await expect(page.getByRole('region',{name:'Campaign activation approval'})).toContainText('Casey River');
    await screens('policy-settings');
    console.log('Owner control browser: named-person policy saved');
    const credential=await json(await site.call('/api/settings/integrations',{method:'POST',cookie:owner,body:{name:'Synthetic Mango gardener',scopes:['contacts:read','contacts:write','campaigns:send']}}),201);
    const machine=async(path:string,body:unknown,method='POST')=>site.call(path,{method,headers:{Authorization:`Bearer ${credential.token}`},body});
    const contact=await json(await machine('/api/integrations/v1/contacts',{email:address('synthetic-mango-208'),displayName:'Leila Garden',segmentName:'Synthetic Mango harvest readers'},'PUT'),200);
    const segmentId=contact.contact.segmentIds[0];
    const segment=(await site.rows(`SELECT inclusion_rule_json AS rule FROM audience_segments WHERE id='${segmentId}'`))[0];
    const generated=await json(await site.call('/api/proposals/generate',{method:'POST',cookie:owner,body:{}}),201);
    await json(await site.call(`/api/proposals/${generated.proposalId}/adopt`,{method:'POST',cookie:owner,body:{}}),200);
    await json(await site.call(`/api/campaign-revisions/${generated.revisionId}`,{method:'PATCH',cookie:owner,body:{name:'Spring garden harvest',inclusionRuleJson:segment.rule}}),200);
    const held=await json(await machine(`/api/integrations/v1/campaigns/${generated.campaignId}/send`,{revisionId:generated.revisionId,segmentId}),202);
    expect(held.status).toBe('held');
    await page.context().setExtraHTTPHeaders({Cookie:approver});
    await openPage(page,site.runtime.url+`/app/campaigns/${generated.campaignId}/review`);
    await expect(page.getByRole('region',{name:'Company activation approval'})).toContainText('Synthetic Mango gardener');
    await expect(page.getByRole('button',{name:'Approve & schedule',exact:true})).toBeEnabled();
    await screens('held-review');
    console.log('Owner control browser: held revision reviewed');
    await page.getByRole('button',{name:'Approve & schedule',exact:true}).click();
    await page.getByRole('alertdialog').getByRole('button',{name:'Approve & schedule',exact:true}).click();
    await expect(page.getByRole('link',{name:'View schedule and results',exact:true})).toBeVisible();
    await screens('approved-review');
    const approved=await json(await site.call(`/api/campaigns/${generated.campaignId}`,{cookie:approver}),200);
    expect(approved.revision).toMatchObject({state:'approved',approvedByOperatorId:'synthetic-mango-207',emailSubject:'Synthetic Mango harvest letter'});
    expect(edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe'])).toHaveLength(0);
    expect(edge.unexpected).toEqual([]);
    console.log('PROBE PROP-005 browser: Owner selects named approver in Settings; generated draft held at machine door; named person reviews and approves -> exact revision scheduled, Settings and review states at 1440 and 390');
    async function screens(name:string) {
      for(const width of [1440,390]) {
        await page.setViewportSize({width,height:width===390?844:1000});
        await expect(page.locator('main h1').first()).toBeVisible();
        expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        await page.screenshot({path:info.outputPath(`owner-control-${name}-${width}.png`),fullPage:true});
        if(name==='policy-settings')await page.getByRole('region',{name:'Campaign activation approval'}).screenshot({path:info.outputPath(`owner-control-${name}-panel-${width}.png`)});
        else if(name==='held-review')await page.getByRole('region',{name:'Company activation approval'}).screenshot({path:info.outputPath(`owner-control-${name}-panel-${width}.png`)});
        else {await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath(`owner-control-${name}-viewport-${width}.png`)});}
      }
    }
  } finally {await page.context().setExtraHTTPHeaders({});await site.runtime.close();await edge.close();}
}
