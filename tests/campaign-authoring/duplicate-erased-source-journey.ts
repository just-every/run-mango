import {expect,type Page,type TestInfo} from '@playwright/test';
import {eraseHttp} from '../audience-import/erase';
import {json,type Installation} from '../go-live/harness';
import {openPage} from '../support/navigation';

/** Only the persisted post-erasure composition may become a fresh draft. */
export async function duplicateErasedSourceJourney(site:Installation,cookie:string,
  source:{campaignId:string;revisionId:string},erasedId:string,erasedAddress:string,page:Page,info:TestInfo) {
  const path=`/api/campaigns/${source.campaignId}/duplicate`;
  const before=await site.count('campaigns');
  // Hold a genuine native write after its source read. Erasure must retire that
  // in-flight snapshot, even though the caller still has a valid owner session.
  await site.control('/_golive/barrier',{action:'arm',point:'revision-create',identity:'Copy of synthetic-mango-504 source'});
  const stale=site.call(path,{method:'POST',cookie,body:{}});
  try {
    await expect.poll(async()=>(await site.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
    expect((await eraseHttp(site,cookie,erasedId)).state).toBe('complete');
  } finally {
    await site.control('/_golive/barrier',{action:'release'});
  }
  const refusal=await stale;
  expect(refusal.status,await refusal.text()).toBe(500);
  expect(await site.count('campaigns')).toBe(before);
  const get=async(id:string)=>json(await site.call(`/api/campaigns/${id}`,{cookie}),200);
  const redacted=await get(source.campaignId);
  expect(redacted.campaign.state).toBe('erasure-invalidated');
  expect(redacted.revision.state).toBe('erasure-invalidated');
  expect(redacted.revision.emailBody).toBe('<p>synthetic-mango-509 editorial contact [erased].</p><hr><p>{{physical_address}}</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>');
  expect(redacted.revision.inclusionRuleJson).toContain('"value":"[erased]"');
  const original=await site.rows(`SELECT * FROM campaign_revisions WHERE id='${source.revisionId}'`);
  const identities=new Set([source.campaignId]);
  await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  await page.setViewportSize({width:1440,height:1000});
  await openPage(page,`${site.runtime.url}/app/campaigns/${source.campaignId}`);
  await expect(page.getByRole('heading',{name:'Review required after contact erasure',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('erased-source-1440.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:info.outputPath('erased-source-390.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  for(let attempt=0;attempt<2;attempt++) {
    let copy:{campaignId:string;revisionId:string};
    if(attempt===0) {
      const response=page.waitForResponse(response=>response.url()===site.runtime.url+path&&response.request().method()==='POST');
      await page.getByRole('button',{name:'Duplicate',exact:true}).click();
      expect((await response).status()).toBe(201);
      await page.waitForURL(url=>url.pathname.startsWith('/app/campaigns/')&&url.pathname.endsWith('/review'));
      const campaignId=new URL(page.url()).pathname.split('/')[3];
      copy={campaignId,revisionId:(await get(campaignId)).revision.id};
      await expect(page.getByRole('heading',{name:'Copy of synthetic-mango-504 source',exact:true})).toBeVisible();
      await page.screenshot({path:info.outputPath('redacted-copy-1440.png'),fullPage:true});
      await page.setViewportSize({width:390,height:844});
      await page.screenshot({path:info.outputPath('redacted-copy-390.png'),fullPage:true});
      await page.setViewportSize({width:1440,height:1000});
    } else copy=await json(await site.call(path,{method:'POST',cookie,body:{}}),201);
    expect(identities.has(copy.campaignId)).toBe(false);identities.add(copy.campaignId);
    for(let reopen=0;reopen<2;reopen++) {
      const detail=await get(copy.campaignId);
      const review=await json(await site.call(`/api/campaigns/${copy.campaignId}/review`,{cookie}),200);
      for(const read of [detail,review]) {
        expect(read.campaign).toMatchObject({state:'draft',activeRevisionId:copy.revisionId,proposalId:null});
        expect(read.revision).toMatchObject({state:'draft',name:'Copy of synthetic-mango-504 source',
          emailBody:redacted.revision.emailBody,emailText:redacted.revision.emailText,
          inclusionRuleJson:redacted.revision.inclusionRuleJson,approvedAt:null,approvedByOperatorId:null,contentDigest:null});
        expect(read.steps).toEqual([]);expect(read.audience).toBeUndefined();expect(read.results).toBeUndefined();
        expect(JSON.stringify(read)).not.toContain(erasedAddress);expect(JSON.stringify(read)).not.toContain(erasedId);
      }
    }
    expect((await site.rows(`SELECT email_body,email_text,inclusion_rule_json FROM campaign_revisions WHERE id='${copy.revisionId}'`))[0])
      .toEqual({email_body:redacted.revision.emailBody,email_text:redacted.revision.emailText,inclusion_rule_json:redacted.revision.inclusionRuleJson});
    for(const [table,column,id] of [['campaign_approval_requests','campaign_id',copy.campaignId],['recipient_steps','campaign_id',copy.campaignId],
      ['campaign_audiences','revision_id',copy.revisionId],['campaign_revision_candidates','revision_id',copy.revisionId],
      ['step_dispatches','revision_id',copy.revisionId]] as const)expect(await site.rows(`SELECT * FROM ${table} WHERE ${column}='${id}'`)).toEqual([]);
    expect((await json(await site.call(`/api/campaigns/${copy.campaignId}/test-sends`,{cookie}),200)).tests).toEqual([]);
    const approval=await json(await site.call(`/api/campaigns/${copy.campaignId}/approve`,{method:'POST',cookie,
      body:{revisionId:copy.revisionId,idempotencyKey:`synthetic-mango-510-${attempt}`}}),409);
    expect(approval.blockers).toContainEqual(expect.objectContaining({kind:'schedule.steps',blocking:true}));
    expect(await site.rows(`SELECT * FROM campaign_approval_requests WHERE campaign_id='${copy.campaignId}'`)).toEqual([]);
    expect(await site.rows(`SELECT * FROM recipient_steps WHERE campaign_id='${copy.campaignId}'`)).toEqual([]);
    expect((await site.control('/_golive/emissions')).filter((row:any)=>row.command.payload?.campaignId===copy.campaignId)).toEqual([]);
  }
  expect(await site.rows(`SELECT * FROM contacts WHERE id='${erasedId}'`)).toEqual([]);
  expect(await site.rows(`SELECT * FROM contact_email_addresses WHERE email='${erasedAddress}'`)).toEqual([]);
  expect(await site.rows(`SELECT * FROM campaign_revisions WHERE id='${source.revisionId}'`)).toEqual(original);
  expect(await json(await site.call('/api/campaign-templates',{method:'POST',cookie,body:{revisionId:source.revisionId,name:'synthetic-mango-511'}}),404)).toEqual({kind:'not_found'});
  const revoked=await site.open();
  const signout=await site.call('/auth/signout',{method:'POST',cookie:revoked,body:{},headers:{Origin:site.runtime.url}});
  expect(signout.status,await signout.text()).toBe(204);
  expect((await site.call(path,{method:'POST',cookie:revoked,body:{}})).status).toBe(401);
  expect(await site.count('campaigns')).toBe(before+2);
  console.log('PROBE CAMP-018 erasure: native erasure retires an in-flight copy with no writes; fresh duplication twice retains only current redacted bytes and rules in independent unscheduled drafts, with no copied authority, no erased identity and no source mutation; explicit approval requires a new schedule, and revoked sessions are refused.');
}
