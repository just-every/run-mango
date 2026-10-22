import {segmentJourney} from './segment-journey';
import {test,expect} from '@playwright/test';
import {runtime,segment,rule,importContacts,createCampaign} from './runtime';
import {rows} from '../approval-binding/native';

test('SEG-001 AUD-001 AUD-002 AUD-007 CAMP-004 nested saved segments select exact contacts by count, event value, window and state at 1440/390; copied rules remain immutable',async({page},info)=>{
  test.setTimeout(600000);
  const h=await runtime();try {
    await h.f.prove();
    await importContacts(h,['subscribed','unsubscribed','cleaned','non-subscribed'],'segments');
    await h.json('/api/contacts/consent',{contact:{email:'segments-pending@example.test'},channel:'email',brandOrLegalSender:'Mango',messageCategory:'offers',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',captureMethod:'signup',captureSource:'https://mango.example.test/subscribe',consentText:'I agree to weekly offers.',consentVersion:'v1',occurredAt:new Date().toISOString()});
    expect((await h.call('/api/audience/segments',segment(),'POST',false)).status).toBe(401);
    const saved=(await h.json('/api/audience/segments',segment())).segment;
    const estimate=await h.json('/api/campaign-authoring/audience',{...saved,channels:['email']});
    expect(estimate).toMatchObject({status:'ok',candidateCount:5,eligibleCount:1,excludedCount:4});
    expect(estimate.exclusions).toEqual(expect.arrayContaining(['unsubscribed','suppressed','non-subscribed','pending'].map(status=>({reason:`email-${status}`,count:1}))));
    const overlapping=await h.json('/api/campaign-authoring/audience',{...saved,channels:['email'],exclusionRulesJson:JSON.stringify(['first exclusion','second exclusion'].map(reason=>({version:1,reason,predicate:{sourceType:'contact',field:'email',comparator:'eq',value:'segments-1@example.test'}})))});
    expect(overlapping).toMatchObject({candidateCount:5,eligibleCount:1,excludedCount:4});
    expect(overlapping.exclusions).toEqual(expect.arrayContaining(['first exclusion','second exclusion','email-unsubscribed'].map(reason=>({reason,count:1}))));
    const campaign=await createCampaign(h,saved.inclusionRuleJson);
    const review=await h.json(`/api/campaigns/${campaign.campaignId}/checks`,{revisionId:campaign.revisionId});
    expect(review.candidateCount).toBe(estimate.candidateCount);expect(review.eligibleCount).toBe(estimate.eligibleCount);expect(review.exclusions).toEqual(estimate.exclusions);
    const other=await createCampaign(h,saved.inclusionRuleJson,'Saved draft');
    await h.json(`/api/campaigns/${campaign.campaignId}/approve`,{revisionId:campaign.revisionId,idempotencyKey:'segment-copy-approval-unique'});
    const immutable=await rows(h.f.db,'campaign_revisions'),approved=await rows(h.f.db,'campaign_approval_requests'),candidates=await rows(h.f.db,'campaign_revision_candidates');
    await h.json(`/api/audience/segments/${saved.id}`,{...segment('Renamed readers'),inclusionRuleJson:rule('email','nobody@example.test','eq')},'PUT');
    expect((await h.json('/api/audience/segments')).segments[0].name).toBe('Renamed readers');
    await h.json(`/api/audience/segments/${saved.id}`,undefined,'DELETE');
    expect((await h.json('/api/audience/segments')).segments).toEqual([]);
    expect(await rows(h.f.db,'campaign_revisions')).toBe(immutable);expect(await rows(h.f.db,'campaign_approval_requests')).toBe(approved);expect(await rows(h.f.db,'campaign_revision_candidates')).toBe(candidates);
    expect((await h.json(`/api/campaigns/${other.campaignId}/review`)).revision.inclusionRuleJson).toBe(saved.inclusionRuleJson);
    const unavailable=await h.json('/api/campaign-authoring/audience',{inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'cart',field:'productId',comparator:'eq',value:'unavailable-product'}]}),exclusionRulesJson:'[]',channels:['email']});
    expect(unavailable.status).toBe('unavailable');expect(unavailable.candidateCount).toBeNull();
    const commerce=JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'inventory',field:'arbitrary',comparator:'eq',value:'x'}]});
    expect((await h.call('/api/audience/segments',{...segment(),inclusionRuleJson:commerce})).status).toBe(400);
  }finally{await h.dispose();}
  await segmentJourney(page,info);
});
