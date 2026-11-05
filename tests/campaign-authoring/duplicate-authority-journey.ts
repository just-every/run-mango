import {expect} from '@playwright/test';
import {eraseHttp} from '../audience-import/erase';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,approve,dispatch,availableTransport} from '../go-live/harness';

const address = (name:string) => [name,'example.test'].join('@');

export async function duplicateAuthorityJourney() {
  const edge = await providerEdge(), site = await installation(edge,eventSigner(),{reuseEmptySchema:true});
  try {
    let cookie = await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    const [withdrawn,retained,joined] = [501,502,503].map(n=>address(`synthetic-mango-${n}`));
    await confirmedContact(site,edge,cookie,withdrawn,'synthetic-mango-501');
    await confirmedContact(site,edge,cookie,retained,'synthetic-mango-502');
    const clock = await site.control('/_golive/clock',{hold:false}), due = new Date(clock.now+3600000);
    const source = await draftCampaign(site,cookie,'synthetic-mango-504 source',[withdrawn,retained,joined],due);
    const get = async (id:string) => json(await site.call(`/api/campaigns/${id}`,{cookie}),200);
    const patch = async (id:string,body:unknown) => json(await site.call(`/api/campaign-revisions/${id}`,{method:'PATCH',cookie,body}),200);
    await availableTransport(site);
    expect(await json(await site.call(`/api/campaigns/${source.campaignId}/test-send`,{method:'POST',cookie,
      body:{revisionId:source.revisionId,channel:'email',to:address('tester')}}),200)).toMatchObject({status:'test-sent',disposition:'accepted'});
    const tests = async (id:string) => (await json(await site.call(`/api/campaigns/${id}/test-sends`,{cookie}),200)).tests;
    expect(await tests(source.campaignId)).toHaveLength(1);
    await approve(site,cookie,source);
    await site.control('/_golive/clock',{advanceMs:3600001});
    const delivered = await dispatch(site,source.campaignId,due);
    expect(delivered.map(row=>({email:row.email,disposition:row.transport_disposition})))
      .toEqual([withdrawn,retained].map(email=>({email,disposition:'accepted'})));
    await expect.poll(async()=>(await get(source.campaignId)).campaign.state,{timeout:10000}).toBe('completed');
    const sourceDetail = await get(source.campaignId);
    expect(sourceDetail.audience).toMatchObject({candidateCount:2,eligibleCount:2});
    expect(sourceDetail.results.steps).toHaveLength(1);
    expect(sourceDetail.results.steps[0].counts).toContainEqual({disposition:'accepted',reason:null,count:2});
    const sourceQueries = [
      `SELECT * FROM campaigns WHERE id='${source.campaignId}'`,
      `SELECT * FROM campaign_revisions WHERE id='${source.revisionId}'`,
      `SELECT * FROM campaign_steps WHERE revision_id='${source.revisionId}' ORDER BY sequence`,
      `SELECT * FROM campaign_approval_requests WHERE campaign_id='${source.campaignId}'`,
      `SELECT * FROM campaign_audiences WHERE revision_id='${source.revisionId}'`,
      `SELECT * FROM campaign_revision_candidates WHERE revision_id='${source.revisionId}' ORDER BY id`,
      `SELECT * FROM recipient_steps WHERE campaign_id='${source.campaignId}' ORDER BY id`,
      `SELECT * FROM step_dispatches WHERE revision_id='${source.revisionId}' ORDER BY step_id`,
      `SELECT * FROM lifecycle_audit_entries WHERE entity_id='${source.revisionId}' AND action='test-send' ORDER BY id`,
    ];
    const sourceRows = await Promise.all(sourceQueries.map(query=>site.rows(query)));
    for (const rows of sourceRows) expect(rows.length).toBeGreaterThan(0);
    const copy = await json(await site.call(`/api/campaigns/${source.campaignId}/duplicate`,{method:'POST',cookie,body:{}}),201);
    cookie = await site.open();
    const noAuthority = async () => {
      expect(await site.rows(`SELECT * FROM campaign_approval_requests WHERE campaign_id='${copy.campaignId}'`)).toEqual([]);
      expect(await site.rows(`SELECT * FROM recipient_steps WHERE campaign_id='${copy.campaignId}'`)).toEqual([]);
      expect((await get(copy.campaignId)).campaign.state).toBe('draft');
      expect((await site.control('/_golive/emissions')).filter((row:any)=>row.command.payload?.campaignId===copy.campaignId)).toEqual([]);
    };
    for (let reopen=0;reopen<2;reopen++) {
      const detail = await get(copy.campaignId);
      expect(detail.campaign).toMatchObject({state:'draft',activeRevisionId:copy.revisionId,proposalId:null});
      expect(detail.revision).toMatchObject({state:'draft',approvedAt:null,approvedByOperatorId:null,contentDigest:null,
        name:'Copy of synthetic-mango-504 source',emailBody:sourceDetail.revision.emailBody,emailText:sourceDetail.revision.emailText});
      expect(detail.steps).toEqual([]);
      expect(detail.audience).toBeUndefined();
      expect(detail.audienceState).toBe('needs_recomputation');
      expect(detail.audienceChannelCounts).toEqual([]);
      expect(detail.results).toBeUndefined();
      expect(await tests(copy.campaignId)).toEqual([]);
      expect(await site.rows(`SELECT * FROM campaign_audiences WHERE revision_id='${copy.revisionId}'`)).toEqual([]);
      expect(await site.rows(`SELECT * FROM campaign_revision_candidates WHERE revision_id='${copy.revisionId}'`)).toEqual([]);
      expect(await site.rows(`SELECT * FROM step_dispatches WHERE revision_id='${copy.revisionId}'`)).toEqual([]);
      await noAuthority();
    }
    console.log('PROBE CAMP-018 acceptance-3: duplicate a completed source with real native approval, snapshot, test and accepted marketing results -> fresh draft with none of that authority, history or schedule; populated source records retained.');

    // The copy gets a new operator-chosen schedule. Settings changed since the
    // source was approved must be checked again, before new authority is issued.
    await site.control('/_golive/clock',{advanceMs:25*3600000});
    cookie = await site.open();
    const current = await site.control('/_golive/clock'), copyDue = new Date(current.now+48*3600000);
    await patch(copy.revisionId,{steps:[{channel:'email',timezone:'Australia/Brisbane',scheduledAt:copyDue.toISOString(),
      sendByAt:new Date(copyDue.getTime()+3600000).toISOString(),whyThisTime:'synthetic-mango-505 new copy schedule'}]});
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:{...sender,replyToEmail:address('synthetic-mango-506')}}),200);
    const refused = await json(await site.call(`/api/campaigns/${copy.campaignId}/approve`,{method:'POST',cookie,
      body:{revisionId:copy.revisionId,idempotencyKey:'synthetic-mango-506-current-settings'}}),409);
    expect(refused.blockers).toContainEqual(expect.objectContaining({kind:'message.email-configured-identity',blocking:true}));
    await noAuthority();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    await patch(copy.revisionId,{emailSubject:'synthetic-mango-507 independent copy',emailBody:'<p>synthetic-mango-508 edited copy.</p>'});
    const checked = await json(await site.call(`/api/campaigns/${copy.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:copy.revisionId}}),200);
    expect(checked.blockers).toEqual([]);
    expect(checked.eligibleCount).toBe(2);
    await noAuthority();
    const link = await site.control('/_golive/unsubscribe-link',{contactId:(await site.rows(`SELECT contact_id FROM contact_email_addresses WHERE email='${withdrawn}'`))[0].contact_id});
    expect((await fetch(site.local(link.url),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'List-Unsubscribe=One-Click'})).status).toBe(200);
    await confirmedContact(site,edge,cookie,joined,'synthetic-mango-503');
    expect((await site.rows(`SELECT channel_status FROM contact_email_addresses WHERE email='${withdrawn}'`))[0].channel_status).toBe('unsubscribed');
    // No second preview: approval must recompute from the changed native facts.
    const approved = await approve(site,cookie,copy);
    expect(approved.status).toBe('scheduled');
    const copyDetail = await get(copy.campaignId);
    expect(copyDetail.revision.emailBody).not.toBe(sourceDetail.revision.emailBody);
    expect(copyDetail.revision.emailBody).toContain('synthetic-mango-508 edited copy.');
    expect(copyDetail.audience).toMatchObject({candidateCount:3,eligibleCount:2,excludedCount:1});
    expect((await site.rows(`SELECT destination FROM recipient_steps WHERE campaign_id='${copy.campaignId}' ORDER BY destination`)).map(row=>row.destination)).toEqual([retained,joined]);
    expect(await site.rows(`SELECT revision_id,revision_digest FROM campaign_approval_requests WHERE campaign_id='${copy.campaignId}'`))
      .toEqual([{revision_id:copy.revisionId,revision_digest:approved.revisionDigest}]);
    expect((await approve(site,cookie,copy)).idempotent).toBe(true);
    expect((await site.rows(`SELECT destination FROM recipient_steps WHERE campaign_id='${copy.campaignId}' ORDER BY destination`)).map(row=>row.destination)).toEqual([retained,joined]);
    for (let reopen=0;reopen<2;reopen++) {
      const detail = await get(source.campaignId);
      expect(detail.revision).toEqual(sourceDetail.revision);
      expect(detail.results.steps).toEqual(sourceDetail.results.steps);
      expect(await tests(source.campaignId)).toHaveLength(1);
      expect(await Promise.all(sourceQueries.map(query=>site.rows(query)))).toEqual(sourceRows);
    }
    expect(edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe'])).toHaveLength(2);
    console.log('PROBE CAMP-018 acceptance-4: changed sender refuses copy approval without authority; after a fresh preview, native opt-out and new confirmation change exact approved recipients from the source pair to the current pair; editing, approval and replay leave source approved bytes, receipt, snapshot, tests and populated results unchanged.');
    const erasedId = (await site.rows(`SELECT contact_id FROM contact_email_addresses WHERE email='${withdrawn}'`))[0].contact_id;
    const erased = await eraseHttp(site,cookie,erasedId);
    expect(erased.state).toBe('complete');
    expect((await site.rows(`SELECT state FROM campaign_revisions WHERE id='${source.revisionId}'`))[0].state).toBe('erasure-invalidated');
    const beforeRefusal = await site.count('campaigns');
    expect(await json(await site.call(`/api/campaigns/${source.campaignId}/duplicate`,{method:'POST',cookie,body:{}}),404))
      .toEqual({error:'source_revision_unavailable'});
    expect(await site.count('campaigns')).toBe(beforeRefusal);
    console.log('PROBE CAMP-018 erased-source boundary: native contact erasure invalidates the source; duplication refuses source_revision_unavailable and creates no draft. Any-state wording remains partial at this conservative privacy boundary.');
    expect(edge.unexpected).toEqual([]);
  } finally {
    await site.runtime.close();
    await edge.close();
  }
}
