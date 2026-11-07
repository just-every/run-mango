import {expect,test} from '@playwright/test';
import {decisionRuntime,generated,type DecisionRuntime} from './runtime';

const consent=()=>({source:'Synthetic signup',evidence:'Please send the Mango newsletter.',brandOrLegalSender:'Mango',messageCategory:'newsletter',
  frequencyDisclosure:'Monthly',destinationJurisdiction:'AU',consentVersion:'v1',occurredAt:new Date(Date.now()-1000).toISOString()});

/** Counts every record that would mean a campaign was scheduled or sent. */
async function activation(runtime:DecisionRuntime,campaignId:string) {
  const count=async(sql:string)=>(await runtime.db.prepare(sql).bind(campaignId).first<{n:number}>())!.n;
  return {
    approvals:await count('SELECT COUNT(*) n FROM campaign_revisions WHERE campaign_id=? AND approved_at IS NOT NULL'),
    recipientSteps:await count('SELECT COUNT(*) n FROM recipient_steps WHERE campaign_id=?'),
    jobs:runtime.jobs.length,
  };
}

test('[PROP-005] an adopted proposal is an unscheduled draft, and under held approval only the exact revision its person approves runs',async()=>{
  test.setTimeout(300000);
  const runtime=await decisionRuntime();
  try {
    const proposal=await generated(runtime);
    const adopted=await runtime.call(`/api/proposals/${proposal.proposalId}/adopt`,{});
    expect(adopted.status).toBe(200);
    const campaign=(await runtime.call(`/api/campaigns/${proposal.campaignId}`)).body;
    expect(campaign.revision).toMatchObject({id:proposal.revisionId,state:'draft'});
    expect(await activation(runtime,proposal.campaignId)).toEqual({approvals:0,recipientSteps:0,jobs:0});
    const key=await runtime.call('/api/settings/integrations',{name:'Synthetic agent',scopes:['contacts:write','campaigns:send']});
    expect(key.status).toBe(201);
    const agent=runtime.agent(key.body.token);
    const member=await agent('/contacts',{email:'first@example.test',displayName:'first',segmentName:'Synthetic agent audience'},'PUT');
    const segmentId=member.body.contact.segmentIds[0];
    const segment=(await runtime.db.prepare('SELECT inclusion_rule_json,exclusion_rules_json FROM audience_segments WHERE id=?').bind(segmentId).first<{inclusion_rule_json:string;exclusion_rules_json:string}>())!;
    const send=(revisionId:string,campaignId=proposal.campaignId)=>agent(`/campaigns/${campaignId}/send`,{revisionId,segmentId});

    // Held policy: the agent's send call on the saved draft is refused and nothing is scheduled.
    expect(await send(proposal.revisionId)).toMatchObject({status:409,body:{error:'owner_approved_revision_required'}});
    expect(await activation(runtime,proposal.campaignId)).toEqual({approvals:0,recipientSteps:0,jobs:0});

    const saved=await runtime.call(`/api/campaign-revisions/${proposal.revisionId}`,{audienceRule:'Synthetic agent audience',inclusionRuleJson:segment.inclusion_rule_json,exclusionRulesJson:segment.exclusion_rules_json},true,'PATCH');
    expect(saved.status).toBe(200);
    const approval={revisionId:proposal.revisionId,idempotencyKey:'synthetic-mango-approve-1'};
    const door=`/api/campaigns/${proposal.campaignId}/approve`;
    expect((await runtime.call(door,approval,false)).status).toBe(401);
    expect((await runtime.call(door,{...approval,revisionId:'synthetic-mango-missing'})).status).toBe(404);
    expect(await activation(runtime,proposal.campaignId)).toEqual({approvals:0,recipientSteps:0,jobs:0});

    // The named person approves that exact saved revision, and only then is work scheduled.
    const approved=await runtime.call(door,approval);
    expect(approved).toMatchObject({status:200,body:{status:'scheduled'}});
    const record=await runtime.db.prepare('SELECT state,approved_by_operator_id,email_subject FROM campaign_revisions WHERE id=?').bind(proposal.revisionId).first();
    expect(record).toEqual({state:'approved',approved_by_operator_id:'proposal-operator',email_subject:'From the garden'});
    expect((await activation(runtime,proposal.campaignId)).recipientSteps).toBe(1);
    expect(await runtime.db.prepare('SELECT DISTINCT revision_id FROM recipient_steps WHERE campaign_id=?').bind(proposal.campaignId).all().then(r=>r.results)).toEqual([{revision_id:proposal.revisionId}]);

    // The approved revision cannot be rewritten; an edit becomes a new draft that carries no authority.
    expect((await runtime.call(`/api/campaign-revisions/${proposal.revisionId}`,{emailSubject:'Changed after approval'},true,'PATCH')).status).toBe(409);
    const edit=await runtime.call(`/api/campaigns/${proposal.campaignId}/edit-schedule`,{});
    expect(edit.status).toBe(201);
    const replacement=edit.body.revisionId as string;
    expect(replacement).not.toBe(proposal.revisionId);
    expect(await send(replacement)).toMatchObject({status:409,body:{error:'owner_approved_revision_required'}});
    expect(await runtime.db.prepare('SELECT COUNT(*) n FROM recipient_steps WHERE revision_id=?').bind(replacement).first()).toEqual({n:0});

    // Once the approved step is due, the agent's send call queues that approved revision and no other.
    const before=runtime.jobs.length;
    await runtime.db.prepare('UPDATE campaign_steps SET scheduled_at=? WHERE revision_id=?').bind(Date.now()-1000,proposal.revisionId).run();
    const queued=await send(proposal.revisionId);
    expect(queued).toMatchObject({status:202,body:{status:'queued',revisionId:proposal.revisionId}});
    expect(runtime.jobs.slice(before)).toEqual([expect.objectContaining({kind:'campaign.dispatch',payload:expect.objectContaining({campaignId:proposal.campaignId,revisionId:proposal.revisionId})})]);

    // Approving one campaign grants nothing to another adopted proposal.
    const jobsBefore=runtime.jobs.length,other=await generated(runtime);
    expect((await runtime.call(`/api/proposals/${other.proposalId}/adopt`,{})).status).toBe(200);
    expect(await send(other.revisionId,other.campaignId)).toMatchObject({status:409,body:{error:'owner_approved_revision_required'}});
    expect(await activation(runtime,other.campaignId)).toEqual({approvals:0,recipientSteps:0,jobs:jobsBefore});
  } finally {await runtime.close();}
});
