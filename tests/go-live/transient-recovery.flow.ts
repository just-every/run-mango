import {expect} from '@playwright/test';
import type {providerEdge} from './edge';
import {approve,confirmedContact,draftCampaign,json,type Installation} from './harness';

/** Real transport refusals and native recovery, with only elapsed time controlled. */
export async function transientRecovery(site:Installation,edge:Awaited<ReturnType<typeof providerEdge>>,cookie:string,existingEmail:string) {
  const otherEmail=['synthetic-mango-591','example.test'].join('@');
  await confirmedContact(site,edge,cookie,otherEmail,'Recovery reader');
  const clock=await site.control('/_golive/clock',{hold:true});
  const [health]=await site.rows("SELECT next_probe_at FROM provider_health WHERE adapter='mail.sender.v1' AND channel='email'");
  await site.control('/_golive/clock',{advanceMs:Math.max(0,health.next_probe_at-clock.now)});
  await site.control('/_golive/cron');
  const ready=await site.control('/_golive/clock'),scheduled=ready.now+60000;
  const emails=[existingEmail,otherEmail];
  for(const email of emails)edge.behavior.refuse(email,429,2,300);
  const campaign=await draftCampaign(site,cookie,'Transient outage recovery',emails,new Date(scheduled));
  await approve(site,cookie,campaign);
  const outcomes=()=>site.rows(`SELECT id,contact_id,destination,transport_disposition,skip_reason,attempt_count FROM recipient_steps WHERE revision_id='${campaign.revisionId}' ORDER BY id`);
  const attempts=()=>edge.behavior.attempts.filter(attempt=>emails.includes(attempt.to));
  const initialAttempts=attempts().length;
  const marketing=()=>edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe']);
  expect(marketing()).toEqual([]);
  await site.control('/_golive/clock',{advanceMs:scheduled-ready.now});
  await site.control('/_golive/cron');
  await expect.poll(async()=> (await outcomes()).reduce((sum,row)=>sum+row.attempt_count,0),{timeout:60000}).toBe(1);
  await expect.poll(async()=> (await outcomes()).every(row=>row.transport_disposition==='queued'),{timeout:60000}).toBe(true);
  const [observing]=await site.rows("SELECT id,state,first_failure_at,paused_at FROM provider_outages WHERE state='observing'");
  expect(observing).toMatchObject({state:'observing',first_failure_at:scheduled,paused_at:null});
  const emissions=await site.control('/_golive/emissions');
  const dispatchIndex=emissions.findIndex((item:any)=>item.command.kind==='campaign.dispatch'&&item.command.payload.revisionId===campaign.revisionId);
  expect(dispatchIndex).toBeGreaterThanOrEqual(0);
  const replay=async()=>{
    const before=(await site.control('/_golive/emissions'))[dispatchIndex].completedQueues.length;
    await site.control('/_golive/replay',{index:dispatchIndex});
    await expect.poll(async()=> (await site.control('/_golive/emissions'))[dispatchIndex].completedQueues.length,{timeout:60000}).toBeGreaterThan(before);
  };
  // Let the second initial refusal use its ordinary shared send allowance.
  // Both retries then remain in the future at the pre-threshold observation.
  await site.control('/_golive/clock',{advanceMs:2000});
  await replay();
  expect((await outcomes()).map(row=>row.attempt_count)).toEqual([1,1]);
  const beforeThreshold=await site.control('/_golive/clock',{advanceMs:297999});
  expect(beforeThreshold.now-observing.first_failure_at).toBe(299999);
  await site.control('/_golive/cron');
  await replay();
  expect(await site.rows(`SELECT state,paused_at FROM provider_outages WHERE id='${observing.id}'`)).toEqual([{state:'observing',paused_at:null}]);
  expect(attempts()).toHaveLength(initialAttempts+2);
  expect(marketing()).toEqual([]);
  await site.control('/_golive/clock',{advanceMs:1});
  await site.control('/_golive/cron');await replay();
  await expect.poll(async()=> (await site.rows(`SELECT state FROM provider_outages WHERE id='${observing.id}'`))[0].state,{timeout:60000}).toBe('paused');
  expect(await site.rows(`SELECT paused_at-first_failure_at elapsed FROM provider_outages WHERE id='${observing.id}'`)).toEqual([{elapsed:300000}]);
  expect(await site.rows("SELECT reachable,code FROM provider_health WHERE adapter='mail.sender.v1' AND channel='email'"))
    .toEqual([{reachable:1,code:'authenticated-read-succeeded'}]);
  const paused=await outcomes();
  expect(paused.map(row=>row.attempt_count).sort()).toEqual([1,2]);
  expect(paused.every(row=>row.transport_disposition==='queued'),{timeout:60000}).toBe(true);
  expect(await site.rows(`SELECT channel,reason,resumed_at FROM campaign_channel_pauses WHERE revision_id='${campaign.revisionId}'`))
    .toEqual([{channel:'email',reason:'provider-outage',resumed_at:null}]);
  await site.control('/_golive/cron');await replay();
  expect(await outcomes()).toEqual(paused);
  expect(attempts()).toHaveLength(initialAttempts+3);
  expect(marketing()).toEqual([]);
  console.log('PROBE SEND-009 acceptance-1: native 429 handoffs at elapsed 0 and 300000 ms -> observing at 299999 ms, paused at 300000 ms, queued work and replay produce no handoff');

  const barred=paused.find(row=>row.attempt_count===1)!,control=paused.find(row=>row.attempt_count===2)!;
  const unsubscribe=await site.control('/_golive/unsubscribe-link',{contactId:barred.contact_id});
  expect((await fetch(site.local(unsubscribe.url),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'List-Unsubscribe=One-Click'})).status).toBe(200);
  const contact=await json(await site.call(`/api/contacts/${barred.contact_id}`,{cookie}),200);
  expect(contact.contact.emailStatus).toBe('unsubscribed');
  for(const email of emails)edge.behavior.refuse(email,429,0);
  const [outage]=await site.rows(`SELECT next_probe_at FROM provider_outages WHERE id='${observing.id}'`);
  const pausedClock=await site.control('/_golive/clock');
  await site.control('/_golive/clock',{advanceMs:outage.next_probe_at-pausedClock.now});
  await site.control('/_golive/cron');
  await expect.poll(async()=> {
    // Recovery and operator notices retain the shared provider allowance.
    // Drive ordinary subsequent Cron ticks, without an operator resume.
    await site.control('/_golive/clock',{advanceMs:60000});
    await site.control('/_golive/cron');
    return (await outcomes()).map(row=>row.transport_disposition).sort();
  },{timeout:60000}).toEqual(['accepted','skipped']);
  const recovered=await outcomes();
  expect(recovered.find(row=>row.id===barred.id)).toEqual({...barred,transport_disposition:'skipped',skip_reason:'channel-not-subscribed'});
  expect(recovered.find(row=>row.id===control.id)).toEqual({...control,transport_disposition:'accepted',attempt_count:3});
  expect(marketing().map(send=>send.to)).toEqual([control.destination]);
  expect(await site.rows(`SELECT state FROM provider_outages WHERE id='${observing.id}'`)).toEqual([{state:'recovered'}]);
  expect((await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200)).results.steps[0].counts)
    .toEqual(expect.arrayContaining([{disposition:'accepted',reason:null,count:1},{disposition:'skipped',reason:'channel-not-subscribed',count:1}]));
  await replay();await site.control('/_golive/cron');
  expect(await outcomes()).toEqual(recovered);
  expect(marketing().map(send=>send.to)).toEqual([control.destination]);
  console.log('PROBE SEND-009 acceptance-3: public opt-out while paused, then successful authenticated probe -> automatic control handoff once, withdrawn queued recipient skipped without another attempt, replay unchanged');
}
