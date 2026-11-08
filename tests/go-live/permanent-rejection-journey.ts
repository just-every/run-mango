import {expect, test, type Page} from '@playwright/test';
import {openPage, reloadPage} from '../support/navigation';
import {approve, availableTransport, confirmedContact, draftCampaign, json, type Installation} from './harness';
import type {providerEdge} from './edge';

/** A definite refusal must stay terminal even when the next edge request would succeed. */
export async function permanentRejectionJourney(site:Installation, edge:Awaited<ReturnType<typeof providerEdge>>, cookie:string, page:Page) {
  const email=['synthetic-mango-135','example.test'].join('@');
  await confirmedContact(site,edge,cookie,email,'Permanent rejection reader');
  await availableTransport(site);
  const beforeAttempts=edge.behavior.attempts.length;
  edge.behavior.refuse(email,400,1);
  const before=await site.control('/_golive/clock');
  const campaign=await draftCampaign(site,cookie,'Permanent rejection',[email],new Date(before.now-1000));
  await approve(site,cookie,campaign);
  const recipients=()=>site.rows(`SELECT id,step_id,transport_disposition,attempt_count,first_attempt_at,terminal_at,
    next_attempt_at,provider_message_id,provider_accepted_at,handed_off_at,handoff_started_at,
    lease_token,lease_expires_at,last_error_code,last_error_detail FROM recipient_steps WHERE revision_id='${campaign.revisionId}'`);
  await expect.poll(async()=>(await recipients()).map(row=>row.transport_disposition),{timeout:60000}).toEqual(['failed']);
  const [failed]=await recipients(),after=await site.control('/_golive/clock');
  expect(failed).toMatchObject({transport_disposition:'failed',attempt_count:1,next_attempt_at:null,
    provider_message_id:null,provider_accepted_at:null,handed_off_at:null,handoff_started_at:null,
    lease_token:null,lease_expires_at:null,last_error_code:'provider_rejected',last_error_detail:'SendGrid rejected the submission.'});
  expect(failed.first_attempt_at).toBeGreaterThanOrEqual(before.now);
  expect(failed.terminal_at).toBeGreaterThanOrEqual(failed.first_attempt_at);
  expect(failed.terminal_at).toBeLessThanOrEqual(after.now);
  const attempts=()=>edge.behavior.attempts.slice(beforeAttempts).filter(attempt=>attempt.to===email);
  const accepted=()=>edge.sends.filter(send=>send.to===email&&send.body.headers?.['List-Unsubscribe']);
  expect(attempts()).toEqual([{to:email,status:400,at:expect.any(Number)}]);
  expect(accepted()).toEqual([]);

  const readResults=async()=>{
    const detail=await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);
    expect(detail.campaign.state).toBe('completed');
    expect(detail.results.cancellable).toBe(false);
    expect(detail.results.steps).toHaveLength(1);
    expect(detail.results.steps[0]).toMatchObject({stepId:failed.step_id,state:'Failed',stoppableCount:0,inFlightCount:0,
      counts:[{disposition:'failed',reason:null,count:1}],
      failures:[{code:'provider_rejected',detail:'SendGrid rejected the submission.',count:1}]});
    expect(Date.parse(detail.results.steps[0].completedAt)).toBeGreaterThanOrEqual(failed.terminal_at);
    const report=await json(await site.call(`/api/campaigns/${campaign.campaignId}/recipients?revisionId=${campaign.revisionId}`,{cookie}),200);
    expect(report.total).toBe(1);
    expect(report.rows).toEqual([expect.objectContaining({recipientStepId:failed.id,stepId:failed.step_id,destination:email,
      disposition:'failed',reason:'provider_rejected'})]);
    expect(report.buckets).toEqual([{stepId:failed.step_id,disposition:'failed',reason:null,count:1}]);
    expect(JSON.stringify({detail,report})).not.toContain('private detail');
  };
  await expect.poll(async()=>(await site.rows(`SELECT state FROM campaigns WHERE id='${campaign.campaignId}'`))[0].state,{timeout:60000}).toBe('completed');
  await readResults();
  const emissions=await site.control('/_golive/emissions');
  const dispatchIndex=emissions.findIndex((item:any)=>item.command.kind==='campaign.dispatch'&&item.command.payload.revisionId===campaign.revisionId);
  expect(dispatchIndex).toBeGreaterThanOrEqual(0);
  expect(emissions.filter((item:any)=>item.command.idempotencyKey.startsWith(`dispatch-retry:${failed.id}:`))).toEqual([]);

  await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  await page.setViewportSize({width:1440,height:1000});
  await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
  const visibleResults=async()=>{
    await expect(page.locator('.step-result-state')).toHaveText('Failed');
    await expect(page.locator('[data-disposition=failed] dd')).toHaveText('1');
    await expect(page.locator('.step-result__notes')).toContainText('SendGrid rejected the submission. (provider_rejected)');
    await expect(page.getByRole('table',{name:'Recipient outcomes'}).locator('tbody tr')).toHaveCount(1);
    const row=page.getByRole('table',{name:'Recipient outcomes'}).locator('tbody tr');
    await expect(row).toContainText(email);
    await expect(row.locator('[data-label=Outcome]')).toHaveText('failed');
    await expect(row.locator('[data-label=Reason]')).toHaveText('provider_rejected');
    await expect(page.locator('body')).not.toContainText('private detail');
  };
  await visibleResults();
  await site.control('/_golive/clock',{advanceMs:3600001});
  await site.control('/_golive/cron');
  await site.control('/_golive/replay',{index:dispatchIndex});
  await expect.poll(async()=>(await site.control('/_golive/emissions'))[dispatchIndex].completedQueues.length,{timeout:60000})
    .toBeGreaterThan(emissions[dispatchIndex].completedQueues.length);
  await reloadPage(page);
  await visibleResults();
  await readResults();
  expect(await recipients()).toEqual([failed]);
  expect(attempts()).toHaveLength(1);
  expect(accepted()).toEqual([]);
  expect((await site.control('/_golive/emissions')).filter((item:any)=>item.command.idempotencyKey.startsWith(`dispatch-retry:${failed.id}:`))).toEqual([]);
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await page.screenshot({path:test.info().outputPath(`permanent-rejection-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
}
