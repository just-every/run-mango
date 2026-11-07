import {expect,test} from '@playwright/test';
import {decisionRuntime,generated,type DecisionRuntime} from './runtime';
import {history} from './history';
import type {GeneratedProposalWire} from '../../src/core/features/proposals/generation';

async function authority(runtime:DecisionRuntime) {
  const rows=async(table:string)=>(await runtime.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results;
  return {
    campaigns:await rows('campaigns'),revisions:await rows('campaign_revisions'),
    steps:await rows('campaign_steps'),links:await rows('campaign_revision_links'),
    recipients:await rows('recipient_steps'),approvals:await rows('campaign_approval_requests'),
    dispatches:await rows('step_dispatches'),forecasts:await rows('proposal_forecasts'),
    jobs:structuredClone(runtime.jobs),
  };
}

test('[PROP-006] forged citations and altered observations fail without composition or campaign authority, then valid generation recovers',async()=>{
  test.setTimeout(300000);
  const runtime=await decisionRuntime();
  try {
    await history(runtime);
    const own=await generated(runtime);
    const original=await runtime.call(`/api/proposals/${own.proposalId}`);
    expect(original.status).toBe(200);
    expect(original.body.forecast).toMatchObject({status:'available',valueMinor:200,historicalNetRevenueMinor:2400,sampleSize:24});
    expect(original.body.composition.revision.state).toBe('draft');
    const before=await authority(runtime);
    expect(before.recipients).toHaveLength(24);
    expect(before.approvals).toEqual([]);
    expect(before.dispatches).toEqual([]);
    expect(before.jobs).toEqual([]);
    const protectedClaims:Array<{field:string;select:(output:GeneratedProposalWire)=>GeneratedProposalWire['summary']}>= [
      {field:'summary',select:output=>output.summary},
      {field:'audience explanation',select:output=>output.audience.explanation},
      {field:'timing explanation',select:output=>output.steps[0].whyThisTime},
    ];
    for(const {field,select} of protectedClaims)for(const mutation of ['unknown key','altered observed value']) {
      runtime.controls.alter=output=>{
        const valid=structuredClone(output);
        const supplied=(runtime.controls.lastRequest!.evidence as {items:Array<{key:string;observedValueJson:string;allowedClaim:string}>}).items;
        for(const {select:claimAt} of protectedClaims) {
          const claim=claimAt(output);
          const item=supplied.find(item=>item.key===claim.citations[0].key)!;
          expect(item).toBeDefined();
          expect(claim.citations).toEqual([{key:item.key,observedValueJson:item.observedValueJson}]);
          expect(claim.text).toBe(item.allowedClaim);
        }
        const citation=select(output).citations[0];
        if(mutation==='unknown key') {
          const key='synthetic-mango-unknown-citation';
          expect(supplied.some(item=>item.key===key)).toBe(false);
          citation.key=key;
        } else {
          citation.observedValueJson=JSON.stringify('synthetic-mango-altered-observation');
          expect(supplied.find(item=>item.key===citation.key)!.observedValueJson).not.toBe(citation.observedValueJson);
        }
        // Only the selected citation property changes; prose and all other output stay valid.
        expect(output).not.toEqual(valid);
        const restored=structuredClone(output);
        select(restored).citations=select(valid).citations;
        expect(restored).toEqual(valid);
      };
      const refused=await runtime.call('/api/proposals/generate',{});
      expect(refused,`${field}: ${mutation}`).toMatchObject({status:409,body:{kind:'failed',error:'invalid_ai_output'}});
      const id=refused.body.proposalId;
      const failed=await runtime.db.prepare('SELECT * FROM proposals WHERE id=?').bind(id).first();
      expect(failed).toMatchObject({id,state:'failed',campaign_id:null,summary:'',decision_context_json:'{}',generation_error:'invalid_ai_output'});
      for(let read=0;read<2;read++) {
        const detail=await runtime.call(`/api/proposals/${id}`);
        expect(detail.status).toBe(200);
        expect(detail.body.proposal).toMatchObject({id,state:'failed',campaignId:null,summary:'',generationError:'invalid_ai_output'});
        expect(detail.body.composition).toBeUndefined();
        expect(detail.body.steps).toEqual([]);
        expect(detail.body.forecast.status).toBe('unavailable');
        expect(detail.body.forecast.valueMinor).toBeUndefined();
        expect(await runtime.db.prepare('SELECT COUNT(*) AS count FROM proposal_forecasts WHERE proposal_id=?').bind(id).first()).toEqual({count:0});
        expect(await runtime.db.prepare('SELECT COUNT(*) AS count FROM proposal_steps WHERE proposal_id=?').bind(id).first()).toEqual({count:0});
        const adoption=await runtime.call(`/api/proposals/${id}/adopt`,{});
        expect(adoption).toMatchObject({status:409,body:{kind:'unavailable'}});
        const desk=await runtime.call('/api/decision-desk');
        expect(desk.status).toBe(200);
        expect(desk.body.proposals.map((entry:any)=>entry.proposal.id)).toEqual([own.proposalId]);
        expect(await runtime.call(`/api/proposals/${own.proposalId}`)).toEqual(original);
        expect(await runtime.db.prepare('SELECT * FROM proposals WHERE id=?').bind(id).first()).toEqual(failed);
        expect(await authority(runtime)).toEqual(before);
      }
      console.log(`PROBE PROP-006 acceptances-2-3 ${field}, ${mutation}: native generation -> HTTP 409 invalid_ai_output; repeated detail and desk reads retain failed proposal, no composition or accepted forecast, refused adoption and unchanged existing campaign, revision, recipient and dispatch authority`);
    }
    runtime.controls.alter=undefined;
    const recoveryStarted=Date.now();
    const recovered=await generated(runtime);
    const recoveryCompleted=Date.now();
    const recoveredDetail=await runtime.call(`/api/proposals/${recovered.proposalId}`);
    expect(Date.parse(recoveredDetail.body.forecast.asOf)).toBeGreaterThanOrEqual(recoveryStarted);
    expect(Date.parse(recoveredDetail.body.forecast.asOf)).toBeLessThanOrEqual(recoveryCompleted);
    expect(recoveredDetail.body.forecast).toMatchObject({status:'available',valueMinor:200,historicalNetRevenueMinor:2400,
      sampleSize:24,campaignCount:3,eventCount:3,proposedRecipientSteps:2,currency:'USD',metric:'expected-revenue',
      campaignIds:['history-0','history-1','history-2'],sourceEventIds:['historic-order-0','historic-order-1','historic-order-2']});
    for(let read=0;read<2;read++) {
      const detail=await runtime.call(`/api/proposals/${recovered.proposalId}`);
      expect(detail.status).toBe(200);
      expect(detail.body.proposal).toMatchObject({state:'proposed',campaignId:recovered.campaignId});
      expect(detail.body.composition.revision).toMatchObject({id:recovered.revisionId,state:'draft'});
      expect(detail.body.forecast).toEqual(recoveredDetail.body.forecast);
      const desk=await runtime.call('/api/decision-desk');
      expect(desk.status).toBe(200);
      expect(desk.body.proposals.map((entry:any)=>entry.proposal.id).sort()).toEqual([own.proposalId,recovered.proposalId].sort());
      expect(await runtime.call(`/api/proposals/${own.proposalId}`)).toEqual(original);
      const after=await authority(runtime);
      expect(after.campaigns.filter(row=>row.id!==recovered.campaignId)).toEqual(before.campaigns);
      expect(after.revisions.filter(row=>row.id!==recovered.revisionId)).toEqual(before.revisions);
      expect(after.recipients).toEqual(before.recipients);
      expect(after.approvals).toEqual(before.approvals);
      expect(after.dispatches).toEqual(before.dispatches);
      expect(after.jobs).toEqual(before.jobs);
    }
    console.log('PROBE PROP-006 valid control: native generation after all six citation refusals -> HTTP 201 with retained grounded proposal, owned-history forecast and draft only; existing work unchanged, no approval or dispatch');
  } finally {await runtime.close();}
});
