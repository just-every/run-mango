import {expect,type Page,type TestInfo} from '@playwright/test';
import {createRequire} from 'node:module';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,approve,dispatch} from './harness';
import {syncSource} from './source-edge';
import {chosenCatalogEdge} from './chosen-catalog-edge';
import {openPage} from '../support/navigation';
import {png} from '../support/images';
const require=createRequire(import.meta.url),axeSource=createRequire(require.resolve('@axe-core/playwright'))('axe-core').source as string;
async function screen(page:Page,info:TestInfo,name:string,width:number){
 await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);await page.evaluate(axeSource);expect(await page.evaluate(async()=>(await (window as any).axe.run(document.querySelector('main'),{iframes:false})).violations.filter((row:any)=>['serious','critical'].includes(row.impact)))).toEqual([]);await page.screenshot({path:info.outputPath(`${name}-${width}.png`),fullPage:true});
}
export async function chosenCatalogJourney(page:Page,info:TestInfo){
 console.log('Chosen catalog proof: setup');
 const catalog=chosenCatalogEdge(),edge=await providerEdge({commerce:request=>catalog.commerce(request),links:catalog.links}),site=await installation(edge,eventSigner(),{commerce:true,networkHosts:['myshop.com','cdn.shopify.com']});
 const marketing=()=>edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe']);
 try{
  const cookie=await site.open();await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);await site.control('/_golive/sender-evidence');await confirmedContact(site,edge,cookie,'synthetic-mango-160@example.test','Synthetic reader');
  await json(await site.call('/api/settings/link-hosts',{method:'PUT',cookie,body:{hosts:'mango.example.test,myshop.com,cdn.shopify.com'}}),200);
  await json(await site.call('/api/settings/analytics',{method:'PUT',cookie,body:{enabled:true,source:'synthetic-mango-160',emailMedium:'email',smsMedium:'sms',campaign:'catalog-proof',content:'chosen-products'}}),200);
  await syncSource(site,cookie,'product');await syncSource(site,cookie,'variant');
  const clock=await site.control('/_golive/clock',{hold:true}),due=new Date(clock.now+3600000),campaign=await draftCampaign(site,cookie,'synthetic-mango-160',['synthetic-mango-160@example.test'],due);
  await page.context().clearCookies();await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  await page.route('https://cdn.shopify.com/**',route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from(png(300,240))}));
  await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);await page.getByRole('button',{name:'Block builder',exact:true}).click();
  await page.getByRole('combobox',{name:'Block kind',exact:true}).selectOption('product');await page.getByRole('button',{name:'Add block',exact:true}).click();
  const search=async(q:string,expected:string[])=>{await expect(page.getByRole('textbox',{name:'Search catalog',exact:true})).toBeVisible();await page.getByRole('textbox',{name:'Search catalog',exact:true}).fill(q);const pending=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/catalog/products'&&new URL(response.url()).searchParams.get('q')===q);await page.getByRole('button',{name:'Search catalog',exact:true}).press('Enter');const response=await pending;expect(response.status()).toBe(200);expect((await response.json()).products.map((item:any)=>item.title)).toEqual(expected);};
  const save=async()=>{const pending=page.waitForResponse(response=>new URL(response.url()).pathname===`/api/campaign-revisions/${campaign.revisionId}`&&response.request().method()==='PATCH');await page.getByRole('button',{name:'Save full draft',exact:true}).press('Enter');expect((await pending).status()).toBe(200);await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();};
  console.log('Chosen catalog proof: search and product picker');
  await search('Synthetic Basil',['Synthetic Basil']);await page.getByRole('button',{name:'Choose Synthetic Basil',exact:true}).press('Enter');await save();
  const single=await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);expect(single.revision.emailBody).toContain('data-mango-catalog=');
  await page.getByRole('button',{name:'Delete block 2',exact:true}).click();await page.getByRole('combobox',{name:'Block kind',exact:true}).selectOption('product-grid');await page.getByRole('button',{name:'Add block',exact:true}).click();
  await search('Summer harvest',['Synthetic Basil','Synthetic Mint']);await search('Mango Workshop',['Synthetic Basil','Synthetic Mint']);await search('Synthetic Basil',['Synthetic Basil']);await page.getByRole('button',{name:'Choose Synthetic Basil',exact:true}).press('Enter');
  await search('mint-green-bundle',['Synthetic Mint']);await page.getByRole('combobox',{name:'Variant for Synthetic Mint',exact:true}).selectOption('gid://shopify/ProductVariant/1612');await page.getByRole('button',{name:'Choose Synthetic Mint',exact:true}).press('Enter');
  for(const width of [1440,390])await screen(page,info,'catalog-picker',width);
  await save();
  let saved=await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);
  const encoded=/data-mango-catalog="([^"]+)"/.exec(saved.revision.emailBody)![1],state=JSON.parse(Buffer.from(encoded,'base64').toString());
  expect(state).toEqual({version:1,provider:'shopify',layout:'product-grid',empty:'hide',items:[{productId:'gid://shopify/Product/160',variantId:'gid://shopify/ProductVariant/1601'},{productId:'gid://shopify/Product/161',variantId:'gid://shopify/ProductVariant/1612'}]});
  for(const copied of ['Synthetic Basil','Synthetic Mint','24.00','myshop.com/products/','cdn.shopify.com/'])expect(saved.revision.emailBody).not.toContain(copied);
  console.log('Chosen catalog proof: HTML round trip');await page.getByRole('button',{name:'HTML mode',exact:true}).press('Enter');await expect(page.getByLabel('Email body',{exact:true})).toBeVisible();const original=await page.getByLabel('Email body',{exact:true}).inputValue();await page.getByLabel('Email body',{exact:true}).fill(original);await save();
  expect((await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200)).revision.emailBody).toBe(saved.revision.emailBody);
  console.log('Chosen catalog proof: current previews');
  const preview=page.locator('section[aria-label="Saved revision previews"]');await expect(preview.getByRole('status')).toContainText('Catalog read at');
  await preview.getByRole('button',{name:'Load 2 remote images',exact:true}).click();
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   await preview.getByRole('button',{name:width===390?'Mobile email':'Desktop email',exact:true}).press('Enter');
   const frame=preview.frameLocator('iframe[title="Saved email preview"]');
   for(const [title,n] of [['Synthetic Basil',160],['Synthetic Mint',161]] as const){
    const item=frame.getByRole('heading',{name:title,exact:true}).locator('..');
    await expect(item).toContainText('AUD 24.00');await expect(item.locator('s')).toHaveText('AUD 30.00');
    await expect(item.locator('img')).toHaveAttribute('src',`https://cdn.shopify.com/synthetic-mango-${n}.png`);
    await expect(item.locator('img')).toHaveJSProperty('naturalWidth',300);
    await expect(item.locator('a')).toHaveAttribute('title',`https://myshop.com/products/product-${n}?utm_source=synthetic-mango-160&utm_medium=email&utm_campaign=catalog-proof&utm_content=chosen-products`);
    expect(await item.locator('a').getAttribute('href')).toBeNull();
   }
   await expect(frame.locator('img')).toHaveCount(2);
   await screen(page,info,'catalog-preview',width);await preview.locator('iframe').scrollIntoViewIfNeeded();await preview.locator('.message-preview--email').screenshot({path:info.outputPath(`catalog-email-${width}.png`)});
  }
  console.log('Chosen catalog proof: fresh hand-off');
  await approve(site,cookie,campaign);console.log('Chosen catalog proof: approved identifiers');
  const locked=await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body:{emailBody:saved.revision.emailBody.replace(encoded,Buffer.from(JSON.stringify({...state,empty:'skip'})).toString('base64'))}});expect(locked.status).toBe(409);console.log('Chosen catalog proof: identifiers locked');
  catalog.price(1601,'36.00');catalog.unpublish(161);const before=marketing().length;console.log('Chosen catalog proof: dispatch new price');await site.control('/_golive/clock',{advanceMs:due.getTime()-(await site.control('/_golive/clock')).now+1});await dispatch(site,campaign.campaignId,due);console.log('Chosen catalog proof: dispatched');const delivered=marketing().slice(before);expect(delivered).toHaveLength(1);const html=delivered[0].body.content.find((part:any)=>part.type==='text/html').value;expect(html).toContain('AUD 36.00');expect(html).not.toContain('Synthetic Mint');
  console.log('Chosen catalog proof: read outcomes');
  const detail=await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);expect(detail.catalogSummary.hidden).toEqual([{reason:'unpublished',count:1}]);
  catalog.reset();console.log('Chosen catalog proof: open outcomes');await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}`);for(const width of [1440,390]){await expect(page.getByRole('region',{name:'Catalog outcomes',exact:true})).toContainText('unpublished');await screen(page,info,'catalog-outcomes',width);}
  console.log('Chosen catalog proof: terminal availability cases');
  const sendCase=async(name:string,change:()=>void,empty:'hide'|'skip'='hide')=>{
   catalog.reset();const now=await site.control('/_golive/clock',{advanceMs:25*3600000,hold:true}),at=new Date(now.now+5000),next=await draftCampaign(site,cookie,'synthetic-mango-'+name,['synthetic-mango-160@example.test'],at),body=empty==='hide'?saved.revision.emailBody:saved.revision.emailBody.replace(encoded,Buffer.from(JSON.stringify({...state,empty})).toString('base64'));
   await json(await site.call(`/api/campaign-revisions/${next.revisionId}`,{method:'PATCH',cookie,body:{emailBody:body}}),200);await site.control('/_golive/sender-evidence');await approve(site,cookie,next);change();const sent=marketing().length;await site.control('/_golive/clock',{advanceMs:at.getTime()-(await site.control('/_golive/clock')).now+1});const rows=await dispatch(site,next.campaignId,at);return {campaign:next,rows,sends:marketing().slice(sent),detail:await json(await site.call(`/api/campaigns/${next.campaignId}`,{cookie}),200)};
  };
  const deleted=await sendCase('161',()=>catalog.delete(160));expect(deleted.sends).toHaveLength(1);expect(deleted.detail.catalogSummary.hidden).toEqual([{reason:'deleted',count:1}]);
  const stock=await sendCase('162',()=>catalog.stock(1601,0));expect(stock.sends).toHaveLength(1);expect(stock.detail.catalogSummary.hidden).toEqual([{reason:'out-of-stock',count:1}]);
  const hide=await sendCase('163',()=>{catalog.unpublish(160);catalog.unpublish(161);});expect(hide.sends).toHaveLength(1);expect(hide.detail.catalogSummary.emptyBlocks).toBe(1);
  const skip=await sendCase('164',()=>{catalog.unpublish(160);catalog.unpublish(161);},'skip');expect(skip.sends).toHaveLength(0);expect(skip.rows.map(row=>row.skip_reason)).toEqual(['catalog-empty']);expect(skip.detail.catalogSummary.skipped).toEqual([{reason:'catalog-empty',count:1}]);
  const unavailable=await sendCase('165',()=>catalog.fail());expect(unavailable.sends).toHaveLength(0);expect(unavailable.rows.map(row=>row.skip_reason)).toEqual(['catalog-unavailable']);expect(unavailable.detail.catalogSummary.skipped).toEqual([{reason:'catalog-unavailable',count:1}]);
  await openPage(page,`${site.runtime.url}/app/campaigns/${unavailable.campaign.campaignId}/scheduled`);
  for(const width of [1440,390]){
   await expect(page.getByRole('table',{name:'Recipient outcomes',exact:true}).getByRole('row').filter({hasText:'synthetic-mango-160@example.test'})).toContainText('catalog-unavailable');
   await screen(page,info,'catalog-unavailable-recipient',width);
  }
  const recovered=await sendCase('166',()=>catalog.price(1601,'38.00'));
  expect({staleReadSkipped:unavailable.rows.map(row=>row.skip_reason),recoveredSends:recovered.sends.length}).toEqual({staleReadSkipped:['catalog-unavailable'],recoveredSends:1});
  expect(recovered.sends[0].body.content.find((part:any)=>part.type==='text/html').value).toContain('AUD 38.00');
  expect(recovered.rows.map(row=>row.transport_disposition)).toEqual(['accepted']);
  expect(edge.unexpected).toEqual([]);
 }finally{await site.runtime.close();await edge.close();}
}
