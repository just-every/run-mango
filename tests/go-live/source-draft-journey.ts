import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {openPage} from '../support/navigation';
import {json,type Installation,draftCampaign} from './harness';
/** Membership-only snapshots pass through preview/apply without consent authority. */
export async function sourceDraftJourney(site:Installation,page:Page,info:TestInfo,cookie:string,provider:string){
  console.log(provider+': membership consent');
  const before=await site.rows('SELECT * FROM consent_evidence ORDER BY id');
  const states=await site.rows('SELECT id,email_status,sms_status FROM contacts ORDER BY id');
  const phones=await site.rows('SELECT * FROM contact_phones ORDER BY id');
  const emails=await site.rows('SELECT c.email,p.phone_e164 FROM contacts c LEFT JOIN contact_phones p ON p.contact_id=c.id WHERE c.email IS NOT NULL ORDER BY c.email');
  const topicOnly=`synthetic-mango-${provider==='activecampaign'?122:123}@example.test`;
  const preview=await json(await site.call('/api/audience/import-preview',{method:'POST',cookie,body:{consent:{brandOrLegalSender:'Mango Garden',messageCategory:'newsletter',frequencyDisclosure:'Monthly',destinationJurisdiction:'AU',consentText:'Send the monthly garden letter.',consentVersion:'synthetic-mango-v1'},files:[{name:'synthetic-mango-124.csv',preset:provider,csv:'email,phone,lists\n'+[...emails,{email:topicOnly,phone_e164:''}].map(row=>`${row.email},${row.phone_e164??''},Garden review only`).join('\n')}],sourceExtras:{notes:[],templates:[],history:[],segments:[{name:'Garden review only',conditions:'Membership snapshot only; no consent.'}]}}}),200);
  const started=await json(await site.call('/api/audience/imports',{method:'POST',cookie,body:{fingerprint:preview.fingerprint}}),200);
  let job=started.job;while(['queued','applying'].includes(job.state))job=(await json(await site.call(`/api/audience/imports/${job.id}/resume`,{method:'POST',cookie,body:{}}),200)).job;
  expect(job.state).toBe('completed');
  expect(await site.rows('SELECT * FROM consent_evidence ORDER BY id')).toEqual(before);
  expect(await site.rows('SELECT * FROM contact_phones ORDER BY id')).toEqual(phones);
  const after=await site.rows('SELECT id,email_status,sms_status FROM contacts ORDER BY id');
  expect(after.filter(row=>states.some(old=>old.id===row.id))).toEqual(states);
  console.log(provider+': topic-only campaign');
  const campaign=await draftCampaign(site,cookie,'Synthetic topic-only review',[topicOnly],new Date(Date.now()+3600000));
  console.log(provider+': topic-only checks');
  const review=await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);
  expect(review.eligibleCount).toBe(0);
  console.log(provider+': draft API');
  const flows=await json(await site.call('/api/flow-drafts',{cookie}),200);
  const name=provider==='activecampaign'?'Welcome series':'Abandoned cart';
  const draft=flows.revisions.find((row:any)=>row.name===name);expect(draft).toBeTruthy();
  expect(draft.graph.nodes.some((node:any)=>node.label.includes('Unavailable'))).toBe(true);
  if(provider==='klaviyo')expect(JSON.stringify(draft.graph)).toContain('send-sms');
  expect(await site.count('woocommerce_flow_enrollments')).toBe(0);expect(await site.count('recipient_steps')).toBe(0);
  console.log(provider+': draft UI');
  page.once('pageerror',error=>console.log('Draft UI error: '+error.message));
  await openPage(page,site.runtime.url+'/app/flows');
  console.log(provider+': draft hydrated');
  await page.getByRole('combobox',{name:'Saved revision',exact:true}).selectOption(draft.id);
  await expect(page.getByLabel('Flow name',{exact:true})).toHaveValue(name);
  for(const width of [1440]){
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
    expect((await new AxeBuilder({page}).include('main').options({iframes:false}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
    await page.screenshot({path:info.outputPath(`${provider}-flow-draft-${width}.png`),fullPage:true});
  }
}
