import {prepareReusableProof,verifyReusableProof} from './reusable-block-journey';
import {expect,type Page,type TestInfo} from '@playwright/test';
import {createRequire} from 'node:module';
const localRequire=createRequire(import.meta.url);
const axeSource=createRequire(localRequire.resolve('@axe-core/playwright'))('axe-core').source as string;
import {localSessionCookieName} from '../support/local-session';
import {openPage,reloadPage} from '../support/navigation';
import {png} from '../support/images';
import {authoredBody} from '../../src/core/features/campaigns/authoring-content';
import {parseEmailHtml} from '../../src/core/features/campaigns/email-html-parse';
export async function blockBuilderJourney(page:Page,info:TestInfo,runtime:{url:string;token:string}){
    console.log('Block proof: open');
    page.on('requestfailed',request=>{if(new URL(request.url()).pathname.startsWith('/media/'))console.log('Image network failure: '+request.failure()?.errorText);});
    page.on('console',message=>{if(message.type()==='error'&&/Content Security Policy|CORS|media\//.test(message.text()))console.log('Image browser diagnostic: '+message.text());});
    const headers={Origin:runtime.url,'X-Mango-Authoring-Fixture':runtime.token,'X-Mango-Block-Fixture':'1'};
    await page.context().setExtraHTTPHeaders({'X-Mango-Authoring-Fixture':runtime.token,'X-Mango-Block-Fixture':'1'});
    const open=await page.request.post(runtime.url+'/_authoring/open',{headers:{...headers,'X-Test-Token':runtime.token}});expect(open.status()).toBe(200);const {token}=await open.json();
    await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:token,url:runtime.url}]);
    const uploaded=await page.request.post(runtime.url+'/api/campaign-assets',{headers,multipart:{file:{name:'synthetic-mango-140.png',mimeType:'image/png',buffer:Buffer.from(png(200,160))}}});expect(uploaded.status()).toBe(201);const {asset}=await uploaded.json();expect(new URL(asset.url).protocol).toBe('https:');
    await page.route(new URL(asset.url).origin+'/media/**',async route=>{const response=await page.request.get(runtime.url+new URL(route.request().url()).pathname,{headers});expect(response.status()).toBe(200);console.log('Image edge: '+response.headers()['content-type']+' '+response.headers()['cross-origin-resource-policy']);await route.fulfill({response});});
    const create=await page.request.post(runtime.url+'/api/campaigns',{headers,data:{}});expect(create.status()).toBe(201);const {campaignId,revisionId}=await create.json();
    const configured=await page.request.patch(runtime.url+'/api/campaign-revisions/'+revisionId,{headers,data:{name:'Synthetic block letter',emailSubject:'Garden seeds',preheader:'From our garden',emailBody:'',steps:[{channel:'email',timezone:'Australia/Brisbane',scheduledAt:'2031-06-07T00:00:00.000Z',sendByAt:'2031-06-07T13:59:00.000Z',whyThisTime:'Operator selected'}]}});expect(configured.status()).toBe(200);
    await page.setViewportSize({width:1440,height:1000});await openPage(page,`${runtime.url}/app/campaigns/${campaignId}/review`);
    console.log('Block proof: build');
    await page.getByRole('button',{name:'Block builder',exact:true}).click();await page.getByRole('combobox',{name:'Block kind',exact:true}).selectOption('columns');await page.getByRole('button',{name:'Add block',exact:true}).click();
    for(const name of ['Product name','Product price','Product description','Image URL','Image description','Button text','Button destination'])await expect(page.getByRole('textbox',{name,exact:true})).toHaveValue('');
    for(const name of ['Image width','Image height'])await expect(page.getByRole('spinbutton',{name,exact:true})).toHaveValue('');
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
    const incomplete=await page.request.post(`${runtime.url}/api/campaigns/${campaignId}/checks`,{headers,data:{revisionId}});expect(incomplete.status()).toBe(200);const incompleteChecks=JSON.stringify(await incomplete.json());expect(incompleteChecks).toContain('Image source');expect(incompleteChecks).toContain('visible text label');
    const refused=await page.request.post(`${runtime.url}/api/campaigns/${campaignId}/approve`,{headers,data:{revisionId,idempotencyKey:'synthetic-mango-141'}});expect(refused.status()).toBe(409);
    await page.getByRole('button',{name:'Block 1: columns',exact:true}).click();
    await page.getByRole('textbox',{name:'Product name',exact:true}).fill('Garden seeds');await page.getByRole('textbox',{name:'Product price',exact:true}).fill('$20.00');await page.getByRole('textbox',{name:'Product description',exact:true}).fill('synthetic-mango-140');
    await page.getByRole('textbox',{name:'Image URL',exact:true}).fill(asset.url);await page.getByRole('textbox',{name:'Image description',exact:true}).fill('Garden seeds');await page.getByRole('spinbutton',{name:'Image width',exact:true}).fill('200');await page.getByRole('spinbutton',{name:'Image height',exact:true}).fill('160');
    await page.getByRole('textbox',{name:'Button text',exact:true}).fill('View product');await page.getByRole('textbox',{name:'Button destination',exact:true}).fill('https://example.test/garden');
    await page.getByRole('combobox',{name:'Selected column',exact:true}).selectOption('1');await expect(page.getByRole('textbox',{name:'Button text',exact:true})).toHaveValue('');await expect(page.getByRole('textbox',{name:'Button destination',exact:true})).toHaveValue('');await page.getByRole('textbox',{name:'Button text',exact:true}).fill('Explore the garden');await page.getByRole('textbox',{name:'Button destination',exact:true}).fill('https://example.test/garden');
    await page.getByRole('combobox',{name:'Selected column',exact:true}).selectOption('0');
    await page.getByLabel('Block padding',{exact:true}).fill('8');await page.getByRole('combobox',{name:'Block alignment',exact:true}).selectOption('center');
    await page.getByRole('combobox',{name:'Mobile column orientation',exact:true}).selectOption('stack-columns');
    await page.getByRole('combobox',{name:'Block kind',exact:true}).selectOption('text');await page.getByRole('button',{name:'Add block',exact:true}).click();await page.getByRole('textbox',{name:'Block text',exact:true}).fill('Synthetic second block');
    await page.getByRole('button',{name:'Move block 2 up',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Block 1: text',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Block 1: text',exact:true}).dragTo(page.getByRole('button',{name:'Block 2: columns',exact:true}));await expect(page.getByRole('button',{name:'Block 1: columns',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Duplicate block 1',exact:true}).click();await expect(page.getByRole('button',{name:'Delete block 3',exact:true})).toBeVisible();await page.getByRole('button',{name:'Delete block 2',exact:true}).click();await page.getByRole('button',{name:'Undo block change',exact:true}).click();await expect(page.getByRole('button',{name:'Delete block 3',exact:true})).toBeVisible();await page.getByRole('button',{name:'Redo block change',exact:true}).click();await expect(page.getByRole('button',{name:'Delete block 3',exact:true})).toHaveCount(0);
    console.log('Block proof: save');
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
    const read=async()=>{const response=await page.request.get(`${runtime.url}/api/campaigns/${campaignId}`,{headers});expect(response.status()).toBe(200);return (await response.json()).revision;};
    console.log('Block proof: reopen');
    const saved=await read();expect(parseEmailHtml(saved.emailBody).canonical).toBe(saved.emailBody);
    await reloadPage(page);await page.getByRole('button',{name:'Block builder',exact:true}).click();await page.getByRole('button',{name:'Block 1: columns',exact:true}).click();await expect(page.getByRole('combobox',{name:'Column count',exact:true})).toHaveValue('2');await expect(page.getByRole('combobox',{name:'Mobile column orientation',exact:true})).toHaveValue('stack-columns');
    await page.getByRole('button',{name:'HTML mode',exact:true}).click();await expect(page.getByLabel('Email body',{exact:true})).toHaveValue(authoredBody(saved.emailBody));await page.getByRole('button',{name:'Block builder',exact:true}).click();
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();expect((await read()).emailBody).toBe(saved.emailBody);
    await expect(page.getByRole('status',{name:'Email sent size',exact:true})).toContainText('Sent size upper bound:');
    await page.getByRole('button',{name:'Block 1: columns',exact:true}).click();
    console.log('Block proof: screens');
    let reusable:any,proof:Awaited<ReturnType<typeof prepareReusableProof>>|undefined;
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:1000});
      await page.getByRole('button',{name:'Block 2: text',exact:true}).click();
      if(width===1440){
        await page.getByRole('textbox',{name:'Reusable block name',exact:true}).fill('synthetic-mango-160 footer');
        await page.getByRole('button',{name:'Save reusable block',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Reusable block saved.'})).toBeVisible();
        const library=await page.request.get(runtime.url+'/api/reusable-email-blocks',{headers});expect(library.status()).toBe(200);
        reusable=(await library.json()).blocks.find((block:any)=>block.name==='synthetic-mango-160 footer');expect(reusable).toBeTruthy();proof=await prepareReusableProof(page.request,runtime.url,headers,reusable);
      }else{
        await page.getByLabel('Mobile font size',{exact:true}).fill('25');await page.getByRole('button',{name:'Update reusable block',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Reusable block updated.'})).toBeVisible();
        await verifyReusableProof(page.request,runtime.url,headers,reusable,proof!);
      }
      await page.getByRole('button',{name:'Block 1: columns',exact:true}).click();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
      await page.evaluate(axeSource);const audit=await page.evaluate(async()=>(window as any).axe.run(document.querySelector('main'),{iframes:false}));expect(audit.violations.filter((v:any)=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
      await page.getByRole('region',{name:'Email blocks',exact:true}).screenshot({path:info.outputPath(`block-builder-${width}.png`)});
    }
    await page.getByRole('button',{name:'Mobile email',exact:true}).click();await page.getByRole('button',{name:'Load 1 remote image',exact:true}).click();
    const preview=page.locator('iframe[title="Saved email preview"]');await expect(preview).toHaveAttribute('sandbox','');
    const previewFrame=page.frameLocator('iframe[title="Saved email preview"]');await expect(previewFrame.getByRole('img',{name:'Garden seeds',exact:true})).toBeVisible();await expect(previewFrame.getByRole('img',{name:'Garden seeds',exact:true})).toHaveJSProperty('naturalWidth',200);
    const previewProduct=await previewFrame.getByRole('heading',{name:'Garden seeds',exact:true}).boundingBox(),previewButton=await previewFrame.getByText('Explore the garden',{exact:true}).boundingBox();await expect(previewFrame.getByRole('link')).toHaveCount(0);expect(previewProduct).toBeTruthy();expect(previewButton!.y).toBeGreaterThan(previewProduct!.y);await preview.screenshot({path:info.outputPath('block-saved-mobile-preview.png')});
    await page.setViewportSize({width:375,height:1000});await page.setContent(saved.emailBody);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    expect(await page.getByRole('img',{name:'Garden seeds',exact:true}).evaluate(node=>(node as HTMLImageElement).complete&&(node as HTMLImageElement).naturalWidth===200)).toBe(true);
    const product=await page.getByRole('heading',{name:'Garden seeds',exact:true}).boundingBox(),button=await page.getByRole('link',{name:'Explore the garden',exact:true}).boundingBox();expect(product).toBeTruthy();expect(button).toBeTruthy();expect(button!.y).toBeGreaterThan(product!.y);await page.screenshot({path:info.outputPath('block-email-375.png'),fullPage:true});
    console.log('Block proof: approve');
    const approval=await page.request.post(`${runtime.url}/api/campaigns/${campaignId}/approve`,{headers,data:{revisionId,idempotencyKey:'synthetic-mango-140'}});expect(approval.status(),await approval.text()).toBe(200);expect((await read()).emailBody).toBe(saved.emailBody);
    return {revisionId,headers};
}

export async function blockMobileControlsJourney(page:Page,info:TestInfo,runtime:{url:string;token:string},headers:Record<string,string>){
  const origin=runtime.url,request=page.request;
  const created=await request.post(origin+'/api/campaigns',{headers,data:{}});expect(created.status()).toBe(201);
  const {campaignId,revisionId}=await created.json();
  const read=async()=>(await (await request.get(`${origin}/api/campaigns/${campaignId}`,{headers})).json()).revision;
  const column=(text:string)=>`<table role="presentation" align="left" width="280" cellpadding="0" cellspacing="0" border="0" style="width:280px;max-width:100%"><tr><td><p>${text}</p></td></tr></table>`;
  const emailBody=`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>${column('Left column')}${column('Right column')}</td></tr></table><p>Hidden on mobile</p><p>Mobile font example</p><p>Hidden on desktop</p>`;
  const saved=await request.patch(`${origin}/api/campaign-revisions/${revisionId}`,{headers,data:{emailBody,emailSubject:'Responsive garden letter',name:'Responsive garden letter',emailMobile:[{block:1,hideOnMobile:true},{block:2,fontSize:24,lineHeight:1.5,padding:12,alignment:'center'},{block:3,hideOnDesktop:true}]}});
  expect(saved.status(),await saved.text()).toBe(200);
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});await openPage(page,`${origin}/app/campaigns/${campaignId}/review`);
    await page.getByRole('button',{name:'Block builder',exact:true}).click();await page.getByRole('button',{name:'Block 3: text',exact:true}).click();
    await page.getByLabel('Hide on mobile',{exact:true}).check();await page.getByLabel('Hide on mobile',{exact:true}).uncheck();
    await page.getByLabel('Hide on desktop',{exact:true}).check();await page.getByLabel('Hide on desktop',{exact:true}).uncheck();
    await page.getByLabel('Mobile font size',{exact:true}).fill('26');await page.getByLabel('Mobile line height',{exact:true}).fill('1.6');await page.getByLabel('Mobile padding',{exact:true}).fill('14');await page.getByRole('combobox',{name:'Mobile alignment',exact:true}).selectOption('right');
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
    const updated=await read();expect(updated.emailBody).toContain('font-size: 26px !important');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
    await page.evaluate(axeSource);const shell=await page.evaluate(async()=>(window as any).axe.run(document,{iframes:false}));expect(shell.violations.filter((row:any)=>row.impact==='serious'||row.impact==='critical')).toEqual([]);
    await page.getByRole('region',{name:'Email blocks',exact:true}).screenshot({path:info.outputPath(`mobile-block-controls-${width}.png`)});
  }
  const controlled=await read();await page.setViewportSize({width:375,height:1000});await page.setContent(controlled.emailBody);
  const computed=await page.getByText('Mobile font example',{exact:true}).evaluate(node=>{const s=getComputedStyle(node);return {font:s.fontSize,line:s.lineHeight,padding:s.padding,text:s.textAlign};});
  expect(computed).toEqual({font:'26px',line:'41.6px',padding:'14px',text:'right'});
}
