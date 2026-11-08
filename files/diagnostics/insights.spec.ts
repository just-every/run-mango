import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {installation,json,sender} from '../tests/go-live/harness';
import {providerEdge} from '../tests/go-live/edge';
import {eventSigner} from '../tests/go-live/sendgrid-events';

test('Insights hydration alone retains exactly one table',async({page},info)=>{
 const evidence:any[]=[];
 page.on('console',message=>{if(['error','warning'].includes(message.type()))evidence.push({type:message.type(),text:message.text()});});
 page.on('pageerror',error=>evidence.push({type:'pageerror',text:error.message}));
 await page.addInitScript(()=>{
  (window as any).hydrationMutations=[];
  const observer=new MutationObserver(()=>{
   const count=document.querySelectorAll('[data-compliance-domain="example.test"] [data-requirement=complaints]').length;
   const last=(window as any).hydrationMutations.at(-1);
   if(last?.count!==count)(window as any).hydrationMutations.push({at:performance.now(),count,ready:document.documentElement.dataset.mangoHydrated, insights:document.querySelectorAll('.insights-page').length, copies:[...document.querySelectorAll('[data-compliance-domain="example.test"] [data-requirement=complaints]')].map(e=>({hidden:!!e.closest('[hidden]'),parent:e.closest('.insights-page')?.parentElement?.tagName}))});
  });
  observer.observe(document,{childList:true,subtree:true});
 });
 const edge=await providerEdge(),site=await installation(edge,eventSigner());
 try{
  const cookie=await site.open();
  await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
  await site.control('/_golive/sender-evidence');
  await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  for(let i=0;i<50;i++){
   await page.goto(site.runtime.url+'/app/insights');
   await page.waitForFunction(()=>document.documentElement.dataset.mangoHydrated==='true');
   await page.waitForLoadState('networkidle');
   const state=await page.evaluate(()=>({
    rows:document.querySelectorAll('[data-compliance-domain="example.test"] [data-requirement=complaints]').length,
    insights:document.querySelectorAll('.insights-page').length,
    mutations:(window as any).hydrationMutations,
    dom:[...document.querySelectorAll('.insights-page')].map(e=>({parent:e.parentElement?.outerHTML.slice(0,300),hidden:!!e.closest('[hidden]')})),
   }));
   evidence.push({navigation:i,...state});
   console.log(JSON.stringify({navigation:i,...state}));
   await expect(page.locator('[data-compliance-domain="example.test"] [data-requirement=complaints]')).toHaveCount(1);
   expect(state.mutations.every((row:any)=>row.count<=1),'Streamed and hydrated tables must never coexist').toBe(true);
  }
 }finally{
  await writeFile('../packet/diagnostic-insights.json',JSON.stringify(evidence,null,2));
  await site.runtime.close();await edge.close();
 }
});

test('zone choices publish in this tab and another tab and survive reload',async({page},info)=>{
 const edge=await providerEdge(),site=await installation(edge,eventSigner());
 const other=await page.context().newPage();
 test.setTimeout(120000);page.setDefaultTimeout(20000);other.setDefaultTimeout(20000);
 try{
  const cookie=await site.open();
  await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
  await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  const open=async(p:any)=>{await p.goto(site.runtime.url+'/app/insights');await p.waitForFunction(()=>document.documentElement.dataset.mangoHydrated==='true');};
  await open(page);await open(other);
  const first=page.getByLabel('Times shown in'),second=other.getByLabel('Times shown in');
  const initial=await first.inputValue();
  const values=await first.locator('option').evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value));
  const selected=values.find(value=>value!==initial)!;
  await first.selectOption(selected);
  await expect(first).toHaveValue(selected);await expect(second).toHaveValue(selected);
  const updatedValues=await second.locator('option').evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value));
  const changed=updatedValues.find(value=>value!==selected)!;
  await second.selectOption(changed);
  await expect(first).toHaveValue(changed);await expect(second).toHaveValue(changed);
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.mangoHydrated==='true');
  await expect(first).toHaveValue(changed);
  console.log(JSON.stringify({sameTab:true,crossTab:true,reload:true}));
 }finally{await other.close().catch(()=>{});await site.runtime.close();await edge.close();}
});
