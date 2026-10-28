import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {openPage} from '../support/navigation';
import {json,type Installation} from './harness';
import {sourceIdentity} from '../../src/core/features/move-in/csv-sources';
export async function sourceCsvJourney(site:Installation,page:Page,info:TestInfo,cookie:string){
  await page.context().clearCookies();await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  const recentSourceTime=new Date(Date.now()-24*60*60*1000).toISOString();
  for(const [index,preset] of ['beehiiv','omnisend','customerio'].entries()){
    console.log(`Source CSV ${preset}: upload`);
    const name=`synthetic-mango-${110+index}.csv`,prefix=`synthetic-mango-${110+index}`,csv='email,status,subscription_tier,unsubscribed,bounced,subscribed_at,tags\n'+[`${prefix}-active@example.test,active,premium,false,false,${recentSourceTime},garden`,`${prefix}-out@example.test,active,free,true,false,${recentSourceTime},garden`,`${prefix}-bounce@example.test,active,free,false,true,${recentSourceTime},garden`].join('\n');
    await openPage(page,site.runtime.url+'/app/audience/import');
    await page.getByLabel('Choose CSV files',{exact:true}).setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from(csv)});
    await page.getByRole('combobox',{name:'Preset for '+name,exact:true}).selectOption(preset);
    for(const [label,value] of [['Brand or legal sender','Mango Garden'],['Disclosed frequency','Monthly'],['Destination jurisdiction','AU'],['Consent version','synthetic-mango-v1'],['Original consent text','Send the monthly garden letter.']])await page.getByRole('textbox',{name:new RegExp('^'+label)}).fill(value);
    await page.getByRole('combobox',{name:'Message category',exact:true}).selectOption('newsletter');
    await page.getByRole('button',{name:'Preview import',exact:true}).click();await expect(page.getByRole('heading',{name:'Source-held consent',exact:true})).toBeVisible();
    console.log(`Source CSV ${preset}: attest`);
    for(const radio of await page.getByRole('radio',{name:'I attest',exact:true}).all())await radio.check();
    const identity=sourceIdentity(preset,name);await page.getByRole('textbox',{name:'Type the source name to confirm: '+identity.sourceName,exact:true}).fill(identity.sourceName);
    await page.getByRole('button',{name:'Preview import',exact:true}).click();await expect(page.getByLabel('Consent evidence counts')).toContainText('Incumbent Held evidence: 1');
    console.log(`Source CSV ${preset}: review`);
    for(const width of [1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);expect((await new AxeBuilder({page}).include('main').options({iframes:false}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo(0,0);});await page.screenshot({path:info.outputPath(`${preset}-csv-${width}.png`),fullPage:true});}
    await page.getByRole('button',{name:/^Start import/}).click();await expect(page.getByRole('button',{name:'Import started',exact:true})).toBeVisible();await expect(page.getByText('completed',{exact:true}).last()).toBeVisible();
    console.log(`Source CSV ${preset}: applied`);
    const rows=await site.rows(`SELECT email,email_status,id FROM contacts WHERE email LIKE '${prefix}-%' ORDER BY email`);
    expect(rows.map(r=>[r.email,r.email_status])).toEqual([[`${prefix}-active@example.test`,'subscribed'],[`${prefix}-bounce@example.test`,'suppressed'],[`${prefix}-out@example.test`,'unsubscribed']]);
    const active=rows.find(r=>r.email.endsWith('-active@example.test'))!;const profile=await json(await site.call('/api/contacts/'+active.id,{cookie}),200);expect(JSON.stringify(profile)).toContain('premium');expect(JSON.stringify(profile)).toContain('garden');
    const jobs=await json(await site.call('/api/audience/imports',{cookie}),200),report=await site.call(`/api/audience/imports/${jobs.jobs[0].id}/report`,{cookie});expect(report.status).toBe(200);expect(await report.text()).toContain('incumbent-held | 1');
  }
}
