import {expect} from '@playwright/test';
import {consumeLifecycleQueue} from '../../src/core/features/lifecycle';
import {decisionRuntime,generated} from './runtime';

export async function ownerControlJourney() {
  const runtime=await decisionRuntime({delivery:true});
  try {
    const policyDoor='/api/settings/campaign-activation';
    expect((await runtime.call(policyDoor,{approverOperatorId:'proposal-analyst'},true,'PUT')).status).toBe(400);
    expect((await runtime.call(policyDoor,{approverOperatorId:runtime.colleague.id},true,'PUT')).status).toBe(200);
    const credential=await runtime.call('/api/settings/integrations',{name:'Synthetic Mango scheduler',scopes:['contacts:read','contacts:write','campaigns:send']});
    expect(credential.status).toBe(201);
    const token=credential.body.token;
    const address=['synthetic-mango-205','example.test'].join('@');
    const put=await runtime.machine('/api/integrations/v1/contacts',token,{email:address,displayName:'Synthetic Mango reader',segmentName:'Synthetic Mango approval cohort'},'PUT');
    expect(put.status).toBe(200);
    const segmentId=put.body.contact.segmentIds[0];
    const segment=await runtime.db.prepare('SELECT inclusion_rule_json inclusion FROM audience_segments WHERE id=?').bind(segmentId).first<{inclusion:string}>();
    expect(segment).toBeTruthy();
    await runtime.services.audienceService.captureConsent({idempotencyKey:'synthetic-mango-205',contact:{email:address,displayName:'Synthetic Mango reader'},channel:'email',brandOrLegalSender:runtime.platform.config.mailSender.displayName,messageCategory:'newsletter',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',captureMethod:'test-fixture',captureSource:'synthetic-mango-205',consentText:'Receive newsletter',consentVersion:'v1',occurredAt:new Date(),confirmationRequired:false});
    runtime.controls.alter=output=>{output.audience.inclusion=JSON.parse(segment!.inclusion);for(const predicate of output.audience.inclusion.predicates)predicate.lookbackDays=null;output.steps[0].scheduledAt=new Date(Date.now()+60000).toISOString();};
    const proposal=await generated(runtime);
    expect((await runtime.call(`/api/proposals/${proposal.proposalId}/adopt`,{})).status).toBe(200);
    const campaignDoor=`/api/campaigns/${proposal.campaignId}`;
    const editDoor=`/api/campaign-revisions/${proposal.revisionId}`;
    const read=async()=>(await runtime.call(campaignDoor)).body;
    const before=await read();
    expect(before.campaign).toMatchObject({state:'draft',proposalId:proposal.proposalId});
    expect(before.revision).toMatchObject({state:'draft',approvedByOperatorId:null,contentDigest:null});
    expect(runtime.jobs).toEqual([]);expect(runtime.deliveries).toEqual([]);
    console.log('PROBE PROP-005 1: generate, adopt and campaign GET -> editable draft, retained proposal provenance, no jobs or deliveries');

    const machineDoor=`/api/integrations/v1/campaigns/${proposal.campaignId}/send`;
    const held=await runtime.machine(machineDoor,token,{revisionId:proposal.revisionId,segmentId});
    expect(held).toMatchObject({status:202,body:{status:'held',revisionId:proposal.revisionId,approverOperatorId:runtime.colleague.id,riskClasses:['external','money']}});
    const replay=await runtime.machine(machineDoor,token,{revisionId:proposal.revisionId,segmentId});
    expect(replay.body.holdId).toBe(held.body.holdId);
    const approveDoor=campaignDoor+'/approve';
    const approve=(hold:any)=>({revisionId:proposal.revisionId,revisionUpdatedAt:hold.revisionUpdatedAt,holdId:hold.holdId,idempotencyKey:crypto.randomUUID()});
    expect((await runtime.call(approveDoor,approve(held.body))).status).toBe(409);
    expect((await read()).campaign.state).toBe('draft');
    expect(runtime.jobs).toEqual([]);expect(runtime.deliveries).toEqual([]);
    // A held authorization cannot silently follow a save to the same revision id.
    expect((await runtime.call(editDoor,{emailSubject:'Synthetic Mango reviewed harvest'},true,'PATCH')).status).toBe(200);
    const stale=await runtime.colleague.call(approveDoor,approve(held.body));
    expect(stale).toMatchObject({status:409,body:{error:'approval_conflict'}});
    expect((await read()).revision).toMatchObject({state:'draft',emailSubject:'Synthetic Mango reviewed harvest'});
    const fresh=await runtime.machine(machineDoor,token,{revisionId:proposal.revisionId,segmentId});
    expect(fresh.body.holdId).not.toBe(held.body.holdId);
    expect(runtime.jobs).toEqual([]);expect(runtime.deliveries).toEqual([]);
    const approval=await runtime.colleague.call(approveDoor,approve(fresh.body));
    expect(approval).toMatchObject({status:200,body:{status:'scheduled',idempotent:false}});
    const approved=await read();
    expect(approved.campaign).toMatchObject({state:'scheduled',activeRevisionId:proposal.revisionId});
    expect(approved.revision).toMatchObject({state:'approved',emailSubject:'Synthetic Mango reviewed harvest',approvedByOperatorId:runtime.colleague.id,contentDigest:approval.body.revisionDigest});
    expect(runtime.jobs).toHaveLength(1);
    expect(runtime.jobs[0]).toMatchObject({kind:'campaign.dispatch',payload:{campaignId:proposal.campaignId,revisionId:proposal.revisionId}});
    const pending=runtime.jobs[0] as Parameters<typeof consumeLifecycleQueue>[0]['messages'][number]['body'];
    const NativeDate=globalThis.Date;
    const later=Date.now()+61000;
    globalThis.Date=new Proxy(NativeDate,{construct(target,args,newTarget){return Reflect.construct(target,args.length?args:[later],newTarget);},get(target,key,receiver){return key==='now'?()=>later:Reflect.get(target,key,receiver);}});
    try {
      const consume=async()=>{
        let acknowledged=false;
        await consumeLifecycleQueue({messages:[{body:pending,ack(){acknowledged=true;},retry(){throw new Error('Synthetic Mango dispatch unexpectedly retried');}}]},runtime.services.lifecycleRuntime);
        expect(acknowledged).toBe(true);
      };
      await consume();
      expect(runtime.deliveries).toHaveLength(1);
      expect(runtime.deliveries[0]).toMatchObject({to:address,content:{subject:'Synthetic Mango reviewed harvest',html:expect.stringContaining('Garden news for you.')}});
      await consume();expect(runtime.deliveries).toHaveLength(1);
    } finally {globalThis.Date=NativeDate;}
    expect((await runtime.call(editDoor,{emailSubject:'Synthetic Mango unapproved replacement'},true,'PATCH')).status).toBe(409);
    expect((await read()).revision.emailSubject).toBe('Synthetic Mango reviewed harvest');
    const next=await generated(runtime);
    const nextHeld=await runtime.machine(`/api/integrations/v1/campaigns/${next.campaignId}/send`,token,{revisionId:next.revisionId,segmentId});
    expect(nextHeld.body.status).toBe('held');
    expect((await runtime.call(`/api/settings/integrations/${credential.body.credential.id}`,undefined,true,'DELETE')).status).toBe(200);
    expect((await runtime.machine(`/api/integrations/v1/campaigns/${next.campaignId}/send`,token,{revisionId:next.revisionId,segmentId})).status).toBe(401);
    const revoked=await runtime.colleague.call(`/api/campaigns/${next.campaignId}/approve`,{...approve(nextHeld.body),revisionId:next.revisionId});
    expect(revoked).toMatchObject({status:409,body:{error:'approval_conflict'}});
    expect((await runtime.call(`/api/campaigns/${next.campaignId}`)).body.campaign.state).toBe('draft');
    expect(runtime.deliveries).toHaveLength(1);
    console.log('PROBE PROP-005 2: scoped machine send -> held with external and money; other person and stale saved version refused; named person exact saved version approval -> scheduled with immutable content and approver');
  } finally {await runtime.close();}
}
