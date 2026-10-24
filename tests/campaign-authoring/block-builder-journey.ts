import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {authoringRuntime} from './browser-runtime.mjs';
import {localSessionCookieName} from '../support/local-session';
import {openPage,reloadPage} from '../support/navigation';
import {png} from '../support/images';
import {authoredBody} from '../../src/core/features/campaigns/authoring-content';
import {parseEmailHtml} from '../../src/core/features/campaigns/email-html-parse';
export async function blockBuilderJourney(page:Page,info:TestInfo){
  const runtime=await authoringRuntime({suite:'block-builder',vars:{AUTHORING_LINK_HOST:'example.test'}});
  try{
    const open=await page.request.post(runtime.url+'/_authoring/open',{headers:{'X-Test-Token':runtime.token}});expect(open.status()).toBe(200);const {token}=await open.json();
    await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:token,url:runtime.url}]);
    const headers={Origin:runtime.url};
    const uploaded=await page.request.post(runtime.url+'/api/campaign-assets',{headers,multipart:{file:{name:'synthetic-mango-140.png',mimeType:'image/png',buffer:Buffer.from(png(200,160))}}});expect(uploaded.status()).toBe(201);const {asset}=await uploaded.json();
    const create=await page.request.post(runtime.url+'/api/campaigns',{headers,data:{}});expect(create.status()).toBe(201);const {campaignId,revisionId}=await create.json();
    const configured=await page.request.patch(runtime.url+'/api/campaign-revisions/'+revisionId,{headers,data:{name:'Synthetic block letter',emailSubject:'Garden seeds',preheader:'From our garden',emailBody:'',steps:[{channel:'email',timezone:'Australia/Brisbane',scheduledAt:'2031-06-07T00:00:00.000Z',sendByAt:'2031-06-07T13:59:00.000Z',whyThisTime:'Operator selected'}]}});expect(configured.status()).toBe(200);
    await page.setViewportSize({width:1440,height:1000});await openPage(page,`${runtime.url}/app/campaigns/${campaignId}/review`);
    await page.getByRole('button',{name:'Block builder',exact:true}).click();await page.getByLabel('Block kind',{exact:true}).selectOption('columns');await page.getByRole('button',{name:'Add block',exact:true}).click();
    const body=page.getByLabel('Block content HTML',{exact:true});await body.fill((await body.inputValue()).replace('https://example.test/garden.png',asset.url));
    await page.getByLabel('Block padding',{exact:true}).fill('8');await page.getByLabel('Block alignment',{exact:true}).selectOption('center');
    await page.getByLabel('Mobile column orientation',{exact:true}).selectOption('stack-columns');
    await page.getByRole('button',{name:'Duplicate block 1',exact:true}).click();await page.getByRole('button',{name:'Move block 2 up',exact:true}).focus();await page.keyboard.press('Enter');
    await page.getByRole('button',{name:'Delete block 2',exact:true}).click();await page.getByRole('button',{name:'Undo block change',exact:true}).click();await expect(page.getByRole('button',{name:'Delete block 2',exact:true})).toBeVisible();await page.getByRole('button',{name:'Redo block change',exact:true}).click();await expect(page.getByRole('button',{name:'Delete block 2',exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
    const read=async()=>{const response=await page.request.get(`${runtime.url}/api/campaigns/${campaignId}`);expect(response.status()).toBe(200);return (await response.json()).revision;};
    const saved=await read();expect(parseEmailHtml(saved.emailBody).canonical).toBe(saved.emailBody);
    await reloadPage(page);await page.getByRole('button',{name:'Block builder',exact:true}).click();await page.getByRole('button',{name:'Block 1: columns',exact:true}).click();await expect(page.getByLabel('Column count',{exact:true})).toHaveValue('2');await expect(page.getByLabel('Mobile column orientation',{exact:true})).toHaveValue('stack-columns');
    await page.getByRole('button',{name:'HTML mode',exact:true}).click();await expect(page.getByLabel('Email body',{exact:true})).toHaveValue(authoredBody(saved.emailBody));await page.getByRole('button',{name:'Block builder',exact:true}).click();
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();expect((await read()).emailBody).toBe(saved.emailBody);
    await expect(page.getByRole('status',{name:'Email sent size',exact:true})).toContainText('Sent size upper bound:');
    for(const width of [1440,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);expect((await new AxeBuilder({page}).include('main').options({iframes:false}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);await page.screenshot({path:info.outputPath(`block-builder-${width}.png`),fullPage:true});}
    await page.setViewportSize({width:375,height:1000});await page.setContent(saved.emailBody);
    const product=await page.getByRole('heading',{name:'Garden seeds',exact:true}).boundingBox(),button=await page.getByRole('link',{name:'Explore the garden',exact:true}).boundingBox();expect(product).toBeTruthy();expect(button).toBeTruthy();expect(button!.y).toBeGreaterThan(product!.y);await page.screenshot({path:info.outputPath('block-email-375.png'),fullPage:true});
    const approval=await page.request.post(`${runtime.url}/api/campaigns/${campaignId}/approve`,{headers,data:{revisionId,idempotencyKey:'synthetic-mango-140'}});expect(approval.status(),await approval.text()).toBe(200);expect((await read()).emailBody).toBe(saved.emailBody);
  }finally{await runtime.close();}
}
