import {expect,type Page,type TestInfo} from '@playwright/test';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,approve,dispatch} from '../go-live/harness';
import {chosenCatalogEdge} from '../go-live/chosen-catalog-edge';
import {syncSource} from '../go-live/source-edge';
import {openPage,reloadPage} from '../support/navigation';
import {png} from '../support/images';

/** Original synthetic-mango fixtures reach the real authoring and delivery doors. */
export async function chosenSizeJourney(page:Page,info:TestInfo){
 const began=Date.now(),catalog=chosenCatalogEdge({six:true});
 const edge=await providerEdge({commerce:request=>catalog.commerce(request),links:catalog.links}),site=await installation(edge,eventSigner(),{commerce:true,networkHosts:['myshop.com','cdn.shopify.com'],reuseEmptySchema:true});
 try{
  const cookie=await site.open(),email='synthetic-mango-390@example.test';
  await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);await site.control('/_golive/sender-evidence');await confirmedContact(site,edge,cookie,email,'Synthetic reader');
  await syncSource(site,cookie,'product');await syncSource(site,cookie,'variant');
  const clock=await site.control('/_golive/clock',{hold:true}),due=new Date(clock.now+3600000),draft=await draftCampaign(site,cookie,'synthetic-mango-390',[email],due);
  await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body:{emailBody:'',trackingEnabled:false}}),200);
  await page.context().clearCookies();await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  await page.route('https://cdn.shopify.com/**',route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from(png(300,240))}));
  await openPage(page,`${site.runtime.url}/app/campaigns/${draft.campaignId}/review`);await page.getByRole('button',{name:'Block builder',exact:true}).click();
  const add=async(kind:string)=>{await page.getByRole('combobox',{name:'Block kind',exact:true}).selectOption(kind);await page.getByRole('button',{name:'Add block',exact:true}).click();};
  await add('header');await page.getByRole('textbox',{name:'Block text',exact:true}).fill('Synthetic garden promotion');await page.getByLabel('Mobile font size',{exact:true}).fill('24');
  await add('image');for(const [name,value] of [['Image URL','https://cdn.shopify.com/synthetic-mango-160.png'],['Image description','Synthetic garden hero']])await page.getByRole('textbox',{name,exact:true}).fill(value);for(const [name,value] of [['Image width','300'],['Image height','240']])await page.getByRole('spinbutton',{name,exact:true}).fill(value);
  await add('button');await page.getByRole('textbox',{name:'Button text',exact:true}).fill('Explore the garden');await page.getByRole('textbox',{name:'Button destination',exact:true}).fill('https://myshop.com/products/product-160');
  await add('columns');for(const column of [0,1]){await page.getByRole('combobox',{name:'Selected column',exact:true}).selectOption(String(column));await page.getByRole('combobox',{name:'Column block kind',exact:true}).selectOption('text');await page.getByRole('textbox',{name:'Block text',exact:true}).fill('Synthetic garden notes. '.repeat(500));}
  await add('product-grid');
  const pending=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/catalog/products');await page.getByRole('textbox',{name:'Search catalog',exact:true}).fill('synthetic-mango-');await page.getByRole('button',{name:'Search catalog',exact:true}).click();expect((await pending).status()).toBe(200);
  for(let n=160;n<166;n++)await page.getByRole('button',{name:`Choose synthetic-mango-${n}`,exact:true}).click();
  await add('social-links');await page.getByRole('textbox',{name:'Profile path',exact:true}).fill('synthetic-mango-390');await page.getByRole('button',{name:'Use network icon',exact:true}).click();await expect(page.getByRole('button',{name:'Use network icon',exact:true})).toBeEnabled();
  const save=async()=>{const pending=page.waitForResponse(response=>response.url().endsWith(`/api/campaign-revisions/${draft.revisionId}`)&&response.request().method()==='PATCH');await page.getByRole('button',{name:'Save full draft',exact:true}).click();expect((await pending).status()).toBe(200);await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();};
  await save();const read=async()=>(await json(await site.call(`/api/campaigns/${draft.campaignId}`,{cookie}),200)).revision,saved=await read();expect(saved.emailBody.length).toBeGreaterThan(20000);expect(saved.emailBody).toContain('data-mango-catalog=');expect(saved.emailBody).toContain('{{physical_address}}');expect(saved.emailBody).toContain('font-size: 24px !important');
  await reloadPage(page);await page.getByRole('button',{name:'Block builder',exact:true}).click();await save();expect((await read()).emailBody).toBe(saved.emailBody);
  const meter=async()=>json(await site.call('/api/campaign-authoring/email-size',{method:'POST',cookie,body:{campaignId:draft.campaignId,emailBody:saved.emailBody,preheader:saved.preheader,physicalAddress:saved.physicalAddress,trackingEnabled:false}}),200);
  const visible=await meter();expect(visible.exceedsLimit).toBe(false);
  catalog.unpublish(160);catalog.stock(1611,0);await save();const hidden=await meter();
  expect(hidden.htmlBytes,'configured six-item bound must include unpublished and out-of-stock items').toBe(visible.htmlBytes);expect(hidden.textBytes).toBe(visible.textBytes);
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await expect(page.getByRole('status',{name:'Email sent size',exact:true})).toContainText(`${hidden.htmlBytes} bytes`);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await page.locator('.editor-panel').screenshot({path:info.outputPath(`chosen-size-${width}.png`)});}
  catalog.reset();await approve(site,cookie,draft);await site.control('/_golive/clock',{advanceMs:3600001});const rows=await dispatch(site,draft.campaignId,due);expect(rows.map(row=>row.transport_disposition)).toEqual(['accepted']);
  const marketing=()=>edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe']);expect(marketing()).toHaveLength(1);const html=marketing()[0].body.content.find((part:any)=>part.type==='text/html').value;expect(Buffer.byteLength(html)).toBe(hidden.htmlBytes);for(let n=160;n<166;n++)expect(html).toContain(`synthetic-mango-${n}`);
  console.log(`Chosen six-item promotion: storedCharacters=${saved.emailBody.length}; bound=${hidden.htmlBytes}; edgeBytes=${Buffer.byteLength(html)}`);
  const nextClock=await site.control('/_golive/clock',{advanceMs:25*3600000,hold:true});await site.control('/_golive/sender-evidence');const nextDue=new Date(nextClock.now+3600000),next=await draftCampaign(site,cookie,'synthetic-mango-391',[email],nextDue);
  await json(await site.call(`/api/campaign-revisions/${next.revisionId}`,{method:'PATCH',cookie,body:{emailBody:saved.emailBody,trackingEnabled:false}}),200);await approve(site,cookie,next);catalog.title(160,'Synthetic garden '.repeat(8000));await site.control('/_golive/clock',{advanceMs:3600001});const skipped=await dispatch(site,next.campaignId,nextDue);expect(skipped.map(row=>({disposition:row.transport_disposition,reason:row.skip_reason}))).toEqual([{disposition:'skipped',reason:'email-too-large'}]);expect(marketing()).toHaveLength(1);
  const detail=await json(await site.call(`/api/campaigns/${next.campaignId}`,{cookie}),200);expect(detail.results.steps.flatMap((step:any)=>step.counts)).toContainEqual(expect.objectContaining({disposition:'skipped',reason:'email-too-large',count:1}));
  console.log(`Chosen size journey elapsed=${Date.now()-began}ms`);
 }finally{await site.runtime.close();await edge.close();}
}
