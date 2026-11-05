const width = 1440;
import {test,contract,runtime} from './runtime-fixture';
import {expect} from '@playwright/test';
import {localSessionCookieName} from '../support/local-session';
import {openPage} from '../support/navigation';


export const walk0 = async({page,request})=>{
  const seed=await request.post(`${runtime.url}/_results/followup`,{headers:{'X-Test-Token':runtime.token}});expect(seed.ok()).toBe(true);const fixture=await seed.json();
  const login=await request.post(`${runtime.url}/_results/open`,{headers:{'X-Test-Token':runtime.token}});const {token}=await login.json();
  await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:token,domain:'127.0.0.1',path:'/'}]);await page.setViewportSize({width,height:1000});
  const post=(path:string,data:unknown)=>page.request.post(runtime.url+path,{data,headers:{Origin:runtime.url}});
  const before=await (await page.request.get(`${runtime.url}/api/campaigns/${fixture.campaignId}`)).json();
  const premature=await post(`/api/campaigns/${fixture.campaignId}/followup`,{subject:'A closer look',delayHours:96,metric:'click'});expect(premature.status()).toBe(409);expect((await premature.json()).kind).toBe('too-early');
  await openPage(page,`${runtime.url}/app/campaigns/${fixture.campaignId}/scheduled`);
  await page.getByText('Follow up with non-engaged readers',{exact:true}).click();await page.getByLabel('New follow-up subject').fill('A closer look at the new ceramics');
  await page.getByLabel('Follow-up delay hours').fill('48');await page.screenshot({path:test.info().outputPath(`followup-create-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Create follow-up draft',exact:true}).click();await page.waitForURL(/\/review$/);
  await expect(page.getByRole('complementary',{name:'Follow-up source'})).toContainText('48 hours');
  const created=page.url().split('/').at(-2)!;const review=await (await page.request.get(`${runtime.url}/api/campaigns/${created}/review`)).json();
  expect(review.campaign.state).toBe('draft');expect(review.revision.state).toBe('draft');expect(review.steps).toEqual([]);expect(review.revision.emailSubject).toBe('A closer look at the new ceramics');
  const actual=await post('/api/campaign-authoring/audience',{inclusionRuleJson:review.revision.inclusionRuleJson,exclusionRulesJson:review.revision.exclusionRulesJson,channels:['email']});
  expect(actual.ok(),await actual.text()).toBe(true);const audience=await actual.json();expect(audience.candidateCount).toBe(fixture.expectedCandidateIds.length);expect(audience.eligibleCount).toBe(fixture.expectedEligibleIds.length);
  expect(audience.exclusions).toEqual(expect.arrayContaining([{reason:'email-unsubscribed',count:1},{reason:'email-suppressed',count:1},{reason:'frequency-window',count:1}]));
  // Identify membership through the same native review door, independently of
  // aggregate totals: each saved cohort is intersected with one known contact.
  const savedRule=JSON.parse(review.revision.inclusionRuleJson);
  const candidateIds:string[]=[],eligibleIds:string[]=[];
  for(const contactId of fixture.contactIds as string[]) {
    const identity={sourceType:'contact',field:'id',comparator:'eq',value:contactId};
    const response=await post('/api/campaign-authoring/audience',{
      inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[identity],groups:[savedRule]}),
      exclusionRulesJson:review.revision.exclusionRulesJson,channels:['email'],
    });
    expect(response.ok(),await response.text()).toBe(true);
    const member=await response.json();
    expect(member.status,contactId).toBe('ok');
    expect(member.candidateCount,`${contactId} original non-clicker membership`).toBe(Number(fixture.expectedCandidateIds.includes(contactId)));
    expect(member.eligibleCount,`${contactId} current review eligibility`).toBe(Number(fixture.expectedEligibleIds.includes(contactId)));
    if(member.candidateCount===1)candidateIds.push(contactId);
    if(member.eligibleCount===1)eligibleIds.push(contactId);
  }
  expect(candidateIds.sort()).toEqual([...fixture.expectedCandidateIds].sort());
  expect(eligibleIds.sort()).toEqual([...fixture.expectedEligibleIds].sort());
  // The unrelated negative control exists and could receive ordinary email;
  // only absence from the original campaign keeps it out of this follow-up.
  const unrelated=await post('/api/campaign-authoring/audience',{
    inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'id',comparator:'eq',value:'followup-unrelated'}]}),
    exclusionRulesJson:'[]',channels:['email'],
  });
  expect(unrelated.ok(),await unrelated.text()).toBe(true);
  expect(await unrelated.json()).toMatchObject({status:'ok',candidateCount:1,eligibleCount:1});
  const approval=await post(`/api/campaigns/${created}/approve`,{revisionId:review.revision.id,idempotencyKey:crypto.randomUUID()});expect(approval.status()).toBe(409);expect((await approval.json()).status).toBe('blocked');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await page.screenshot({path:test.info().outputPath(`followup-review-${width}.png`),fullPage:true});
  const copied=await post(`/api/campaigns/${created}/duplicate`,{});expect(copied.status()).toBe(201);const copy=await copied.json();
  const copiedParent=await (await page.request.get(`${runtime.url}/api/campaigns/${copy.campaignId}/followup-parent`)).json();expect(copiedParent.followup.sourceCampaignId).toBe(fixture.campaignId);
  const missing=await post('/api/campaign-authoring/audience',{inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'campaign',field:'followup',comparator:'eq',value:'missing-audience'}]}),exclusionRulesJson:'[]',channels:['email']});expect(await missing.json()).toMatchObject({status:'unavailable',eligibleCount:null});
  const enable=await page.request.put(`${runtime.url}/api/insights/open-tracking`,{headers:{Origin:runtime.url},data:{enabled:true}});expect(enable.status()).toBe(200);
  const pixels=await request.post(`${runtime.url}/_results/followup-opens`,{headers:{'X-Test-Token':runtime.token}});expect(pixels.ok()).toBe(true);
  const estimated=await post(`/api/campaigns/${fixture.campaignId}/followup`,{subject:'An estimated non-opener follow-up',delayHours:48,metric:'open-estimate'});expect(estimated.status()).toBe(201);const estimatedDraft=await estimated.json();
  const estimatedReview=await (await page.request.get(`${runtime.url}/api/campaigns/${estimatedDraft.campaignId}/review`)).json();
  const estimatedAudience=await post('/api/campaign-authoring/audience',{inclusionRuleJson:estimatedReview.revision.inclusionRuleJson,exclusionRulesJson:estimatedReview.revision.exclusionRulesJson,channels:['email']});expect(await estimatedAudience.json()).toMatchObject({candidateCount:5,eligibleCount:3});
  await openPage(page,`${runtime.url}/app/campaigns/${estimatedDraft.campaignId}/review`);await expect(page.getByRole('complementary',{name:'Follow-up source'})).toContainText('open estimate');await page.screenshot({path:test.info().outputPath(`followup-estimate-review-${width}.png`),fullPage:true});
  await openPage(page,`${runtime.url}/app/campaigns/${fixture.campaignId}/scheduled`);await page.getByText('Follow up with non-engaged readers',{exact:true}).click();await page.getByLabel('Follow-up engagement').selectOption('open-estimate');await expect(page.getByText('Image loads are privacy-sensitive estimates and do not prove a person read a message.',{exact:true})).toBeVisible();await page.getByLabel('Follow-up engagement').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath(`followup-estimate-choice-${width}.png`)});
  const disable=await page.request.put(`${runtime.url}/api/insights/open-tracking`,{headers:{Origin:runtime.url},data:{enabled:false}});expect(disable.status()).toBe(200);
  const after=await (await page.request.get(`${runtime.url}/api/campaigns/${fixture.campaignId}`)).json();expect(after.revision).toEqual(before.revision);expect(after.steps).toEqual(before.steps);
};
