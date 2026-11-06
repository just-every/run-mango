import {expect,test} from '@playwright/test';
import {decisionRuntime} from './runtime';
import type {SenderCapabilities} from '../../src/core/shared/platform';

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

    // A saved correction clears readiness only; it must never grant authority.
    for(const [field,label] of [['fromEmail','from email'],['replyToEmail','reply-to email'],['physicalAddress','postal address']] as const) {
      const original=read.body.revision[field];
      const empty=await runtime.call(revisionDoor,{[field]:''},true,'PATCH');
      expect(empty.status).toBe(200);
      expect(empty.body.revision[field]).toBe('');
      const unchanged=await persisted();
      const result=await checks();
      expect(result.status).toBe(200);
      expect(result.body.blockers).toContainEqual(expect.objectContaining({
        kind:'message.email-identity',blocking:true,detail:expect.stringContaining(`missing ${label}`),
      }));
      const denied=await runtime.call(`${campaignDoor}/approve`,{revisionId,idempotencyKey:`synthetic-mango-missing-${field}`});
      expect(denied).toMatchObject({status:409,body:{status:'blocked'}});
      expect(denied.body.blockers).toEqual(result.body.blockers);
      for(const suffix of ['', '/review']) {
        const retained=await runtime.call(`${campaignDoor}${suffix}`);
        expect(retained.status).toBe(200);
        expect(retained.body.revision).toMatchObject({state:'draft',[field]:'',approvedAt:null,approvedByOperatorId:null,contentDigest:null});
        expect(await persisted()).toEqual(unchanged);
        await noAuthority();
      }
      expect((await runtime.call(revisionDoor,{[field]:original},true,'PATCH')).status).toBe(200);
      expect((await checks()).body.blockers).toEqual([]);
      await noAuthority();
      console.log(`PROBE CAMP-004 acceptance-5 missing ${label}: native save and checks -> named blocker; approve -> 409, unchanged draft and no authority; correction -> clear without approving`);
    }

    const blockedWithoutAuthority=async(kind:string,detail?:RegExp)=>{
      const unchanged=await persisted();
      const review=await checks();
      expect(review.status).toBe(200);
      expect(review.body.blockers).toContainEqual(expect.objectContaining({kind,blocking:true,...(detail?{detail:expect.stringMatching(detail)}:{})}));
      const refused=await runtime.call(`${campaignDoor}/approve`,{revisionId,idempotencyKey:crypto.randomUUID()});
      expect(refused).toMatchObject({status:409,body:{status:'blocked'}});
      expect(refused.body.blockers.map((item:any)=>item.kind).sort()).toEqual(review.body.blockers.map((item:any)=>item.kind).sort());
      expect(await persisted()).toEqual(unchanged);
      const retained=await runtime.call(`${campaignDoor}/review`);
      expect(retained.status).toBe(200);
      expect(retained.body.revision).toMatchObject({state:'draft',approvedAt:null,approvedByOperatorId:null,contentDigest:null});
      await noAuthority();
    };
    const passingRevision=(await runtime.call(campaignDoor)).body.revision;
    const contentCases=[
      {field:'emailSubject',value:'',kind:'message.email-identity',detail:/missing subject/i},
      {field:'preheader',value:'',kind:'message.email-identity',detail:/missing preheader/i},
      {field:'emailBody',value:'',kind:'message.email-identity',detail:/missing.*message body/i},
      {field:'emailBody',value:'<p>Hello {{displayName}}, here is the garden news.</p>',kind:'message.personalisation',detail:/fallback/i},
      {field:'emailBody',value:'<p style="display:none">Hidden garden news</p>',kind:'message.content',detail:/display|hidden|style/i},
      {field:'emailBody',value:'<p>Garden news <a href="http://synthetic-mango.test/garden">Read more</a></p>',kind:'message.links',detail:/http:/i},
      {field:'emailBody',value:'<p>Garden news <a href="https://synthetic-mango.test/garden">Read more</a></p>',kind:'message.links',detail:/synthetic-mango.test/i},
      {field:'emailBody',value:'<p>Garden news <a href="tel:123">Phone us</a></p>',kind:'message.links',detail:/tel:/i},
      {field:'emailBody',value:'<p>Garden news <img src="http://synthetic-mango.test/garden.png" alt="Garden"></p>',kind:'message.content',detail:/HTTPS|image|http:/i},
      {field:'messageCategory',value:'synthetic-mango-unconsented-category',kind:'message.email-consent-scope',detail:/consent mismatch/i},
      {field:'steps',value:[],kind:'schedule.steps',detail:/step|instant/i},
    ];
    for(const item of contentCases) {
      expect((await runtime.call(revisionDoor,{[item.field]:item.value},true,'PATCH')).status).toBe(200);
      await blockedWithoutAuthority(item.kind,item.detail);
      console.log(`PROBE CAMP-004 acceptance-2 ${item.kind}: saved native draft -> named blocker, approval 409 and no authority`);
      const original=item.field==='steps'?before.steps.map((step:any)=>({channel:step.channel,scheduledAt:step.scheduledAt,sendByAt:step.sendByAt,timezone:step.timezone,whyThisTime:step.whyThisTime})):passingRevision[item.field];
      expect((await runtime.call(revisionDoor,{[item.field]:original},true,'PATCH')).status).toBe(200);
      expect((await checks()).body.blockers).toEqual([]);
      await noAuthority();
    }
    const capabilities=runtime.platform.mailer.capabilities.bind(runtime.platform.mailer);
    const adapterCases:Array<{value:Partial<SenderCapabilities>;kind:string}>=[
      {value:{configured:false},kind:'mail.sender.v1.configured'},
      {value:{canSendMarketing:false},kind:'mail.sender.v1.configured'},
      {value:{effectiveDeduplication:false},kind:'mail.sender.v1.deduplication'},
      {value:{deduplicationWindowMs:0},kind:'mail.sender.v1.deduplication-window'},
      {value:{effectiveReconciliation:false},kind:'mail.sender.v1.reconciliation'},
      {value:{reconciliationWindowMs:0},kind:'mail.sender.v1.reconciliation'},
      {value:{deliveryEventsVerified:false},kind:'delivery-events-missing'},
    ];
    for(const item of adapterCases) {
      // Only the external sender capability boundary changes; route, checks and writes stay native.
      runtime.platform.mailer.capabilities=async()=>({...await capabilities(),...item.value});
      await blockedWithoutAuthority(item.kind);
      console.log(`PROBE CAMP-004 acceptance-3 ${item.kind}: unavailable provider guarantee -> approval 409 with unchanged draft and no authority`);
      runtime.platform.mailer.capabilities=capabilities;
      expect((await checks()).body.blockers).toEqual([]);
      await noAuthority();
    }
    runtime.senderEdge.domainVerified=false;
    await blockedWithoutAuthority('message.email-sender',/not verified|domain/i);
    runtime.senderEdge.domainVerified=true;
    await runtime.senderEvidence.renew();
    expect((await checks()).body.blockers).toEqual([]);
    for(const mechanism of ['spf','dkim','dmarc'] as const) {
      runtime.senderEdge.failedAuthentication=mechanism;
      await runtime.senderEvidence.renew();
      await blockedWithoutAuthority('message.email-authentication');
      console.log(`PROBE CAMP-004 acceptance-1 ${mechanism}: failed receiver evidence -> named authentication blocker, approval 409 and no authority`);
    }
    delete runtime.senderEdge.failedAuthentication;
    await runtime.senderEvidence.renew();
    expect((await checks()).body.blockers).toEqual([]);
    // A historical saved body can predate the managed-footer normalizer.
    await runtime.db.prepare('UPDATE campaign_revisions SET email_body=?,email_text=? WHERE id=?')
      .bind('<p>Historical garden news</p>','Historical garden news',revisionId).run();
    await blockedWithoutAuthority('message.email-unsubscribe');
    await blockedWithoutAuthority('message.email-address');
    expect((await runtime.call(revisionDoor,{emailBody:passingRevision.emailBody},true,'PATCH')).status).toBe(200);
    expect((await checks()).body.blockers).toEqual([]);
    console.log('PROBE CAMP-004 acceptance-2 compliance: historical saved mail without managed unsubscribe or postal footer -> approval 409 with both named blockers and no authority; native resave repairs readiness only');

    // Every independently missing field must remain visible when failures coexist.
    expect((await runtime.call(revisionDoor,{senderName:'',emailSubject:'',preheader:'',physicalAddress:''},true,'PATCH')).status).toBe(200);
    await blockedWithoutAuthority('message.email-identity',/missing subject, preheader, sender name, postal address/i);
    expect((await runtime.call(revisionDoor,{senderName,emailSubject:passingRevision.emailSubject,preheader:passingRevision.preheader,physicalAddress:passingRevision.physicalAddress},true,'PATCH')).status).toBe(200);
    expect((await checks()).body.blockers).toEqual([]);
    await noAuthority();
    console.log('PROBE CAMP-004 acceptance-4 simultaneous failures: native approval -> all missing fields named together, unchanged draft and no authority');

    const inspect=runtime.platform.mailer.inspectSender!.bind(runtime.platform.mailer);
    const unchanged=await persisted();
    runtime.platform.mailer.inspectSender=async sender=>{
      const result=await inspect(sender);
      // Simulate withdrawal just after the provider returned valid evidence.
      await runtime.senderEvidence.verification.revoke();
      return result;
    };
    const revoked=await runtime.call(`${campaignDoor}/approve`,{revisionId,idempotencyKey:'synthetic-mango-revoked-evidence'});
    expect(revoked).toMatchObject({status:409,body:{error:'approval_conflict'}});
    expect(await persisted()).toEqual(unchanged);
    await noAuthority();
    runtime.platform.mailer.inspectSender=inspect;
    await blockedWithoutAuthority('message.email-sender',/withdrawn/i);
    await runtime.senderEvidence.renew();
    expect((await checks()).body.blockers).toEqual([]);
    console.log('PROBE CAMP-004 acceptance-1 sender authority: withdrawal after valid inspection -> atomic approval conflict, unchanged draft and no authority; repeated review remains blocked until fresh receiver evidence');

    const first=await runtime.db.prepare("SELECT id FROM contacts WHERE display_name='first'").first<{id:string}>();
    const second=await runtime.db.prepare("SELECT id FROM contacts WHERE display_name='second'").first<{id:string}>();
    expect(first).toBeTruthy();expect(second).toBeTruthy();
    const unsubscribe=await runtime.services.audienceService.issueUnsubscribeToken(first!.id,'email');
    runtime.platform.mailer.inspectSender=async sender=>{
      const result=await inspect(sender);
      expect((await runtime.publicPost(`/unsubscribe/${unsubscribe.token}`,'confirm=true')).status).toBe(200);
      return result;
    };
    const consentChanged=await runtime.call(`${campaignDoor}/approve`,{revisionId,idempotencyKey:'synthetic-mango-concurrent-optout'});
    expect(consentChanged).toMatchObject({status:409,body:{error:'approval_conflict'}});
    expect(await persisted()).toEqual(unchanged);
    await noAuthority();
    runtime.platform.mailer.inspectSender=inspect;
    const current=await checks();
    expect(current.body.eligibleCount).toBe(1);
    expect(current.body.blockers).toEqual([]);
    expect(await runtime.db.prepare('SELECT email_status FROM contacts WHERE id=?').bind(first!.id).first()).toEqual({email_status:'unsubscribed'});
    expect((await runtime.publicPost(`/unsubscribe/${unsubscribe.token}`,'confirm=true')).status).toBe(200);
    await noAuthority();
    console.log('PROBE CAMP-004 acceptance-1 audience and consent: native unsubscribe during approval -> atomic conflict, unchanged draft and no authority; replay retains opt-out, fresh review contains only the eligible control');

    const approved=await runtime.call(`${campaignDoor}/approve`,{revisionId,idempotencyKey:'synthetic-mango-corrected-approval'});
    expect(approved).toMatchObject({status:200,body:{status:'scheduled',idempotent:false}});
    const receipt=await runtime.db.prepare('SELECT campaign_id,revision_id,revision_digest,operator_id FROM campaign_approval_requests WHERE campaign_id=?').bind(campaignId).all();
    expect(receipt.results).toEqual([{campaign_id:campaignId,revision_id:revisionId,revision_digest:approved.body.revisionDigest,operator_id:'proposal-operator'}]);
    const recipients=await runtime.db.prepare('SELECT contact_id,channel,attempt_count FROM recipient_steps WHERE campaign_id=?').bind(campaignId).all();
    expect(recipients.results).toEqual([{contact_id:second!.id,channel:'email',attempt_count:0}]);
    const approvedRead=await runtime.call(campaignDoor);
    expect(approvedRead.body.campaign).toMatchObject({state:'scheduled',activeRevisionId:revisionId});
    expect(approvedRead.body.revision).toMatchObject({state:'approved',contentDigest:approved.body.revisionDigest,approvedByOperatorId:'proposal-operator'});
    expect(runtime.jobs).toEqual([expect.objectContaining({kind:'campaign.dispatch',payload:expect.objectContaining({campaignId,revisionId,channel:'email'})})]);
    expect(runtime.marketingHandoffs).toEqual([]);
    const replay=await runtime.call(`${campaignDoor}/approve`,{revisionId,idempotencyKey:'synthetic-mango-corrected-approval'});
    expect(replay).toMatchObject({status:200,body:{status:'scheduled',idempotent:true,revisionDigest:approved.body.revisionDigest}});
    expect((await runtime.db.prepare('SELECT * FROM campaign_approval_requests WHERE campaign_id=?').bind(campaignId).all()).results).toHaveLength(1);
    expect((await runtime.db.prepare('SELECT * FROM recipient_steps WHERE campaign_id=?').bind(campaignId).all()).results).toHaveLength(1);
    expect(runtime.jobs).toHaveLength(1);
    expect(runtime.marketingHandoffs).toEqual([]);
    console.log('PROBE CAMP-004 corrected approval: native approval -> immutable receipt and exact digest, one eligible control recipient and one dispatch command; replay creates no extra authority and the opted-out contact stays excluded');

  } finally {await runtime.close();}
});
