import {contract} from '../contract.js';
import {segmentJourney} from './segment-journey';
import {test,expect} from '@playwright/test';
import {runtime,segment,rule,importContacts,createCampaign} from './runtime';
import {rows} from '../approval-binding/native';



export const walk0 = async({page},info)=>{

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
    await test.step('Overlapping inclusions freeze each email recipient step once and approval replay adds no authority',async()=>{
      const prefix='synthetic-mango-overlap';
      const contacts=await importContacts(h,['subscribed','subscribed','unsubscribed'],prefix);
      expect(contacts).toHaveLength(3);
      const selected=[0,1].map(index=>contacts.find(contact=>contact.email.split('@')[0]===`${prefix}-${index}`)!);
      for(const contact of selected)expect(contact.emailStatus).toBe('subscribed');
      const excluded=contacts.find(contact=>contact.email.split('@')[0]===`${prefix}-2`)!;
      expect(excluded.emailStatus).toBe('unsubscribed');
      const unrelated=(await h.json('/api/audience')).contacts.find((contact:any)=>contact.email.startsWith('segments-0'));
      expect(unrelated.emailStatus).toBe('subscribed');
      const branches=['email','displayName'].map(field=>({version:1,operator:'all',predicates:[
        {sourceType:'contact',field,comparator:'contains',value:prefix},
      ]}));
      // Prove both independent branches select every fixture contact, including
      // the ineligible match, and leave an eligible unrelated contact outside.
      for(const branch of branches)for(const contact of [...contacts,unrelated]) {
        const member=contact.id!==unrelated.id;
        const inclusionRuleJson=JSON.stringify({version:1,operator:'all',groups:[branch],predicates:[
          {sourceType:'contact',field:'id',comparator:'eq',value:contact.id},
        ]});
        expect(await h.json('/api/campaign-authoring/audience',{inclusionRuleJson,exclusionRulesJson:'[]',channels:['email']}))
          .toMatchObject({status:'ok',candidateCount:member?1:0,eligibleCount:member&&contact.emailStatus==='subscribed'?1:0});
      }
      const inclusionRuleJson=JSON.stringify({version:1,operator:'any',predicates:[],groups:branches});
      const overlap=await createCampaign(h,inclusionRuleJson,'Overlapping email readers');
      const firstAt=Date.now()+3600000;
      await h.json(`/api/campaign-revisions/${overlap.revisionId}`,{steps:[0,1,2].map(index=>({
        channel:'email',timezone:'UTC',scheduledAt:new Date(firstAt+index*25*3600000).toISOString(),
        sendByAt:new Date(firstAt+index*25*3600000+3600000).toISOString(),whyThisTime:'Operator selected time',
      }))},'PATCH');
      const draft=await h.json(`/api/campaigns/${overlap.campaignId}/review`);
      expect(draft.steps.map((step:any)=>step.channel)).toEqual(['email','email','email']);
      expect(await h.json(`/api/campaigns/${overlap.campaignId}/checks`,{revisionId:overlap.revisionId}))
        .toMatchObject({candidateCount:3,eligibleCount:2,channelCounts:[{channel:'email',recipientStepCount:6}]});
      const authorityTables=['campaign_approval_requests','campaign_revision_candidates','recipient_steps','sender_verification_associations','sms_approval_policies'];
      const readAuthority=()=>Promise.all(authorityTables.map(table=>rows(h.f.db,table)));
      const belongsToRevision=(row:any,index:number)=>(index===3?row.entity_id:row.revision_id)===overlap.revisionId;
      const before=await readAuthority();
      for(const [index,snapshot]of before.entries())expect(JSON.parse(snapshot).filter((row:any)=>belongsToRevision(row,index))).toEqual([]);
      const approval={revisionId:overlap.revisionId,idempotencyKey:'synthetic-mango-overlap-approval'};
      const approved=await h.json(`/api/campaigns/${overlap.campaignId}/approve`,approval);
      expect(approved).toMatchObject({status:'scheduled',idempotent:false});
      const frozen=await readAuthority();
      const [approvals,candidates,recipients,senderAuthority,smsAuthority]=frozen.map((snapshot,index)=>JSON.parse(snapshot).filter((row:any)=>belongsToRevision(row,index)));
      expect(approvals).toHaveLength(1);
      expect(approvals[0]).toMatchObject({campaign_id:overlap.campaignId,revision_digest:approved.revisionDigest,idempotency_key:approval.idempotencyKey});
      expect(senderAuthority).toEqual([expect.objectContaining({kind:'approval',entity_id:overlap.revisionId,attempt_key:approval.idempotencyKey})]);
      expect(smsAuthority).toEqual([]);
      expect(candidates.map((row:any)=>({contactId:row.contact_id,identity:row.contact_identity_key})).sort((a,b)=>a.contactId.localeCompare(b.contactId)))
        .toEqual(selected.map(contact=>({contactId:contact.id,identity:contact.id})).sort((a,b)=>a.contactId.localeCompare(b.contactId)));
      const tuple=(row:any)=>[row.contact_id,row.contact_identity_key,row.channel,row.step_id,row.destination].join(':');
      expect(recipients.map(tuple).sort()).toEqual(selected.flatMap(contact=>draft.steps.map((step:any)=>
        tuple({contact_id:contact.id,contact_identity_key:contact.id,channel:'email',step_id:step.id,destination:contact.email}))).sort());
      for(const row of recipients)expect(row).toMatchObject({campaign_id:overlap.campaignId,transport_disposition:'queued',attempt_count:0});
      for(const [index,snapshot]of frozen.entries()) {
        expect(JSON.parse(snapshot)).toHaveLength(JSON.parse(before[index]).length+[1,2,6,1,0][index]);
        expect(JSON.parse(snapshot).filter((row:any)=>!belongsToRevision(row,index)))
          .toEqual(JSON.parse(before[index]));
      }
      const scheduled=await h.json(`/api/campaigns/${overlap.campaignId}/review`);
      expect(scheduled.campaign).toMatchObject({state:'scheduled',activeRevisionId:overlap.revisionId});
      expect(scheduled.revision.state).toBe('approved');
      for(const idempotencyKey of [approval.idempotencyKey,'synthetic-mango-overlap-replay']) {
        expect(await h.json(`/api/campaigns/${overlap.campaignId}/approve`,{...approval,idempotencyKey}))
          .toEqual({...approved,idempotent:true});
        expect(await readAuthority()).toEqual(frozen);
      }
    });
  }finally{await h.dispose();}
  await segmentJourney(page,info);
};
