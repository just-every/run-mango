import {test,expect} from '@playwright/test';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,approve,availableTransport,consent} from './harness';

test('[SEND-004] definite provider refusals use increasing retries within the original hour and expose the terminal reason',async()=>{
  const edge=await providerEdge(),signer=eventSigner(),site=await installation(edge,signer);
  try {
    const cookie=await site.open();await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    const email='refused@example.test';await confirmedContact(site,edge,cookie,email,'Refused reader');await availableTransport(site);
    edge.behavior.refuse(email,429,6,75);
    const campaign=await draftCampaign(site,cookie,'Retry budget',[email],new Date(Date.now()-1000));await approve(site,cookie,campaign);
    const attempts=()=>edge.behavior.attempts.filter(a=>a.to===email&&a.status===429);
    const state=async()=>(await site.rows(`SELECT attempt_count,first_attempt_at,next_attempt_at,transport_disposition,last_error_detail FROM recipient_steps WHERE revision_id='${campaign.revisionId}'`))[0];
    const intervals:number[]=[];
    for(let attempt=1;attempt<=6;attempt++) {
      await expect.poll(async()=> (await state()).attempt_count,{timeout:60000}).toBe(attempt);
      const row=await state();
      // Wait for the actual disposition write, after the handoff fence increments.
      await expect.poll(async()=> (await state()).transport_disposition,{timeout:60000}).toBe(attempt===6?'failed':'queued');
      const settled=await state();expect(attempts()).toHaveLength(attempt);
      if(attempt<6) {
        const clock=await site.control('/_golive/clock');
        const delay=settled.next_attempt_at-clock.now;
        intervals.push(delay);expect(settled.next_attempt_at-settled.first_attempt_at).toBeLessThanOrEqual(3600000);
        const emissions=await site.control('/_golive/emissions');
        expect(emissions.some((e:any)=>e.command.kind==='campaign.dispatch'&&e.command.payload.revisionId===campaign.revisionId&&e.delaySeconds>=Math.floor(delay/1000))).toBe(true);
        await site.control('/_golive/clock',{advanceMs:Math.max(0,Math.ceil(delay))+10});
        await site.control('/_golive/cron');
      }else {expect(settled.last_error_detail).not.toContain('private detail');expect(row.first_attempt_at).not.toBeNull();}
    }
    expect(intervals[0]).toBeGreaterThan(70000);
    for(let i=1;i<intervals.length;i++)expect(intervals[i]).toBeGreaterThan(intervals[i-1]);
    await site.control('/_golive/cron');expect(attempts()).toHaveLength(6);
    const detail=await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);
    expect(detail.results.steps[0].failures.some((f:any)=>f.count===1&&f.code)).toBe(true);
    expect(edge.unexpected).toEqual([]);
  } finally {await site.runtime.close();await edge.close();}
});

test('[SEND-005] authenticated probes pause without recipients, obey durable cadence and recover without duplicate uncertain notices',async({page})=>{
  const edge=await providerEdge(),signer=eventSigner(),directory=await mkdtemp(join(tmpdir(),'mango-outage-'));
  const options={token:crypto.randomUUID(),stateDirectory:join(directory,'state')};
  let site=await installation(edge,signer,options);
  try {
    await site.open();await site.open('second-owner@example.test','second-owner');
    edge.behavior.setHealthStatus(503);
    await site.control('/_golive/barrier',{action:'arm',point:'outage-pause',identity:'mail.sender.v1'});
    const failingProbe=site.control('/_golive/cron');
    await expect.poll(async()=> (await site.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
    const [probe]=await site.rows("SELECT next_probe_at FROM provider_health WHERE adapter='mail.sender.v1' AND channel='email'");
    const beforeRecovery=await site.control('/_golive/clock');
    await site.control('/_golive/clock',{advanceMs:Math.max(0,probe.next_probe_at-beforeRecovery.now)+1});
    edge.behavior.setHealthStatus(200);await site.control('/_golive/cron');
    await site.control('/_golive/barrier',{action:'release'});await failingProbe;
    const [outage]=await site.rows("SELECT id,state,next_probe_at FROM provider_outages WHERE state='paused'");
    expect(outage).toBeTruthy();expect(edge.sends).toEqual([]);
    const reads=()=>edge.behavior.requests.filter(r=>r.path==='/v3/scopes');
    expect(reads()).toHaveLength(2);
    await Promise.all([site.control('/_golive/cron'),site.control('/_golive/cron')]);expect(reads()).toHaveLength(2);
    expect(await site.rows(`SELECT count(*) AS n FROM provider_outage_notifications WHERE outage_id='${outage.id}'`)).toEqual([{n:2}]);
    const clock=await site.control('/_golive/clock');
    await site.runtime.close();site=await installation(edge,signer,options);
    if(clock.offset)await site.control('/_golive/clock',{advanceMs:clock.offset});
    await site.control('/_golive/cron');expect(reads()).toHaveLength(2);
    edge.behavior.setHealthStatus(200);edge.loseResponseFor('owner@example.test');
    const current=await site.control('/_golive/clock');
    await site.control('/_golive/clock',{advanceMs:Math.max(0,outage.next_probe_at-current.now)+1});
    await site.control('/_golive/cron');
    expect(reads()).toHaveLength(3);
    expect(await site.rows(`SELECT state FROM provider_outages WHERE id='${outage.id}'`)).toEqual([{state:'recovered'}]);
    await site.control('/_golive/clock',{advanceMs:60000});await site.control('/_golive/cron');
    const notices=()=>edge.sends.filter(s=>s.body.subject==='Mango provider outage');
    expect(notices().map(n=>n.to).sort()).toEqual(['owner@example.test','second-owner@example.test']);
    expect(await site.rows(`SELECT state FROM provider_outage_notifications WHERE outage_id='${outage.id}' AND operator_id='go-live-owner'`)).toEqual([{state:'handoff-unknown'}]);
    const later=await site.control('/_golive/clock');await site.runtime.close();site=await installation(edge,signer,options);
    await site.control('/_golive/clock',{advanceMs:later.offset});
    await Promise.all([site.control('/_golive/cron'),site.control('/_golive/cron')]);
    expect(notices()).toHaveLength(2);expect(reads()).toHaveLength(3);
    // A later outage has pending recipients. Its deadline must close even while
    // no dispatch or successful probe can run; late Queue replay stays inert.
    let cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    const paced=await site.rows("SELECT next_at FROM provider_pacing WHERE scope='sendgrid:installation'"),beforeSignup=await site.control('/_golive/clock');
    await site.control('/_golive/clock',{advanceMs:Math.max(0,Math.ceil(Number(paced[0]?.next_at??0)-beforeSignup.now)+1)});
    const expiryEmail='outage-deadline@example.test',signupNow=(await site.control('/_golive/clock')).now;
    await json(await site.call('/api/contacts/consent',{method:'POST',cookie,body:{...consent,contact:{email:expiryEmail,displayName:'Deadline reader'},occurredAt:new Date(signupNow).toISOString()}}),201);
    const confirmation=edge.sends.find(send=>send.to===expiryEmail)!;
    const link=/https:\/\/\S+\/consent\/confirm\/\S+/.exec(confirmation.body.content.find((part:any)=>part.type==='text/plain').value)![0];
    expect((await fetch(site.local(link),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
    const [nextHealth]=await site.rows("SELECT next_probe_at FROM provider_health WHERE adapter='mail.sender.v1' AND channel='email'");
    const scheduled=nextHealth.next_probe_at+60000,deadline=scheduled+60000;
    const campaign=await draftCampaign(site,cookie,'Expires during outage',[expiryEmail],new Date(scheduled));
    await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body:{steps:[{channel:'email',timezone:'UTC',scheduledAt:new Date(scheduled).toISOString(),sendByAt:new Date(deadline).toISOString(),whyThisTime:'Bounded pending window'}]}}),200);
    await approve(site,cookie,campaign);
    edge.behavior.setHealthStatus(503);
    const beforeOutage=await site.control('/_golive/clock');await site.control('/_golive/clock',{advanceMs:Math.max(0,nextHealth.next_probe_at-beforeOutage.now)+1});await site.control('/_golive/cron');
    const [activeOutage]=await site.rows("SELECT id,next_probe_at FROM provider_outages WHERE state='paused'");
    expect(await site.rows(`SELECT count(*) AS n FROM provider_outage_notifications WHERE outage_id='${activeOutage.id}' AND state='pending'`)).toEqual([{n:2}]);
    await page.context().addCookies([{name:'operator_session_local',value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.goto(`${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
    await expect(page.locator('.step-result-state.status-pill--paused')).toBeVisible();
    await expect(page.locator('[data-disposition=queued] dd')).toHaveText('1');
    await page.screenshot({path:test.info().outputPath('outage-paused-pending-probe.png'),fullPage:true});
    const beforeDeadline=await site.control('/_golive/clock');await site.control('/_golive/clock',{advanceMs:deadline-beforeDeadline.now+1});await site.control('/_golive/cron');
    expect(await site.rows(`SELECT transport_disposition,skip_reason,attempt_count FROM recipient_steps WHERE revision_id='${campaign.revisionId}'`)).toEqual([{transport_disposition:'skipped',skip_reason:'send-window-expired',attempt_count:0}]);
    expect(await site.rows(`SELECT state FROM campaigns WHERE id='${campaign.campaignId}'`)).toEqual([{state:'completed'}]);
    const emitted=await site.control('/_golive/emissions'),lateIndex=emitted.findIndex((item:any)=>item.command.kind==='campaign.dispatch'&&item.command.payload.revisionId===campaign.revisionId);
    expect(lateIndex).toBeGreaterThanOrEqual(0);await site.control('/_golive/replay',{index:lateIndex});
    await expect(page.locator('[data-disposition=skipped] dd')).toHaveText('1',{timeout:30000});
    await expect(page.locator('[data-disposition=queued]')).toHaveCount(0);
    await expect(page.locator('.step-result__notes time')).toHaveCount(0);
    expect(edge.sends.filter(send=>send.to===expiryEmail&&send.body.headers?.['List-Unsubscribe'])).toEqual([]);
    edge.behavior.setHealthStatus(200);
    const beforeSecondRecovery=await site.control('/_golive/clock');await site.control('/_golive/clock',{advanceMs:Math.max(0,activeOutage.next_probe_at-beforeSecondRecovery.now)+1});await site.control('/_golive/cron');
    await expect.poll(async()=> (await site.rows(`SELECT resumed_at FROM campaign_channel_pauses WHERE campaign_id='${campaign.campaignId}' AND reason='provider-outage'`))[0]?.resumed_at,{timeout:60000}).toBeTruthy();
    await expect(page.locator('[data-disposition=skipped] dd')).toHaveText('1');
    await expect(page.locator('[data-pause-reason=provider-outage][data-pause-state=recovered]')).toBeVisible({timeout:30000});
    await page.screenshot({path:test.info().outputPath('outage-recovered-expired-recipient.png'),fullPage:true});

    expect(edge.unexpected).toEqual([]);
  } finally {await page.close();await site.control('/_golive/barrier',{action:'release'}).catch(()=>{});await site.runtime.close();await edge.close();await rm(directory,{recursive:true,force:true});}
});
