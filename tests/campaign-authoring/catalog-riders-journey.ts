import {expect,type Page,type TestInfo} from '@playwright/test';
import {json,type Installation} from '../go-live/harness';
import {chosenCatalogEdge} from '../go-live/chosen-catalog-edge';
import {reloadPage} from '../support/navigation';
import {authoredBody} from '../../src/core/features/campaigns/authoring-content';
import {mobileEnvelope,mobileDocument} from '../../src/core/features/campaigns/email-mobile';
import {catalogBlocks,CatalogUnavailable} from '../../src/core/features/campaigns/catalog-blocks';

/** Original synthetic-mango fixtures exercise the saved draft and live edge. */
export async function catalogRidersJourney(page:Page,info:TestInfo,site:Installation,catalog:ReturnType<typeof chosenCatalogEdge>,cookie:string,draft:{campaignId:string;revisionId:string},saved:any){
 const read=async()=>(await json(await site.call(`/api/campaigns/${draft.campaignId}`,{cookie}),200)).revision;
 const reopen=async()=>{await reloadPage(page);await page.getByRole('button',{name:'Block builder',exact:true}).click();await page.getByRole('button',{name:/^Block \d+: product-grid$/}).click();};
 const items=catalogBlocks(saved.emailBody)[0].state.items;
 await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body:{emailBody:saved.emailBody}}),200);
 const chosen=page.getByRole('group',{name:'Connected catalog',exact:true}),rows=chosen.locator('ol > li');
 catalog.fail();await reopen();
 await expect(chosen.getByRole('alert')).toBeVisible();await expect(rows).toHaveCount(items.length);
 await expect(rows.locator('[data-catalog-state]')).toHaveCount(0);
 for(let index=0;index<items.length;index++)await expect(rows.nth(index).getByRole('button',{name:`Remove chosen product ${index+1}`,exact:true})).toBeVisible();
 const failedRead=await rows.locator('p').allTextContents();
 catalog.reset();catalog.delete(165);catalog.unpublish(160);catalog.stock(1611,0);await reopen();
 await expect(chosen.getByText(/^Catalog read at /)).toBeVisible();
 for(const width of [1440]){
  await page.setViewportSize({width,height:1000});
  for(const reason of ['deleted','unpublished','out-of-stock']){
   const line=chosen.locator(`[data-catalog-state="${reason}"]`);expect.soft(await line.count()).toBe(1);
   if(await line.count()){await expect(line).toBeVisible();const index=await line.evaluate(node=>Array.from(node.parentElement!.parentElement!.children).indexOf(node.parentElement!));expect.soft((await line.textContent())!.toLowerCase()).not.toContain(failedRead[index].toLowerCase());}
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await chosen.screenshot({path:info.outputPath(`catalog-riders-${width}.png`)});
 }
 expect((await read()).emailBody).toBe(saved.emailBody);
 catalog.reset();catalog.unpublish(160);catalog.url(160,'');
 const current=catalog.commerce({query:'MangoCatalogNode',variables:{id:items[0].productId}}) as {data:{node:{title:string}}};
 const envelope=mobileEnvelope(authoredBody(saved.emailBody)),unsaved=mobileDocument(envelope.body+'<p>synthetic-mango-420 unsaved change</p>',envelope.style);
 const save=async(status:number)=>{
  const pending=page.waitForResponse(response=>new URL(response.url()).pathname===`/api/campaign-revisions/${draft.revisionId}`&&response.request().method()==='PATCH');
  await page.getByRole('button',{name:'Save full draft',exact:true}).click();const response=await pending;expect(response.status()).toBe(status);return response.json();
 };
 for(const width of [1440]){
  await page.setViewportSize({width,height:1000});await reopen();
  const empty=chosen.getByRole('combobox',{name:'When no products remain',exact:true});await empty.selectOption('skip');
  const blocks=await save(400);expect(blocks.error).toBe('catalog_unavailable');
  expect.soft(blocks.detail).toContain(current.data.node.title);expect.soft(blocks.detail).not.toBe(new CatalogUnavailable().message);expect(blocks.detail).not.toMatch(/https?:\/\//);
  const notice=page.locator('.inline-error').filter({hasText:blocks.detail});
  await expect(notice).toHaveText(blocks.detail);await expect(notice).toBeVisible();await expect(notice).toBeInViewport();
  await expect(empty).toHaveValue('skip');expect((await read()).emailBody).toBe(saved.emailBody);
  await page.screenshot({path:info.outputPath(`catalog-unavailable-blocks-${width}.png`)});
  await page.getByRole('button',{name:'HTML mode',exact:true}).click();const body=page.getByRole('textbox',{name:'Email body',exact:true});await body.fill(unsaved);
  const html=await save(400);expect(html.error).toBe('catalog_unavailable');expect(html.detail).toBe(blocks.detail);
  const field=page.locator('.field-error').filter({hasText:html.detail});await expect(field).toHaveText(html.detail);await expect(field).toBeVisible();await expect(field).toBeInViewport();await expect(body).toBeFocused();
  await expect(body).toHaveValue(unsaved);expect((await read()).emailBody).toBe(saved.emailBody);
  await page.screenshot({path:info.outputPath(`catalog-unavailable-html-${width}.png`)});
 }
 await page.getByRole('button',{name:'Block builder',exact:true}).click();await page.getByRole('button',{name:/^Block \d+: product-grid$/}).click();
 await chosen.getByRole('button',{name:'Remove chosen product 1',exact:true}).click();await save(200);
 const removed=await read();expect(catalogBlocks(removed.emailBody)[0].state.items).toEqual(items.slice(1));expect(catalogBlocks(removed.emailBody).flatMap(block=>block.state.items)).not.toContainEqual(items[0]);
 catalog.reset();await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body:{emailBody:saved.emailBody}}),200);catalog.unpublish(160);catalog.url(160,'');
 await reopen();await page.getByRole('button',{name:'HTML mode',exact:true}).click();await page.getByRole('textbox',{name:'Email body',exact:true}).fill(unsaved);
 catalog.reset();
 const meter=async()=>json(await site.call('/api/campaign-authoring/email-size',{method:'POST',cookie,body:{campaignId:draft.campaignId,emailBody:unsaved,preheader:saved.preheader,physicalAddress:saved.physicalAddress,trackingEnabled:false}}),200);
 const published=await meter();catalog.delete(160);const deleted=await meter();expect(published.htmlBytes).toBeGreaterThan(deleted.htmlBytes);catalog.reset();
 const pending=page.waitForResponse(response=>new URL(response.url()).pathname===`/api/campaign-revisions/${draft.revisionId}`&&response.request().method()==='PATCH');await page.getByRole('button',{name:'Save full draft',exact:true}).click();expect((await pending).status()).toBe(200);await expect(page.getByRole('status',{name:'Email sent size',exact:true})).toContainText(`${published.htmlBytes} bytes`);expect((await read()).emailBody).toContain('synthetic-mango-420');
 await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body:{emailBody:saved.emailBody}}),200);await reopen();
}
