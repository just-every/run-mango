import {test,expect} from '@playwright/test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation,json,approve,sender,consent,draftCampaign,signedPost,type Installation} from './harness';
import {smsBindings,smsDisclosure,smsProgramme,smsSender} from './sms-bindings';
import {smsSegments} from '../../src/core/features/sms/segments';
import {smsWindow} from '../../src/core/features/sms/policy';
import {decodeProviderReference} from '../../src/core/shared/provider-reference';
import {smsComplianceBlock} from '../../src/core/features/sms/content';

test('[SEND-001][RESULT-001] native SMS queue, multipart receipts and public tracked links retain their authority across restart',async({page})=>{
  const edge=await providerEdge(),signer=eventSigner(),directory=await mkdtemp(join(tmpdir(),'mango-sms-'));
  const options={token:crypto.randomUUID(),stateDirectory:join(directory,'state'),parallelQueue:true,sms:true,smsPolicyAt:Date.now()};
  let site=await installation(edge,signer,{...options,sms:'missing-retention'});
  try {
    let clock=await site.control('/_golive/clock'),allowed=new Date(clock.now);
    while(!smsWindow(smsProgramme(clock.now),allowed,'Australia/Brisbane','recipient-supplied-signup',clock.now).allowed)allowed=new Date(allowed.getTime()+60000);
    clock=await site.control('/_golive/clock',{advanceMs:Math.max(0,allowed.getTime()-clock.now)+1});
    edge.sms.setClock(clock.now);
    let cookie=await site.open();
    const phones=['+61411111111','+61422222222','+61433333333','+61444444444','+61455555555'];
    for(const phone of phones) {
      const budget=await site.rows("SELECT next_at FROM provider_pacing WHERE scope='mobile-message:test-account'");
      const now=(await site.control('/_golive/clock')).now,wait=Number(budget[0]?.next_at??0)-now;
      if(wait>0){clock=await site.control('/_golive/clock',{advanceMs:Math.ceil(wait)+1});edge.sms.setClock(clock.now);}
      await json(await site.call('/subscribe/sms',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.10'},body:{phone,consent:true,timeZone:'Australia/Brisbane',disclosure:smsDisclosure()}}),202);
      // Local Workers do not run scheduled triggers automatically. A service
      // deferral is durable; drive its real scheduled consumer at observed due
      // time, including the rolling-segment bound beyond simple spacing.
      const deferred=await site.rows(`SELECT s.next_at FROM sms_service_messages s JOIN contact_phones p ON p.contact_id=s.contact_id WHERE p.phone_e164='${phone}' AND s.state='queued'`);
      if(deferred.length){
        clock=await site.control('/_golive/clock');
        clock=await site.control('/_golive/clock',{advanceMs:Math.max(0,Math.ceil(deferred[0].next_at-clock.now))+1});edge.sms.setClock(clock.now);
        await site.control('/_golive/cron');
      }
      await expect.poll(()=>Promise.resolve(edge.sms.sends.filter(s=>s.body.messages[0].to===phone.slice(1)).length),{timeout:60000}).toBe(1);
      const sent=edge.sms.sends.find(s=>s.body.messages[0].to===phone.slice(1))!.body.messages[0];
      const link=/https:\/\/\S+/.exec(sent.message)![0].replace(/\.$/,'');
      const response=await fetch(site.local(link),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'});
      expect(response.status,await response.clone().text()).toBe(200);
    }
    const ids=await site.rows('SELECT contact_id,phone_e164 FROM contact_phones ORDER BY phone_e164');
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    const mailBudget=await site.rows("SELECT next_at FROM provider_pacing WHERE scope='sendgrid:installation'");
    const mailWait=Number(mailBudget[0]?.next_at??0)-(await site.control('/_golive/clock')).now;
    if(mailWait>0)await new Promise(resolve=>setTimeout(resolve,Math.ceil(mailWait)+20));
    const scopeEmail='independent-mail@example.test';
    await json(await site.call('/api/contacts/consent',{method:'POST',cookie,body:{...consent,contact:{email:scopeEmail,displayName:'Independent mail reader'},occurredAt:new Date((await site.control('/_golive/clock')).now).toISOString()}}),201);
    const confirmation=edge.sends.find(s=>s.to===scopeEmail)!,confirmationLink=/https:\/\/\S+\/consent\/confirm\/\S+/.exec(confirmation.body.content.find((p:any)=>p.type==='text/plain').value)![0];
    expect((await fetch(site.local(confirmationLink),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
    const accountEvent=async(type:string)=>{
      const now=(await site.control('/_golive/clock')).now,body=Buffer.from(JSON.stringify([{event:'account_status_change',type,timestamp:Math.floor(now/1000),sg_event_id:`sms-scope-${type}`} ]));
      return signedPost(site,'/webhooks/mail/sendgrid',body,signer.headers(body,String(Math.floor(now/1000))));
    };
    expect(await accountEvent('compliance_suspend')).toBe(204);
    const originalUrl='https://shop.example.test/garden?season=spring&offer=seed';
    async function draft(current:Installation,selected:string[],trackingEnabled:boolean,scheduledAt?:number) {
      const campaign=await json(await current.call('/api/campaigns',{method:'POST',cookie,body:{}}),201);
      const now=(await current.control('/_golive/clock')).now;
      await json(await current.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body:{
        name:trackingEnabled?'Tracked multipart':'Original link',smsSender,
        smsBody:`NotMango NotNews NotWeekly: ${'Garden news. '.repeat(20)} ${originalUrl}`,
        messageCategory:'newsletter',trackingEnabled,
        inclusionRuleJson:JSON.stringify({version:1,operator:'any',predicates:selected.map(value=>({sourceType:'contact',field:'id',comparator:'eq',value}))}),exclusionRulesJson:'[]',
        steps:[{channel:'sms',timezone:'Australia/Brisbane',scheduledAt:new Date(scheduledAt??now-1000).toISOString(),sendByAt:new Date(now+3600000).toISOString(),whyThisTime:'Recipient permitted window'}]}}),200);
      return campaign;
    }
    const on=await draft(site,ids.slice(0,3).map(r=>r.contact_id),true);
    const blocked=await site.call(`/api/campaigns/${on.campaignId}/approve`,{method:'POST',cookie,body:{revisionId:on.revisionId,idempotencyKey:`approve-${on.revisionId}`}});
    expect(blocked.status).toBe(409);
    expect(await site.rows('SELECT count(*) AS n FROM recipient_steps')).toEqual([{n:0}]);
    clock=await site.control('/_golive/clock');await site.runtime.close();site=await installation(edge,signer,options);
    clock=await site.control('/_golive/clock',{advanceMs:clock.offset});edge.sms.setClock(clock.now);cookie=await site.open();
    const review=await json(await site.call(`/api/campaigns/${on.campaignId}/review`,{cookie}),200);
    await page.context().addCookies([{name:'operator_session_local',value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.goto(`${site.runtime.url}/app/campaigns/${on.campaignId}/review`);
    await expect(page.locator('.message-preview--sms .preview-plain-text').first()).toBeVisible();
    const desktop=page.viewportSize()!;
    await page.screenshot({path:test.info().outputPath('sms-review-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:test.info().outputPath('sms-review-mobile.png'),fullPage:true});
    await page.setViewportSize(desktop);
    const serviceBudget=await site.rows("SELECT MAX(reserved_at) AS at FROM provider_pacing_reservations WHERE scope='mobile-message:test-account'");
    clock=await site.control('/_golive/clock');clock=await site.control('/_golive/clock',{advanceMs:Math.max(0,Number(serviceBudget[0]?.at??0)+61000-clock.now)});edge.sms.setClock(clock.now);
    const initialDue=(await site.control('/_golive/clock')).now+10000;
    await json(await site.call(`/api/campaign-revisions/${on.revisionId}`,{method:'PATCH',cookie,body:{steps:[{channel:'sms',timezone:'Australia/Brisbane',scheduledAt:new Date(initialDue).toISOString(),sendByAt:new Date(initialDue+3600000).toISOString(),whyThisTime:'Recipient permitted window'}]}}),200);
    const configured=smsBindings(),policy=JSON.parse(configured.MANGO_DELIVERY_POLICY_JSON!)['mobile-message'];
    const rate=Math.min(Number(configured.MANGO_SMS_HANDOFFS_PER_MINUTE),policy.providerPerMinute,policy.carrierPerMinute);
    await approve(site,cookie,on);
    await site.control('/_golive/barrier',{action:'arm',point:'handoff',identity:'mobile-message'});
    clock=await site.control('/_golive/clock');clock=await site.control('/_golive/clock',{advanceMs:Math.max(0,initialDue-clock.now+1)});edge.sms.setClock(clock.now);await site.control('/_golive/cron');
    await expect.poll(async()=> (await site.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
    const [initialProgress]=await site.rows(`SELECT started_at,estimated_completion_at FROM step_dispatches WHERE revision_id='${on.revisionId}'`);
    const renderedUnits=review.smsPreview.examples.reduce((total:number,example:any)=>total+example.segments,0);
    const [savedBody]=await site.rows(`SELECT sms_body FROM campaign_revisions WHERE id='${on.revisionId}'`);
    expect(smsSegments(savedBody.sms_body).segments).toBeLessThan(review.smsPreview.examples[0].segments);
    expect(initialProgress.estimated_completion_at-initialProgress.started_at).toBeGreaterThanOrEqual(renderedUnits*60000/rate);
    expect(edge.sms.sends.filter(send=>send.body.ignore_unsubscribes===false)).toEqual([]);
    await page.goto(`${site.runtime.url}/app/campaigns/${on.campaignId}/scheduled`);
    await expect(page.locator('.step-result__notes time')).toBeVisible();
    await page.screenshot({path:test.info().outputPath('sms-initial-rendered-segment-eta.png'),fullPage:true});
    edge.sms.loseNextMarketingResponse();
    await site.control('/_golive/barrier',{action:'release'});
    const marketing=()=>edge.sms.sends.filter(s=>s.body.ignore_unsubscribes===false);
    await expect.poll(()=>Promise.resolve(marketing().length),{timeout:60000,intervals:[50]}).toBeGreaterThan(0);
    const firstCost=smsSegments(marketing()[0].body.messages[0].message).segments;
    const [reservation]=await site.rows("SELECT next_at,updated_at FROM provider_pacing WHERE scope='mobile-message:test-account'");
    expect(reservation.next_at-reservation.updated_at).toBeCloseTo(firstCost*60000/rate,2);
    const pending=await site.rows(`SELECT attempt_count,first_attempt_at FROM recipient_steps WHERE revision_id='${on.revisionId}' AND transport_disposition='queued'`);
    expect(pending.length).toBeGreaterThan(0);for(const row of pending)expect(row).toEqual({attempt_count:0,first_attempt_at:null});
    await expect.poll(()=>Promise.resolve(marketing().length),{timeout:60000}).toBe(2);
    clock=await site.control('/_golive/clock',{hold:true});edge.sms.setClock(clock.now,true);
    expect(marketing()[1].at-marketing()[0].at).toBeGreaterThanOrEqual(firstCost*60000/rate-100);
    const expectedSegments=smsSegments(marketing()[0].body.messages[0].message);
    expect(review.smsPreview.examples.find((example:any)=>example.destination===phones[0])).toMatchObject({segments:expectedSegments.segments,encoding:expectedSegments.encoding});
    expect(rate%firstCost).toBeGreaterThan(0);expect(firstCost*3).toBeGreaterThan(rate);
    const [firstReservation]=await site.rows(`SELECT MIN(reserved_at) AS at FROM provider_pacing_reservations WHERE scope='mobile-message:test-account' AND units=${firstCost}`);
    // The native Queue's delivery delay uses real time. Hold only the test
    // policy clock so this measured due instant remains inside the rolling
    // minute while the genuine Queue consumer reaches its real D1 fence.
    await expect.poll(async()=> (await site.rows(`SELECT next_attempt_at FROM recipient_steps WHERE revision_id='${on.revisionId}' AND transport_disposition='queued'`))[0]?.next_attempt_at,{timeout:60000}).toBeGreaterThan(clock.now);
    const [thirdDue]=await site.rows(`SELECT id,next_attempt_at FROM recipient_steps WHERE revision_id='${on.revisionId}' AND transport_disposition='queued'`);
    expect(thirdDue.next_attempt_at).toBeLessThan(firstReservation.at+60000);
    await site.control('/_golive/barrier',{action:'arm',point:'handoff',identity:thirdDue.id});
    clock=await site.control('/_golive/clock',{advanceMs:Math.max(0,Math.ceil(thirdDue.next_attempt_at-clock.now))+1});edge.sms.setClock(clock.now,true);
    await site.control('/_golive/cron');
    await expect.poll(async()=> (await site.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
    await site.control('/_golive/barrier',{action:'release'});
    await expect.poll(async()=> (await site.rows(`SELECT next_attempt_at FROM recipient_steps WHERE revision_id='${on.revisionId}' AND transport_disposition='queued'`))[0]?.next_attempt_at,{timeout:60000}).toBeGreaterThanOrEqual(firstReservation.at+60000);
    expect(marketing()).toHaveLength(2);
    expect(await site.rows(`SELECT attempt_count,first_attempt_at FROM recipient_steps WHERE revision_id='${on.revisionId}' AND transport_disposition='queued'`)).toEqual([{attempt_count:0,first_attempt_at:null}]);
    const lost=marketing().find(send=>send.outcome==='lost')!;
    expect(lost).toBeTruthy();
    const [unknown]=await site.rows(`SELECT id,contact_id,idempotency_key,provider_message_id,transport_disposition,outbound_request_json,attempt_count FROM recipient_steps WHERE revision_id='${on.revisionId}' AND destination='+${lost.body.messages[0].to}'`);
    expect(unknown).toMatchObject({provider_message_id:null,transport_disposition:'handoff-unknown',attempt_count:1});
    expect(lost.idempotencyKey).toBe(unknown.idempotency_key);
    expect(decodeProviderReference(lost.body.messages[0].custom_ref)).toBe(unknown.idempotency_key);
    const originalRequest=JSON.parse(unknown.outbound_request_json);
    expect(originalRequest).toMatchObject({idempotencyKey:unknown.idempotency_key,to:`+${lost.body.messages[0].to}`,content:{text:lost.body.messages[0].message}});
    await expect.poll(()=>Promise.resolve(edge.sms.reads.some(read=>read.reference===lost.body.messages[0].custom_ref&&read.returnedIds.length===0)),{timeout:60000}).toBe(true);
    expect((await site.control('/_golive/emissions')).some((e:any)=>e.command.kind==='delivery.reconcile'&&e.command.payload.recipientStepId===unknown.id)).toBe(true);
    const durableReservations=await site.rows("SELECT id,reserved_at,units FROM provider_pacing_reservations WHERE scope='mobile-message:test-account' ORDER BY reserved_at");
    await test.info().attach('sms-rolling-budget-boundary',{body:Buffer.from(JSON.stringify({firstReservation,thirdDue,heldClock:clock,reservations:durableReservations,submissions:marketing().map(send=>({at:send.at,segments:smsSegments(send.body.messages[0].message).segments,outcome:send.outcome}))})),contentType:'application/json'});
    clock=await site.control('/_golive/clock',{hold:false});edge.sms.setClock(clock.now);
    await site.runtime.close();site=await installation(edge,signer,options);
    clock=await site.control('/_golive/clock',{advanceMs:clock.offset});edge.sms.setClock(clock.now);cookie=await site.open();
    expect(await site.rows("SELECT id,reserved_at,units FROM provider_pacing_reservations WHERE scope='mobile-message:test-account' ORDER BY reserved_at")).toEqual(durableReservations);
    expect(await site.rows(`SELECT transport_disposition,outbound_request_json,attempt_count FROM recipient_steps WHERE id='${unknown.id}'`)).toEqual([{transport_disposition:'handoff-unknown',outbound_request_json:unknown.outbound_request_json,attempt_count:1}]);
    edge.sms.publishLostSubmissions();
    clock=await site.control('/_golive/clock',{advanceMs:Math.max(0,firstReservation.at+61000-clock.now)});edge.sms.setClock(clock.now);await site.control('/_golive/cron');
    await expect.poll(()=>Promise.resolve(marketing().length),{timeout:60000}).toBe(3);
    await expect.poll(async()=> (await site.rows(`SELECT provider_message_id FROM recipient_steps WHERE id='${unknown.id}'`))[0]?.provider_message_id,{timeout:60000}).toBe(lost.messageId);
    expect(edge.sms.reads.some(read=>read.reference===lost.body.messages[0].custom_ref&&read.returnedIds.includes(lost.messageId))).toBe(true);
    expect(await site.rows(`SELECT transport_disposition,outbound_request_json,attempt_count FROM recipient_steps WHERE id='${unknown.id}'`)).toEqual([{transport_disposition:'accepted',outbound_request_json:unknown.outbound_request_json,attempt_count:1}]);
    expect(await site.rows(`SELECT count(*) AS n FROM delivery_facts WHERE recipient_step_id='${unknown.id}' AND kind='delivered'`)).toEqual([{n:0}]);
    expect(marketing().filter(send=>send.idempotencyKey===unknown.idempotency_key)).toHaveLength(1);
    const all=edge.sms.sends;
    for(const handoff of all)expect(all.filter(send=>send.at>handoff.at-60000&&send.at<=handoff.at).reduce((units,send)=>units+smsSegments(send.body.messages[0].message).segments,0)).toBeLessThanOrEqual(rate);

    const mixedTime=new Date((await site.control('/_golive/clock')).now+3600000);
    const mixed=await draftCampaign(site,cookie,'Mixed provider hold',[scopeEmail],mixedTime);
    await json(await site.call(`/api/campaign-revisions/${mixed.revisionId}`,{method:'PATCH',cookie,body:{smsSender,smsBody:'Garden news',
      steps:['email','sms'].map(channel=>({channel,timezone:'Australia/Brisbane',scheduledAt:mixedTime.toISOString(),sendByAt:new Date(mixedTime.getTime()+3600000).toISOString(),whyThisTime:'Separate provider scope'}))}}),200);
    const mixedApproval=await site.call(`/api/campaigns/${mixed.campaignId}/approve`,{method:'POST',cookie,body:{revisionId:mixed.revisionId,idempotencyKey:`approve-${mixed.revisionId}`}});
    expect(mixedApproval.status).toBe(409);
    expect(await site.rows(`SELECT count(*) AS n FROM campaign_checks WHERE revision_id='${mixed.revisionId}' AND kind='provider.restrictions' AND status='blocked'`)).toEqual([{n:1}]);
    expect((await site.control('/_golive/emissions')).some((e:any)=>e.command.kind==='campaign.dispatch'&&e.command.payload.revisionId===on.revisionId)).toBe(true);
    const recipients=await site.rows(`SELECT id,provider_message_id,destination FROM recipient_steps WHERE revision_id='${on.revisionId}' ORDER BY destination`);
    const sentFor=(recipient:Record<string,any>)=>marketing().find(s=>s.messageId===recipient.provider_message_id)!.body.messages[0];
    const firstText=sentFor(recipients[0]).message,link=/https:\/\/\S+\/l\/\S+/.exec(firstText)![0];
    expect(firstText.endsWith(`\n\n${smsComplianceBlock(smsProgramme(options.smsPolicyAt),smsSender)}`)).toBe(true);
    expect(firstText).not.toContain(originalUrl);
    const redirect=await fetch(site.local(link),{redirect:'manual',headers:{'User-Agent':'Mozilla/5.0 human garden reader'}});
    expect(redirect.status).toBe(302);expect(redirect.headers.get('location')).toBe(originalUrl);
    expect(await site.rows('SELECT count(*) AS n FROM link_click_facts WHERE automated=0')).toEqual([{n:1}]);
    const receipt=async(recipient:Record<string,any>,part:number,status='delivered')=>{
      const sent=sentFor(recipient),now=(await site.control('/_golive/clock')).now;
      const signed=edge.sms.signed({...sent,message_id:recipient.provider_message_id,status,received_at:new Date(now).toISOString(),part_number:part,total_parts:smsSegments(sent.message).segments},now);
      return site.call('/webhooks/sms/mobile-message',{method:'POST',raw:signed.body,headers:signed.headers});
    };
    const total=smsSegments(firstText).segments;expect(total).toBeGreaterThan(1);
    expect((await receipt(recipients[0],1)).status).toBe(204);expect((await receipt(recipients[0],1)).status).toBe(204);
    expect(await site.rows("SELECT count(*) AS n FROM recipient_steps WHERE transport_disposition='delivered'")).toEqual([{n:0}]);
    clock=await site.control('/_golive/clock');await site.runtime.close();site=await installation(edge,signer,options);
    clock=await site.control('/_golive/clock',{advanceMs:clock.offset});edge.sms.setClock(clock.now);cookie=await site.open();
    await page.context().addCookies([{name:'operator_session_local',value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.goto(`${site.runtime.url}/app/insights`);
    const reputation=page.getByRole('row').filter({has:page.getByRole('rowheader',{name:`${smsSender} (sms)`,exact:true})});
    await expect(reputation.locator('td').nth(1)).toHaveText(/^0 \/ 0 /);
    for(let part=2;part<=total;part++)expect((await receipt(recipients[0],part)).status).toBe(204);
    expect(await site.rows(`SELECT transport_disposition FROM recipient_steps WHERE id='${recipients[0].id}'`)).toEqual([{transport_disposition:'delivered'}]);
    const secondTotal=smsSegments(sentFor(recipients[1]).message).segments;
    for(let part=1;part<=secondTotal;part++)expect((await receipt(recipients[1],part,part===secondTotal?'failed':'delivered')).status).toBe(204);
    expect((await receipt(recipients[1],1)).status).toBe(204);
    expect(await site.rows(`SELECT transport_disposition FROM recipient_steps WHERE id='${recipients[1].id}'`)).toEqual([{transport_disposition:'failed'}]);
    // First clear the observed spacing and rolling segment budgets. This race
    // isolates the destination claim; the earlier rolling denial remains strict.
    clock=await site.control('/_golive/clock');
    const [raceBudget]=await site.rows("SELECT p.next_at,(SELECT MAX(reserved_at)+60000 FROM provider_pacing_reservations WHERE scope=p.scope) AS rolling_clear_at FROM provider_pacing p WHERE p.scope='mobile-message:test-account'");
    const raceAt=Math.max(clock.now,Number(raceBudget.next_at),Number(raceBudget.rolling_clear_at??0))+10000;
    // Hold one genuine Queue consumer immediately before its atomic destination
    // claim. Replay only the winner's actual approval emission through the second
    // native broker, whose consumer shares the same production export and D1.
    const loser=await draft(site,[ids[4].contact_id],false,raceAt);
    await approve(site,cookie,loser);
    const [loserRecipient]=await site.rows(`SELECT id FROM recipient_steps WHERE revision_id='${loser.revisionId}'`);
    await site.control('/_golive/barrier',{action:'arm',point:'sms-frequency',identity:loserRecipient.id});
    clock=await site.control('/_golive/clock',{advanceMs:Math.max(0,raceAt-(await site.control('/_golive/clock')).now+1)});edge.sms.setClock(clock.now);await site.control('/_golive/cron');
    await expect.poll(async()=> (await site.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
    const winner=await draft(site,[ids[4].contact_id],false);await approve(site,cookie,winner);
    const raceEmissions=await site.control('/_golive/emissions');
    const winnerEmission=raceEmissions.findIndex((item:any)=>item.command.kind==='campaign.dispatch'&&item.command.payload.revisionId===winner.revisionId);
    expect(winnerEmission).toBeGreaterThanOrEqual(0);
    await site.control('/_golive/replay',{index:winnerEmission,parallel:true});
    await expect.poll(async()=> (await site.rows(`SELECT transport_disposition FROM recipient_steps WHERE revision_id='${winner.revisionId}'`))[0]?.transport_disposition,{timeout:60000}).toBe('accepted');
    await site.control('/_golive/barrier',{action:'release'});
    await expect.poll(async()=> (await site.rows(`SELECT lease_token FROM recipient_steps WHERE id='${loserRecipient.id}'`))[0]?.lease_token,{timeout:60000}).toBeNull();
    expect(await site.rows(`SELECT attempt_count,first_attempt_at,last_error_code,transport_disposition,skip_reason FROM recipient_steps WHERE id='${loserRecipient.id}'`)).toEqual([{attempt_count:0,first_attempt_at:null,last_error_code:'sms-frequency-window',transport_disposition:'skipped',skip_reason:'frequency-window-deadline'}]);
    // The original winner emission remains on the first broker. Observe both
    // real consumer completions before asserting it did not produce a second POST.
    await expect.poll(async()=> (await site.control('/_golive/emissions'))[winnerEmission]?.completedQueues.length,{timeout:60000}).toBe(2);
    expect(new Set((await site.control('/_golive/emissions'))[winnerEmission].completedQueues).size).toBe(2);
    expect(marketing().filter(send=>send.body.messages[0].to===phones[4].slice(1))).toHaveLength(1);
    for(const revisionId of [loser.revisionId,winner.revisionId])expect(raceEmissions.some((item:any)=>item.command.kind==='campaign.dispatch'&&item.command.payload.revisionId===revisionId)).toBe(true);
    const [unconfirmed]=await site.rows(`SELECT reconcile_until,outbound_request_json FROM recipient_steps WHERE id='${recipients[2].id}'`);
    expect(unconfirmed.reconcile_until).toBeGreaterThan((await site.control('/_golive/clock')).now);
    const beforeFollowOn=edge.sms.sends.length;
    clock=await site.control('/_golive/clock',{advanceMs:4*86400000});edge.sms.setClock(clock.now);cookie=await site.open();
    await page.context().addCookies([{name:'operator_session_local',value:cookie.split('=')[1],url:site.runtime.url}]);
    expect(clock.now).toBeGreaterThan(unconfirmed.reconcile_until);
    await site.control('/_golive/cron');
    await expect.poll(async()=> (await site.rows(`SELECT transport_disposition,last_error_code,outbound_request_json FROM recipient_steps WHERE id='${recipients[2].id}'`))[0],{timeout:60000})
      .toEqual({transport_disposition:'failed',last_error_code:'outcome-unconfirmed',outbound_request_json:unconfirmed.outbound_request_json});
    expect(edge.sms.sends).toHaveLength(beforeFollowOn);
    for(const contactId of new Set([ids[0].contact_id,unknown.contact_id])) {
      const followOn=await draft(site,[contactId],true);
      const followOnReview=await json(await site.call(`/api/campaigns/${followOn.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:followOn.revisionId}}),200);
      expect(followOnReview.exclusions).toContainEqual({reason:'frequency-window',count:1});
      expect(followOnReview.eligibleCount).toBe(0);
      expect((await site.call(`/api/campaigns/${followOn.campaignId}/approve`,{method:'POST',cookie,body:{revisionId:followOn.revisionId,idempotencyKey:`approve-${followOn.revisionId}`}})).status).toBe(409);
    }
    expect(edge.sms.sends).toHaveLength(beforeFollowOn);
    const links=await site.count('tracked_links'),clicks=await site.count('link_click_facts');
    edge.sms.substituteSender('61400000099');
    const off=await draft(site,[ids[3].contact_id],false);await approve(site,cookie,off);
    await expect.poll(()=>Promise.resolve(marketing().length),{timeout:60000}).toBe(5);
    const untracked=marketing().find(s=>s.body.messages[0].to===phones[3].slice(1))!.body.messages[0].message;
    expect(untracked).toContain(originalUrl);expect(untracked).not.toContain('/l/');
    expect(await site.count('tracked_links')).toBe(links);expect(await site.count('link_click_facts')).toBe(clicks);
    expect(await site.rows("SELECT count(*) AS n FROM delivery_facts WHERE kind='delivered'")).toEqual([{n:1}]);
    expect(await site.rows(`SELECT transport_disposition,actual_sender FROM recipient_steps WHERE revision_id='${off.revisionId}'`)).toEqual([{transport_disposition:'accepted',actual_sender:'61400000099'}]);
    expect(await site.rows("SELECT held FROM provider_holds WHERE provider='mobile-message' AND reason='provider-substituted-sender'")).toEqual([{held:1}]);
    clock=await site.control('/_golive/clock',{advanceMs:1001});edge.sms.setClock(clock.now);
    expect(await accountEvent('reactivate')).toBe(204);
    await site.control('/_golive/sender-evidence');
    const emailOnly=await draftCampaign(site,cookie,'Email ignores SMS sender hold',[scopeEmail],new Date(clock.now+3600000));
    await approve(site,cookie,emailOnly);
    await expect(reputation.locator('td').nth(1)).toHaveText(/^0 \/ 1 /,{timeout:30000});
    await expect(reputation.locator('td').nth(2)).toHaveText(/^0 \/ 5 /,{timeout:30000});
    await expect(reputation.locator('td').first()).toHaveText('mobile-message');
    await page.screenshot({path:test.info().outputPath('sms-sender-rates-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:test.info().outputPath('sms-sender-rates-mobile.png'),fullPage:true});
    await page.setViewportSize(desktop);
    const window=page.locator('section').filter({has:reputation}).locator('time');
    await expect(window).toBeVisible();expect(Date.parse((await window.getAttribute('datetime'))!)).toBeLessThan((await site.control('/_golive/clock')).now);
    expect(edge.unexpected).toEqual([]);
  } finally {await site.control('/_golive/barrier',{action:'release'}).catch(()=>{});await page.close();await site.runtime.close();await edge.close();await rm(directory,{recursive:true,force:true});}
});
