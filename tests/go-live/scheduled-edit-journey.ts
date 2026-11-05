import {expect,type Page,type TestInfo} from '@playwright/test';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,approve,availableTransport,type Installation} from './harness';
import {openPage} from '../support/navigation';

type Campaign = {campaignId:string;revisionId:string};
async function readDetail(site:Installation,cookie:string,campaign:Campaign) {
  return json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);
}
async function authority(site:Installation,cookie:string,campaign:Campaign) {
  const [detail,approval,recipients]=await Promise.all([
    readDetail(site,cookie,campaign),
    site.rows(`SELECT * FROM campaign_approval_requests WHERE campaign_id='${campaign.campaignId}' ORDER BY revision_id`),
    site.rows(`SELECT id,revision_id,step_id,destination,transport_disposition,skip_reason,attempt_count,handoff_started_at,provider_message_id
      FROM recipient_steps WHERE campaign_id='${campaign.campaignId}' ORDER BY step_id,id`),
  ]);
  return {activeRevisionId:detail.campaign.activeRevisionId,state:detail.campaign.state,revision:detail.revision,steps:detail.steps,approval,recipients};
}
async function draftHasNoAuthority(site:Installation,cookie:string,draft:Campaign) {
  const review=await json(await site.call(`/api/campaigns/${draft.campaignId}/review`,{cookie}),200);
  expect(review.revision).toMatchObject({id:draft.revisionId,state:'draft',contentDigest:null,approvedAt:null,approvedByOperatorId:null});
  expect(await site.rows(`SELECT revision_id FROM campaign_approval_requests WHERE revision_id='${draft.revisionId}'`)).toEqual([]);
  expect(await site.rows(`SELECT id FROM recipient_steps WHERE revision_id='${draft.revisionId}'`)).toEqual([]);
}
async function edit(site:Installation,cookie:string,campaignId:string,subject:string) {
  const draft=await json(await site.call(`/api/campaigns/${campaignId}/edit-schedule`,{method:'POST',cookie,body:{}}),201);
  await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body:{emailSubject:subject}}),200);
  return draft as Campaign & {kind:'replacement'|'fork'};
}
async function barrier(site:Installation,point:'step-start'|'approval',identity:string) {
  await site.control('/_golive/barrier',{action:'arm',point,identity});
}
async function waiting(site:Installation) {
  await expect.poll(async()=> (await site.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
}
const release=(site:Installation)=>site.control('/_golive/barrier',{action:'release'});
async function due(time:Date) {const delay=time.getTime()-Date.now();if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay+20));}
async function capture(page:Page,info:TestInfo,site:Installation,campaign:Campaign,name:string,label:string) {
  await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
  await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await page.screenshot({path:info.outputPath(`${label}-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
}

export async function scheduledEditJourney(page:Page,info:TestInfo) {
  const edge=await providerEdge(),signer=eventSigner(),site=await installation(edge,signer);
  try {
    const cookie=await site.open(),email=['synthetic-mango-701','example.test'].join('@');
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await availableTransport(site);await site.control('/_golive/sender-evidence');
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await confirmedContact(site,edge,cookie,email,'Replacement reader');
    const original=await draftCampaign(site,cookie,'Original',[email],new Date(Date.now()-1000));
    const [step]=await site.rows(`SELECT id FROM campaign_steps WHERE revision_id='${original.revisionId}'`);
    await barrier(site,'step-start',step.id);
    await approve(site,cookie,original);await waiting(site);
    const approved=await authority(site,cookie,original);
    expect(approved).toMatchObject({activeRevisionId:original.revisionId,state:'scheduled',revision:{id:original.revisionId,state:'approved'}});
    expect(approved.approval).toHaveLength(1);
    expect(approved.approval[0]).toMatchObject({revision_id:original.revisionId,operator_id:'go-live-owner',revision_digest:approved.revision.contentDigest});
    expect(approved.recipients).toHaveLength(1);
    expect(approved.recipients[0]).toMatchObject({revision_id:original.revisionId,destination:email,transport_disposition:'queued',handoff_started_at:null});
    const replacement=await json(await site.call(`/api/campaigns/${original.campaignId}/edit-schedule`,{method:'POST',cookie,body:{}}),201);
    expect(replacement.kind).toBe('replacement');
    expect(replacement.campaignId).toBe(original.campaignId);
    expect(replacement.revisionId).not.toBe(original.revisionId);
    expect(await authority(site,cookie,original)).toEqual(approved);
    await draftHasNoAuthority(site,cookie,replacement);
    await json(await site.call(`/api/campaign-revisions/${replacement.revisionId}`,{method:'PATCH',cookie,body:{emailSubject:'Replacement content'}}),200);
    expect(await authority(site,cookie,original)).toEqual(approved);
    await draftHasNoAuthority(site,cookie,replacement);
    const review=await json(await site.call(`/api/campaigns/${original.campaignId}/review`,{cookie}),200);
    expect(review.revision.emailSubject).toBe('Replacement content');
    expect(review.campaign.activeRevisionId).toBe(original.revisionId);
    console.log('PROBE CAMP-007 acceptance-1: edit-schedule POST and draft PATCH -> original active revision, immutable approval and queued recipient unchanged; replacement has no authority');
    await capture(page,info,site,original,'Original','replacement-unapproved');
    await approve(site,cookie,replacement);
    await release(site);
    await expect.poll(()=>Promise.resolve(edge.sends.filter(s=>s.to===email&&s.body.headers?.['List-Unsubscribe']).length),{timeout:60000}).toBe(1);
    expect(edge.sends.filter(s=>s.to===email&&s.body.headers?.['List-Unsubscribe']).map(s=>s.body.subject)).toEqual(['Replacement content']);
    expect(await site.rows(`SELECT transport_disposition,skip_reason FROM recipient_steps WHERE revision_id='${original.revisionId}'`)).toEqual([{transport_disposition:'skipped',skip_reason:'schedule-replaced'}]);
    const emissions=await site.control('/_golive/emissions');
    const oldIndex=emissions.findIndex((e:any)=>e.command.kind==='campaign.dispatch'&&e.command.payload.revisionId===original.revisionId);
    expect(oldIndex).toBeGreaterThanOrEqual(0);await site.control('/_golive/replay',{index:oldIndex});

    const secondEmail=['synthetic-mango-702','example.test'].join('@');await confirmedContact(site,edge,cookie,secondEmail,'Dispatch reader');
    const time=new Date(Date.now()+12000),second=await draftCampaign(site,cookie,'Dispatch winner',[secondEmail],time);
    await approve(site,cookie,second);
    const contender=await edit(site,cookie,second.campaignId,'Losing replacement');
    await barrier(site,'approval',contender.revisionId);
    const approval=site.call(`/api/campaigns/${second.campaignId}/approve`,{method:'POST',cookie,body:{revisionId:contender.revisionId,idempotencyKey:`approval-${contender.revisionId}`}});
    await waiting(site);await due(time);await site.control('/_golive/cron');
    await expect.poll(()=>Promise.resolve(edge.sends.filter(s=>s.to===secondEmail&&s.body.headers?.['List-Unsubscribe']).length),{timeout:60000}).toBe(1);
    await release(site);expect((await approval).status).toBe(409);
    expect(await site.rows(`SELECT active_revision_id FROM campaigns WHERE id='${second.campaignId}'`)).toEqual([{active_revision_id:second.revisionId}]);
    expect(edge.sends.filter(s=>s.to===secondEmail&&s.body.headers?.['List-Unsubscribe']).map(s=>s.body.subject)).toEqual(['Dispatch winner: what is growing this month']);
    expect(await site.rows(`SELECT count(*) AS n FROM recipient_steps WHERE revision_id='${contender.revisionId}'`)).toEqual([{n:0}]);
    const fork=await edit(site,cookie,second.campaignId,'Future fork');expect(fork.kind).toBe('fork');expect(fork.campaignId).not.toBe(second.campaignId);
    await site.control('/_golive/cron');
    expect(edge.sends.filter(s=>s.body.headers?.['List-Unsubscribe']).map(s=>s.body.subject).sort()).toEqual(['Dispatch winner: what is growing this month','Replacement content'].sort());
    console.log('PROBE CAMP-007 acceptance-2: forced replacement-first and dispatch-first approval orderings -> replacement alone sends or approval conflicts; stale dispatch replay sends nothing');
    await laterStepsContinue(page,info,site,edge,cookie);
    expect(edge.unexpected).toEqual([]);
  } finally {await release(site).catch(()=>{});await page.close();await site.runtime.close();await edge.close();}
}

async function laterStepsContinue(page:Page,info:TestInfo,site:Installation,edge:Awaited<ReturnType<typeof providerEdge>>,cookie:string) {
  const email=['synthetic-mango-703','example.test'].join('@');
  await confirmedContact(site,edge,cookie,email,'Three step reader');
  const clock=await site.control('/_golive/clock',{hold:true});
  const times=[1,26,51].map(hours=>new Date(clock.now+hours*3600000));
  const original=await draftCampaign(site,cookie,'Market series',[email],times[0]);
  await json(await site.call(`/api/campaign-revisions/${original.revisionId}`,{method:'PATCH',cookie,body:{
    steps:times.map((time,index)=>({channel:'email',timezone:'Australia/Brisbane',scheduledAt:time.toISOString(),
      sendByAt:new Date(time.getTime()+2*3600000).toISOString(),whyThisTime:`Market series step ${index+1}`})),
  }}),200);
  const approval=await approve(site,cookie,original);
  const approved=await authority(site,cookie,original);
  expect(approved.approval).toHaveLength(1);
  expect(approved.approval[0]).toMatchObject({revision_id:original.revisionId,revision_digest:approval.revisionDigest,operator_id:'go-live-owner'});
  expect(approved.recipients).toHaveLength(3);
  expect(approved.recipients.every(row=>row.transport_disposition==='queued')).toBe(true);
  const steps=approved.steps;
  expect(steps).toHaveLength(3);
  const marketing=()=>edge.sends.filter(send=>send.to===email&&send.body.headers?.['List-Unsubscribe']);
  const advanceTo=async(time:Date)=>{
    const now=await site.control('/_golive/clock');
    await site.control('/_golive/clock',{advanceMs:time.getTime()-now.now+1});
    await site.control('/_golive/sender-evidence');
    await site.control('/_golive/cron');
  };
  const recipients=(stepId:string)=>site.rows(`SELECT id,revision_id,step_id,transport_disposition,skip_reason,attempt_count,handoff_started_at,provider_message_id
    FROM recipient_steps WHERE revision_id='${original.revisionId}' AND step_id='${stepId}'`);
  await advanceTo(times[0]);
  await expect.poll(async()=> (await recipients(steps[0].id))[0].transport_disposition,{timeout:60000}).toBe('accepted');
  expect(marketing()).toHaveLength(1);
  const afterFirst=await authority(site,cookie,original);
  expect(afterFirst.state).toBe('dispatching');
  expect(afterFirst.approval).toEqual(approved.approval);
  expect(afterFirst.revision).toEqual(approved.revision);
  const fork=await json(await site.call(`/api/campaigns/${original.campaignId}/edit-schedule`,{method:'POST',cookie,body:{}}),201);
  expect(fork.kind).toBe('fork');
  expect(fork.campaignId).not.toBe(original.campaignId);
  expect(fork.revisionId).not.toBe(original.revisionId);
  expect(await authority(site,cookie,original)).toEqual(afterFirst);
  await draftHasNoAuthority(site,cookie,fork);
  await json(await site.call(`/api/campaign-revisions/${fork.revisionId}`,{method:'PATCH',cookie,body:{name:'Future market series',emailSubject:'Future series draft'}}),200);
  expect(await authority(site,cookie,original)).toEqual(afterFirst);
  await draftHasNoAuthority(site,cookie,fork);
  const forkDetail=await readDetail(site,cookie,fork);
  expect(forkDetail.campaign).toMatchObject({state:'draft',activeRevisionId:fork.revisionId});
  expect(forkDetail.revision).toMatchObject({id:fork.revisionId,state:'draft',name:'Future market series',emailSubject:'Future series draft'});
  for(const step of steps.slice(1))expect(await recipients(step.id)).toEqual([
    expect.objectContaining({revision_id:original.revisionId,step_id:step.id,transport_disposition:'queued',handoff_started_at:null,provider_message_id:null}),
  ]);
  await capture(page,info,site,fork,'Future market series','post-dispatch-draft-fork');
  await advanceTo(times[1]);
  await expect.poll(async()=> (await recipients(steps[1].id))[0].transport_disposition,{timeout:60000}).toBe('accepted');
  await site.control('/_golive/cron');
  expect(marketing()).toHaveLength(2);
  expect(marketing().map(send=>send.body.subject)).toEqual(Array(2).fill('Market series: what is growing this month'));
  const beforeCancel=await authority(site,cookie,original);
  expect(beforeCancel).toMatchObject({activeRevisionId:original.revisionId,state:'dispatching'});
  expect(beforeCancel.revision).toEqual(approved.revision);
  expect(beforeCancel.approval).toEqual(approved.approval);
  const accepted=beforeCancel.recipients.filter(row=>row.transport_disposition==='accepted');
  expect(accepted).toHaveLength(2);
  for(const row of accepted) {
    expect(row.handoff_started_at).not.toBeNull();
    expect(row.provider_message_id).toBeTruthy();
    expect(row.attempt_count).toBe(1);
  }
  expect(await recipients(steps[2].id)).toEqual([expect.objectContaining({transport_disposition:'queued',handoff_started_at:null})]);
  await capture(page,info,site,original,'Market series','original-second-step-sent');
  await expect(page.locator(`[data-step-id="${steps[0].id}"] [data-disposition=accepted] dd`)).toHaveText('1');
  await expect(page.locator(`[data-step-id="${steps[1].id}"] [data-disposition=accepted] dd`)).toHaveText('1');
  await page.getByRole('button',{name:'Cancel campaign',exact:true}).click();
  const cancelled=page.waitForResponse(response=>new URL(response.url()).pathname===`/api/campaigns/${original.campaignId}/cancel`&&response.request().method()==='POST');
  await page.getByRole('button',{name:'Confirm cancellation',exact:true}).click();
  const response=await cancelled;
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({status:'cancelled'});
  await advanceTo(times[2]);
  const emissions=await site.control('/_golive/emissions');
  for(const [index,emission] of emissions.entries())if(emission.command.kind==='campaign.dispatch'&&emission.command.payload.revisionId===original.revisionId)await site.control('/_golive/replay',{index});
  await site.control('/_golive/cron');
  const afterCancel=await authority(site,cookie,original);
  expect(afterCancel).toMatchObject({activeRevisionId:original.revisionId,state:'cancelled'});
  expect(afterCancel.approval).toEqual(approved.approval);
  expect(afterCancel.revision).toEqual(approved.revision);
  expect(afterCancel.recipients.filter(row=>row.transport_disposition==='accepted')).toEqual(accepted);
  expect(await recipients(steps[2].id)).toEqual([expect.objectContaining({transport_disposition:'skipped',skip_reason:'campaign-cancelled',attempt_count:0,handoff_started_at:null,provider_message_id:null})]);
  expect(await site.rows(`SELECT started_at FROM step_dispatches WHERE step_id='${steps[2].id}' AND started_at IS NOT NULL`)).toEqual([]);
  expect(marketing()).toHaveLength(2);
  const report=await json(await site.call(`/api/campaigns/${original.campaignId}/recipients?revisionId=${original.revisionId}&stepId=${steps[2].id}&outcome=skipped&reason=campaign-cancelled`,{cookie}),200);
  expect(report.rows).toEqual([expect.objectContaining({stepId:steps[2].id,destination:email,disposition:'skipped',reason:'campaign-cancelled'})]);
  expect(await site.rows(`SELECT actor_id,action FROM lifecycle_audit_entries WHERE entity_id='${original.campaignId}' AND action='cancelled'`)).toEqual([{actor_id:'go-live-owner',action:'cancelled'}]);
  await draftHasNoAuthority(site,cookie,fork);
  await capture(page,info,site,original,'Market series','original-third-step-cancelled');
  await expect(page.locator(`[data-step-id="${steps[2].id}"] [data-disposition=skipped] dd`)).toHaveText('1');
  console.log('PROBE CAMP-007 acceptance-3: edit after first handoff -> independent unauthorised draft; original second step sends once; explicit cancellation skips third as campaign-cancelled, preserves two accepted outcomes and fences replay');
}
