import {expect,type Page,type TestInfo} from '@playwright/test';
import {createRequire} from 'node:module';
const localRequire=createRequire(import.meta.url);
const axeSource=createRequire(localRequire.resolve('@axe-core/playwright'))('axe-core').source as string;
import {openPage,reloadPage} from '../support/navigation';
export async function flowTemplateJourney(page:Page,info:TestInfo,url:string,headers:Record<string,string>){
  await page.setViewportSize({width:1440,height:1000});
  const list=await page.request.get(url+'/api/campaign-templates',{headers});expect(list.status()).toBe(200);
  const template=(await list.json()).templates.find((t:any)=>t.kind==='saved');expect(template).toBeTruthy();
  const copy=await page.request.get(url+'/api/flow-drafts/templates/'+template.id,{headers});expect(copy.status()).toBe(200);
  const original=(await copy.json()).email;
  await openPage(page,url+'/app/flows');
  await page.getByLabel('Flow name',{exact:true}).fill('synthetic-mango-125');
  await page.getByRole('combobox',{name:'Node kind',exact:true}).selectOption('email');await page.getByRole('button',{name:'Add node',exact:true}).click();
  await page.getByLabel('Node name',{exact:true}).fill('Synthetic library email');
  await page.getByRole('combobox',{name:'Library template',exact:true}).selectOption(template.id);
  await expect(page.getByRole('textbox',{name:'Email HTML',exact:true})).toHaveValue(original.html);
  await expect(page.getByLabel('Email subject',{exact:true})).toHaveValue(original.subject);
  await page.getByRole('combobox',{name:'Node kind',exact:true}).selectOption('exit');await page.getByRole('button',{name:'Add node',exact:true}).click();await page.getByLabel('Node name',{exact:true}).fill('Synthetic exit');
  await page.getByRole('button',{name:'Subscription confirmed',exact:true}).click();await page.getByRole('checkbox',{name:'Synthetic library email',exact:true}).check();
  await page.getByRole('button',{name:'Synthetic library email',exact:true}).click();await page.getByRole('checkbox',{name:'Synthetic exit',exact:true}).check();
  await page.getByRole('button',{name:'Save draft revision',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft revision saved.');
  const read=async()=>{const r=await page.request.get(url+'/api/flow-drafts',{headers});expect(r.status()).toBe(200);return (await r.json()).revisions.find((r:any)=>r.name==='synthetic-mango-125');};
  const saved=await read();expect(saved.graph.nodes.find((n:any)=>n.kind==='email').email).toEqual(original);
  const started=await page.request.post(url+'/api/campaign-templates/'+template.id+'/start',{headers});expect(started.status()).toBe(201);const {revisionId}=await started.json();
  const changed=await page.request.patch(url+'/api/campaign-revisions/'+revisionId,{headers,data:{emailSubject:'Synthetic changed library subject',emailBody:'<p>Synthetic replacement library copy.</p>'}});expect(changed.status()).toBe(200);
  const updated=await page.request.post(url+'/api/campaign-templates',{headers,data:{revisionId,name:template.name,templateId:template.id,updatedAt:Date.parse(template.updatedAt)}});expect(updated.status()).toBe(201);
  expect(JSON.stringify((await read()).graph)).toBe(JSON.stringify(saved.graph));
  const later=await page.request.get(url+'/api/flow-drafts/templates/'+template.id,{headers});expect((await later.json()).email.subject).toBe('Synthetic changed library subject');
  for(const width of [1440]){
    await page.setViewportSize({width,height:1000});await reloadPage(page);await page.getByRole('combobox',{name:'Saved revision',exact:true}).selectOption(saved.id);await page.getByRole('button',{name:'Synthetic library email',exact:true}).click();
    await expect(page.getByRole('textbox',{name:'Email HTML',exact:true})).toHaveValue(original.html);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
    await page.evaluate(axeSource);const audit=await page.evaluate(async()=>(window as any).axe.run(document.querySelector('main'),{iframes:false}));expect(audit.violations.filter((v:any)=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
    await page.screenshot({path:info.outputPath(`flow-library-copy-${width}.png`),fullPage:true});
  }
}
