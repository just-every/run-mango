import {test,expect} from '@playwright/test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {providerEdge} from './edge';
import {event,eventSigner} from './sendgrid-events';
import {installation,json,sender,consent,confirmedContact,draftCampaign,approve,availableTransport,signedPost} from './harness';

test('[SEND-001][SEND-008][SEND-006] native Resend reconciliation resumes exact paged lookup, distinguishes event payloads and closes expired uncertainty',async({page})=>{
  const edge=await providerEdge(),signer=eventSigner(),directory=await mkdtemp(join(tmpdir(),'mango-resend-'));
  const options={token:crypto.randomUUID(),stateDirectory:join(directory,'state'),mailProvider:'resend' as const};
  let site=await installation(edge,signer,{...options,mailProvider:'sendgrid'});
  try {
    let cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    const legacyEmail='previous-provider@example.test';await confirmedContact(site,edge,cookie,legacyEmail,'Previous provider reader');
    const legacy=await draftCampaign(site,cookie,'Previous provider',[legacyEmail],new Date(Date.now()-1000));await approve(site,cookie,legacy);
    await expect.poll(()=>Promise.resolve(edge.sends.filter(s=>s.to===legacyEmail&&s.body.headers?.['List-Unsubscribe']).length),{timeout:60000}).toBe(1);
    const prior=edge.sends.find(s=>s.to===legacyEmail&&s.body.headers?.['List-Unsubscribe'])!;
    const raw=Buffer.from(JSON.stringify([event('delivered',legacyEmail,Date.now(),prior.messageId,prior.body.personalizations[0].custom_args),
      event('spamreport',legacyEmail,Date.now(),prior.messageId,prior.body.personalizations[0].custom_args)]));
    expect(await signedPost(site,'/webhooks/mail/sendgrid',raw,signer.headers(raw))).toBe(204);
    const unknownEmail='previous-provider-unknown@example.test';
    await confirmedContact(site,edge,cookie,unknownEmail,'Uncertain previous provider');
    const unknownCampaign=await draftCampaign(site,cookie,'Previous provider uncertainty',[unknownEmail],new Date(Date.now()-1000));
    edge.loseResponseFor(unknownEmail);await approve(site,cookie,unknownCampaign);
    await expect.poll(async()=> (await site.rows(`SELECT transport_disposition FROM recipient_steps WHERE revision_id='${unknownCampaign.revisionId}'`))[0]?.transport_disposition,{timeout:60000}).toBe('handoff-unknown');
    const [originalUnknown]=await site.rows(`SELECT id,provider,provider_credential_digest,outbound_request_json FROM recipient_steps WHERE revision_id='${unknownCampaign.revisionId}'`);
    expect(originalUnknown.provider).toBe('sendgrid');expect(originalUnknown.provider_credential_digest).toBeTruthy();
    await site.runtime.close();site=await installation(edge,signer,{...options,resendCoverage:'missing'});cookie=await site.open();
    // A different From alias on the same domain must inherit the existing
    // domain denominator, even when the actual provider changes.
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:{...sender,fromEmail:'updates@example.test'}}),200);
    await availableTransport(site);await site.control('/_golive/sender-evidence');
    const emails=['resend-found@example.test','resend-unconfirmed@example.test'];
    for(const email of emails) {
      await availableTransport(site);
      await json(await site.call('/api/contacts/consent',{method:'POST',cookie,body:{...consent,contact:{email,displayName:email},occurredAt:new Date().toISOString()}}),201);
      const sent=edge.resend.sends.findLast(send=>send.body.to[0]===email&&send.body.subject==='Confirm your Mango Garden subscription')!;
      const link=/https:\/\/\S+\/consent\/confirm\/\S+/.exec(sent.body.text)![0];
      expect((await fetch(site.local(link),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
    }
    const campaign=await draftCampaign(site,cookie,'Resend reconciliation',emails,new Date(Date.now()-1000));
    const rejected=await site.call(`/api/campaigns/${campaign.campaignId}/approve`,{method:'POST',cookie,body:{revisionId:campaign.revisionId,idempotencyKey:`approve-${campaign.revisionId}`}});
    expect(rejected.status).toBe(409);expect(await site.rows(`SELECT count(*) AS n FROM recipient_steps WHERE revision_id='${campaign.revisionId}'`)).toEqual([{n:0}]);
    await site.runtime.close();site=await installation(edge,signer,{...options,resendCoverage:'complete'});cookie=await site.open();
    const beforeForeignLookup=edge.resend.reads.filter(read=>read.path.startsWith('/emails')).length;
    await site.control('/_golive/cron');
    await expect.poll(async()=> (await site.rows(`SELECT reason FROM campaign_channel_pauses WHERE revision_id='${unknownCampaign.revisionId}' AND resumed_at IS NULL`)).map(row=>row.reason),{timeout:60000}).toContain('reconciliation-authority');
    expect(edge.resend.reads.filter(read=>read.path.startsWith('/emails'))).toHaveLength(beforeForeignLookup);
    for(const email of emails)edge.resend.loseResponseFor(email);
    await availableTransport(site);await approve(site,cookie,campaign);
    const marketing=()=>edge.resend.attempts.filter(send=>send.body.headers?.['List-Unsubscribe']);
    await expect.poll(()=>Promise.resolve(marketing().length),{timeout:60000}).toBe(2);
    const recipients=()=>site.rows(`SELECT id,destination,provider_message_id,transport_disposition,reconcile_cursor,reconcile_until,outbound_request_json FROM recipient_steps WHERE revision_id='${campaign.revisionId}' ORDER BY destination`);
    await expect.poll(async()=> (await recipients()).map(r=>r.transport_disposition),{timeout:60000}).toEqual(['handoff-unknown','handoff-unknown']);
    // Four plausible candidates include matching opaque references with wrong
    // sender, recipient or message context. None establishes our acceptance.
    await expect.poll(()=>Promise.resolve(edge.resend.reads.filter(r=>r.path==='/emails'&&r.after==='decoy-3').length),{timeout:60000}).toBeGreaterThanOrEqual(2);
    await expect.poll(async()=> (await recipients()).map(r=>r.reconcile_cursor),{timeout:60000}).toEqual([null,null]);
    const before=await recipients();expect(before.map(r=>r.provider_message_id)).toEqual([null,null]);
    const emissions=await site.control('/_golive/emissions');
    expect(emissions.some((e:any)=>e.command.kind==='campaign.dispatch'&&e.command.payload.revisionId===campaign.revisionId)).toBe(true);
    expect(emissions.some((e:any)=>e.command.kind==='delivery.reconcile'&&before.some(r=>r.id===e.command.payload.recipientStepId))).toBe(true);
    await site.runtime.close();site=await installation(edge,signer,{...options,resendCoverage:'complete'});cookie=await site.open();
    expect((await recipients()).map(r=>r.outbound_request_json)).toEqual(before.map(r=>r.outbound_request_json));
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.goto(`${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
    await expect(page.locator('[data-disposition=handoff-unknown] dd')).toHaveText('2');
    const accepted=edge.resend.sends.find(send=>send.body.to[0]===emails[0]&&send.body.headers?.['List-Unsubscribe'])!;
    edge.resend.index(accepted.messageId);
    const scans=edge.resend.reads.length;await site.control('/_golive/cron');
    await expect.poll(async()=> (await recipients())[0].provider_message_id,{timeout:60000}).toBe(accepted.messageId);
    expect(edge.resend.reads.slice(scans).some(r=>r.path==='/emails'&&r.after===null)).toBe(true);
    await site.control('/_golive/cron');
    await expect.poll(()=>Promise.resolve(edge.resend.reads.some(r=>r.path.endsWith('/events')&&r.after==='event-3')),{timeout:60000}).toBe(true);
    await expect.poll(async()=> (await recipients())[0].reconcile_cursor,{timeout:60000}).toBeNull();
    // Event delivery status says delivered; its original email.sent payload
    // proves only acceptance. Exhausting that sweep must reset the event cursor.
    expect((await recipients())[0].transport_disposition).toBe('accepted');
    expect(await site.rows(`SELECT count(*) AS n FROM delivery_facts WHERE kind='delivered' AND recipient_step_id IN (SELECT id FROM recipient_steps WHERE revision_id='${campaign.revisionId}')`)).toEqual([{n:0}]);
    const originalRequests=(await recipients()).map(r=>r.outbound_request_json);
    const eventReads=edge.resend.reads.length;edge.resend.deliver(accepted.messageId);await site.control('/_golive/cron');
    await expect.poll(async()=> (await recipients())[0].transport_disposition,{timeout:60000}).toBe('delivered');
    expect(edge.resend.reads.slice(eventReads).some(r=>r.path.endsWith('/events')&&r.after===null)).toBe(true);
    await expect(page.locator('[data-disposition=delivered] dd')).toHaveText('1',{timeout:30000});
    expect((await recipients()).map(r=>r.outbound_request_json)).toEqual(originalRequests);
    await page.goto(`${site.runtime.url}/app/insights`);
    const reputation=page.getByRole('row').filter({has:page.getByRole('rowheader',{name:'example.test (email)',exact:true})});
    await expect(reputation).toHaveCount(1);
    await expect(reputation.locator('td').first()).toHaveText('resend, sendgrid');
    await expect(reputation.locator('td').nth(1)).toHaveText(/^1 \/ 2 /);
    await expect(reputation.locator('td').nth(2)).toHaveText(/^0 \/ 4 /);
    await page.screenshot({path:test.info().outputPath('domain-rates-combined-providers.png'),fullPage:true});
    // Leave the polling insights page first: once the session expires, its next reload sends it to
    // sign-in, and that navigation would abort the next page.goto.
    await page.goto('about:blank');
    const clock=await site.control('/_golive/clock'),expiry=(await recipients())[1].reconcile_until;
    expect(expiry).toBeGreaterThan(clock.now);
    const expiredClock=await site.control('/_golive/clock',{advanceMs:expiry-clock.now+1});edge.resend.setClock(expiredClock.now);

    // A new active owner session is necessary after advancing beyond account
    // retention. Expiry must never trigger another recipient submission.
    cookie=await site.open();await page.context().clearCookies();
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.goto(`${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
    await site.control('/_golive/cron');
    await expect.poll(async()=> (await site.rows(`SELECT transport_disposition,last_error_code FROM recipient_steps WHERE destination='${emails[1]}'`))[0],{timeout:60000})
      .toEqual({transport_disposition:'failed',last_error_code:'outcome-unconfirmed'});
    await expect(page.locator('[data-disposition=failed] dd')).toHaveText('1',{timeout:30000});
    expect(await site.rows(`SELECT state FROM campaigns WHERE id='${campaign.campaignId}'`)).toEqual([{state:'completed'}]);
    expect(marketing()).toHaveLength(2);expect((await recipients())[0].transport_disposition).toBe('delivered');
    await expect.poll(async()=> (await site.rows(`SELECT reason FROM campaign_channel_pauses WHERE revision_id='${unknownCampaign.revisionId}' AND resumed_at IS NULL`)).map(row=>row.reason),{timeout:60000}).toContain('reconciliation-authority');
    expect(await site.rows(`SELECT provider,transport_disposition,attempt_count,outbound_request_json FROM recipient_steps WHERE id='${originalUnknown.id}'`)).toEqual([{provider:'sendgrid',transport_disposition:'handoff-unknown',attempt_count:1,outbound_request_json:originalUnknown.outbound_request_json}]);
    expect(edge.sends.filter(send=>send.to===unknownEmail&&send.body.headers?.['List-Unsubscribe'])).toHaveLength(1);
    expect(edge.resend.attempts.filter(send=>send.body.to.includes(unknownEmail))).toHaveLength(0);
    await page.goto(`${site.runtime.url}/app/campaigns/${unknownCampaign.campaignId}/scheduled`);
    await expect(page.locator('[data-disposition=handoff-unknown] dd')).toHaveText('1');
    await expect(page.locator('[data-disposition=failed]')).toHaveCount(0);
    expect(edge.unexpected).toEqual([]);
  } finally {await page.close();await site.runtime.close();await edge.close();await rm(directory,{recursive:true,force:true});}
});
