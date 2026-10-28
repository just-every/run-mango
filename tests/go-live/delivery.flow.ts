const width = 1440;
import {sendingConnectionJourney} from './sending-connection-journey';
import {test,expect} from '@playwright/test';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {providerEdge} from './edge';
import {event,eventSigner} from './sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,approve,availableTransport,signedPost,type Installation} from './harness';

async function barrier(site:Installation,point:'step-start'|'approval'|'handoff',identity:string) {
  await site.control('/_golive/barrier',{action:'arm',point,identity});
}
async function waiting(site:Installation) {
  await expect.poll(async()=> (await site.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
}
const release=(site:Installation)=>site.control('/_golive/barrier',{action:'release'});
async function setup(site:Installation) {
  const cookie=await site.open();
  await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
  await availableTransport(site);await site.control('/_golive/sender-evidence');return cookie;
}
async function edit(site:Installation,cookie:string,campaignId:string,subject:string) {
  const draft=await json(await site.call(`/api/campaigns/${campaignId}/edit-schedule`,{method:'POST',cookie,body:{}}),201);
  await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body:{emailSubject:subject}}),200);
  return draft as {campaignId:string;revisionId:string;kind:'replacement'|'fork'};
}
async function due(time:Date) {const delay=time.getTime()-Date.now();if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay+20));}









export const walk0 = async()=>{
  const edge=await providerEdge(),signer=eventSigner(),site=await installation(edge,signer);
  try {
    const cookie=await setup(site),email='replace@example.test';
    await confirmedContact(site,edge,cookie,email,'Replacement reader');
    const original=await draftCampaign(site,cookie,'Original',[email],new Date(Date.now()-1000));
    const [step]=await site.rows(`SELECT id FROM campaign_steps WHERE revision_id='${original.revisionId}'`);
    await barrier(site,'step-start',step.id);
    await approve(site,cookie,original);await waiting(site);
    const replacement=await edit(site,cookie,original.campaignId,'Replacement content');
    expect(replacement.kind).toBe('replacement');await approve(site,cookie,replacement);
    await release(site);
    await expect.poll(()=>Promise.resolve(edge.sends.filter(s=>s.to===email&&s.body.headers?.['List-Unsubscribe']).length),{timeout:60000}).toBe(1);
    expect(edge.sends.filter(s=>s.to===email&&s.body.headers?.['List-Unsubscribe']).map(s=>s.body.subject)).toEqual(['Replacement content']);
    expect(await site.rows(`SELECT transport_disposition,skip_reason FROM recipient_steps WHERE revision_id='${original.revisionId}'`)).toEqual([{transport_disposition:'skipped',skip_reason:'schedule-replaced'}]);
    const emissions=await site.control('/_golive/emissions');
    const oldIndex=emissions.findIndex((e:any)=>e.command.kind==='campaign.dispatch'&&e.command.payload.revisionId===original.revisionId);
    expect(oldIndex).toBeGreaterThanOrEqual(0);await site.control('/_golive/replay',{index:oldIndex});

    const secondEmail='dispatch-wins@example.test';await confirmedContact(site,edge,cookie,secondEmail,'Dispatch reader');
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
    expect(edge.unexpected).toEqual([]);
  } finally {await release(site).catch(()=>{});await site.runtime.close();await edge.close();}
};
export const walk1 = async()=>{
  const edge=await providerEdge(),signer=eventSigner(),site=await installation(edge,signer);
  try {
    const cookie=await setup(site),email='restriction-race@example.test';await confirmedContact(site,edge,cookie,email,'Restricted reader');
    const time=new Date(Date.now()+12000),campaign=await draftCampaign(site,cookie,'Restricted letter',[email],time);
    await approve(site,cookie,campaign);
    const [recipient]=await site.rows(`SELECT id FROM recipient_steps WHERE revision_id='${campaign.revisionId}'`);
    await barrier(site,'handoff',recipient.id);await due(time);await site.control('/_golive/cron');await waiting(site);
    const body=Buffer.from(JSON.stringify([event('spamreport',email,Date.now(),'previous-message',{})]));
    expect(await signedPost(site,'/webhooks/mail/sendgrid',body,signer.headers(body))).toBe(204);
    await release(site);
    await expect.poll(async()=> (await site.rows(`SELECT lease_token FROM recipient_steps WHERE id='${recipient.id}'`))[0].lease_token,{timeout:60000}).toBeNull();
    expect(await site.rows(`SELECT attempt_count,handoff_started_at FROM recipient_steps WHERE id='${recipient.id}'`)).toEqual([{attempt_count:0,handoff_started_at:null}]);
    const emissions=await site.control('/_golive/emissions');
    const index=emissions.findIndex((e:any)=>e.command.kind==='campaign.dispatch'&&e.command.payload.revisionId===campaign.revisionId);
    await site.control('/_golive/replay',{index});await site.control('/_golive/cron');
    expect(edge.sends.filter(s=>s.to===email&&s.body.headers?.['List-Unsubscribe'])).toEqual([]);
    expect(edge.unexpected).toEqual([]);
  } finally {await release(site).catch(()=>{});await site.runtime.close();await edge.close();}
};
export const walk2 = async({page})=>{
  const edge=await providerEdge(),signer=eventSigner(),directory=await mkdtemp(join(tmpdir(),'mango-pacing-'));
  const options={token:crypto.randomUUID(),stateDirectory:join(directory,'state')};
  let site=await installation(edge,signer,options);
  const observations:Array<Record<string,unknown>>=[];
  const observe=async(label:string)=>observations.push({label,at:Date.now(),
    recipients:await site.rows('SELECT id,revision_id,destination,transport_disposition,attempt_count,first_attempt_at,handoff_started_at,updated_at FROM recipient_steps'),
    dispatches:await site.rows('SELECT step_id,state,started_at,updated_at,estimated_completion_at FROM step_dispatches'),
    emissions:await site.control('/_golive/emissions'),
    provider:edge.sends.map(({to,messageId,at,outcome})=>({to,messageId,at,outcome}))});
  try {
    let cookie=await setup(site);
    const emails=Array.from({length:10},(_,i)=>`paced-${i}@example.test`);
    for(const email of emails)await confirmedContact(site,edge,cookie,email,email);
    const time=new Date(Date.now()+12000);
    const a=await draftCampaign(site,cookie,'Shared A',emails.slice(0,5),time),b=await draftCampaign(site,cookie,'Shared B',emails.slice(5),time);
    await Promise.all([approve(site,cookie,a),approve(site,cookie,b)]);
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.goto(`${site.runtime.url}/app/campaigns/${b.campaignId}/scheduled`);
    await due(time);await site.control('/_golive/cron');
    const marketing=()=>edge.sends.filter(s=>s.body.headers?.['List-Unsubscribe']);
    await expect.poll(()=>Promise.resolve(marketing().length),{timeout:60000}).toBeGreaterThan(0);
    // The restart is after a recorded receipt, not during an unacknowledged
    // HTTP handoff (whose correct outcome would instead be durable uncertainty).
    await expect.poll(async()=> (await site.rows("SELECT count(*) AS n FROM recipient_steps WHERE transport_disposition='accepted'"))[0].n,{timeout:60000}).toBeGreaterThan(0);
    await expect.poll(async()=> (await site.rows("SELECT count(*) AS n FROM recipient_steps WHERE transport_disposition='handoff-unknown'"))[0].n,{timeout:60000}).toBe(0);
    await observe('before-restart-receipts-settled');
    const acceptedBeforeRestart=(await site.rows(`SELECT count(*) AS n FROM recipient_steps WHERE revision_id='${b.revisionId}' AND transport_disposition='accepted'`))[0].n;
    const deferred=await site.rows("SELECT attempt_count,first_attempt_at FROM recipient_steps WHERE transport_disposition='queued'");
    expect(deferred.length).toBeGreaterThan(0);for(const row of deferred)expect(row).toEqual({attempt_count:0,first_attempt_at:null});
    const budget=await site.rows('SELECT scope,next_at,updated_at FROM provider_pacing');expect(budget).toHaveLength(1);
    await site.runtime.close();edge.behavior.delayMarketingResponses(8000);site=await installation(edge,signer,options);cookie=await site.open();
    expect((await site.rows('SELECT scope,next_at,updated_at FROM provider_pacing'))[0].next_at).toBeGreaterThanOrEqual(budget[0].next_at);
    await page.context().clearCookies();await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.goto(`${site.runtime.url}/app/campaigns/${b.campaignId}/scheduled`);
    await site.control('/_golive/cron');
    const step=page.locator('[data-step-id]');
    const estimate=step.locator('.step-result__notes time');
    await expect(estimate).toBeVisible({timeout:30000});
    const estimatedAt=Date.parse((await estimate.getAttribute('datetime'))!);
    const [initialProgress]=await site.rows(`SELECT started_at,updated_at,estimated_completion_at FROM step_dispatches WHERE revision_id='${b.revisionId}'`);
    expect(estimatedAt).toBeGreaterThan(initialProgress.started_at);
    await page.screenshot({path:test.info().outputPath('dispatch-shared-backlog-eta.png'),fullPage:true});
    await observe('screen-open-with-shared-backlog');
    // Queue batches may spend several slow provider responses on A before B.
    // Measure screen freshness from B's actual durable receipt, not its time
    // waiting behind another campaign in the same shared provider backlog.
    await expect.poll(async()=> (await site.rows(`SELECT count(*) AS n FROM recipient_steps WHERE revision_id='${b.revisionId}' AND transport_disposition='accepted'`))[0].n,{timeout:60000}).toBeGreaterThan(acceptedBeforeRestart);
    await observe('b-acceptance-recorded');
    await expect.poll(async()=>Number((await page.locator('[data-disposition=accepted] dd').allTextContents())[0]??0),{timeout:30000}).toBeGreaterThan(acceptedBeforeRestart);
    await observe('b-acceptance-visible-without-navigation');
    expect(marketing().length).toBeLessThan(emails.length);
    const [liveProgress]=await site.rows(`SELECT updated_at FROM step_dispatches WHERE revision_id='${b.revisionId}'`);
    expect(liveProgress.updated_at).toBeGreaterThan(initialProgress.started_at);
    // Slow replies have proved that the open screen refreshes during a backlog.
    // Release that edge delay before draining: if B wins the shared queue early,
    // eight remaining 8-second replies alone exceed the completion wait.
    edge.behavior.delayMarketingResponses(0);
    await expect.poll(()=>Promise.resolve(marketing().length),{timeout:60000}).toBe(emails.length);
    const sends=edge.sends.slice().sort((a,b)=>a.at-b.at);
    // Compare measured handoffs to the installation's actual configured spacing,
    // not a literal rate or a per-campaign allowance.
    const spacing=budget[0].next_at-budget[0].updated_at;
    for(let i=1;i<sends.length;i++)expect(sends[i].at-sends[i-1].at).toBeGreaterThanOrEqual(spacing-100);
    await expect(page.locator('[data-disposition=accepted] dd')).toHaveText('5',{timeout:30000});
    await expect(page.locator('[data-disposition=queued]')).toHaveCount(0);
    await expect(page.locator('.step-result__countdown')).toHaveCount(0);
    for(const email of emails)expect(marketing().filter(s=>s.to===email)).toHaveLength(1);
    expect(edge.unexpected).toEqual([]);
  } finally {
    await observe('terminal').catch(()=>{});
    await test.info().attach('shared-budget-native-observations',{body:Buffer.from(JSON.stringify(observations,null,2)),contentType:'application/json'});
    await page.close();await site.runtime.close();await edge.close();await rm(directory,{recursive:true,force:true});
  }
};
export const walk3 = async({page},info)=>{
  await sendingConnectionJourney(page,info);
  const edge=await providerEdge(),signer=eventSigner(),site=await installation(edge,signer);
  try {
    const cookie=await setup(site),email='account-hold@example.test';
    await confirmedContact(site,edge,cookie,email,'Account reader');
    const bouncedEmail='account-bounce@example.test';await confirmedContact(site,edge,cookie,bouncedEmail,'Bounce reader');
    const time=new Date(Date.now()+12000),campaign=await draftCampaign(site,cookie,'Held account',[email],time);
    await approve(site,cookie,campaign);
    const contender=await draftCampaign(site,cookie,'Approval held',[bouncedEmail],new Date(Date.now()-1000));
    const [recipient]=await site.rows(`SELECT id FROM recipient_steps WHERE revision_id='${campaign.revisionId}'`);
    await barrier(site,'handoff',recipient.id);await due(time);await site.control('/_golive/cron');await waiting(site);
    const clock=await site.control('/_golive/clock'),occurred=Math.floor(clock.now/1000);
    const post=async(type:string,timestamp:number,id:string)=>{
      const body=Buffer.from(JSON.stringify([{event:'account_status_change',type,timestamp,sg_event_id:id}]));
      const now=await site.control('/_golive/clock');
      return signedPost(site,'/webhooks/mail/sendgrid',body,signer.headers(body,String(Math.floor(now.now/1000))));
    };
    expect(await post('compliance_suspend',occurred,'account-hold-event')).toBe(204);
    expect((await site.call(`/api/campaigns/${contender.campaignId}/approve`,{method:'POST',cookie,body:{revisionId:contender.revisionId,idempotencyKey:`approve-${contender.revisionId}`}})).status).toBe(409);
    await release(site);
    await expect.poll(async()=> (await site.rows(`SELECT lease_token FROM recipient_steps WHERE id='${recipient.id}'`))[0].lease_token,{timeout:60000}).toBeNull();
    expect(await site.rows(`SELECT attempt_count,handoff_started_at FROM recipient_steps WHERE id='${recipient.id}'`)).toEqual([{attempt_count:0,handoff_started_at:null}]);
    expect(await post('reactivate',occurred-1,'old-restoration')).toBe(204);
    await site.control('/_golive/clock',{advanceMs:15*60000+1000});await site.control('/_golive/cron');
    expect(edge.behavior.requests.filter(r=>r.path==='/v3/scopes').length).toBeGreaterThan(1);
    expect(await site.rows("SELECT held FROM provider_holds WHERE provider='sendgrid' AND scope='account' AND reason='compliance'")).toEqual([{held:1}]);
    expect(edge.sends.filter(s=>s.to===email&&s.body.headers?.['List-Unsubscribe'])).toEqual([]);
    expect(await post('reactivate',occurred+1,'new-restoration')).toBe(204);
    expect(await post('compliance_suspend',occurred,'account-hold-event')).toBe(204);
    expect(await site.rows("SELECT held FROM provider_holds WHERE provider='sendgrid' AND scope='account' AND reason='compliance'")).toEqual([{held:0}]);
    await site.control('/_golive/clock',{advanceMs:60001});await site.control('/_golive/cron');
    await expect.poll(()=>Promise.resolve(edge.sends.filter(s=>s.to===email&&s.body.headers?.['List-Unsubscribe']).length),{timeout:60000}).toBe(1);
    await approve(site,cookie,contender);
    await expect.poll(()=>Promise.resolve(edge.sends.filter(s=>s.to===bouncedEmail&&s.body.headers?.['List-Unsubscribe']).length),{timeout:60000}).toBe(1);
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.goto(`${site.runtime.url}/app/insights`);
    const reputation=page.getByRole('row').filter({has:page.getByRole('rowheader',{name:'example.test (email)',exact:true})});
    await expect(reputation.locator('td').nth(1)).toHaveText(/^0 \/ 0 /);
    await expect(reputation.locator('td').nth(2)).toHaveText(/^0 \/ 2 /);
    const sent=(to:string)=>edge.sends.find(s=>s.to===to&&s.body.headers?.['List-Unsubscribe'])!;
    const eventClock=await site.control('/_golive/clock',{advanceMs:2000});
    const signedFacts=async(items:unknown[])=>{const raw=Buffer.from(JSON.stringify(items));return signedPost(site,'/webhooks/mail/sendgrid',raw,signer.headers(raw,String(Math.floor(eventClock.now/1000))));};
    expect(await signedFacts([event('delivered',email,eventClock.now-1000,sent(email).messageId,sent(email).body.personalizations[0].custom_args),
      event('bounce',bouncedEmail,eventClock.now-1000,sent(bouncedEmail).messageId,sent(bouncedEmail).body.personalizations[0].custom_args,{type:'bounce',bounce_classification:'Invalid Address'})])).toBe(204);
    await expect(reputation.locator('td').nth(1)).toHaveText(/^0 \/ 1 /,{timeout:30000});
    await expect(reputation.locator('td').nth(2)).toHaveText(/^1 \/ 2 /,{timeout:30000});
    // A late complaint updates the already completed marketing history, while
    // the accepted diagnostic/confirmation messages never enter denominators.
    expect(await signedFacts([event('spamreport',email,eventClock.now-500,sent(email).messageId,sent(email).body.personalizations[0].custom_args)])).toBe(204);
    await expect(reputation.locator('td').nth(1)).toHaveText(/^1 \/ 1 /,{timeout:30000});
    await expect(reputation.locator('td').first()).toHaveText('sendgrid');
    const desktop=page.viewportSize()!;
    await page.screenshot({path:test.info().outputPath('email-domain-rates-desktop.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:844});
    await page.screenshot({path:test.info().outputPath('email-domain-rates-mobile.png'),fullPage:true});
    const window=page.locator('section').filter({has:reputation}).locator('time');
    await expect(window).toBeVisible();expect(Date.parse((await window.getAttribute('datetime'))!)).toBeLessThan(eventClock.now);
    // Fresh signed facts can arrive after the original attempts have left the
    // configured reporting window. Keep the actual recipient/message identities.
    const reporting=await json(await site.call('/api/insights/deliverability',{cookie}),200);
    const sendsBeforeLateFacts=edge.sends.length;
    const lateClock=await site.control('/_golive/clock',{advanceMs:reporting.windowDays*86400000+2000});
    const renewedCookie=await site.open();
    await page.context().addCookies([{name:renewedCookie.split('=')[0],value:renewedCookie.split('=')[1],url:site.runtime.url}]);
    const lateFacts=Buffer.from(JSON.stringify([
      event('delivered',email,lateClock.now-1000,sent(email).messageId,sent(email).body.personalizations[0].custom_args),
      event('bounce',bouncedEmail,lateClock.now-1000,sent(bouncedEmail).messageId,sent(bouncedEmail).body.personalizations[0].custom_args,{type:'bounce',bounce_classification:'Invalid Address'}),
    ]));
    expect(await signedPost(site,'/webhooks/mail/sendgrid',lateFacts,signer.headers(lateFacts,String(Math.floor(lateClock.now/1000))))).toBe(204);
    const lateReporting=await json(await site.call('/api/insights/deliverability',{cookie:renewedCookie}),200);
    expect(lateReporting.senders.find((row:any)=>row.channel==='email'&&row.sender==='example.test')).toMatchObject({
      delivered:1,complained:0,hardBounced:1,attempted:0,complaintRate:0,hardBounceRate:null,
    });
    await page.setViewportSize(desktop);
    await page.goto(`${site.runtime.url}/app/insights`);
    await expect(reputation.locator('td').nth(1)).toHaveText(/^0 \/ 1 /,{timeout:30000});
    await expect(reputation.locator('td').nth(2)).toHaveText(/^1 \/ 0 /,{timeout:30000});
    await expect(reputation.locator('td').nth(2)).not.toHaveText(/%/);
    await page.screenshot({path:test.info().outputPath('email-late-facts-unavailable-rate-desktop.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:844});
    await page.screenshot({path:test.info().outputPath('email-late-facts-unavailable-rate-mobile.png'),fullPage:true});
    expect(edge.sends).toHaveLength(sendsBeforeLateFacts);
    expect(edge.unexpected).toEqual([]);
  } finally {await page.close();await release(site).catch(()=>{});await site.runtime.close();await edge.close();}
};
