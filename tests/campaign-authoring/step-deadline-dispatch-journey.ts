import {expect, type Browser, type TestInfo} from '@playwright/test';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {installation, json, sender, consent, confirmedContact, draftCampaign, approve, type Installation} from '../go-live/harness';
import {smsProgramme, smsDisclosure, smsSender} from '../go-live/sms-bindings';
import {confirmSmsReply} from '../go-live/sms-confirm-reply';
import {openPage, reloadPage} from '../support/navigation';

// Native approval, Cron and Queue doors; only provider network edges and elapsed
// time are controlled. Deadlines are persisted by ordinary authenticated saves.
export async function stepDeadlineDispatchJourney(browser: Browser, info: TestInfo) {
  for (const channel of ['email', 'sms'] as const) {
    const started=Date.now();
    const progress=(phase:string)=>console.log(`Deadline ${channel}: ${phase}; elapsed=${Date.now()-started}ms`);
    progress('starting installation');
    const edge = await providerEdge(), site = await installation(edge, eventSigner(), {sms:channel==='sms', reuseEmptySchema:true});
    progress('installation ready');
    const context = await browser.newContext({viewport:{width:1440,height:1000}});
    try {
      // Freeze at the next Brisbane noon so SMS eligibility is independent of
      // the machine's time of day. Every later operation advances this clock.
      const initial = await site.control('/_golive/clock');
      let clock = await site.control('/_golive/clock', {hold:true, advanceMs:(43_200_000-((initial.now+36_000_000)%86_400_000)+86_400_000)%86_400_000});
      edge.sms.setClock(clock.now, true);
      const to = async (at:number) => {
        expect(at).toBeGreaterThanOrEqual(clock.now);
        clock = await site.control('/_golive/clock', {advanceMs:at-clock.now, hold:true});
        edge.sms.setClock(clock.now, true);
      };
      const pace = async () => {
        const [row] = await site.rows('SELECT MAX(next_at) AS due FROM provider_pacing');
        await to(Math.max(clock.now+1, Math.ceil(Number(row.due??0))+1));
      };
      const cookie = await site.open();
      await json(await site.call('/api/settings/sender', {method:'PUT',cookie,body:sender}),200);
      await site.control('/_golive/sender-evidence');
      const emails = [610,611,612].slice(0,channel==='email'?3:2).map(n=>['synthetic-mango-'+n,'example.test'].join('@'));
      for (const [index,email] of emails.entries()) {
        await pace();
        if (channel === 'email') await confirmedContact(site,edge,cookie,email,'synthetic-mango-'+(610+index));
        else {
          const policy = smsProgramme(), disclosure = JSON.parse(smsDisclosure()), before = edge.sms.sends.length;
          await json(await site.call('/api/contacts/consent', {method:'POST',cookie,body:{...consent,
            channel:'sms', contact:{email, phone:'+6141111111'+index, displayName:'synthetic-mango-'+(610+index)},
            permissionMethod:'in-person', affirmed:true, expressWrittenConsent:true,
            smsProgram:policy.programme, brandOrLegalSender:policy.brand, messageCategory:policy.category,
            frequencyDisclosure:policy.frequency, destinationJurisdiction:policy.jurisdiction,
            consentText:disclosure.text, consentVersion:disclosure.version, captureSource:'Synthetic permission record',
            timeZone:'Australia/Brisbane', locationSource:'operator-entry', locationRecordedAt:new Date(clock.now).toISOString(),
            occurredAt:new Date(clock.now).toISOString(),
          }}),201);
          await site.control('/_golive/cron');
          await expect.poll(()=>edge.sms.sends.length,{timeout:60000}).toBe(before+1);
          await confirmSmsReply(site,edge);
        }
      }
      progress('contacts confirmed');
      const now = clock.now, due = now+3600000, deadline = due+60000;
      const make = async (number:number, starts:number[], ends:number[]) => {
        const draft = await draftCampaign(site,cookie,'synthetic-mango-'+number,emails,new Date(starts[0]));
        const steps = starts.map((at,index)=>({channel,timezone:'Australia/Brisbane',scheduledAt:new Date(at).toISOString(),sendByAt:new Date(ends[index]).toISOString(),whyThisTime:'Selected by the operator.'}));
        await json(await site.call(`/api/campaign-revisions/${draft.revisionId}`,{method:'PATCH',cookie,body:{steps,...(channel==='sms'?{smsBody:'Synthetic garden news. Seedlings are ready.',smsSender}:{})}}),200);
        const before = await detail(site,cookie,draft.campaignId);
        expect(before.campaign.state).toBe('draft');
        expect(before.steps.map((step:any)=>step.sendByAt)).toEqual(ends.map(at=>new Date(at).toISOString()));
        expect(await site.rows(`SELECT id FROM recipient_steps WHERE revision_id='${draft.revisionId}'`)).toEqual([]);
        expect(await site.rows(`SELECT revision_id FROM campaign_approval_requests WHERE revision_id='${draft.revisionId}'`)).toEqual([]);
        await approve(site,cookie,draft);
        return draft;
      };
      const partial = await make(620,[due,due+120*60000],[deadline,due+121*60000]);
      const missed = await make(621,[due+20*60000],[due+21*60000]);
      const delayed = await make(622,[due+30*60000],[due+31*60000]);
      const paused = await make(623,[due+40*60000],[due+41*60000]);
      await json(await site.call(`/api/campaigns/${paused.campaignId}/pause`,{method:'POST',cookie}),200);
      progress('campaigns approved');
      const rows = await site.rows(`SELECT r.id,r.destination FROM recipient_steps r JOIN campaign_steps s ON s.id=r.step_id WHERE r.revision_id='${partial.revisionId}' AND s.sequence=1 ORDER BY r.created_at,r.rowid`);
      expect(rows).toHaveLength(emails.length);
      if (channel === 'email') {edge.loseResponseFor(rows[1].destination);edge.behavior.delayMarketingResponses(2000);}
      await site.control('/_golive/barrier',{action:'arm',point:'handoff',identity:rows.at(-1)!.id});
      const marketing = () => channel==='email'
        ? edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe'])
        : edge.sms.sends.filter(send=>send.body.ignore_unsubscribes===false);
      await to(due);
      await site.control('/_golive/cron');
      // Leave the provider's response outstanding while time moves, rather
      // than changing any application result or recipient disposition.
      if (channel === 'email') {
        await expect.poll(()=>marketing().length,{timeout:60000}).toBe(1);
        await to(due+5000);
        await expect.poll(()=>marketing().length,{timeout:60000}).toBe(2);
        await to(due+10000);
      }
      await expect.poll(async()=>(await site.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
      progress('partial handoff barrier reached');
      const sentCount = channel==='email'?2:1;
      expect(marketing()).toHaveLength(sentCount);
      await expect.poll(async()=>(await site.rows(`SELECT transport_disposition FROM recipient_steps WHERE id='${rows[0].id}'`))[0].transport_disposition,{timeout:60000}).toBe('accepted');
      if (channel==='email') expect((await site.rows(`SELECT transport_disposition FROM recipient_steps WHERE id='${rows[1].id}'`))[0].transport_disposition).toBe('handoff-unknown');
      const firstDispositions = await site.rows(`SELECT id,transport_disposition,provider_message_id,handoff_started_at,handed_off_at,attempt_count FROM recipient_steps WHERE revision_id='${partial.revisionId}' AND handoff_started_at IS NOT NULL ORDER BY id`);
      for (const row of firstDispositions) expect(row.handoff_started_at).toBeLessThan(deadline);
      // Expiry at equality retires the prepared but unsent recipient while
      // retaining provider authority for requests already handed off.
      await to(deadline);
      await site.control('/_golive/cron');
      await site.control('/_golive/barrier',{action:'release'});
      await expect.poll(async()=>(await site.rows(`SELECT transport_disposition FROM recipient_steps WHERE id='${rows.at(-1)!.id}'`))[0].transport_disposition,{timeout:60000}).toBe('skipped');
      expect(await site.rows(`SELECT skip_reason,attempt_count,handoff_started_at FROM recipient_steps WHERE id='${rows.at(-1)!.id}'`)).toEqual([{skip_reason:'send-window-expired',attempt_count:0,handoff_started_at:null}]);
      expect(await site.rows(`SELECT id,transport_disposition,provider_message_id,handoff_started_at,handed_off_at,attempt_count FROM recipient_steps WHERE revision_id='${partial.revisionId}' AND handoff_started_at IS NOT NULL ORDER BY id`)).toEqual(firstDispositions);
      expect(marketing()).toHaveLength(sentCount);
      await replayDispatch(site,partial.revisionId);
      expect(marketing()).toHaveLength(sentCount);

      await to(due+21*60000); await site.control('/_golive/cron');
      await expired(site,missed.revisionId,emails.length);
      expect(await site.rows(`SELECT step_id FROM step_dispatches WHERE revision_id='${missed.revisionId}'`)).toEqual([]);
      await replayDispatch(site,missed.revisionId);
      expect(await site.rows(`SELECT step_id FROM step_dispatches WHERE revision_id='${missed.revisionId}'`)).toEqual([]);
      expect(marketing()).toHaveLength(sentCount);

      const [delayedStep] = await site.rows(`SELECT id FROM campaign_steps WHERE revision_id='${delayed.revisionId}'`);
      await site.control('/_golive/barrier',{action:'arm',point:'step-start',identity:delayedStep.id});
      await to(due+30*60000); await site.control('/_golive/cron');
      await expect.poll(async()=>(await site.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
      await to(due+31*60000+1);
      await site.control('/_golive/barrier',{action:'release'});
      await replayDispatch(site,delayed.revisionId);
      await site.control('/_golive/cron');
      await expired(site,delayed.revisionId,emails.length);
      expect(marketing()).toHaveLength(sentCount);

      await to(due+41*60000);
      await json(await site.call(`/api/campaigns/${paused.campaignId}/resume`,{method:'POST',cookie}),200);
      await site.control('/_golive/cron');
      await expired(site,paused.revisionId,emails.length);
      expect(marketing()).toHaveLength(sentCount);
      await to(due+121*60000+1); await site.control('/_golive/cron');
      const later = await site.rows(`SELECT r.transport_disposition,r.skip_reason,r.attempt_count,r.handoff_started_at FROM recipient_steps r JOIN campaign_steps s ON s.id=r.step_id WHERE r.revision_id='${partial.revisionId}' AND s.sequence=2`);
      expect(later).toHaveLength(emails.length);
      for (const row of later) expect(row).toEqual({transport_disposition:'skipped',skip_reason:'send-window-expired',attempt_count:0,handoff_started_at:null});
      expect(await site.rows(`SELECT d.step_id FROM step_dispatches d JOIN campaign_steps s ON s.id=d.step_id WHERE s.revision_id='${partial.revisionId}' AND s.sequence=2`)).toEqual([]);
      await replayDispatch(site,partial.revisionId,2);
      expect(marketing()).toHaveLength(sentCount);
      const result = await detail(site,cookie,partial.campaignId);
      expect(result.results.steps[1].counts).toContainEqual(expect.objectContaining({disposition:'skipped',reason:'send-window-expired',count:emails.length}));
      await context.addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
      const page = await context.newPage();
      await openPage(page,`${site.runtime.url}/app/campaigns/${partial.campaignId}/scheduled`);
      await expect(page.locator('[data-disposition=skipped] dd')).toHaveText(['1',String(emails.length)]);
      await page.screenshot({fullPage:true,path:info.outputPath(`deadline-results-${channel}-1440.png`)});
      await page.setViewportSize({width:390,height:844}); await reloadPage(page);
      await page.locator('[data-disposition=skipped] dd').first().waitFor();
      await page.screenshot({fullPage:true,path:info.outputPath(`deadline-results-${channel}-390.png`)});
      expect(marketing()).toHaveLength(sentCount);
      expect(edge.unexpected).toEqual([]);
      console.log(`PROBE CAMP-010 acceptance-2 ${channel}: approved native work reaches expiry at equality -> queued and prepared recipients skipped with send-window-expired, zero attempts; prior handoffs retained.`);
      console.log(`PROBE CAMP-010 acceptance-3 ${channel}: missed first and later steps, delayed native queue command, paused window and replay after expiry -> no late marketing handoff.`);
    } catch (error) {
      console.log('Deadline state',await site.rows('SELECT channel,transport_disposition,skip_reason,last_error_code,attempt_count FROM recipient_steps'));
      throw error;
    } finally {
      await site.control('/_golive/barrier',{action:'release'}).catch(()=>{});
      await context.close(); await site.runtime.close(); await edge.close();
    }
  }
}

async function detail(site:Installation,cookie:string,id:string) {
  return json(await site.call(`/api/campaigns/${id}`,{cookie}),200);
}
async function expired(site:Installation,revisionId:string,count:number) {
  const rows = await site.rows(`SELECT transport_disposition,skip_reason,attempt_count,handoff_started_at FROM recipient_steps WHERE revision_id='${revisionId}'`);
  expect(rows).toHaveLength(count);
  for(const row of rows) expect(row).toEqual({transport_disposition:'skipped',skip_reason:'send-window-expired',attempt_count:0,handoff_started_at:null});
}
async function replayDispatch(site:Installation,revisionId:string,sequence=1) {
  const [step] = await site.rows(`SELECT id FROM campaign_steps WHERE revision_id='${revisionId}' AND sequence=${sequence}`);
  const emissions = await site.control('/_golive/emissions');
  const index = emissions.findIndex((item:any)=>item.command.kind==='campaign.dispatch'&&item.command.payload.stepId===step.id);
  expect(index).toBeGreaterThanOrEqual(0);
  const before = emissions[index].completedQueues.length;
  await site.control('/_golive/replay',{index});
  await expect.poll(async()=>(await site.control('/_golive/emissions'))[index].completedQueues.length,{timeout:60000}).toBeGreaterThan(before);
}
