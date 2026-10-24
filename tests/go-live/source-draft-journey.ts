import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {openPage} from '../support/navigation';
import {json,type Installation,draftCampaign} from './harness';
/** Membership-only snapshots pass through preview/apply without consent authority. */
export async function sourceDraftJourney(site:Installation,page:Page,info:TestInfo,cookie:string,provider:string){
  const before=await site.rows('SELECT * FROM consent_evidence ORDER BY id');
  const states=await site.rows('SELECT id,email_status,sms_status FROM contacts ORDER BY id');
  const emails=await site.rows('SELECT email FROM contacts WHERE email IS NOT NULL ORDER BY email');
  const topicOnly=`synthetic-mango-${provider==='activecampaign'?122:123}@example.test`;
  const preview=await json(await site.call('/api/audience/import-preview',{method:'POST',cookie,body:{files:[{name:'synthetic-mango-124.csv',preset:provider,csv:'email,lists\n'+[...emails.map(row=>row.email),topicOnly].map(email=>`${email},Garden review only`).join('\n')}],sourceExtras:{notes:[],templates:[],history:[],segments:[{name:'Garden review only',conditions:'Membership snapshot only; no consent.'}]}}}),200);
  const started=await json(await site.call('/api/audience/imports',{method:'POST',cookie,body:{fingerprint:preview.fingerprint}}),200);
  await expect.poll(async()=> (await json(await site.call(`/api/audience/imports/${started.job.id}`,{cookie}),200)).job.state).toBe('completed');
  expect(await site.rows('SELECT * FROM consent_evidence ORDER BY id')).toEqual(before);
  const after=await site.rows('SELECT id,email_status,sms_status FROM contacts ORDER BY id');
  expect(after.filter(row=>states.some(old=>old.id===row.id))).toEqual(states);
  const campaign=await draftCampaign(site,cookie,'Synthetic topic-only review',[topicOnly],new Date(Date.now()+3600000));
  const review=await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);
  expect(review.eligibleCount).toBe(0);
  const flows=await json(await site.call('/api/flow-drafts',{cookie}),200);
  const name=provider==='activecampaign'?'Welcome series':'Abandoned cart';
  const draft=flows.revisions.find((row:any)=>row.name===name);expect(draft).toBeTruthy();
  expect(draft.graph.nodes.some((node:any)=>node.label.includes('Unavailable'))).toBe(true);
  if(provider==='klaviyo')expect(JSON.stringify(draft.graph)).toContain('send-sms');
  await openPage(page,site.runtime.url+'/app/flows');
  await page.getByLabel('Saved revision',{exact:true}).selectOption(draft.id);
  await expect(page.getByLabel('Flow name',{exact:true})).toHaveValue(name);
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
    expect((await new AxeBuilder({page}).include('main').options({iframes:false}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
    await page.screenshot({path:info.outputPath(`${provider}-flow-draft-${width}.png`),fullPage:true});
  }
}
