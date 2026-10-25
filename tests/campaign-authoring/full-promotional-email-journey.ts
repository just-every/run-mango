import {expect,type Page,type TestInfo} from '@playwright/test';
import {createRequire} from 'node:module';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,approve,dispatch} from '../go-live/harness';
import {openPage,reloadPage} from '../support/navigation';
import {png} from '../support/images';
import {authoredBody} from '../../src/core/features/campaigns/authoring-content';
import {parseEmailHtml} from '../../src/core/features/campaigns/email-html-parse';
const localRequire=createRequire(import.meta.url),axeSource=createRequire(localRequire.resolve('@axe-core/playwright'))('axe-core').source as string;

export async function fullPromotionalEmailJourney(page:Page,info:TestInfo){
  const social='https://www.instagram.com/synthetic-mango-180',shop='https://shop.example.test/garden';
  const edge=await providerEdge({links:{[social]:{status:200}}}),site=await installation(edge,eventSigner(),{networkHosts:['www.instagram.com']});
  try{
    await page.context().setExtraHTTPHeaders({});
    const cookie=await site.open(),headers={Cookie:cookie,Origin:site.origin};
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);await site.control('/_golive/sender-evidence');
    const defaults=await json(await site.call('/api/settings/link-hosts',{cookie}),200);
    expect(defaults.sources).toContainEqual(expect.objectContaining({host:'www.instagram.com',source:'Social defaults'}));
    await json(await site.call('/api/settings/link-hosts',{method:'PUT',cookie,body:{hosts:[...defaults.hosts,'shop.example.test'].join(',')}}),200);
    await json(await site.call('/api/insights/open-tracking',{method:'PUT',cookie,body:{enabled:true}}),200);
    const email='synthetic-mango-180@example.test';await confirmedContact(site,edge,cookie,email,'synthetic-mango-180');
    const clock=await site.control('/_golive/clock',{hold:true}),due=new Date(clock.now+3600000);
    const draft=await draftCampaign(site,cookie,'synthetic-mango-181',[email],due);
    await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body:{emailBody:''}}),200);
    const uploaded=await page.request.post(site.runtime.url+'/api/campaign-assets',{headers,multipart:{file:{name:'synthetic-mango-181.png',mimeType:'image/png',buffer:Buffer.from(png(200,160))}}});expect(uploaded.status()).toBe(201);const {asset}=await uploaded.json();
    await page.route(new URL(asset.url).origin+'/media/**',async route=>{const response=await page.request.get(site.runtime.url+new URL(route.request().url()).pathname,{headers});expect(response.status()).toBe(200);await route.fulfill({response});});
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.setViewportSize({width:1440,height:1000});await openPage(page,`${site.runtime.url}/app/campaigns/${draft.campaignId}/review`);await page.getByRole('button',{name:'Block builder',exact:true}).click();
    const add=async(kind:string)=>{await page.getByRole('combobox',{name:'Block kind',exact:true}).selectOption(kind);await page.getByRole('button',{name:'Add block',exact:true}).click();};
    const image=async(alt:string)=>{for(const [name,value] of [['Image URL',asset.url],['Image description',alt]])await page.getByRole('textbox',{name,exact:true}).fill(value);for(const [name,value] of [['Image width','200'],['Image height','160']])await page.getByRole('spinbutton',{name,exact:true}).fill(value);};
    await add('header');await page.getByRole('textbox',{name:'Block text',exact:true}).fill('Synthetic spring letter');
    await page.getByLabel('Mobile font size',{exact:true}).fill('24');await page.getByRole('combobox',{name:'Mobile alignment',exact:true}).selectOption('center');
    await add('image');await image('Synthetic garden hero');await add('button');await page.getByRole('textbox',{name:'Button text',exact:true}).fill('Explore the garden');await page.getByRole('textbox',{name:'Button destination',exact:true}).fill(shop);
    await add('columns');
    for(const column of [0,1]){await page.getByRole('combobox',{name:'Selected column',exact:true}).selectOption(String(column));await page.getByRole('combobox',{name:'Column block kind',exact:true}).selectOption('text');await page.getByRole('textbox',{name:'Block text',exact:true}).fill(`Synthetic garden section ${column+1}. `+'Seasonal garden notes from our seed beds. '.repeat(300));}
    await add('product-grid');
    for(let item=0;item<6;item++){
      await page.getByRole('combobox',{name:'Selected product',exact:true}).selectOption(String(item));
      await page.getByRole('textbox',{name:'Product name',exact:true}).fill('synthetic-mango-'+(item+182));await page.getByRole('textbox',{name:'Product price',exact:true}).fill('$'+(item+10)+'.00');await page.getByRole('textbox',{name:'Product description',exact:true}).fill('Seeds for the seasonal garden.');await image('Synthetic product '+(item+1));if(item===0){await page.getByRole('spinbutton',{name:'Image width',exact:true}).fill('600');await page.getByRole('spinbutton',{name:'Image height',exact:true}).fill('480');}await page.getByRole('textbox',{name:'Button text',exact:true}).fill('View garden product '+(item+1));await page.getByRole('textbox',{name:'Button destination',exact:true}).fill(shop);
    }
    await add('social-links');await page.getByRole('textbox',{name:'Profile path',exact:true}).fill('synthetic-mango-180');
    const iconResponse=page.waitForResponse(response=>response.url().endsWith('/api/campaign-assets')&&response.request().method()==='POST');await page.getByRole('button',{name:'Use network icon',exact:true}).click();expect((await iconResponse).status()).toBe(201);await expect(page.getByRole('button',{name:'Use network icon',exact:true})).toBeEnabled();
    await page.getByLabel('Mobile padding',{exact:true}).fill('12');await page.getByLabel('Mobile font size',{exact:true}).fill('14');await page.getByRole('combobox',{name:'Mobile alignment',exact:true}).selectOption('center');
    for(const [index,kind] of [[5,'product-grid'],[6,'social-links']] as const){
      await page.getByRole('button',{name:`Duplicate block ${index}`,exact:true}).click();await expect(page.getByRole('button',{name:`Block ${index+1}: ${kind}`,exact:true})).toBeVisible();await page.getByRole('button',{name:`Delete block ${index+1}`,exact:true}).click();
      await page.getByRole('button',{name:`Move block ${index} up`,exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:`Block ${index-1}: ${kind}`,exact:true})).toBeVisible();await page.getByRole('button',{name:`Move block ${index-1} down`,exact:true}).click();
      const preceding=index===5?'columns':'product-grid';await page.getByRole('button',{name:`Block ${index}: ${kind}`,exact:true}).dragTo(page.getByRole('button',{name:`Block ${index-1}: ${preceding}`,exact:true}));await expect(page.getByRole('button',{name:`Block ${index-1}: ${kind}`,exact:true})).toBeVisible();await page.getByRole('button',{name:`Block ${index-1}: ${kind}`,exact:true}).dragTo(page.getByRole('button',{name:`Block ${index}: ${preceding}`,exact:true}));
    }
    const save=async()=>{await page.getByRole('button',{name:'Save full draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();};await save();
    const read=async()=>(await json(await site.call(`/api/campaigns/${draft.campaignId}`,{cookie}),200)).revision;
    const saved=await read();expect(saved.emailBody.length).toBeGreaterThan(20000);expect(parseEmailHtml(saved.emailBody).canonical).toBe(saved.emailBody);expect(saved.emailBody.match(/\{\{unsubscribe_url\}\}/g)).toHaveLength(1);expect(saved.emailBody).toContain('{{physical_address}}');expect(saved.emailBody).toContain('font-size: 24px !important');
    await reloadPage(page);await page.getByRole('button',{name:'Block builder',exact:true}).click();await page.getByRole('button',{name:'Block 5: product-grid',exact:true}).click();await expect(page.getByRole('combobox',{name:'Selected product',exact:true}).getByRole('option')).toHaveCount(6);
    await page.getByRole('button',{name:'HTML mode',exact:true}).click();await expect(page.getByRole('textbox',{name:'Email body',exact:true})).toHaveValue(authoredBody(saved.emailBody));await page.getByRole('button',{name:'Block builder',exact:true}).click();await save();expect((await read()).emailBody).toBe(saved.emailBody);
    const measured=await json(await site.call('/api/campaign-authoring/email-size',{method:'POST',cookie,body:{campaignId:draft.campaignId,name:saved.name,emailBody:saved.emailBody,preheader:saved.preheader,physicalAddress:saved.physicalAddress,trackingEnabled:saved.trackingEnabled,inclusionRuleJson:saved.inclusionRuleJson,exclusionRulesJson:saved.exclusionRulesJson}}),200);expect(measured.exceedsLimit).toBe(false);expect(measured.htmlBytes).toBeLessThanOrEqual(measured.limitBytes);
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:1000});await openPage(page,`${site.runtime.url}/app/campaigns/${draft.campaignId}/review`);await page.getByRole('button',{name:'Block builder',exact:true}).click();await page.getByRole('button',{name:'Block 5: product-grid',exact:true}).click();
      await expect(page.getByRole('status',{name:'Email sent size',exact:true})).toContainText(`${measured.htmlBytes} bytes`);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);await page.evaluate(axeSource);const audit=await page.evaluate(async()=>(window as any).axe.run(document,{iframes:false}));expect(audit.violations.filter((row:any)=>['serious','critical'].includes(row.impact??''))).toEqual([]);await page.locator('.editor-panel').screenshot({path:info.outputPath(`full-promotion-${width}.png`)});
      await page.getByRole('button',{name:'Block 6: social-links',exact:true}).click();await expect(page.getByRole('textbox',{name:'Profile path',exact:true})).toHaveValue('synthetic-mango-180');await page.getByRole('region',{name:'Email blocks',exact:true}).screenshot({path:info.outputPath(`social-block-${width}.png`)});
    }
    expect(errors).toEqual([]);
    await page.setViewportSize({width:375,height:1000});await page.setContent(saved.emailBody);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    let previous=-1;for(let item=1;item<=6;item++){const box=await page.getByRole('heading',{name:'synthetic-mango-'+(item+181),exact:true}).boundingBox();expect(box).toBeTruthy();expect(box!.y).toBeGreaterThan(previous);previous=box!.y;const cell=page.getByRole('heading',{name:'synthetic-mango-'+(item+181),exact:true}).locator('..');await expect(cell).toContainText('$'+(item+9)+'.00');await expect(cell.getByRole('img')).toHaveAttribute('src',asset.url);const imageBox=await cell.getByRole('img').boundingBox(),cellBox=await cell.boundingBox();expect(imageBox!.width).toBeLessThanOrEqual(cellBox!.width);await expect(cell.getByRole('link')).toHaveAttribute('href',shop);}
    await expect(page.getByRole('img',{name:'Instagram',exact:true})).toHaveJSProperty('naturalWidth',64);
    expect(await page.getByRole('heading',{name:'Synthetic spring letter',exact:true}).evaluate(node=>{const style=getComputedStyle(node.closest('td')!);return {font:style.fontSize,alignment:style.textAlign};})).toEqual({font:'24px',alignment:'center'});
    expect(await page.getByRole('img',{name:'Instagram',exact:true}).evaluate(node=>getComputedStyle(node.closest('td')!).textAlign)).toBe('center');
    await page.screenshot({path:info.outputPath('full-promotion-email-375.png'),fullPage:true});
    await json(await site.call(`/api/campaigns/${draft.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:draft.revisionId}}),200);
    const checked=await json(await site.call(`/api/campaigns/${draft.campaignId}`,{cookie}),200);
    for(const check of checked.checks.filter((check:any)=>check.status==='advisory')){expect(check.blocking).toBe(false);await json(await site.call(`/api/campaigns/${draft.campaignId}/checks/${check.id}/acknowledge`,{method:'POST',cookie,body:{revisionId:draft.revisionId,findingIdentity:check.findingIdentity}}),200);}
    await approve(site,cookie,draft);expect((await read()).emailBody).toBe(saved.emailBody);await site.control('/_golive/clock',{advanceMs:3600001});const recipients=await dispatch(site,draft.campaignId,due);expect(recipients).toHaveLength(1);expect(recipients[0].transport_disposition).toBe('accepted');
    const sent=edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe']);expect(sent).toHaveLength(1);const html=sent[0].body.content.find((part:any)=>part.type==='text/html').value;expect(Buffer.byteLength(html)).toBe(measured.htmlBytes);expect(Buffer.byteLength(sent[0].body.content.find((part:any)=>part.type==='text/plain').value)).toBe(measured.textBytes);expect(html).not.toContain('{{');expect(html).toContain(social);for(let item=0;item<6;item++){expect(html).toContain('synthetic-mango-'+(item+182));expect(html).toContain('$'+(item+10)+'.00');}
    console.log(`Full promotional email: storedCharacters=${saved.emailBody.length}; sentBytes=${Buffer.byteLength(html)}; shownBytes=${measured.htmlBytes}; limit=${measured.limitBytes}`);
  }finally{await site.runtime.close();await edge.close();}
}
