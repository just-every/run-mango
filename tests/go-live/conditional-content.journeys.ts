import {test,expect,type Page} from '@playwright/test';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,approve,dispatch} from './harness';
import {openPage} from '../support/navigation';

const vipOnly='VIP early access to the seed beds.',otherwise='Join the garden club for early access.';
const preview=async(page:Page,address:string)=>{
  const details=page.locator('details').filter({hasText:'Preview as a contact'});
  if(!await details.getByLabel('Contact email or phone').isVisible())await details.locator('summary').click();
  await details.getByLabel('Contact email or phone').fill(address);
  await details.getByRole('button',{name:'Find preview contact',exact:true}).click();
  const choice=details.getByLabel('Preview contact',{exact:true});
  await choice.selectOption(await choice.locator('option',{hasText:address}).getAttribute('value'));
};

test('[BUILD-005] a VIP-only block shows in the preview as a VIP contact and not as another, and each recipient receives HTML and plain text that agree',async({page},info)=>{
  const edge=await providerEdge(),site=await installation(edge,eventSigner());
  try {
    const cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    await json(await site.call('/api/settings/properties',{method:'POST',cookie,body:{key:'synthetic_mango_tier',label:'Synthetic tier',type:'text',options:[]}}),201);
    const vip='vip@example.test',other='reader@example.test';
    await confirmedContact(site,edge,cookie,vip,'Vera Vip');
    await confirmedContact(site,edge,cookie,other,'Rory Reader');
    const contact=async(email:string)=>(await json(await site.call('/api/contacts/search?address='+encodeURIComponent(email),{cookie}),200)).contacts.find((c:any)=>c.email===email);
    await json(await site.call(`/api/contacts/${(await contact(vip)).id}/properties`,{method:'PUT',cookie,body:{fields:{synthetic_mango_tier:'vip'}}}),200);
    console.log('step 0');
    const clock=await site.control('/_golive/clock',{hold:true}),due=new Date(clock.now+3600000);
    const campaign=await draftCampaign(site,cookie,'Conditional garden letter',[vip,other],due);
    await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body:{emailBody:''}}),200);

    console.log('step 1');
    // Author the blocks in the builder: a block for everyone, a VIP-only block and its otherwise block.
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.setViewportSize({width:1440,height:1000});
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
    await page.getByRole('button',{name:'Block builder',exact:true}).click();
    const add=async(text:string)=>{await page.getByRole('combobox',{name:'Block kind',exact:true}).selectOption('text');await page.getByRole('button',{name:'Add block',exact:true}).click();await page.getByRole('textbox',{name:'Block text',exact:true}).fill(text);};
    await add('Spring is here at the market.');
    console.log('step 2');
    await add(vipOnly);
    const conditional=page.getByRole('group',{name:'Conditional display'}).or(page.locator('fieldset').filter({hasText:'Conditional display'}));
    await conditional.getByLabel('Property',{exact:true}).selectOption('synthetic_mango_tier');
    await conditional.getByLabel('Value',{exact:true}).fill('vip');
    await conditional.getByRole('button',{name:'Show only to this condition',exact:true}).click();
    await expect(conditional).toContainText('Shown only to contacts who match');
    console.log('step 3');
    await conditional.getByRole('button',{name:'Add otherwise block',exact:true}).click();
    await page.getByRole('button',{name:/^Block 3:/}).click();
    await page.getByRole('textbox',{name:'Block text',exact:true}).fill(otherwise);
    await expect(page.locator('fieldset').filter({hasText:'Conditional display'})).toContainText('do not match');
    console.log('step 4');
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();

    // Preview as the VIP contact, then as another contact: HTML and plain text agree in each.
    const frame=page.frameLocator('iframe[title="Saved email preview"]').locator('body'),plain=page.locator('.message-preview--plain');
    console.log('step 5');
    await preview(page,vip);
    await expect(frame).toContainText(vipOnly);await expect(plain).toContainText(vipOnly);
    await expect(frame).not.toContainText(otherwise);await expect(plain).not.toContainText(otherwise);
    await page.locator('.message-preview--email').screenshot({path:info.outputPath('conditional-preview-vip-1440.png')});
    console.log('step 6');
    await preview(page,other);
    await expect(frame).toContainText(otherwise);await expect(plain).toContainText(otherwise);
    await expect(frame).not.toContainText(vipOnly);await expect(plain).not.toContainText(vipOnly);
    // Each branch can also be previewed without choosing a contact.
    await page.getByRole('button',{name:'Every condition met',exact:true}).click();
    await expect(frame).toContainText(vipOnly);await expect(plain).toContainText(vipOnly);await expect(plain).not.toContainText(otherwise);
    await page.setViewportSize({width:390,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.locator('.message-preview--email').screenshot({path:info.outputPath('conditional-preview-390.png')});
    await page.setViewportSize({width:1440,height:1000});

    // Delivery makes the same choice per recipient, in both parts of the message.
    console.log('step 7');
    await approve(site,cookie,campaign);
    await site.control('/_golive/clock',{advanceMs:3600001,hold:false});
    const outcomes=await dispatch(site,campaign.campaignId,due);
    expect(outcomes.map(row=>row.transport_disposition)).toEqual(['accepted','accepted']);
    for(const [email,shown,hidden] of [[vip,vipOnly,otherwise],[other,otherwise,vipOnly]]) {
      const sent=edge.sends.findLast(send=>send.to===email&&send.body.headers?.['List-Unsubscribe'])!;
      const html=sent.body.content.find((part:any)=>part.type==='text/html').value,text=sent.body.content.find((part:any)=>part.type==='text/plain').value;
      expect(html).toContain(shown);expect(text).toContain(shown);expect(html).not.toContain(hidden);expect(text).not.toContain(hidden);
      expect(html).not.toContain('data-mango-when');expect(html).not.toContain('data-mango-otherwise');
    }
  } finally {await site.runtime.close();await edge.close();}
});
