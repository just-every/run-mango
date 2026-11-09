import {expect,type Page,type TestInfo} from '@playwright/test';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {performance} from 'node:perf_hooks';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,approve,type Installation} from './harness';
import {openPage,reloadPage} from '../support/navigation';

type Campaign={campaignId:string;revisionId:string};
async function detail(site:Installation,cookie:string,campaign:Campaign) {
  return json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);
}
const recipients=(site:Installation,campaign:Campaign)=>site.rows(`SELECT id,contact_id,revision_id,step_id,destination,
  transport_disposition,skip_reason,attempt_count,handoff_started_at,provider_message_id,idempotency_key
  FROM recipient_steps WHERE revision_id='${campaign.revisionId}' ORDER BY created_at,rowid`);
const report=(site:Installation,cookie:string,campaign:Campaign)=>site.call(
  `/api/campaigns/${campaign.campaignId}/recipients?revisionId=${campaign.revisionId}`,{cookie}).then(response=>json(response,200));
async function advanceTo(site:Installation,at:number) {
  const clock=await site.control('/_golive/clock');
  await site.control('/_golive/clock',{advanceMs:Math.max(0,Math.ceil(at-clock.now))});
}
async function settled(site:Installation,campaign:Campaign) {
  await expect.poll(async()=>{
    const emissions=await site.control('/_golive/emissions');
    const dispatches=emissions.filter((item:any)=>item.command.kind==='campaign.dispatch'&&item.command.payload.revisionId===campaign.revisionId);
    return dispatches.length>0&&dispatches.every((item:any)=>item.completedQueues.length>0);
  },{timeout:60000}).toBe(true);
}
async function screens(page:Page,info:TestInfo,site:Installation,campaign:Campaign,name:string,rows:any[]) {
  await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await reloadPage(page);
    await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
    await expect(page.locator('.scheduled-head__state')).toHaveText('State: Cancelled');
    await expect(page.getByRole('button',{name:'Cancel campaign',exact:true})).toHaveCount(0);
    await expect(page.locator('.step-result__countdown')).toHaveCount(0);
    const stepIds=[...new Set(rows.map(row=>row.stepId))];
    for(const stepId of stepIds) {
      const step=page.locator(`[data-step-id="${stepId}"]`);
      await expect(step.locator('.step-result-state')).toHaveText('Cancelled');
      for(const disposition of ['skipped','accepted','handoff-unknown']) {
        const count=rows.filter(row=>row.stepId===stepId&&row.disposition===disposition).length;
        const bucket=step.locator(`[data-disposition="${disposition}"] dd`);
        if(count)await expect(bucket).toHaveText(String(count));else await expect(bucket).toHaveCount(0);
      }
    }
    const table=page.getByRole('table',{name:'Recipient outcomes',exact:true});
    await expect(table.locator('tbody tr')).toHaveCount(rows.length);
    for(const row of rows) {
      // Each contact is intentionally present once per approved step.
      await expect(table.getByText(row.destination,{exact:true})).toHaveCount(stepIds.length);
      await expect(table.getByRole('rowheader',{name:row.displayName,exact:true})).toHaveCount(stepIds.length);
    }
    await expect(table.getByText('campaign-cancelled',{exact:true})).toHaveCount(rows.filter(row=>row.disposition==='skipped').length);
    await page.screenshot({path:info.outputPath(`cancelled-${name}-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
}

export async function cancellationJourney(page:Page,info:TestInfo) {
  const edge=await providerEdge(),signer=eventSigner(),directory=await mkdtemp(join(tmpdir(),'mango-cancellation-'));
  const options={token:crypto.randomUUID(),stateDirectory:join(directory,'state')};
  let site=await installation(edge,signer,options);
  try {
    let cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    const addresses=Array.from({length:9},(_,index)=>[`synthetic-mango-${801+index}`,'example.test'].join('@'));
    for(const [index,email] of addresses.entries())await confirmedContact(site,edge,cookie,email,['Iris Market','Leo Garden','Maya Orchard'][index%3]);
    await site.control('/_golive/clock',{hold:true});
    for(const [scenario,state] of (['scheduled','dispatching','paused'] as const).entries()) {
      const emails=addresses.slice(scenario*3,scenario*3+3);
      cookie=await site.open();
      const [senderBudget]=await site.rows('SELECT MAX(next_at) AS due FROM provider_pacing');
      await advanceTo(site,senderBudget.due+1);
      await site.control('/_golive/sender-evidence');
      const clock=await site.control('/_golive/clock');
      const times=[1,26,51].map(hours=>clock.now+hours*3600000);
      const name=`Market letter ${state}`;
      const campaign=await draftCampaign(site,cookie,name,emails,new Date(times[0]));
      await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body:{
        steps:times.map((at,index)=>({channel:'email',timezone:'Australia/Brisbane',scheduledAt:new Date(at).toISOString(),
          sendByAt:new Date(at+2*3600000).toISOString(),whyThisTime:`Market letter ${index+1}`})),
      }}),200);
      const approval=await approve(site,cookie,campaign);
      const approved=await detail(site,cookie,campaign);
      expect(approved).toMatchObject({campaign:{state:'scheduled',activeRevisionId:campaign.revisionId},
        revision:{id:campaign.revisionId,state:'approved',contentDigest:approval.revisionDigest}});
      expect(approved.steps).toHaveLength(3);
      const initial=await recipients(site,campaign);
      expect(initial).toHaveLength(9);
      for(const step of approved.steps) {
        const group=initial.filter(row=>row.step_id===step.id);
        expect(group.map(row=>row.destination).sort()).toEqual([...emails].sort());
        for(const row of group)expect(row).toMatchObject({transport_disposition:'queued',attempt_count:0,handoff_started_at:null});
      }
      if(state!=='scheduled') {
        const first=initial.filter(row=>row.step_id===approved.steps[0].id);
        edge.loseResponseFor(first[1].destination);
        await advanceTo(site,times[0]+1);
        await site.control('/_golive/cron');
        await expect.poll(async()=>(await recipients(site,campaign)).filter(row=>row.transport_disposition==='accepted').length,{timeout:60000}).toBe(1);
        await settled(site,campaign);
        const [budget]=await site.rows('SELECT MAX(next_at) AS due FROM provider_pacing');
        await advanceTo(site,budget.due+1);
        await site.control('/_golive/cron');
        await expect.poll(async()=>(await site.rows(`SELECT id FROM recipient_steps WHERE revision_id='${campaign.revisionId}' AND transport_disposition='handoff-unknown' AND lease_token IS NULL`)).length,{timeout:60000}).toBe(1);
        await settled(site,campaign);
        // The third real consumer has already claimed its recipient, but has
        // not crossed the atomic handoff boundary when the owner cancels.
        const [queued]=(await recipients(site,campaign)).filter(row=>row.step_id===approved.steps[0].id&&row.transport_disposition==='queued');
        expect(queued).toBeTruthy();
        await site.control('/_golive/barrier',{action:'arm',point:'handoff',identity:queued.id});
        const [next]=await site.rows('SELECT MAX(next_at) AS due FROM provider_pacing');
        await advanceTo(site,next.due+1);
        await site.control('/_golive/cron');
        await expect.poll(async()=>(await site.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
        if(state==='paused')await json(await site.call(`/api/campaigns/${campaign.campaignId}/pause`,{method:'POST',cookie}),200);
      }
      expect((await detail(site,cookie,campaign)).campaign.state).toBe(state);
      const before=await recipients(site,campaign),beforeReport=await report(site,cookie,campaign);
      const unsent=before.filter(row=>row.transport_disposition==='queued'&&row.handoff_started_at===null);
      expect(unsent).toHaveLength(state==='scheduled'?9:7);
      for(const step of approved.steps)expect(unsent.some(row=>row.step_id===step.id)).toBe(true);
      const retained=before.filter(row=>['accepted','handoff-unknown'].includes(row.transport_disposition));
      expect(retained).toHaveLength(state==='scheduled'?0:2);
      for(const row of retained)expect(row.attempt_count).toBe(1);
      const marketing=()=>edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe']);
      const handoffs=structuredClone(marketing());
      await page.context().clearCookies();
      await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
      await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
      await page.getByRole('button',{name:'Cancel campaign',exact:true}).click();
      const response=page.waitForResponse(response=>new URL(response.url()).pathname===`/api/campaigns/${campaign.campaignId}/cancel`&&response.request().method()==='POST');
      const started=performance.now();
      await page.getByRole('button',{name:'Confirm cancellation',exact:true}).click();
      expect((await response).status()).toBe(200);
      const afterDetail=await detail(site,cookie,campaign),afterReport=await report(site,cookie,campaign);
      const elapsed=performance.now()-started;
      expect(elapsed).toBeLessThanOrEqual(30000);
      expect(afterDetail.campaign.state).toBe('cancelled');
      expect(afterDetail.revision).toEqual(approved.revision);
      const expected=beforeReport.rows.map((row:any)=>unsent.some(unsent=>unsent.id===row.recipientStepId)
        ?{...row,disposition:'skipped',skipReason:'campaign-cancelled',reason:'campaign-cancelled'}:row);
      expect(afterReport.rows).toEqual(expected);
      const after=await recipients(site,campaign);
      for(const row of unsent)expect(after.find(item=>item.id===row.id)).toEqual({...row,
        transport_disposition:'skipped',skip_reason:'campaign-cancelled'});
      expect(after.filter(row=>retained.some(item=>item.id===row.id))).toEqual(retained);
      console.log(`PROBE CAMP-009 1: ${state} native cancel and API readback -> ${unsent.length} identified unsent recipients across three approved steps skipped as campaign-cancelled in ${Math.round(elapsed)} ms; ${retained.length} handoffs retained`);
      await site.control('/_golive/barrier',{action:'release'});
      // Restart the actual installation with its D1 and native Queue state.
      const emissions=await site.control('/_golive/emissions');
      const dispatches=emissions.flatMap((item:any,index:number)=>item.command.kind==='campaign.dispatch'&&item.command.payload.revisionId===campaign.revisionId?[index]:[]);
      expect(dispatches.length).toBeGreaterThan(0);
      // Exercise every later due time and replay actual captured dispatches,
      // waiting for each native consumer to return rather than sleeping.
      for(const at of [...times,times[2]+3*3600000]) {
        await advanceTo(site,at+1);
        await site.control('/_golive/cron');
        for(const index of dispatches) {
          const beforeReplay=await site.control('/_golive/emissions');
          const completions=beforeReplay[index].completedQueues.length;
          await site.control('/_golive/replay',{index});
          await expect.poll(async()=>(await site.control('/_golive/emissions'))[index].completedQueues.length,{timeout:60000}).toBeGreaterThan(completions);
        }
        expect((await report(site,cookie,campaign)).rows).toEqual(expected);
        expect(marketing()).toEqual(handoffs);
      }
      const held=await site.control('/_golive/clock');
      await site.runtime.close();
      site=await installation(edge,signer,options);
      await advanceTo(site,held.now);
      await site.control('/_golive/clock',{hold:true});
      cookie=await site.open();
      for(const at of [...times,times[2]+3*3600000]) {
        await advanceTo(site,at+1);
        await site.control('/_golive/cron');
      }
      expect((await detail(site,cookie,campaign)).campaign.state).toBe('cancelled');
      expect((await report(site,cookie,campaign)).rows).toEqual(expected);
      expect(await recipients(site,campaign)).toEqual(after);
      expect(marketing()).toEqual(handoffs);
      expect(await site.rows(`SELECT step_id FROM step_dispatches WHERE revision_id='${campaign.revisionId}' AND step_id<>'${approved.steps[0].id}'`)).toEqual([]);
      await page.context().clearCookies();
      await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
      await screens(page,info,site,campaign,name,expected);
    }
    expect(edge.unexpected).toEqual([]);
  } finally {
    await site.control('/_golive/barrier',{action:'release'}).catch(()=>{});
    await page.close();await site.runtime.close();await edge.close();await rm(directory,{recursive:true,force:true});
  }
}
