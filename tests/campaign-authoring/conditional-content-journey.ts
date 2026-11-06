import {conditionalPrivacyJourney} from './conditional-privacy-journey';
import {conditionalSourcesJourney} from './conditional-sources-journey';
import {expect,type Page,type TestInfo} from '@playwright/test';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,approve,dispatch} from '../go-live/harness';
import {openPage,reloadPage} from '../support/navigation';

export async function conditionalContentJourney(page:Page,info:TestInfo) {
  page.setDefaultTimeout(15000);
  const mark=(phase:string)=>console.log('Conditional content: '+phase);
  mark('start');
  const edge=await providerEdge(),site=await installation(edge,eventSigner(),{reuseEmptySchema:true});
  try {
    mark('native runtime ready');
    const cookie=await site.open(),address=(n:number)=>['synthetic-mango-'+n,'example.test'].join('@');
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);await site.control('/_golive/sender-evidence');
    const vip=address(501),regular=address(502);
    for(const [email,name] of [[vip,'Synthetic VIP'],[regular,'Synthetic reader']])await confirmedContact(site,edge,cookie,email,name);
    const contacts=(await json(await site.call('/api/audience',{cookie}),200)).contacts;
    const vipId=contacts.find((c:any)=>c.email===vip).id,regularId=contacts.find((c:any)=>c.email===regular).id;
    await json(await site.call('/api/settings/properties',{method:'POST',cookie,body:{key:'vip',label:'VIP',type:'boolean'}}),201);
    for(const [id,value] of [[vipId,true],[regularId,false]])await json(await site.call(`/api/contacts/${id}/properties`,{method:'PUT',cookie,body:{fields:{vip:value}}}),200);
    const segment=(await json(await site.call('/api/audience/segments',{method:'POST',cookie,body:{name:'Synthetic VIP readers',inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'property',property:'vip',comparator:'eq',value:true}]}),exclusionRulesJson:'[]'}}),201)).segment;
    const clock=await site.control('/_golive/clock',{hold:true}),due=new Date(clock.now+3600000);
    const draft=await draftCampaign(site,cookie,'Synthetic conditional letter',[vip,regular],due);
    await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body:{emailBody:''}}),200);
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.setViewportSize({width:1440,height:1000});await openPage(page,`${site.runtime.url}/app/campaigns/${draft.campaignId}/review`);
    await page.getByRole('button',{name:'Block builder',exact:true}).click();await page.getByRole('button',{name:'Add block',exact:true}).click();
    await page.getByRole('textbox',{name:'Block text',exact:true}).fill('VIP early access to the garden');
    await page.getByRole('combobox',{name:'Show block',exact:true}).selectOption('conditional');
    await page.getByLabel('Condition key',{exact:true}).fill(segment.id);
    await page.getByRole('textbox',{name:'Otherwise text',exact:true}).fill('Explore the garden collection');
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
    mark('saved conditional block');
    const saved=(await json(await site.call(`/api/campaigns/${draft.campaignId}`,{cookie}),200)).revision;
    await reloadPage(page);await page.getByRole('button',{name:'Block builder',exact:true}).click();await page.getByRole('button',{name:'Block 1: text',exact:true}).click();
    await expect(page.getByLabel('Condition key',{exact:true})).toHaveValue(segment.id);
    await expect(page.getByRole('textbox',{name:'Otherwise text',exact:true})).toHaveValue('Explore the garden collection');
    mark('reopened conditional block');
    const previews=page.getByRole('region',{name:'Saved revision previews',exact:true}),html=page.frameLocator('iframe[title="Saved email preview"]'),plain=previews.locator('.message-preview--plain');
    await previews.getByText('Preview as a contact',{exact:true}).click();await previews.getByLabel('Contact email or phone',{exact:true}).fill('synthetic-mango-50');await previews.getByRole('button',{name:'Find preview contact',exact:true}).click();
    const select=previews.getByRole('combobox',{name:'Preview contact',exact:true});await expect(select.getByRole('option')).toHaveCount(3);
    const check=async(id:string,shown:string,hidden:string)=>{await select.selectOption(id);await expect(html.getByText(shown,{exact:true})).toBeVisible();await expect(html.getByText(hidden,{exact:true})).toHaveCount(0);await expect(plain).toContainText(shown);await expect(plain).not.toContainText(hidden);};
    await check(vipId,'VIP early access to the garden','Explore the garden collection');
    await check(regularId,'Explore the garden collection','VIP early access to the garden');
    await previews.getByRole('combobox',{name:'Preview conditional branch',exact:true}).selectOption('match:0');await expect(html.getByText('VIP early access to the garden',{exact:true})).toBeVisible();await expect(plain).toContainText('VIP early access to the garden');await expect(plain).not.toContainText('Explore the garden collection');
    await previews.getByRole('combobox',{name:'Preview conditional branch',exact:true}).selectOption('otherwise:0');await expect(html.getByText('Explore the garden collection',{exact:true})).toBeVisible();await expect(plain).toContainText('Explore the garden collection');await expect(plain).not.toContainText('VIP early access to the garden');
    await previews.getByRole('combobox',{name:'Preview conditional branch',exact:true}).selectOption('contact');await check(vipId,'VIP early access to the garden','Explore the garden collection');
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.getByRole('region',{name:'Email blocks',exact:true}).screenshot({path:info.outputPath(`conditional-editor-${width}.png`)});
      await previews.screenshot({path:info.outputPath(`conditional-preview-${width}.png`)});
    }
    // Current values are re-read through the authenticated door. No cached VIP
    // membership becomes delivery authority, and missing contact IDs disclose nothing.
    expect((await site.call(`/api/contacts/${vipId}/content-context?revisionId=${draft.revisionId}`)).status).toBe(401);
    expect((await site.call('/api/contacts/synthetic-mango-missing/content-context',{cookie})).status).toBe(404);
    // A draft cannot conditionally remove either mandatory compliance element.
    for(const token of ['{{physical_address}}','{{unsubscribe_url}}']) {
      const body=saved.emailBody.replace('VIP early access to the garden',token);
      expect((await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body:{emailBody:body}})).status).toBe(400);
    }
    // Save a second, property-based block without an otherwise alternative.
    await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Add block',exact:true}).click();await page.getByRole('textbox',{name:'Block text',exact:true}).fill('VIP shipping included');await page.getByRole('combobox',{name:'Show block',exact:true}).selectOption('conditional');await page.getByRole('combobox',{name:'Condition source',exact:true}).selectOption('property');await page.getByLabel('Condition key',{exact:true}).fill('vip');
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
    await select.selectOption(regularId);await expect(html.getByText('Explore the garden collection',{exact:true})).toBeVisible();await expect(html.getByText('VIP shipping included',{exact:true})).toHaveCount(0);await expect(plain).not.toContainText('VIP shipping included');
    await select.selectOption(vipId);await expect(html.getByText('VIP shipping included',{exact:true})).toBeVisible();await expect(plain).toContainText('VIP shipping included');
    const source=await conditionalSourcesJourney(page,site,cookie,draft,vipId,regularId);
    mark('previews complete; approve and deliver');
    await approve(site,cookie,draft);
    await site.control('/_golive/clock',{advanceMs:due.getTime()-clock.now+1000,hold:false});await dispatch(site,draft.campaignId,due);
    const sends=edge.sends.filter(send=>send.body.subject==='Synthetic conditional letter: what is growing this month');expect(sends).toHaveLength(2);
    for(const [email,shown,hidden] of [[vip,'VIP early access to the garden','Explore the garden collection'],[regular,'Explore the garden collection','VIP early access to the garden']]) {
      const send=sends.find(s=>s.to===email)!;expect(send).toBeTruthy();
      for(const part of send.body.content){expect(part.value).toContain(shown);expect(part.value).not.toContain(hidden);expect(part.value).not.toContain('data-mango-condition');expect(part.value).not.toContain('data-mango-branch');}
      for(const part of send.body.content){
        expect(part.value.includes('VIP shipping included')).toBe(email===vip);
        expect(part.value).toContain('Newsletter growing tips');
        expect(part.value).toContain(email===vip?'Champion garden preview':'First season garden notes');
        expect(part.value).toContain(email===vip?'Order bonus: seed packet':'Browse seed packets');
        expect(part.value).not.toContain(email===vip?'First season garden notes':'Champion garden preview');
        expect(part.value).not.toContain(email===vip?'Browse seed packets':'Order bonus: seed packet');
      }
    }
    await conditionalPrivacyJourney(site,cookie,draft,vipId,regularId,source);
    console.log('PROBE BUILD-005 1: saved block, chosen VIP and ordinary contact previews, branch previews, and native delivery -> matching HTML and plain text; hidden block omitted for ordinary recipient');
  } finally {await site.runtime.close();await edge.close();}
}
