import {expect,test} from '@playwright/test';
import {decisionRuntime,generated} from './runtime';
import {smsContentEditing} from './sms-content-editing';

test('[PROP-004] adopted email and SMS content, sender identities and destinations remain editable without sending authority',async({page},info)=>{
  test.setTimeout(300000);
  const runtime=await decisionRuntime();
  try {
    const originalDestination='https://example.test/synthetic-mango-1';
    runtime.controls.alter=output=>{
      output.email!.html=`<p>Garden news for you.</p><p><a href="${originalDestination}">Original garden</a></p>`;
      output.links=[{label:'Original garden',destinationUrl:originalDestination}];
    };
    const proposal=await generated(runtime);
    const original=await runtime.call(`/api/proposals/${proposal.proposalId}`);
    expect(original.status).toBe(200);
    expect(original.body.evidenceItems.length).toBeGreaterThan(0);
    expect(original.body.composition.revision.emailBody).toContain(originalDestination);
    const evidence=await runtime.db.prepare('SELECT * FROM proposal_evidence_items WHERE proposal_id=? ORDER BY id').bind(proposal.proposalId).all();
    const provenance=await runtime.db.prepare('SELECT summary,trigger_events_json,source_data_as_of,lookback_start_at,decision_context_json,inclusion_rule_json,exclusion_rules_json FROM proposals WHERE id=?').bind(proposal.proposalId).first();

    const adopted=await runtime.call(`/api/proposals/${proposal.proposalId}/adopt`,{});
    expect(adopted.status).toBe(200);
    expect(adopted.body.campaignId).toBe(proposal.campaignId);

    // Chosen independently of the generated content and the response being checked.
    const destination='https://example.test/synthetic-mango-2?offer=autumn';
    const emailBody=`<h2>Autumn seed collection</h2><p>Reserve your blue planter.</p><p><a href="${destination}">Choose a planter</a></p>`;
    const sender={senderName:'Synthetic Mango Gardening Club',fromEmail:['synthetic-mango-1','example.test'].join('@'),
      replyToEmail:['synthetic-mango-2','example.test'].join('@'),physicalAddress:'42 Synthetic Mango Lane, Melbourne VIC 3000'};
    const chosen={emailBody,...sender,links:[{label:'Choose a planter',destinationUrl:destination}]};
    expect(sender.senderName).not.toBe(original.body.composition.revision.senderName);
    expect(sender.fromEmail).not.toBe(original.body.composition.revision.fromEmail);
    expect(sender.replyToEmail).not.toBe(original.body.composition.revision.replyToEmail);
    expect(sender.physicalAddress).not.toBe(original.body.composition.revision.physicalAddress);
    const editDoor=`/api/campaign-revisions/${proposal.revisionId}`;
    expect((await runtime.call(editDoor,chosen,false,'PATCH')).status).toBe(401);
    expect((await runtime.call(`/api/campaigns/${proposal.campaignId}`)).body.revision.emailBody).toBe(original.body.composition.revision.emailBody);
    const saved=await runtime.call(editDoor,chosen,true,'PATCH');
    expect(saved.status).toBe(200);

    // The native save adds compliance content; expected bytes do not use its normalizer.
    const expectedBody=emailBody+'<hr><p>{{physical_address}}</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>';
    const expected={id:proposal.revisionId,state:'draft',emailBody:expectedBody,...sender,
      name:original.body.composition.revision.name,emailSubject:original.body.composition.revision.emailSubject,
      contentDigest:null,approvedAt:null,approvedByOperatorId:null};
    expect(saved.body.revision).toMatchObject(expected);
    let persistedRevision:unknown;
    let persistedLinks:unknown;
    for(let read=0;read<2;read++) {
      for(const suffix of ['', '/review']) {
        const current=await runtime.call(`/api/campaigns/${proposal.campaignId}${suffix}`);
        expect(current.status).toBe(200);
        expect(current.body.campaign).toMatchObject({state:'draft',activeRevisionId:proposal.revisionId,proposalId:proposal.proposalId});
        expect(current.body.revision).toMatchObject(expected);
        expect(current.body.revision.emailText).toContain('Autumn seed collection\nReserve your blue planter.');
        expect(current.body.revision.emailText).toContain(`Choose a planter (${destination})`);
        expect(current.body.revision.emailText).not.toContain(originalDestination);
        expect(current.body.links.map(({sequence,label,destinationUrl}:any)=>({sequence,label,destinationUrl})))
          .toEqual([{sequence:1,label:'Choose a planter',destinationUrl:destination}]);
      }
      const revision=await runtime.db.prepare('SELECT * FROM campaign_revisions WHERE id=?').bind(proposal.revisionId).first();
      expect(revision).toMatchObject({state:'draft',email_body:expectedBody,sender_name:sender.senderName,from_email:sender.fromEmail,
        reply_to_email:sender.replyToEmail,physical_address:sender.physicalAddress,approved_at:null,approved_by_operator_id:null,content_digest:null});
      const links=(await runtime.db.prepare('SELECT * FROM campaign_revision_links WHERE revision_id=? ORDER BY sequence').bind(proposal.revisionId).all()).results;
      expect(links).toEqual([expect.objectContaining({revision_id:proposal.revisionId,sequence:1,label:'Choose a planter',destination_url:destination})]);
      if(read===0) {persistedRevision=revision;persistedLinks=links;}
      else {expect(revision).toEqual(persistedRevision);expect(links).toEqual(persistedLinks);}

      const detail=await runtime.call(`/api/proposals/${proposal.proposalId}`);
      expect(detail.status).toBe(200);
      expect(detail.body.evidenceItems).toEqual(original.body.evidenceItems);
      expect(detail.body.proposal).toMatchObject({campaignId:proposal.campaignId,summary:original.body.proposal.summary,
        sourceDataAsOf:original.body.proposal.sourceDataAsOf,triggerEventsJson:original.body.proposal.triggerEventsJson});
      expect((await runtime.db.prepare('SELECT * FROM proposal_evidence_items WHERE proposal_id=? ORDER BY id').bind(proposal.proposalId).all()).results).toEqual(evidence.results);
      expect(await runtime.db.prepare('SELECT summary,trigger_events_json,source_data_as_of,lookback_start_at,decision_context_json,inclusion_rule_json,exclusion_rules_json FROM proposals WHERE id=?').bind(proposal.proposalId).first()).toEqual(provenance);
      expect(await runtime.db.prepare('SELECT COUNT(*) AS count FROM campaign_approval_requests WHERE campaign_id=?').bind(proposal.campaignId).first()).toEqual({count:0});
      expect(await runtime.db.prepare('SELECT COUNT(*) AS count FROM recipient_steps WHERE campaign_id=?').bind(proposal.campaignId).first()).toEqual({count:0});
      expect(await runtime.db.prepare('SELECT COUNT(*) AS count FROM step_dispatches WHERE revision_id=?').bind(proposal.revisionId).first()).toEqual({count:0});
      expect(runtime.jobs).toEqual([]);
    }
    console.log('PROBE PROP-004 acceptance-1 email body: generate, adopt, PATCH and repeated campaign and review GET -> chosen saved HTML and text, unchanged name and subject');
    console.log('PROBE PROP-004 acceptance-3 email sender: authenticated PATCH and repeated campaign and review GET -> chosen sender name, From, Reply-to and postal address match persisted revision');
    console.log('PROBE PROP-004 acceptance-3 destination links: authenticated PATCH and repeated campaign and review GET -> replacement destination and label only, stable persisted link row');
    console.log('PROBE PROP-004 draft safety: unauthenticated PATCH refused; authorized edits and reads -> unchanged original proposal evidence, draft only, no approval, recipients, dispatch rows or commands');
  } finally {await runtime.close();}
  await smsContentEditing(page,info);
});
