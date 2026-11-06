import {expect,test} from '@playwright/test';
import {decisionRuntime} from './runtime';

test('[CAMP-004] a missing sender name blocks approval without authority and clears only after a saved correction',async()=>{
  test.setTimeout(300000);
  const runtime=await decisionRuntime();
  try {
    const created=await runtime.call('/api/campaigns',{mode:'blank'});
    expect(created.status).toBe(201);
    const {campaignId,revisionId}=created.body;
    const campaignDoor=`/api/campaigns/${campaignId}`;
    const revisionDoor=`/api/campaign-revisions/${revisionId}`;
    const senderName=runtime.platform.config.mailSender.displayName;
    const scheduledAt=new Date(Date.now()+3600000).toISOString();
    const sendByAt=new Date(Date.now()+7200000).toISOString();
    const valid=await runtime.call(revisionDoor,{
      name:'Synthetic Mango sender review',emailSubject:'The autumn garden newsletter',
      preheader:'A fresh note about the garden',emailBody:'<p>Here is the autumn garden news for our readers.</p>',
      senderName,steps:[{channel:'email',scheduledAt,sendByAt,timezone:'Etc/UTC',whyThisTime:'Chosen by the operator'}],
    },true,'PATCH');
    expect(valid.status).toBe(200);
    const checks=()=>runtime.call(`${campaignDoor}/checks`,{revisionId});
    const passing=await checks();
    expect(passing.status).toBe(200);
    expect(passing.body.eligibleCount).toBe(2);
    expect(passing.body.blockers).toEqual([]);

    const saved=await runtime.call(revisionDoor,{senderName:''},true,'PATCH');
    expect(saved.status).toBe(200);
    expect(saved.body.revision).toMatchObject({id:revisionId,state:'draft',senderName:''});
    const before=(await runtime.call(campaignDoor)).body;
    expect(before.campaign).toMatchObject({id:campaignId,state:'draft',activeRevisionId:revisionId});
    const persisted=async()=>({
      campaign:await runtime.db.prepare('SELECT * FROM campaigns WHERE id=?').bind(campaignId).first(),
      revision:await runtime.db.prepare('SELECT * FROM campaign_revisions WHERE id=?').bind(revisionId).first(),
      steps:(await runtime.db.prepare('SELECT * FROM campaign_steps WHERE revision_id=? ORDER BY sequence').bind(revisionId).all()).results,
      links:(await runtime.db.prepare('SELECT * FROM campaign_revision_links WHERE revision_id=? ORDER BY sequence').bind(revisionId).all()).results,
    });
    const snapshot=await persisted();
    const noAuthority=async()=>{
      expect(await runtime.db.prepare('SELECT COUNT(*) AS count FROM campaign_approval_requests WHERE campaign_id=?').bind(campaignId).first()).toEqual({count:0});
      expect(await runtime.db.prepare('SELECT COUNT(*) AS count FROM recipient_steps WHERE campaign_id=?').bind(campaignId).first()).toEqual({count:0});
      expect(await runtime.db.prepare('SELECT COUNT(*) AS count FROM step_dispatches WHERE revision_id=?').bind(revisionId).first()).toEqual({count:0});
      expect(runtime.jobs).toEqual([]);
      expect(runtime.marketingHandoffs).toEqual([]);
    };
    await noAuthority();
    const missing=await checks();
    expect(missing.status).toBe(200);
    expect(missing.body.blockers).toContainEqual(expect.objectContaining({
      kind:'message.email-identity',status:'blocked',blocking:true,detail:expect.stringMatching(/missing sender name/i),
    }));
    expect(missing.body.eligibleCount).toBe(2);
    const refused=await runtime.call(`${campaignDoor}/approve`,{revisionId,idempotencyKey:'synthetic-mango-missing-sender'});
    expect(refused).toMatchObject({status:409,body:{status:'blocked'}});
    expect(refused.body.blockers).toEqual(missing.body.blockers);
    for(const suffix of ['', '/review']) {
      const read=await runtime.call(`${campaignDoor}${suffix}`);
      expect(read.status).toBe(200);
      expect(read.body.campaign).toEqual(before.campaign);
      expect(read.body.revision).toEqual(before.revision);
      expect(read.body.steps).toEqual(before.steps);
      expect(read.body.links).toEqual(before.links);
      expect(read.body.revision).toMatchObject({state:'draft',senderName:'',approvedAt:null,approvedByOperatorId:null,contentDigest:null});
      expect(read.body.checks).toEqual(expect.arrayContaining(missing.body.blockers.map((blocker:any)=>expect.objectContaining(blocker))));
      expect(await persisted()).toEqual(snapshot);
      await noAuthority();
    }
    console.log('PROBE CAMP-004 acceptance-5 missing sender: native PATCH with empty sender name and checks -> saved draft, named message.email-identity blocker with two eligible contacts');
    console.log('PROBE CAMP-004 acceptance-4 missing sender refusal: native approve -> HTTP 409 with all current blockers; campaign, revision, steps and links unchanged; no approval receipt, recipients, dispatch, jobs or marketing handoff');

    const restored=await runtime.call(revisionDoor,{senderName},true,'PATCH');
    expect(restored.status).toBe(200);
    const corrected=await checks();
    expect(corrected.status).toBe(200);
    expect(corrected.body.blockers).toEqual([]);
    expect(corrected.body.checks).toContainEqual(expect.objectContaining({kind:'message.email-identity',status:'passed',blocking:false}));
    const read=await runtime.call(`${campaignDoor}/review`);
    expect(read.status).toBe(200);
    expect(read.body.campaign).toEqual(before.campaign);
    expect(read.body.revision).toMatchObject({id:revisionId,state:'draft',senderName,approvedAt:null,approvedByOperatorId:null,contentDigest:null});
    expect(read.body.steps).toEqual(before.steps);
    expect(read.body.links).toEqual(before.links);
    await noAuthority();
    console.log('PROBE CAMP-004 acceptance-5 correction: native PATCH restoring configured sender and checks -> no blockers; campaign remains draft without approval or sending authority');
  } finally {await runtime.close();}
});
