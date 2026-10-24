import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {openPage} from '../support/navigation';
import {json,type Installation} from './harness';
import {sourceIdentity} from '../../src/core/features/move-in/csv-sources';
export async function sourceApiJourney(site:Installation,page:Page,info:TestInfo,cookie:string){
  for(const [index,provider] of ['activecampaign','klaviyo'].entries()){
    const key=`synthetic-mango-${120+index}-key`;
    await openPage(page,site.runtime.url+'/app/audience/import');
    await page.getByRole('combobox',{name:'Source API',exact:true}).selectOption(provider);
    await page.getByRole('textbox',{name:'Account API origin',exact:true}).fill(provider==='activecampaign'?'https://synthetic-mango-120.api-us1.com':'https://a.klaviyo.com');
    await page.getByLabel('One-time source API key',{exact:true}).fill(key);await page.getByRole('button',{name:'Read export',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('Source export read.');await expect(page.getByLabel('One-time source API key',{exact:true})).toHaveValue('');
    for(const [label,value] of [['Brand or legal sender','Mango Garden'],['Disclosed frequency','Monthly'],['Destination jurisdiction','AU'],['Consent version','synthetic-mango-v1'],['Original consent text','Send the monthly garden letter.']])await page.getByRole('textbox',{name:new RegExp('^'+label)}).fill(value);
    await page.getByRole('combobox',{name:'Message category',exact:true}).selectOption('newsletter');
    await page.getByRole('button',{name:'Preview import',exact:true}).click();await expect(page.getByRole('heading',{name:'Source-held consent',exact:true})).toBeVisible();
    for(const radio of await page.getByRole('radio',{name:'I attest',exact:true}).all())await radio.check();
    const identity=sourceIdentity(provider,provider+'-export.csv');await page.getByRole('textbox',{name:'Type the source name to confirm: '+identity.sourceName,exact:true}).fill(identity.sourceName);
    await page.getByRole('button',{name:'Preview import',exact:true}).click();await expect(page.getByLabel('Consent evidence counts')).toContainText('Incumbent Held evidence: 1');
    for(const width of [1440,390]){await page.setViewportSize({width,height:1000});const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('main *')].filter(el=>el.getBoundingClientRect().right>window.innerWidth+1).slice(0,8).map(el=>({tag:el.tagName,style:el.className,right:Math.round(el.getBoundingClientRect().right)}))}));expect(layout.width,JSON.stringify(layout.overflow)).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);expect((await new AxeBuilder({page}).include('main').options({iframes:false}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo(0,0);});await page.screenshot({path:info.outputPath(`${provider}-api-${width}.png`),fullPage:true});}
    await page.getByRole('button',{name:'Start import',exact:true}).click();await expect(page.getByRole('button',{name:'Import started',exact:true})).toBeVisible();await expect(page.getByText('completed',{exact:true}).last()).toBeVisible();
    const prefix=`synthetic-mango-${120+index}`,rows=await site.rows(`SELECT email,email_status,sms_status FROM contacts WHERE email LIKE '${prefix}-%' ORDER BY email`);expect(rows.map(r=>r.email_status)).toEqual(['subscribed','suppressed','unsubscribed']);expect(rows.every(r=>r.sms_status!=='subscribed')).toBe(true);
    const jobs=await json(await site.call('/api/audience/imports',{cookie}),200);const report=await (await site.call(`/api/audience/imports/${jobs.jobs[0].id}/report`,{cookie})).text();expect(report).toContain('incumbent-held | 1');expect(report).not.toContain(key);
    if(provider==='activecampaign'){expect(report).toContain('Welcome series');expect(report).toContain('Garden topic');}
    else{expect((await site.rows("SELECT source_facts_json FROM incumbent_consent_links WHERE contact_id=(SELECT id FROM contacts WHERE email='synthetic-mango-121-active@example.test')")).some(r=>JSON.parse(r.source_facts_json).SOURCE_METHOD==='signup form')).toBe(true);expect(report).toContain('Abandoned cart');expect(report).toContain('send-sms');expect(report).toContain('unsupported-source-condition');expect(JSON.stringify(await json(await site.call('/api/campaign-templates',{cookie}),200))).toContain('Garden imported template');expect(await site.rows("SELECT kind,occurred_at FROM contact_history WHERE kind IN ('incumbent-order','incumbent-click') ORDER BY occurred_at")).toEqual([{kind:'incumbent-order',occurred_at:Date.parse('2026-03-01T00:00:00Z')},{kind:'incumbent-click',occurred_at:Date.parse('2026-03-02T00:00:00Z')}]);}
    const custody=await site.rows('SELECT content FROM audience_import_plan_chunks');expect(JSON.stringify(custody)).not.toContain(key);
    expect((await json(await site.call('/api/audience/segments',{cookie}),200)).segments.some((s:any)=>s.name.startsWith('Imported snapshot ·'))).toBe(true);
  }
  for(const role of ['author','analyst','support']){
    const roleCookie=await site.open(`synthetic-mango-${role}@example.test`,'synthetic-mango-'+role);
    await json(await site.call('/api/operators/synthetic-mango-'+role+'/role',{method:'PUT',cookie,body:{role}}),200);
    expect((await site.call('/api/audience/import-source',{method:'POST',cookie:roleCookie,body:{provider:'klaviyo',endpoint:'https://a.klaviyo.com',key:'synthetic-mango-121-key'}})).status).toBe(403);
  }
  expect((await site.call('/api/audience/import-source',{method:'POST',cookie,body:{provider:'klaviyo',endpoint:'https://foreign.example',key:'synthetic-mango-121-key'}})).status).toBe(422);
}
