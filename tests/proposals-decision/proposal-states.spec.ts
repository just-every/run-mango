import {expect,test} from '@playwright/test';
import {decisionRuntime,generated} from './runtime';
import {proposalRenderer} from '../audience-summary/proposal-render';

test('[PROP-009] authenticated decisions record actor/time once and all request paths fence expiry and competing decisions',async()=>{
  const runtime=await decisionRuntime();
  try {
    const dismissed=await generated(runtime);
    expect((await runtime.call(`/api/proposals/${dismissed.proposalId}/dismiss`,{reason:'No'},false)).status).toBe(401);
    for(const reason of ['', '   '])expect((await runtime.call(`/api/proposals/${dismissed.proposalId}/dismiss`,{reason})).status).toBe(400);
    const html=await (await proposalRenderer())((await runtime.call(`/api/proposals/${dismissed.proposalId}`)).body);
    expect(html).toContain('Dismissal reason');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Dismiss proposal/);
    const race=await Promise.all(['Does not fit this week','Already planned'].map(reason=>runtime.call(`/api/proposals/${dismissed.proposalId}/dismiss`,{reason})));
    expect(race.map(result=>result.status).sort()).toEqual([200,409]);
    const detail=(await runtime.call(`/api/proposals/${dismissed.proposalId}`)).body;
    expect(detail.proposal.state).toBe('dismissed');
    expect(detail.history).toHaveLength(2);
    expect((await runtime.call('/api/decision-desk')).body.recentDecisions).toContainEqual(expect.objectContaining({proposalId:dismissed.proposalId,state:'dismissed',actorId:'proposal-operator',reason:detail.history[1].reason}));
    expect(detail.history[1]).toMatchObject({fromState:'proposed',toState:'dismissed',actorId:'proposal-operator',reason:expect.any(String),occurredAt:expect.any(String)});
    expect(Number.isFinite(Date.parse(detail.history[1].occurredAt))).toBe(true);
    const approve=(proposal:typeof dismissed)=>runtime.call(`/api/campaigns/${proposal.campaignId}/approve`,{revisionId:proposal.revisionId,idempotencyKey:crypto.randomUUID()});
    expect((await approve(dismissed)).status).toBe(409);
    expect((await runtime.call(`/api/proposals/${dismissed.proposalId}/adopt`,{})).status).toBe(409);

    for(const action of ['adopt','dismiss','approve'] as const) {
      const expired=await generated(runtime);
      await runtime.db.prepare('UPDATE proposals SET send_by_at=? WHERE id=?').bind(Date.now()-1,expired.proposalId).run();
      const result=action==='approve'?await approve(expired):await runtime.call(`/api/proposals/${expired.proposalId}/${action}`,action==='dismiss'?{reason:'Too late'}:{});
      expect(result.status).toBe(409);
      const expiredDetail=(await runtime.call(`/api/proposals/${expired.proposalId}`)).body;
      expect(expiredDetail.proposal.state).toBe('expired');
      expect(expiredDetail.history).toHaveLength(2);
      expect((await runtime.call('/api/decision-desk')).body.recentDecisions).toContainEqual(expect.objectContaining({proposalId:expired.proposalId,state:'expired',actorId:'system:send-by-deadline'}));
      expect(expiredDetail.history[1]).toMatchObject({toState:'expired',actorId:'system:send-by-deadline',occurredAt:expect.any(String)});
    }

    const racing=await generated(runtime),capabilities=runtime.platform.mailer.capabilities;
    let dismissedDuringChecks=false;
    runtime.platform.mailer.capabilities=async()=>{
      if(!dismissedDuringChecks){dismissedDuringChecks=true;expect((await runtime.call(`/api/proposals/${racing.proposalId}/dismiss`,{reason:'Concurrent decision'})).status).toBe(200);}
      return capabilities();
    };
    expect((await approve(racing)).status).toBe(409);
    runtime.platform.mailer.capabilities=capabilities;
    expect((await runtime.call(`/api/campaigns/${racing.campaignId}`)).body.revision.state).toBe('draft');
    expect(runtime.jobs).toEqual([]);

    const approved=await generated(runtime),result=await approve(approved);
    expect(result.status,JSON.stringify(result.body)).toBe(200);
    expect((await runtime.call(`/api/proposals/${approved.proposalId}`)).body).toMatchObject({proposal:{state:'approved'},history:expect.arrayContaining([expect.objectContaining({fromState:'proposed',toState:'approved',actorId:'proposal-operator',occurredAt:expect.any(String)})])});
    expect((await runtime.call(`/api/proposals/${approved.proposalId}/dismiss`,{reason:'Too late'})).status).toBe(409);
    expect((await runtime.call('/api/decision-desk')).body.proposals).toEqual([]);
  }finally{await runtime.close();}
});

test('[PROP-007] provider rejection produces an auditable failed proposal, unknown cost and no substitute draft',async()=>{
  const runtime=await decisionRuntime();
  try {
    runtime.controls.failure=new Error('Provider response contains private customer data');
    const result=await runtime.call('/api/proposals/generate',{});
    expect(result).toMatchObject({status:409,body:{kind:'failed',error:'ai_provider_failed'}});
    const detail=(await runtime.call(`/api/proposals/${result.body.proposalId}`)).body;
    expect(detail.proposal).toMatchObject({state:'failed',campaignId:null,generationError:'ai_provider_failed'});
    expect(JSON.stringify(detail)).not.toContain('private customer data');
    expect(await runtime.db.prepare('SELECT units_known,reported_cost_micros,outcome FROM external_cost_facts WHERE proposal_id=?').bind(result.body.proposalId).first()).toEqual({units_known:0,reported_cost_micros:null,outcome:'unknown'});
    expect(detail.history).toEqual([expect.objectContaining({toState:'failed',actorId:'proposal-operator',occurredAt:expect.any(String)})]);
    expect(runtime.jobs).toEqual([]);
  }finally{await runtime.close();}
});
