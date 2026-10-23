import {expect,type APIRequestContext,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {rejectedPresentation} from '../support/adversarial-email.mjs';
import {openPage} from '../support/navigation';

export async function mobilePresentationJourney(request:APIRequestContext,page:Page,info:TestInfo,origin:string,headers:Record<string,string>) {
  const created=await request.post(origin+'/api/campaigns',{headers,data:{}});expect(created.status()).toBe(201);
  const {campaignId,revisionId}=await created.json();
  const patch=(data:unknown)=>request.patch(`${origin}/api/campaign-revisions/${revisionId}`,{headers,data});
  const read=async()=>(await (await request.get(`${origin}/api/campaigns/${campaignId}`,{headers})).json()).revision;
  const checks=async()=>{const response=await request.post(`${origin}/api/campaigns/${campaignId}/checks`,{headers,data:{revisionId}});expect(response.status()).toBe(200);return response.json();};
  // Two independent drafts keep the public-door adversarial matrix bounded
  // without concurrent writes to one revision or another test registration.
  await Promise.all([0,1].map(async lane=>{
    const created=await request.post(origin+'/api/campaigns',{headers,data:{}});expect(created.status()).toBe(201);
    const target=await created.json();
    for(const [name,emailBody] of rejectedPresentation.filter((_,index)=>index%2===lane)) {
      const saved=await request.patch(`${origin}/api/campaign-revisions/${target.revisionId}`,{headers,data:{emailBody}});
      if(saved.status()===400)expect((await saved.json()).detail,name).toBeTruthy();
      else {
        expect(saved.status(),name+': '+await saved.text()).toBe(200);
        const response=await request.post(`${origin}/api/campaigns/${target.campaignId}/checks`,{headers,data:{revisionId:target.revisionId}});expect(response.status()).toBe(200);
        expect((await response.json()).blockers.map((row:any)=>row.kind),name).toContain('message.content');
      }
    }
  }));
  for(const emailBody of ['<style>p{color:red}</style><p>Authored style</p>','<p class="authored">Authored class</p>','<p style="font-size:16px!important">Authored priority</p>']) {
    const saved=await patch({emailBody});expect(saved.status()).toBe(400);expect((await saved.json()).detail).toBeTruthy();
  }
  const hiddenFooter=await patch({emailBody:'<p>{{physical_address}}</p>',emailMobile:[{block:0,hideOnMobile:true}]});
  expect(hiddenFooter.status()).toBe(400);expect((await hiddenFooter.json()).detail).toContain('hidden block');
  const oversize=await patch({emailBody:Array.from({length:128},(_,i)=>`<p>Block ${i+1}</p>`).join(''),emailMobile:Array.from({length:128},(_,block)=>({block,hideOnDesktop:true,orientation:'stack',fontSize:24,lineHeight:1.5,padding:12,alignment:'center'}))});
  expect(oversize.status()).toBe(400);expect((await oversize.json()).detail).toMatch(/\d+ bytes/);
  const column=(text:string)=>`<table role="presentation" align="left" width="280" cellpadding="0" cellspacing="0" border="0" style="width:280px;max-width:100%"><tr><td><p>${text}</p></td></tr></table>`;
  const emailBody=`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>${column('Left column')}${column('Right column')}</td></tr></table><p>Hidden on mobile</p><p>Mobile font example</p><p>Hidden on desktop</p>`;
  const saved=await patch({emailBody,emailSubject:'Responsive garden letter',name:'Responsive garden letter',emailMobile:[{block:1,hideOnMobile:true},{block:2,fontSize:24,lineHeight:1.5,padding:12,alignment:'center'},{block:3,hideOnDesktop:true}]});
  expect(saved.status(),await saved.text()).toBe(200);
  const revision=await read();expect(revision.emailText).toContain('Hidden on mobile');expect(revision.emailText).toContain('Hidden on desktop');
  const checked=(await checks()).blockers.map((row:any)=>row.kind);expect(checked).not.toContain('message.content');expect(checked).not.toContain('message.personalisation');
  const changed=await patch({emailBody:revision.emailBody.replace('font-size: 24px !important','font-size: 25px !important')});
  expect(changed.status()).toBe(400);expect((await changed.json()).detail).toContain('byte-identical');
  expect((await read()).emailBody).toBe(revision.emailBody);
  for(const width of [375,600])for(const quirks of [false,true])for(const stripped of [false,true]) {
    const document=revision.emailBody.replace(/^<!doctype html>/,quirks?'':'<!doctype html>').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,part=>stripped?'':part);
    await page.setViewportSize({width,height:1000});await page.setContent(document);
    expect(await page.evaluate(()=>document.compatMode)).toBe(quirks?'BackCompat':'CSS1Compat');
    const left=await page.getByText('Left column',{exact:true}).boundingBox(),right=await page.getByText('Right column',{exact:true}).boundingBox();
    expect(left).not.toBeNull();expect(right).not.toBeNull();
    if(width===375)expect(right!.y).toBeGreaterThan(left!.y);else expect(Math.abs(right!.y-left!.y)).toBeLessThan(1);
    if(!stripped&&width===375)await expect(page.getByText('Hidden on mobile',{exact:true})).toBeHidden();else await expect(page.getByText('Hidden on mobile',{exact:true})).toBeVisible();
    if(!stripped&&width===600)await expect(page.getByText('Hidden on desktop',{exact:true})).toBeHidden();else await expect(page.getByText('Hidden on desktop',{exact:true})).toBeVisible();
    if(!stripped&&width===375)expect(await page.getByText('Mobile font example',{exact:true}).evaluate(node=>getComputedStyle(node).fontSize)).toBe('24px');
    expect(await page.evaluate(()=>document.querySelectorAll('head > style').length)).toBe(stripped?0:1);
    expect((await new AxeBuilder({page}).include('body').options({iframes:false}).analyze()).violations.filter(row=>row.impact==='serious'||row.impact==='critical')).toEqual([]);
    await page.screenshot({path:info.outputPath(`mobile-email-${width}-${quirks?'quirks':'standards'}-${stripped?'stripped':'generated'}.png`),fullPage:true});
  }
  const cookie=headers.Cookie.split('=');await page.context().addCookies([{name:cookie[0],value:cookie.slice(1).join('='),url:origin}]);
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});await openPage(page,`${origin}/app/campaigns/${campaignId}`);
    await expect(page.locator('iframe[title="Saved email preview"]')).toBeVisible();
    await expect(page.getByText('Mobile overrides require the generated style block.',{exact:false})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
    expect((await new AxeBuilder({page}).options({iframes:false}).analyze()).violations.filter(row=>row.impact==='serious'||row.impact==='critical')).toEqual([]);
    await page.locator('[aria-label="Saved revision previews"]').screenshot({path:info.outputPath(`mobile-preview-${width}.png`)});
  }
}
