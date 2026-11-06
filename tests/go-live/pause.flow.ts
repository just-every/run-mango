const width = 1440;
import { expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { providerEdge } from './edge';
import { eventSigner } from './sendgrid-events';
import { installation, json, sender, confirmedContact, draftCampaign, approve } from './harness';
import { openPage, reloadPage } from '../support/navigation';


export const walk0 = async ({page}, info) => {
  const edge = await providerEdge(), signer = eventSigner(), site = await installation(edge, signer);
  const marketing = () => edge.sends.filter(send => send.body.headers?.['List-Unsubscribe']);
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    const emails = ['iris@example.test','leo@example.test','maya@example.test'];
    for (const email of [...emails,'expiry@example.test']) await confirmedContact(site,edge,cookie,email,email.split('@')[0]);
    const clock = await site.control('/_golive/clock',{hold:true}), due = new Date(clock.now+3600000);
    const campaign = await draftCampaign(site,cookie,'Spring market reminders',emails,due);
    const later = new Date(due.getTime()+25*3600000);
    await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body:{steps:[
      {channel:'email',timezone:'Australia/Brisbane',scheduledAt:due.toISOString(),sendByAt:new Date(due.getTime()+2*3600000).toISOString(),whyThisTime:'Market announcement'},
      {channel:'email',timezone:'Australia/Brisbane',scheduledAt:later.toISOString(),sendByAt:new Date(later.getTime()+2*3600000).toISOString(),whyThisTime:'Next day reminder'},
    ]}}),200);
    await approve(site,cookie,campaign);
    // Each operation gets its own held installation instant, chosen before the
    // public request. A response timestamp cannot supply its own expectation.
    const transitions:Array<{action:string;at:number}>=[];
    const refusals:Array<{action:string;body:unknown}>=[];
    const observe = async (action:'paused'|'resumed', operation:()=>Promise<unknown>) => {
      const before=await site.control('/_golive/clock',{advanceMs:1700});
      await operation();
      const after=await site.control('/_golive/clock');
      expect(after.now).toBe(before.now);
      transitions.push({action,at:before.now});
      const detail=await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);
      expect(detail.campaign.state).toBe(action==='paused'?'paused':transitions.length===2?'scheduled':'dispatching');
    };
    const authority = async () => ({
      campaign:await site.rows(`SELECT active_revision_id FROM campaigns WHERE id='${campaign.campaignId}'`),
      approval:await site.rows(`SELECT * FROM campaign_approval_requests WHERE campaign_id='${campaign.campaignId}'`),
      recipients:await site.rows(`SELECT id,revision_id,step_id,contact_id,channel,destination,created_at FROM recipient_steps WHERE campaign_id='${campaign.campaignId}' ORDER BY id`),
    });
    const approvedAuthority=await authority();
    const audit = () => site.rows(`SELECT id,operation_key,actor_type,actor_id,action,detail_json,occurred_at,created_at FROM lifecycle_audit_entries WHERE entity_id='${campaign.campaignId}' AND action IN ('paused','resumed') ORDER BY occurred_at,rowid`);
    const pauses = () => site.rows(`SELECT * FROM campaign_channel_pauses WHERE campaign_id='${campaign.campaignId}' AND reason='operator-pause' ORDER BY channel`);
    const history = async () => (await json(await site.call(`/api/activity?object=${campaign.campaignId}`,{cookie}),200)).entries.filter((entry:any)=>['paused','resumed'].includes(entry.action));
    const reconcile = async () => {
      expect((await audit()).map(row=>({action:row.action,actor:row.actor_id,type:row.actor_type,revision:JSON.parse(row.detail_json).revisionId,at:row.occurred_at,created:row.created_at}))).toEqual(
        transitions.map(event=>({action:event.action,actor:'go-live-owner',type:'operator',revision:campaign.revisionId,at:event.at,created:event.at})));
      expect((await history()).map((entry:any)=>({action:entry.action,actor:entry.operatorId,type:entry.actorType,revision:entry.detail.revisionId,at:entry.occurredAt}))).toEqual(
        [...transitions].reverse().map(event=>({action:event.action,actor:'go-live-owner',type:'operator',revision:campaign.revisionId,at:event.at})));
      const latestPause=transitions.filter(event=>event.action==='paused').at(-1)!;
      const latestResume=transitions.at(-1)!.action==='resumed'?transitions.at(-1)!.at:null;
      expect((await pauses()).map(row=>({revision:row.revision_id,channel:row.channel,paused:row.paused_at,resumed:row.resumed_at,created:row.created_at,updated:row.updated_at}))).toEqual([
        {revision:campaign.revisionId,channel:'email',paused:latestPause.at,resumed:latestResume,created:transitions[0].at,updated:transitions.at(-1)!.at},
      ]);
      expect(await authority()).toEqual(approvedAuthority);
    };
    const custody = async () => ({
      campaign:await site.rows(`SELECT * FROM campaigns WHERE id='${campaign.campaignId}'`),
      revisions:await site.rows(`SELECT * FROM campaign_revisions WHERE campaign_id='${campaign.campaignId}' ORDER BY id`),
      recipients:await site.rows(`SELECT * FROM recipient_steps WHERE campaign_id='${campaign.campaignId}' ORDER BY id`),
      dispatches:await site.rows(`SELECT * FROM step_dispatches WHERE revision_id='${campaign.revisionId}' ORDER BY step_id`),
      events:await site.rows(`SELECT * FROM lifecycle_audit_entries WHERE entity_id='${campaign.campaignId}' ORDER BY id`),
      transitions:await site.rows(`SELECT * FROM campaign_state_transitions WHERE campaign_id='${campaign.campaignId}' ORDER BY id`),
    });
    const unchanged = async (operation:()=>Promise<unknown>) => {
      const before={custody:await custody(),pauses:await pauses(),history:await history(),authority:await authority(),handoffs:marketing().length};
      await site.control('/_golive/clock',{advanceMs:4300});
      await operation();
      expect({custody:await custody(),pauses:await pauses(),history:await history(),authority:await authority(),handoffs:marketing().length}).toEqual(before);
      await reconcile();
    };
    const capture = async (name:string) => {
      for(const captureWidth of [1440,390]) {
        await page.setViewportSize({width:captureWidth,height:1000});
        await page.screenshot({path:info.outputPath(`${name}-${captureWidth}.png`),fullPage:true});
      }
      await page.setViewportSize({width,height:1000});
    };
    const control = (action:string) => site.call(`/api/campaigns/${campaign.campaignId}/${action}`,{method:'POST',cookie});
    const refuse = async (action:'pause'|'resume') => {
      const body=await json(await control(action),409);
      expect(body).toEqual({error:action==='pause'?'campaign_not_pausable':'campaign_not_operator_paused'});
      refusals.push({action,body});
    };
    expect((await site.call(`/api/campaigns/${campaign.campaignId}/pause`,{method:'POST'})).status).toBe(401);
    await page.setViewportSize({width,height:1000});
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
    await observe('paused',async()=>{
      await page.getByRole('button',{name:'Pause campaign',exact:true}).click();
      await expect(page.getByRole('button',{name:'Resume campaign',exact:true})).toBeVisible();
    });
    await reconcile();
    await capture('scheduled-pause');
    await observe('resumed',async()=>{
      await page.getByRole('button',{name:'Resume campaign',exact:true}).click();
      await expect(page.getByRole('button',{name:'Pause campaign',exact:true})).toBeVisible();
    });
    await reconcile();
    await unchanged(async()=>{
      await refuse('resume');
      await reloadPage(page);
      await expect(page.getByRole('button',{name:'Pause campaign',exact:true})).toBeVisible();
    });
    const recipients = await site.rows(`SELECT r.id,r.destination FROM recipient_steps r JOIN campaign_steps s ON s.id=r.step_id WHERE r.revision_id='${campaign.revisionId}' AND s.sequence=1 ORDER BY r.created_at,r.rowid`);
    await site.control('/_golive/barrier',{action:'arm',point:'handoff',identity:recipients[1].id});
    await site.control('/_golive/clock',{advanceMs:3600001});
    await site.control('/_golive/cron');
    await expect.poll(async () => (await site.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
    expect(marketing()).toHaveLength(1);
    await reloadPage(page);
    await observe('paused',async()=>{
      await page.getByRole('button',{name:'Pause campaign',exact:true}).click();
      await expect(page.getByRole('heading',{name:'Sending paused by an operator'})).toBeVisible();
    });
    await reconcile();
    await unchanged(async()=>{
      await json(await control('pause'),200); // Replay retains the original transition.
      await reloadPage(page);
      await expect(page.getByRole('heading',{name:'Sending paused by an operator'})).toBeVisible();
    });
    const before = marketing().length;
    await site.control('/_golive/barrier',{action:'release'});
    await expect.poll(async () => (await site.rows(`SELECT lease_token FROM recipient_steps WHERE id='${recipients[1].id}'`))[0].lease_token,{timeout:60000}).toBeNull();
    await site.control('/_golive/clock',{advanceMs:31000});
    await site.control('/_golive/cron');
    expect(marketing()).toHaveLength(before);
    const optedOut = recipients[2].destination;
    const [contact] = await site.rows(`SELECT id FROM contacts WHERE email='${optedOut}'`);
    const unsubscribe = await site.control('/_golive/unsubscribe-link',{contactId:contact.id});
    expect((await fetch(site.local(unsubscribe.url),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
    await reloadPage(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await capture('dispatch-paused');
    await observe('resumed',async()=>{
      await page.getByRole('button',{name:'Resume campaign',exact:true}).click();
      await expect(page.getByRole('button',{name:'Pause campaign',exact:true})).toBeVisible();
    });
    await reconcile();
    await site.control('/_golive/clock',{advanceMs:10*60000});
    await site.control('/_golive/cron');
    await expect.poll(() => Promise.resolve(marketing().length),{timeout:60000}).toBe(2);
    await site.control('/_golive/clock',{advanceMs:25*3600000});
    // This network receipt connector's sender observation lasts one day.
    // Renew it just as an operator must before the following day's handoffs.
    await site.control('/_golive/sender-evidence');
    await site.control('/_golive/clock',{advanceMs:60000});
    await site.control('/_golive/cron');
    // The real shared provider budget may defer the second remaining recipient.
    await expect.poll(async () => {
      if(marketing().length<4){await site.control('/_golive/clock',{advanceMs:60000});await site.control('/_golive/cron');}
      return marketing().length;
    },{timeout:60000}).toBe(4);
    await expect.poll(async () => (await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200)).campaign.state,{timeout:60000}).toBe('completed');
    const sent = marketing().map(send => send.to);
    expect(sent.filter(email => email===optedOut)).toHaveLength(0);
    for(const email of emails.filter(email=>email!==optedOut)) expect(sent.filter(value=>value===email)).toHaveLength(2);
    expect(await site.rows(`SELECT actor_id,action FROM lifecycle_audit_entries WHERE entity_id='${campaign.campaignId}' AND action IN ('paused','resumed') ORDER BY occurred_at,rowid`)).toEqual([
      {actor_id:'go-live-owner',action:'paused'},{actor_id:'go-live-owner',action:'resumed'},
      {actor_id:'go-live-owner',action:'paused'},{actor_id:'go-live-owner',action:'resumed'},
    ]);
    await reloadPage(page);
    await expect(page.getByRole('heading',{name:'Spring market reminders',exact:true})).toBeVisible();
    await expect(page.locator('[data-step-id] [data-disposition=accepted] dd')).toHaveText(['2','2']);
    await expect(page.getByRole('button',{name:'Resume campaign',exact:true})).toHaveCount(0);
    await capture('pause-completed');
    await unchanged(async()=>{
      await refuse('pause');
      await refuse('resume');
      await reloadPage(page);
      expect((await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200)).campaign.state).toBe('completed');
    });
    await openPage(page,`${site.runtime.url}/app/settings/activity`);
    await page.getByRole('textbox',{name:'Object',exact:true}).fill(campaign.campaignId);
    await page.getByRole('button',{name:'Apply filters',exact:true}).click();
    const activity=page.getByRole('region',{name:'Activity log table'});
    for(const event of transitions) {
      const row=activity.locator('tbody tr').filter({has:page.locator(`time[datetime="${new Date(event.at).toISOString()}"]`)});
      await expect(row.locator('[data-label="Who"]')).toHaveText('Owner');
      await expect(row.locator('[data-label="What"]')).toHaveText(event.action==='paused'?'Paused':'Resumed');
    }
    await capture('pause-activity');
    await reconcile();
    const now = (await site.control('/_golive/clock')).now;
    const expired = await draftCampaign(site,cookie,'Window closes during pause',['expiry@example.test'],new Date(now+3600000));
    await approve(site,cookie,expired);
    await json(await site.call(`/api/campaigns/${expired.campaignId}/pause`,{method:'POST',cookie}),200);
    await site.control('/_golive/clock',{advanceMs:4*3600000});
    await json(await site.call(`/api/campaigns/${expired.campaignId}/resume`,{method:'POST',cookie}),200);
    await site.control('/_golive/cron');
    expect(await site.rows(`SELECT transport_disposition,skip_reason FROM recipient_steps WHERE campaign_id='${expired.campaignId}'`)).toEqual([{transport_disposition:'skipped',skip_reason:'send-window-expired'}]);
    expect(marketing()).toHaveLength(4);
    expect(edge.unexpected).toEqual([]);
    const receipt=info.outputPath('pause-transition-retention.json');
    await writeFile(receipt,JSON.stringify({
      clause:'CAMP-001',point:'acceptance 2 operator pause and resume occurrence-time retention',
      campaignId:campaign.campaignId,revisionId:campaign.revisionId,
      independentlyBracketed:transitions,retainedAudit:await audit(),retainedHistory:await history(),
      retainedChannelPauses:await pauses(),refusals,
      observedLaterAt:(await site.control('/_golive/clock')).now,
      retainedApprovalAndFrozenRecipients:true,marketingHandoffs:marketing().length,
    },null,2)+'\n');
    await info.attach('pause-transition-retention',{path:receipt,contentType:'application/json'});
  } catch (error) {
    console.log('Pause journey transport state',await site.rows('SELECT transport_disposition,skip_reason,last_error_code,attempt_count FROM recipient_steps'));
    throw error;
  } finally {
    await site.control('/_golive/barrier',{action:'release'}).catch(()=>{});
    await page.close(); await site.runtime.close(); await edge.close();
  }
};
