const width = 1440;
import { expect } from '@playwright/test';
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
    const control = (action:string) => site.call(`/api/campaigns/${campaign.campaignId}/${action}`,{method:'POST',cookie});
    const operations:Array<{action:string;before:number;after:number}>=[];
    const history = async () => (await json(await site.call(`/api/activity?object=${campaign.campaignId}`,{cookie}),200)).entries;
    const audit = () => site.rows(`SELECT id,operation_key,actor_type,actor_id,action,detail_json,occurred_at,created_at
      FROM lifecycle_audit_entries WHERE entity_id='${campaign.campaignId}' AND action IN ('paused','resumed') ORDER BY occurred_at,rowid`);
    const pauses = () => site.rows(`SELECT * FROM campaign_channel_pauses WHERE campaign_id='${campaign.campaignId}' AND reason='operator-pause' ORDER BY channel`);
    const authority = async () => ({
      campaign:await site.rows(`SELECT state,active_revision_id,updated_at FROM campaigns WHERE id='${campaign.campaignId}'`),
      approval:await site.rows(`SELECT revision_id,revision_digest,operator_id,approved_at,created_at FROM campaign_approval_requests WHERE campaign_id='${campaign.campaignId}'`),
      revision:await site.rows(`SELECT state,content_digest,approved_at,approved_by_operator_id FROM campaign_revisions WHERE id='${campaign.revisionId}'`),
      recipients:await site.rows(`SELECT id,revision_id,step_id,contact_id,contact_identity_key,channel,destination,idempotency_key,transport_disposition,attempt_count,provider_message_id,handoff_started_at
        FROM recipient_steps WHERE campaign_id='${campaign.campaignId}' ORDER BY id`),
      commands:(await site.control('/_golive/emissions')).map(({command,delaySeconds})=>({command,delaySeconds})),handoffs:marketing().length,
    });
    const retained = async () => ({audit:await audit(),pauses:await pauses(),history:await history(),authority:await authority()});
    const checkHistory = async () => {
      const records=await audit();
      expect(records).toHaveLength(operations.length);
      expect(new Set(records.map(row=>row.operation_key)).size).toBe(operations.length);
      expect(new Set(records.map(row=>row.occurred_at)).size).toBe(operations.length);
      for(const [index,operation] of operations.entries()) {
        expect(records[index]).toMatchObject({action:operation.action,actor_type:'operator',actor_id:'go-live-owner'});
        expect(JSON.parse(records[index].detail_json)).toEqual({revisionId:campaign.revisionId});
        expect(records[index].occurred_at).toBeGreaterThanOrEqual(operation.before);
        expect(records[index].occurred_at).toBeLessThanOrEqual(operation.after);
        expect(records[index].created_at).toBe(records[index].occurred_at);
      }
      const visible=(await history()).filter(entry=>['paused','resumed'].includes(entry.action)).reverse();
      expect(visible).toEqual(records.map(row=>({id:row.id,operatorId:'go-live-owner',operatorName:'Owner',actorType:'operator',
        action:row.action,objectType:'campaign',objectId:campaign.campaignId,detail:{revisionId:campaign.revisionId},occurredAt:row.occurred_at})));
      const latestPause=records.findLast(row=>row.action==='paused'), latestResume=records.findLast(row=>row.action==='resumed');
      expect(await pauses()).toEqual([expect.objectContaining({campaign_id:campaign.campaignId,revision_id:campaign.revisionId,channel:'email',
        paused_at:latestPause!.occurred_at,created_at:records[0].occurred_at,
        resumed_at:latestResume && latestResume.occurred_at>latestPause!.occurred_at?latestResume.occurred_at:null})]);
    };
    const operate = async (action:'paused'|'resumed', run:()=>Promise<unknown>) => {
      // Bracket the real operator request, independently of its returned or stored time.
      const before=(await site.control('/_golive/clock',{advanceMs:7000})).now;
      await run();
      const after=(await site.control('/_golive/clock')).now;
      operations.push({action,before,after});
      await checkHistory();
    };
    const capture = async (name:string) => {
      await page.screenshot({path:info.outputPath(`${name}-1440.png`),fullPage:true});
      await page.setViewportSize({width:390,height:844});
      await page.screenshot({path:info.outputPath(`${name}-390.png`),fullPage:true});
      await page.setViewportSize({width,height:1000});
    };
    expect((await site.call(`/api/campaigns/${campaign.campaignId}/pause`,{method:'POST'})).status).toBe(401);
    await page.setViewportSize({width,height:1000});
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
    await operate('paused',async()=>{
      await page.getByRole('button',{name:'Pause campaign',exact:true}).click();
      await expect(page.getByRole('button',{name:'Resume campaign',exact:true})).toBeVisible();
    });
    await expect(page.getByRole('button',{name:'Resume campaign',exact:true})).toBeVisible();
    await capture('scheduled-pause');
    const scheduledPause=await retained();
    await site.control('/_golive/clock',{advanceMs:11000});
    await json(await control('pause'),200);
    await reloadPage(page);
    expect(await retained()).toEqual(scheduledPause);
    await operate('resumed',async()=>{
      await page.getByRole('button',{name:'Resume campaign',exact:true}).click();
      await expect(page.getByRole('button',{name:'Pause campaign',exact:true})).toBeVisible();
    });
    await expect(page.getByRole('button',{name:'Pause campaign',exact:true})).toBeVisible();
    const scheduledResume=await retained();
    await site.control('/_golive/clock',{advanceMs:13000});
    expect(await json(await control('resume'),409)).toEqual({error:'campaign_not_operator_paused'});
    await reloadPage(page);
    expect(await retained()).toEqual(scheduledResume);
    const recipients = await site.rows(`SELECT r.id,r.destination FROM recipient_steps r JOIN campaign_steps s ON s.id=r.step_id WHERE r.revision_id='${campaign.revisionId}' AND s.sequence=1 ORDER BY r.created_at,r.rowid`);
    await site.control('/_golive/barrier',{action:'arm',point:'handoff',identity:recipients[1].id});
    await site.control('/_golive/clock',{advanceMs:3600001});
    await site.control('/_golive/cron');
    await expect.poll(async () => (await site.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
    expect(marketing()).toHaveLength(1);
    await reloadPage(page);
    await operate('paused',async()=>{
      await page.getByRole('button',{name:'Pause campaign',exact:true}).click();
      await expect(page.getByRole('heading',{name:'Sending paused by an operator'})).toBeVisible();
    });
    const dispatchPause=await retained();
    await site.control('/_golive/clock',{advanceMs:17000});
    await json(await control('pause'),200); // Repeat keeps the original event and pause time.
    expect(await retained()).toEqual(dispatchPause);
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
    await checkHistory();
    await operate('resumed',async()=>{
      await page.getByRole('button',{name:'Resume campaign',exact:true}).click();
      await expect(page.getByRole('button',{name:'Pause campaign',exact:true})).toBeVisible();
    });
    await expect(page.getByRole('button',{name:'Pause campaign',exact:true})).toBeVisible();
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
    const completed=await retained();
    await site.control('/_golive/clock',{advanceMs:19000});
    expect(await json(await control('pause'),409)).toEqual({error:'campaign_not_pausable'});
    expect(await json(await control('resume'),409)).toEqual({error:'campaign_not_operator_paused'});
    await reloadPage(page);
    expect(await retained()).toEqual(completed);
    await checkHistory();
    await openPage(page,`${site.runtime.url}/app/settings/activity`);
    await page.getByLabel('Object',{exact:true}).fill(campaign.campaignId);
    await page.getByRole('button',{name:'Apply filters',exact:true}).click();
    const historyRows=page.getByRole('region',{name:'Activity log table'}).locator('tbody tr').filter({has:page.getByRole('cell',{name:/^(Paused|Resumed)$/})});
    await expect(historyRows).toHaveCount(4);
    for(const [index,operation] of [...operations].reverse().entries()) {
      await expect(historyRows.nth(index).locator('time')).toHaveAttribute('datetime',new Date(operation.before).toISOString());
      await expect(historyRows.nth(index).getByRole('cell',{name:'Owner',exact:true})).toBeVisible();
    }
    await capture('pause-history');
    expect(await retained()).toEqual(completed);
    await info.attach('pause-occurrence-proof',{body:JSON.stringify({operations,audit:completed.audit,pauses:completed.pauses,
      history:completed.history.filter(entry=>['paused','resumed'].includes(entry.action)),handoffs:completed.authority.handoffs},null,2),contentType:'application/json'});
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
  } catch (error) {
    console.log('Pause journey transport state',await site.rows('SELECT transport_disposition,skip_reason,last_error_code,attempt_count FROM recipient_steps'));
    throw error;
  } finally {
    await site.control('/_golive/barrier',{action:'release'}).catch(()=>{});
    await page.close(); await site.runtime.close(); await edge.close();
  }
};
