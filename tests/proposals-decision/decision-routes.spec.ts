import {expect,test} from '@playwright/test';
import {decisionRuntime,dueProposal,generated,persistedTransitions,timed,type DecisionRuntime} from './runtime';
import {history} from './history';
import {reusableRoleProof} from '../campaign-authoring/reusable-block-journey';

type Transition=Awaited<ReturnType<typeof persistedTransitions>>[number];
const visibleHistory=(rows:Transition[])=>rows.map(({id,createdAt,occurredAt,...row})=>({...row,occurredAt:new Date(occurredAt).toISOString()}));

async function assertTransition(runtime:DecisionRuntime,proposalId:string,
  expected:{fromState:string;toState:string;actorId:string;reason:string},window:{before:number;after:number}) {
  const response=await runtime.call(`/api/proposals/${proposalId}`);
  expect(response.status).toBe(200);
  expect(response.body.proposal.state).toBe(expected.toState);
  const rows=await persistedTransitions(runtime,proposalId);
  expect(response.body.history).toEqual(visibleHistory(rows));
  const applicable=rows.filter(row=>row.toState===expected.toState);
  expect(applicable).toHaveLength(1);
  expect(applicable[0]).toMatchObject(expected);
  expect(applicable[0].occurredAt).toBeGreaterThanOrEqual(window.before);
  expect(applicable[0].occurredAt).toBeLessThanOrEqual(window.after);
  return rows;
}

async function assertUnchangedHistory(runtime:DecisionRuntime,proposalId:string,original:Transition[]) {
  for(let read=0;read<2;read++) {
    const detail=await runtime.call(`/api/proposals/${proposalId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.history).toEqual(visibleHistory(original));
    const desk=await runtime.call('/api/decision-desk');
    expect(desk.status).toBe(200);
    const terminal=original.filter(row=>row.toState!=='proposed');
    expect(desk.body.recentDecisions.filter((row:any)=>row.proposalId===proposalId)).toEqual(
      terminal.map(row=>expect.objectContaining({state:row.toState,actorId:row.actorId,reason:row.reason,occurredAt:new Date(row.occurredAt).toISOString()})));
  }
  expect(await persistedTransitions(runtime,proposalId)).toEqual(original);
}

test('[PROP-001][PROP-002][PROP-003][PROP-004][PROP-005][PROP-006][PROP-007][PROP-008][PROP-009] grounded suggestions expose evidence and costs in revenue then deadline order, become editable drafts only by owner decision, and fail without substitutes',async()=>{
  test.setTimeout(300000);
  const runtime=await decisionRuntime();
  try {
    expect((await runtime.call('/api/proposals/generate',{},false)).status).toBe(401);
    const generation=await timed(()=>generated(runtime));
    const first=generation.value;
    const detail=(await runtime.call(`/api/proposals/${first.proposalId}`)).body;
    expect(detail.proposal.state).toBe('proposed');
    const proposedHistory=await assertTransition(runtime,first.proposalId,{fromState:'generating',toState:'proposed',actorId:'proposal-operator',reason:'grounded-generation'},generation);
    expect(proposedHistory).toHaveLength(1);
    await assertUnchangedHistory(runtime,first.proposalId,proposedHistory);
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
    const invalidGeneration=await timed(()=>runtime.call('/api/proposals/generate',{}));
    const invalid=invalidGeneration.value;
    expect(invalid).toMatchObject({status:409,body:{kind:'failed',error:'invalid_ai_output'}});
    expect((await runtime.call(`/api/proposals/${invalid.body.proposalId}`)).body.proposal).toMatchObject({state:'failed',campaignId:null});
    const invalidHistory=await assertTransition(runtime,invalid.body.proposalId,{fromState:'generating',toState:'failed',actorId:'proposal-operator',reason:'invalid_ai_output'},invalidGeneration);
    expect(invalidHistory).toHaveLength(1);
    await assertUnchangedHistory(runtime,invalid.body.proposalId,invalidHistory);
    runtime.controls.alter=undefined;
    runtime.controls.failure=new Error('private provider diagnostic');
    const failedGeneration=await timed(()=>runtime.call('/api/proposals/generate',{}));
    const failed=failedGeneration.value;
    expect(failed).toMatchObject({status:409,body:{kind:'failed',error:'ai_provider_failed'}});
    const failure=(await runtime.call(`/api/proposals/${failed.body.proposalId}`)).body;
    expect(failure.proposal).toMatchObject({state:'failed',campaignId:null});
    expect(JSON.stringify(failure)).not.toContain('private provider diagnostic');
    const failedHistory=await assertTransition(runtime,failed.body.proposalId,{fromState:'generating',toState:'failed',actorId:'proposal-operator',reason:'ai_provider_failed'},failedGeneration);
    expect(failedHistory).toHaveLength(1);
    await assertUnchangedHistory(runtime,failed.body.proposalId,failedHistory);
    expect(await runtime.db.prepare('SELECT units_known,reported_cost_micros,outcome FROM external_cost_facts WHERE proposal_id=?').bind(failed.body.proposalId).first()).toEqual({units_known:0,reported_cost_micros:null,outcome:'unknown'});
    runtime.controls.failure=undefined;
    const dismissed=await generated(runtime);
    expect((await runtime.call(`/api/proposals/${dismissed.proposalId}/dismiss`,{reason:''})).status).toBe(400);
    const reasons=['No longer needed','Already planned'];
    const dismissal=await timed(()=>Promise.all(reasons.map(reason=>runtime.call(`/api/proposals/${dismissed.proposalId}/dismiss`,{reason}))));
    const decisions=dismissal.value;
    expect(decisions.map(result=>result.status).sort()).toEqual([200,409]);
    const decided=(await runtime.call(`/api/proposals/${dismissed.proposalId}`)).body;
    expect(decided.proposal.state).toBe('dismissed');
    expect(decided.history).toContainEqual(expect.objectContaining({toState:'dismissed',actorId:'proposal-operator',reason:expect.any(String)}));
    const dismissedHistory=await assertTransition(runtime,dismissed.proposalId,{fromState:'proposed',toState:'dismissed',actorId:'proposal-operator',reason:reasons[decisions.findIndex(result=>result.status===200)]},dismissal);
    expect(dismissedHistory).toHaveLength(2);
    const remaining=(await runtime.call('/api/decision-desk')).body.proposals;
    expect(remaining.every((entry:any)=>entry.proposal.state==='proposed')).toBe(true);
    expect(remaining.map((entry:any)=>entry.proposal.id)).not.toContain(dismissed.proposalId);
    expect((await runtime.call(`/api/proposals/${dismissed.proposalId}/adopt`,{})).status).toBe(409);
    expect((await runtime.call(`/api/campaigns/${dismissed.campaignId}/approve`,{revisionId:dismissed.revisionId,idempotencyKey:'synthetic-mango-009-dismissed'})).status).toBe(409);
    await assertUnchangedHistory(runtime,dismissed.proposalId,dismissedHistory);
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

    const approvalBody={revisionId:first.revisionId,idempotencyKey:'synthetic-mango-009-approval'};
    const approval=await timed(()=>runtime.call(`/api/campaigns/${first.campaignId}/approve`,approvalBody));
    expect(approval.value,JSON.stringify(approval.value.body)).toMatchObject({status:200,body:{status:'scheduled',idempotent:false}});
    const approved=(await runtime.call(`/api/campaigns/${first.campaignId}`)).body;
    expect(approved.campaign).toMatchObject({id:first.campaignId,proposalId:first.proposalId,state:'scheduled',activeRevisionId:first.revisionId});
    expect(approved.revision).toMatchObject({id:first.revisionId,state:'approved',approvedByOperatorId:'proposal-operator',contentDigest:approval.value.body.revisionDigest});
    const approvedHistory=await assertTransition(runtime,first.proposalId,{fromState:'proposed',toState:'approved',actorId:'proposal-operator',reason:`approval:${first.revisionId}`},approval);
    expect(approvedHistory).toHaveLength(2);
    expect(approvedHistory[0]).toEqual(proposedHistory[0]);
    expect(approvedHistory[1].occurredAt).toBeGreaterThan(proposedHistory[0].occurredAt);
    expect((await runtime.call(`/api/proposals/${first.proposalId}`)).body.proposal.campaignId).toBe(first.campaignId);
    expect(await runtime.call(`/api/campaigns/${first.campaignId}/approve`,approvalBody)).toMatchObject({status:200,body:{idempotent:true,revisionDigest:approval.value.body.revisionDigest}});
    expect((await runtime.call(`/api/proposals/${first.proposalId}/dismiss`,{reason:'Too late'})).status).toBe(409);
    await assertUnchangedHistory(runtime,first.proposalId,approvedHistory);

    const expiring=await generated(runtime);
    const beforeExpiry=await persistedTransitions(runtime,expiring.proposalId);
    expect(beforeExpiry.map(row=>row.toState)).toEqual(['proposed']);
    const deadline=await dueProposal(runtime,expiring.proposalId);
    const expiry=await timed(()=>runtime.call(`/api/proposals/${expiring.proposalId}`));
    expect(expiry.value).toMatchObject({status:200,body:{proposal:{state:'expired'}}});
    const expiredHistory=await assertTransition(runtime,expiring.proposalId,{fromState:'proposed',toState:'expired',actorId:'system:send-by-deadline',reason:'send-by instant passed'},expiry);
    expect(expiredHistory).toHaveLength(2);
    expect(expiredHistory[0]).toEqual(beforeExpiry[0]);
    expect(expiredHistory[1].occurredAt).toBeGreaterThan(deadline);
    expect((await runtime.call(`/api/proposals/${expiring.proposalId}/adopt`,{})).status).toBe(409);
    expect((await runtime.call(`/api/proposals/${expiring.proposalId}/dismiss`,{reason:'Too late'})).status).toBe(409);
    expect((await runtime.call(`/api/campaigns/${expiring.campaignId}/approve`,{revisionId:expiring.revisionId,idempotencyKey:'synthetic-mango-009-expired'})).status).toBe(409);
    await assertUnchangedHistory(runtime,expiring.proposalId,expiredHistory);
  } finally {await runtime.close();}
});
