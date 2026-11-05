import {expect,test} from '@playwright/test';
import {decisionRuntime,generated} from './runtime';
import {history} from './history';
import type {GeneratedProposalWire} from '../../src/core/features/proposals/generation';

test('[PROP-008] foreign-store benchmarks fail without authority while own-history forecasts survive authenticated reads',async()=>{
  test.setTimeout(300000);
  const runtime=await decisionRuntime();
  try {
    await history(runtime);
    const own=await generated(runtime);
    // Three owned campaigns, eight recipients each, three orders netting 800
    // minor units each, and two eligible recipients in the proposed email.
    const expected={status:'available',metric:'expected-revenue',currency:'USD',valueMinor:200,
      historicalNetRevenueMinor:2400,proposedRecipientSteps:2,sampleSize:24,campaignCount:3,eventCount:3,
      campaignIds:['history-0','history-1','history-2'],
      sourceEventIds:['historic-order-0','historic-order-1','historic-order-2']};
    const original=(await runtime.call(`/api/proposals/${own.proposalId}`)).body;
    expect(original.forecast).toMatchObject(expected);
    expect(original.forecast.recipientStepIds).toEqual(Array.from({length:3},(_,campaign)=>
      Array.from({length:8},(_,recipient)=>`historic-${campaign}-${recipient}`)).flat());
    expect(original.proposal).toMatchObject({state:'proposed',campaignId:own.campaignId});
    expect(original.composition.revision.state).toBe('draft');
    expect(await runtime.db.prepare('SELECT metric,value_minor,campaign_ids_json,source_event_ids_json,sample_size FROM proposal_forecasts WHERE proposal_id=?')
      .bind(own.proposalId).first()).toEqual({metric:'expected-revenue',value_minor:200,
        campaign_ids_json:JSON.stringify(expected.campaignIds),source_event_ids_json:JSON.stringify(expected.sourceEventIds),sample_size:24});

    const campaigns=(await runtime.db.prepare('SELECT * FROM campaigns ORDER BY id').all()).results;
    const revisions=(await runtime.db.prepare('SELECT * FROM campaign_revisions ORDER BY id').all()).results;
    const recipients=(await runtime.db.prepare('SELECT * FROM recipient_steps ORDER BY id').all()).results;
    expect(recipients).toHaveLength(24);
    const benchmark='Synthetic Mango foreign store reports a 42 percent recovery rate and USD 900 expected revenue. This forecast uses that other-store benchmark.';
    const attempts:Array<{field:string;alter:(output:GeneratedProposalWire)=>void}>=[
      {field:'summary',alter:output=>{output.summary.text+=' '+benchmark;}},
      {field:'audience explanation',alter:output=>{output.audience.explanation.text+=' '+benchmark;}},
      {field:'timing explanation',alter:output=>{output.steps[0].whyThisTime.text+=' '+benchmark;}},
      {field:'provider forecast',alter:output=>{
        // Deliberately violate the provider wire contract at the network edge.
        Object.assign(output,{forecast:{status:'available',metric:'expected-revenue',valueMinor:90000,currency:'USD',
          method:benchmark,campaignIds:['synthetic-mango-foreign-1'],sourceEventIds:['synthetic-mango-foreign-2'],sampleSize:100}});
      }},
    ];
    for(const attempt of attempts) {
      runtime.controls.alter=output=>{
        // Keep the valid owned citations and all other output unchanged: only
        // the unsupported benchmark is introduced in each attempt.
        const claims=[output.summary,output.audience.explanation,...output.steps.map(step=>step.whyThisTime)];
        const citations=structuredClone(claims.map(claim=>claim.citations));
        const supplied=(runtime.controls.lastRequest!.evidence as {items:Array<{key:string;observedValueJson:string}>}).items;
        for(const claim of claims)for(const citation of claim.citations)
          expect(supplied).toContainEqual(expect.objectContaining(citation));
        attempt.alter(output);
        expect(claims.map(claim=>claim.citations)).toEqual(citations);
      };
      const refused=await runtime.call('/api/proposals/generate',{});
      expect(refused,attempt.field).toMatchObject({status:409,body:{kind:'failed',error:'invalid_ai_output'}});
      const id=refused.body.proposalId;
      for(let read=0;read<2;read++) {
        const detail=await runtime.call(`/api/proposals/${id}`);
        expect(detail.status).toBe(200);
        expect(detail.body.proposal).toMatchObject({id,state:'failed',campaignId:null,generationError:'invalid_ai_output',summary:''});
        expect(detail.body.forecast.status).toBe('unavailable');
        expect(detail.body.forecast.valueMinor).toBeUndefined();
        expect(detail.body.composition).toBeUndefined();
        expect(detail.body.steps).toEqual([]);
        expect(JSON.stringify(detail.body)).not.toContain(benchmark);
        expect(await runtime.db.prepare('SELECT campaign_id,decision_context_json FROM proposals WHERE id=?').bind(id).first())
          .toEqual({campaign_id:null,decision_context_json:'{}'});
        expect(await runtime.db.prepare('SELECT COUNT(*) AS count FROM proposal_forecasts WHERE proposal_id=?').bind(id).first()).toEqual({count:0});
        expect((await runtime.call(`/api/proposals/${id}/adopt`,{})).status).toBe(409);
        const desk=await runtime.call('/api/decision-desk');
        expect(desk.status).toBe(200);
        expect(desk.body.proposals.map((entry:any)=>entry.proposal.id)).toEqual([own.proposalId]);
        expect(desk.body.proposals[0].forecast).toEqual(original.forecast);
        const control=await runtime.call(`/api/proposals/${own.proposalId}`);
        expect(control.status).toBe(200);
        expect(control.body.forecast).toEqual(original.forecast);
        expect(control.body.forecast).toMatchObject(expected);
        expect((await runtime.db.prepare('SELECT * FROM campaigns ORDER BY id').all()).results).toEqual(campaigns);
        expect((await runtime.db.prepare('SELECT * FROM campaign_revisions ORDER BY id').all()).results).toEqual(revisions);
        expect((await runtime.db.prepare('SELECT * FROM recipient_steps ORDER BY id').all()).results).toEqual(recipients);
        expect(await runtime.db.prepare('SELECT COUNT(*) AS count FROM campaign_approval_requests').first()).toEqual({count:0});
        expect(await runtime.db.prepare('SELECT COUNT(*) AS count FROM step_dispatches').first()).toEqual({count:0});
        expect(runtime.jobs).toEqual([]);
      }
      console.log(`PROBE PROP-008 acceptance-2 ${attempt.field}: native generation with a foreign-store benchmark -> HTTP 409 invalid_ai_output; failed proposal, no linked campaign or accepted forecast, absent from actionable desk, adoption refused, unchanged recipients and no dispatch authority`);
    }
    console.log('PROBE PROP-008 own-history control: native generation and repeated authenticated proposal and desk reads -> USD 200 minor units from 3 owned campaigns, 24 recipient steps and 3 events netting 2400 minor units; stable forecast and draft with no approval or dispatch');
  } finally {await runtime.close();}
});
