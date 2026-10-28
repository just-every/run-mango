import {test,expect} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {runtime,rule,importContacts,createCampaign} from './runtime';
import {rows} from '../approval-binding/native';



export const walk0 = async()=>{

  const h=await runtime();try {
    await h.f.prove();
    expect((await h.call('/api/contacts/merge',{survivorContactId:'a',mergedContactId:'b'},'POST',false)).status).toBe(401);
    for(const status of ['unsubscribed','cleaned'])for(const reverse of [false,true]) {
      const contacts=await importContacts(h,['subscribed',status],`merge-${status}-${reverse}`);
      const subscribed=contacts.find(contact=>contact.emailStatus==='subscribed')!,restricted=contacts.find(contact=>contact.emailStatus!=='subscribed')!;
      const survivor=reverse?subscribed:restricted,merged=reverse?restricted:subscribed;
      const body={survivorContactId:survivor.id,mergedContactId:merged.id};
      expect((await h.json('/api/contacts/merge-preview',body)).emailStatus).toBe(restricted.emailStatus);
      await h.json('/api/contacts/merge',body);
      const detail=await h.json(`/api/contacts/${survivor.id}`);
      expect(detail.contact.emailStatus).toBe(restricted.emailStatus);expect(detail.emails).toHaveLength(2);expect(detail.history.some((item:any)=>item.kind==='contact-merged')).toBe(true);
      expect(detail.importObservations).toHaveLength(2);expect(detail.consent.length).toBeGreaterThan(0);
      const estimate=await h.json('/api/campaign-authoring/audience',{inclusionRuleJson:rule('email',survivor.email,'eq'),exclusionRulesJson:'[]',channels:['email']});
      expect(estimate.eligibleCount).toBe(0);
    }
    const pair=await importContacts(h,['subscribed','subscribed'],'merge-links');
    const [survivor,merged]=pair;
    const unsubscribe=await h.f.services.audienceService.issueUnsubscribeToken(merged.id,'email');
    const campaign=await createCampaign(h,rule('email',merged.email,'eq'),'Merged pending recipient');
    await h.json(`/api/campaigns/${campaign.campaignId}/approve`,{revisionId:campaign.revisionId,idempotencyKey:'merge-dispatch-approval-unique'});
    const frozen=await rows(h.f.db,'campaign_revision_candidates');
    const results=await Promise.all([1,2].map(()=>h.call('/api/contacts/merge',{survivorContactId:survivor.id,mergedContactId:merged.id})));
    expect(results.map(result=>result.status).sort()).toEqual([200,409]);
    expect(await rows(h.f.db,'campaign_revision_candidates')).toBe(frozen);
    const recipient=await h.f.db.prepare('SELECT * FROM recipient_steps WHERE campaign_id=?').bind(campaign.campaignId).first<any>();
    expect(recipient.contact_id).toBe(merged.id);
    const sentBefore=h.f.outbound.length;
    await h.f.lifecycle.delivery.dispatchStep({stepId:recipient.step_id,revisionId:campaign.revisionId,channel:'email'});
    expect(h.f.outbound.length).toBe(sentBefore);
    expect(await h.f.db.prepare('SELECT transport_disposition,skip_reason FROM recipient_steps WHERE id=?').bind(recipient.id).first()).toEqual({transport_disposition:'skipped',skip_reason:'contact-merged'});
    expect((await h.call(`/unsubscribe/${encodeURIComponent(unsubscribe.token)}`,{confirm:true})).status).toBe(200);
    const after=await h.json(`/api/contacts/${survivor.id}`);expect(after.contact.emailStatus).toBe('unsubscribed');expect(after.emails.every((item:any)=>item.channelStatus==='unsubscribed')).toBe(true);expect(after.campaignHistory).toHaveLength(1);
    const pending=await h.f.services.audienceService.captureConsent({contact:{email:'merge-pending@example.test'},channel:'email',brandOrLegalSender:'Mango',messageCategory:'offers',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',captureMethod:'signup',captureSource:'https://mango.example.test/subscribe',consentText:'I agree to weekly offers.',consentVersion:'v1',occurredAt:new Date(),confirmationRequired:true});
    const other=(await importContacts(h,['pending'],'merge-confirm'))[0];
    await h.json('/api/contacts/merge',{survivorContactId:other.id,mergedContactId:pending.contact.id});
    expect((await h.call(`/consent/confirm/${encodeURIComponent(pending.confirmation!.token)}`,{confirm:true})).status).toBe(200);
    expect((await h.json(`/api/contacts/${other.id}`)).consent.some((entry:any)=>entry.confirmedAt)).toBe(true);
    const union=await importContacts(h,['subscribed','subscribed'],'merge-union');
    for(const contact of union) {
      await h.f.services.audienceService.ingestCommerceWebhook({provider:'test-commerce',completion:'delta',adapterCompleted:true,sourceTypes:['order'],records:[{sourceType:'order',providerSourceId:`order-${contact.id}`,occurredAt:new Date(),payload:{email:contact.email,total:10},contact:{email:contact.email},activity:{kind:'order',state:'completed'}}]});
      const authored=await createCampaign(h,rule('email',contact.email,'eq'),`History ${contact.email}`);
      await h.json(`/api/campaigns/${authored.campaignId}/approve`,{revisionId:authored.revisionId,idempotencyKey:`union-approval-${contact.id}`});
      await h.f.services.audienceService.recordProviderSuppression({destination:contact.email,channel:'email',cause:'hard-bounce',occurredAt:new Date(),providerEventId:`union-${contact.id}`});
    }
    const originals=await Promise.all(union.map(contact=>h.json(`/api/contacts/${contact.id}`)));
    await h.json('/api/contacts/merge',{survivorContactId:union[0].id,mergedContactId:union[1].id});
    const combined=await h.json(`/api/contacts/${union[0].id}`);
    for(const field of ['consent','sourceActivity','suppressions','campaignHistory','importObservations']) expect(combined[field].map((item:any)=>item.id).sort()).toEqual(originals.flatMap(item=>item[field].map((entry:any)=>entry.id)).sort());
    expect(combined.history.map((item:any)=>item.id)).toEqual(expect.arrayContaining(originals.flatMap(item=>item.history.map((entry:any)=>entry.id))));
    expect((await h.call('/api/contacts/merge',{survivorContactId:other.id,mergedContactId:'missing'})).status).toBe(409);
    expect((await h.f.db.prepare('SELECT merge_lock FROM contacts WHERE id=?').bind(other.id).first<any>()).merge_lock).toBeNull();
    if(process.env.MANGO_CONTROLS_EVIDENCE){await mkdir(process.env.MANGO_CONTROLS_EVIDENCE,{recursive:true});await writeFile(join(process.env.MANGO_CONTROLS_EVIDENCE,'merge-verification.json'),JSON.stringify({authenticatedRoute:'/api/contacts/merge',unauthenticated:401,restrictiveBothDirections:['unsubscribed','suppressed'],subscribedAliasEligible:false,oldUnsubscribe:200,oldConfirmation:200,queuedMergedRecipient:{disposition:'skipped',reason:'contact-merged',providerHandoffs:0},frozenCandidatesUnchanged:true,union:['consent','sourceActivity','suppressions','campaignHistory','importObservations','history'],concurrentPair:[200,409],missingPartner:409,survivorLock:null},null,2));}

  }finally{await h.dispose();}
};
