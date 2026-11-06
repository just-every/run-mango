import {expect,test} from '@playwright/test';
import {decisionRuntime,generated} from './runtime';
import {history} from './history';
import {reusableRoleProof} from '../campaign-authoring/reusable-block-journey';

test('[PROP-001][PROP-002][PROP-003][PROP-004][PROP-005][PROP-006][PROP-007][PROP-008][PROP-009] grounded suggestions expose evidence and costs in revenue then deadline order, become editable drafts only by owner decision, and fail without substitutes',async()=>{
  test.setTimeout(300000);
  const runtime=await decisionRuntime();
  try {
    expect((await runtime.call('/api/proposals/generate',{},false)).status).toBe(401);
    const first=await generated(runtime);
    const detail=(await runtime.call(`/api/proposals/${first.proposalId}`)).body;
    expect(detail.proposal.state).toBe('proposed');
    expect(detail.audience).toMatchObject({candidateCount:3,excludedCount:1,eligibleCount:2});
    expect(detail.audienceChannelCounts).toEqual([expect.objectContaining({channel:'email',recipientStepCount:2})]);
    expect(detail.evidenceItems).toContainEqual(expect.objectContaining({sourceType:'product',observedValue:expect.objectContaining({title:'Garden linen'})}));
    expect(JSON.parse(detail.proposal.triggerEventsJson)).toContain(detail.evidenceItems[0].sourceRecordId);
    expect(Date.parse(detail.proposal.lookbackStartAt)).toBeLessThanOrEqual(Date.parse(detail.proposal.sourceDataAsOf));
    expect(Date.parse(detail.steps[0].scheduledAt)).toBeLessThan(Date.parse(detail.proposal.sendByAt));
    expect(detail.forecast).toMatchObject({status:'insufficient',valueMinor:null});
    expect(detail.composition.revision).toMatchObject({state:'draft',emailSubject:'From the garden',emailBody:expect.stringContaining('Garden news')});
    const review=(await runtime.call(`/api/campaigns/${first.campaignId}/review`)).body;
    expect(review).toBeTruthy();
    expect((await runtime.call(`/api/proposals/${first.proposalId}/adopt`,{})).body.campaignId).toBe(first.campaignId);
    expect((await runtime.call(`/api/proposals/${first.proposalId}/adopt`,{})).body.campaignId).toBe(first.campaignId);
    expect((await runtime.call(`/api/campaign-revisions/${first.revisionId}`,{name:'Owner revision',emailSubject:'Reviewed by the owner'},true,'PATCH')).status).toBe(200);
    expect((await runtime.call(`/api/campaigns/${first.campaignId}`)).body.revision).toMatchObject({state:'draft',name:'Owner revision',emailSubject:'Reviewed by the owner'});
    expect(runtime.jobs).toEqual([]);
    await history(runtime);
    runtime.controls.alter=output=>{output.audience.inclusion.predicates[0]={sourceType:'contact',field:'email',comparator:'eq',value:'first@example.test',lookbackDays:null};};
    const lower=await generated(runtime);
    runtime.controls.alter=output=>{output.steps[0].sendByAt=new Date(Date.now()+4*3600000).toISOString();};
    const higherLater=await generated(runtime);
    runtime.controls.alter=undefined;
    const forecasted=await generated(runtime);
    const forecast=(await runtime.call(`/api/proposals/${forecasted.proposalId}`)).body.forecast;
    expect(forecast).toMatchObject({status:'available',currency:'USD',historicalNetRevenueMinor:2400,proposedRecipientSteps:2,sampleSize:24});
    expect(forecast.campaignIds).toHaveLength(3);expect(forecast.sourceEventIds).toHaveLength(3);
    const desk=(await runtime.call('/api/decision-desk')).body;
    expect(desk.proposals.every((entry:any)=>entry.proposal.state==='proposed')).toBe(true);
    expect(desk.proposals.map((entry:any)=>entry.proposal.id)).toEqual([forecasted.proposalId,higherLater.proposalId,lower.proposalId,first.proposalId]);
    await runtime.db.prepare("UPDATE attribution_facts SET currency='AUD' WHERE id='attribution-0'").run();
    const mixed=await generated(runtime);
    expect((await runtime.call(`/api/proposals/${mixed.proposalId}`)).body.forecast).toMatchObject({status:'insufficient',valueMinor:null,currency:null});
    runtime.controls.alter=output=>{output.summary.text='This store has a fabricated recovery rate.';};
    const invalid=await runtime.call('/api/proposals/generate',{});
    expect(invalid).toMatchObject({status:409,body:{kind:'failed',error:'invalid_ai_output'}});
    expect((await runtime.call(`/api/proposals/${invalid.body.proposalId}`)).body.proposal).toMatchObject({state:'failed',campaignId:null});
    runtime.controls.alter=undefined;
    runtime.controls.failure=new Error('private provider diagnostic');
    const failed=await runtime.call('/api/proposals/generate',{});
    expect(failed).toMatchObject({status:409,body:{kind:'failed',error:'ai_provider_failed'}});
    const failure=(await runtime.call(`/api/proposals/${failed.body.proposalId}`)).body;
    expect(failure.proposal).toMatchObject({state:'failed',campaignId:null});
    expect(JSON.stringify(failure)).not.toContain('private provider diagnostic');
    expect(await runtime.db.prepare('SELECT units_known,reported_cost_micros,outcome FROM external_cost_facts WHERE proposal_id=?').bind(failed.body.proposalId).first()).toEqual({units_known:0,reported_cost_micros:null,outcome:'unknown'});
    runtime.controls.failure=undefined;
    const dismissed=await generated(runtime);
    expect((await runtime.call(`/api/proposals/${dismissed.proposalId}/dismiss`,{reason:''})).status).toBe(400);
    const decisions=await Promise.all(['No longer needed','Already planned'].map(reason=>runtime.call(`/api/proposals/${dismissed.proposalId}/dismiss`,{reason})));
    expect(decisions.map(result=>result.status).sort()).toEqual([200,409]);
    const decided=(await runtime.call(`/api/proposals/${dismissed.proposalId}`)).body;
    expect(decided.proposal.state).toBe('dismissed');
    expect(decided.history).toContainEqual(expect.objectContaining({toState:'dismissed',actorId:'proposal-operator',reason:expect.any(String)}));
    const remaining=(await runtime.call('/api/decision-desk')).body.proposals;
    expect(remaining.every((entry:any)=>entry.proposal.state==='proposed')).toBe(true);
    expect(remaining.map((entry:any)=>entry.proposal.id)).not.toContain(dismissed.proposalId);
    expect((await runtime.call(`/api/proposals/${dismissed.proposalId}/adopt`,{})).status).toBe(409);
    expect(runtime.jobs).toEqual([]);
    await reusableRoleProof(runtime);
    // A separate owner removes the generator; original actors are fixture facts,
    // independently checked before comparing retained records and public reads.
    const colleague=runtime.colleague;
    const retained=await colleague.call('/api/proposals/generate',{});
    expect(retained.status).toBe(201);
    const dismissedByColleague=await colleague.call('/api/proposals/generate',{});
    expect(dismissedByColleague.status).toBe(201);
    expect((await colleague.call(`/api/proposals/${dismissedByColleague.body.proposalId}/dismiss`,{reason:'Synthetic colleague decision'})).status).toBe(200);
    runtime.controls.failure=new Error('Synthetic provider refusal');
    const failedByColleague=await colleague.call('/api/proposals/generate',{});
    expect(failedByColleague).toMatchObject({status:409,body:{kind:'failed',error:'ai_provider_failed'}});
    runtime.controls.failure=undefined;
    runtime.controls.alter=output=>{output.summary.text='Synthetic unsupported claim';};
    const rejectedByColleague=await colleague.call('/api/proposals/generate',{});
    expect(rejectedByColleague).toMatchObject({status:409,body:{kind:'failed',error:'invalid_ai_output'}});
    runtime.controls.alter=undefined;
    const cases=[
      {id:retained.body.proposalId,state:'proposed',transitions:[{fromState:'generating',toState:'proposed',actorId:colleague.id,reason:'grounded-generation'}]},
      {id:dismissedByColleague.body.proposalId,state:'dismissed',transitions:[{fromState:'generating',toState:'proposed',actorId:colleague.id,reason:'grounded-generation'},{fromState:'proposed',toState:'dismissed',actorId:colleague.id,reason:'Synthetic colleague decision'}]},
      {id:failedByColleague.body.proposalId,state:'failed',transitions:[{fromState:'generating',toState:'failed',actorId:colleague.id,reason:'ai_provider_failed'}]},
      {id:rejectedByColleague.body.proposalId,state:'failed',transitions:[{fromState:'generating',toState:'failed',actorId:colleague.id,reason:'invalid_ai_output'}]},
    ];
    const readRetained=async()=>Promise.all(cases.map(async expected=>{
      const response=await runtime.call(`/api/proposals/${expected.id}`);
      expect(response.status).toBe(200);
      const proposal=await runtime.db.prepare('SELECT * FROM proposals WHERE id=?').bind(expected.id).first();
      const transitions=(await runtime.db.prepare('SELECT * FROM proposal_transitions WHERE proposal_id=? ORDER BY occurred_at,id').bind(expected.id).all()).results;
      return {detail:response.body,proposal,transitions};
    }));
    const originals=await readRetained();
    for(const [index,expected] of cases.entries()) {
      expect(originals[index].detail.proposal).toMatchObject({id:expected.id,state:expected.state});
      expect(originals[index].detail.history).toEqual(expected.transitions.map(event=>expect.objectContaining(event)));
      expect(originals[index].transitions).toEqual(expected.transitions.map(event=>expect.objectContaining({from_state:event.fromState,to_state:event.toState,actor_id:colleague.id,reason:event.reason})));
    }
    expect((await runtime.call(`/api/operators/${colleague.id}`,undefined,true,'DELETE')).status).toBe(403);
    expect(await readRetained()).toEqual(originals);
    expect((await colleague.call('/api/operator')).status).toBe(200);
    expect((await runtime.confirmOwner()).status).toBe(303);
    expect((await runtime.call(`/api/operators/${colleague.id}`,undefined,true,'DELETE')).status).toBe(204);
    expect((await runtime.call('/api/operator')).body.operator).toMatchObject({id:'proposal-operator',role:'owner'});
    expect(await runtime.db.prepare('SELECT display_name,removed_at FROM operators WHERE id=?').bind(colleague.id).first()).toEqual({display_name:colleague.name,removed_at:expect.any(Number)});
    for(let read=0;read<2;read++) {
      expect(await readRetained()).toEqual(originals);
      for(const expected of cases)expect(await colleague.call(`/api/proposals/${expected.id}`)).toEqual({status:401,body:{error:'unauthenticated'}});
    }
    expect((await colleague.call('/api/operator')).status).toBe(401);
    expect((await colleague.call('/api/proposals/generate',{})).status).toBe(401);
    expect((await colleague.call(`/api/proposals/${retained.body.proposalId}/dismiss`,{reason:'Revoked decision'})).status).toBe(401);
    expect(await readRetained()).toEqual(originals);
    expect(runtime.jobs).toEqual([]);
  } finally {await runtime.close();}
});
