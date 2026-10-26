import {expect,type Page,type TestInfo} from '@playwright/test';
import {json,type Installation} from '../go-live/harness';
import {chosenCatalogEdge} from '../go-live/chosen-catalog-edge';
import {reloadPage} from '../support/navigation';
import {authoredBody} from '../../src/core/features/campaigns/authoring-content';
import {mobileEnvelope,mobileDocument} from '../../src/core/features/campaigns/email-mobile';

/** Original synthetic-mango fixtures exercise the saved draft and live edge. */
export async function catalogRidersJourney(page:Page,info:TestInfo,site:Installation,catalog:ReturnType<typeof chosenCatalogEdge>,cookie:string,draft:{campaignId:string;revisionId:string},saved:any){
 const read=async()=>(await json(await site.call(`/api/campaigns/${draft.campaignId}`,{cookie}),200)).revision;
 const reopen=async()=>{await reloadPage(page);await page.getByRole('button',{name:'Block builder',exact:true}).click();await page.getByRole('button',{name:/^Block \d+: product-grid$/}).click();};
 catalog.delete(165);catalog.unpublish(160);catalog.stock(1611,0);
 await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body:{emailBody:saved.emailBody}}),200);
 await reopen();
 const chosen=page.getByRole('group',{name:'Connected catalog',exact:true});
 await expect(chosen.getByText(/^Catalog read at /)).toBeVisible();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  for(const reason of ['deleted','unpublished','out-of-stock']){
   const line=chosen.locator(`[data-catalog-state="${reason}"]`);expect.soft(await line.count()).toBe(1);
   if(await line.count()){await expect(line).toBeVisible();expect.soft(await line.textContent()).not.toMatch(/current values unavailable/i);expect(await line.evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(13);}
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await chosen.screenshot({path:info.outputPath(`catalog-riders-${width}.png`)});
 }
 expect((await read()).emailBody).toBe(saved.emailBody);
 catalog.fail();await reopen();await expect(chosen.getByText('Current values unavailable',{exact:true})).toHaveCount(6);catalog.reset();
 catalog.unpublish(160);catalog.url(160,'');
 const envelope=mobileEnvelope(authoredBody(saved.emailBody)),unsaved=mobileDocument(envelope.body+'<p>synthetic-mango-420 unsaved change</p>',envelope.style);
 await page.getByRole('button',{name:'HTML mode',exact:true}).click();await page.getByRole('textbox',{name:'Email body',exact:true}).fill(unsaved);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  const pending=page.waitForResponse(response=>new URL(response.url()).pathname===`/api/campaign-revisions/${draft.revisionId}`&&response.request().method()==='PATCH');
  await page.getByRole('button',{name:'Save full draft',exact:true}).click();const response=await pending;expect(response.status()).toBe(400);const refused=await response.json();expect(refused.error).toBe('catalog_unavailable');
  expect.soft(refused.detail).toContain('synthetic-mango-160');expect.soft(refused.detail).toMatch(/publish/i);expect.soft(refused.detail).toMatch(/remove/i);expect.soft(refused.detail).toMatch(/save again/i);expect(refused.detail).not.toMatch(/https?:\/\//);
  await expect(page.getByText(refused.detail,{exact:true}).first()).toBeVisible();await expect(page.getByRole('textbox',{name:'Email body',exact:true})).toHaveValue(unsaved);expect((await read()).emailBody).toBe(saved.emailBody);
  await page.locator('.editor-panel').screenshot({path:info.outputPath(`catalog-unavailable-${width}.png`)});
 }
 catalog.reset();
 const meter=async()=>json(await site.call('/api/campaign-authoring/email-size',{method:'POST',cookie,body:{campaignId:draft.campaignId,emailBody:unsaved,preheader:saved.preheader,physicalAddress:saved.physicalAddress,trackingEnabled:false}}),200);
 const published=await meter();catalog.delete(160);const deleted=await meter();expect(published.htmlBytes).toBeGreaterThan(deleted.htmlBytes);catalog.reset();
 const pending=page.waitForResponse(response=>new URL(response.url()).pathname===`/api/campaign-revisions/${draft.revisionId}`&&response.request().method()==='PATCH');await page.getByRole('button',{name:'Save full draft',exact:true}).click();expect((await pending).status()).toBe(200);await expect(page.getByRole('status',{name:'Email sent size',exact:true})).toContainText(`${published.htmlBytes} bytes`);expect((await read()).emailBody).toContain('synthetic-mango-420');
 await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body:{emailBody:saved.emailBody}}),200);await reopen();
}
