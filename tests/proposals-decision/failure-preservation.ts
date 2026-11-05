import {expect} from '@playwright/test';
import {generated,type DecisionRuntime} from './runtime';
import {unansweredGeneration} from './unanswered-ai';

async function work(runtime:DecisionRuntime) {
  const rows=async(table:string,key='id')=>(await runtime.db.prepare(`SELECT * FROM ${table} ORDER BY ${key}`).all<Record<string,unknown>>()).results;
  return {
    proposals:await rows('proposals'),
    campaigns:await rows('campaigns'),revisions:await rows('campaign_revisions'),
    proposalSteps:await rows('proposal_steps'),campaignSteps:await rows('campaign_steps'),
    links:await rows('campaign_revision_links'),
    approvals:await rows('campaign_approval_requests','idempotency_key'),recipients:await rows('recipient_steps'),
    dispatches:await rows('step_dispatches','step_id'),
  };
}

export async function failurePreservation(runtime:DecisionRuntime) {
  // Populate every retained record family, including a real saved link. The
  // generated schedules are hours away, so the real minute cannot expire them.
  runtime.controls.alter=output=>{
    const destination='https://example.test/synthetic-mango-7';
    output.email!.html+=`<p><a href="${destination}">Garden collection</a></p>`;
    output.links=[{label:'Garden collection',destinationUrl:destination}];
  };
  await generated(runtime);
  runtime.controls.alter=undefined;
  const before=await work(runtime);
  for(const rows of [before.proposals,before.campaigns,before.revisions,before.proposalSteps,before.campaignSteps,before.links])expect(rows.length).toBeGreaterThan(0);
  const failures:Record<string,unknown>[]=[];
  const assertPreserved=async(proposalId:string,error:string)=>{
    const persisted=await runtime.db.prepare('SELECT * FROM proposals WHERE id=?').bind(proposalId).first<Record<string,unknown>>();
    expect(persisted).toMatchObject({id:proposalId,state:'failed',generation_error:error,campaign_id:null});
    failures.push(persisted!);
    for(let read=0;read<2;read++) {
      const failure=await runtime.call(`/api/proposals/${proposalId}`);
      expect(failure.status).toBe(200);
      expect(failure.body.proposal).toMatchObject({state:'failed',generationError:error,campaignId:null});
      expect(failure.body.history).toContainEqual(expect.objectContaining({toState:'failed',actorId:'proposal-operator',reason:error}));
      expect((await runtime.call('/api/decision-desk')).status).toBe(200);
      for(const proposal of before.proposals)expect((await runtime.call(`/api/proposals/${proposal.id}`)).status).toBe(200);
      for(const campaign of before.campaigns)expect((await runtime.call(`/api/campaigns/${campaign.id}`)).status).toBe(200);
      expect(await work(runtime)).toEqual({...before,proposals:[...before.proposals,...failures].sort((a,b)=>String(a.id).localeCompare(String(b.id)))});
      expect(runtime.jobs).toEqual([]);
    }
  };

  runtime.controls.alter=output=>{output.summary.text='This store has a fabricated recovery rate.';};
  const invalid=await runtime.call('/api/proposals/generate',{});
  expect(invalid).toMatchObject({status:409,body:{kind:'failed',error:'invalid_ai_output'}});
  expect((await runtime.call(`/api/proposals/${invalid.body.proposalId}`)).body.proposal).toMatchObject({state:'failed',campaignId:null});
  await assertPreserved(invalid.body.proposalId,'invalid_ai_output');
  console.log('PROBE PROP-007 acceptance-1: authenticated generate with ungrounded output -> 409 invalid_ai_output, persisted failed proposal, no substitute and unchanged existing work after repeated reads');

  runtime.controls.alter=undefined;
  runtime.controls.failure=new Error('private provider diagnostic');
  const failed=await runtime.call('/api/proposals/generate',{});
  expect(failed).toMatchObject({status:409,body:{kind:'failed',error:'ai_provider_failed'}});
  const failure=(await runtime.call(`/api/proposals/${failed.body.proposalId}`)).body;
  expect(failure.proposal).toMatchObject({state:'failed',campaignId:null});
  expect(JSON.stringify(failure)).not.toContain('private provider diagnostic');
  expect(await runtime.db.prepare('SELECT units_known,reported_cost_micros,outcome FROM external_cost_facts WHERE proposal_id=?').bind(failed.body.proposalId).first()).toEqual({units_known:0,reported_cost_micros:null,outcome:'unknown'});
  await assertPreserved(failed.body.proposalId,'ai_provider_failed');
  runtime.controls.failure=undefined;

  const timeout=await unansweredGeneration(runtime);
  expect(timeout.requests).toBe(1);
  expect(timeout.abortName).toBe('TimeoutError');
  // Independent monotonic clocks cover both the route and the unanswered
  // transport. No fixture timer or injected TimeoutError can satisfy this.
  for(const elapsed of [timeout.elapsedMs,timeout.transportElapsedMs]) {
    expect(elapsed).toBeGreaterThanOrEqual(59_000);
    expect(elapsed).toBeLessThan(70_000);
  }
  expect(timeout.result).toMatchObject({status:409,body:{kind:'failed',error:'ai_provider_timeout'}});
  await assertPreserved(timeout.result.body.proposalId,'ai_provider_timeout');
  expect(await runtime.db.prepare('SELECT units_known,reported_cost_micros,outcome FROM external_cost_facts WHERE proposal_id=?').bind(timeout.result.body.proposalId).first()).toEqual({units_known:0,reported_cost_micros:null,outcome:'unknown'});
  console.log(`PROBE PROP-007 acceptance-2: authenticated generate, production OpenAI adapter, unanswered abort-aware transport -> 409 ai_provider_timeout; route=${Math.round(timeout.elapsedMs)}ms transport=${Math.round(timeout.transportElapsedMs!)}ms, persisted failed proposal, unknown cost, no substitute campaign or command`);
  console.log(`PROBE PROP-007 acceptance-3: invalid output, provider error and real timeout plus repeated authenticated reads -> unchanged ${before.proposals.length} proposals, ${before.campaigns.length} campaigns, ${before.revisions.length} revisions, ${before.proposalSteps.length} proposal steps, ${before.campaignSteps.length} campaign steps and ${before.links.length} links; no new approval, recipient, dispatch or marketing command`);
}
