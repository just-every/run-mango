import { expect } from '@playwright/test';
import { providerEdge } from './edge';
import { eventSigner } from './sendgrid-events';
import { installation, json, sender, confirmedContact, draftCampaign, approve } from './harness';
import { openPage, reloadPage } from '../support/navigation';




export const walk0 = async ({page}, info, width = 1440) => {
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
    expect((await site.call(`/api/campaigns/${campaign.campaignId}/pause`,{method:'POST'})).status).toBe(401);
    await page.setViewportSize({width,height:1000});
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
    await page.getByRole('button',{name:'Pause campaign',exact:true}).click();
    await expect(page.getByRole('button',{name:'Resume campaign',exact:true})).toBeVisible();
    await site.control('/_golive/clock',{advanceMs:3600001});
    await site.control('/_golive/cron');
    expect(marketing()).toHaveLength(0);
    expect((await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200)).campaign.state).toBe('paused');
    expect(await site.rows(`SELECT transport_disposition,attempt_count FROM recipient_steps WHERE campaign_id='${campaign.campaignId}'`)).toEqual(
      Array.from({length:6},()=>({transport_disposition:'queued',attempt_count:0})),
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({path:info.outputPath(`scheduled-pause-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:'Resume campaign',exact:true}).click();
    await expect(page.getByRole('button',{name:'Pause campaign',exact:true})).toBeVisible();
    const recipients = await site.rows(`SELECT r.id,r.destination FROM recipient_steps r JOIN campaign_steps s ON s.id=r.step_id WHERE r.revision_id='${campaign.revisionId}' AND s.sequence=1 ORDER BY r.created_at,r.rowid`);
    await site.control('/_golive/barrier',{action:'arm',point:'handoff',identity:recipients[1].id});
    await site.control('/_golive/cron');
    await expect.poll(async () => (await site.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
    expect(marketing()).toHaveLength(1);
    const accepted = () => site.rows(`SELECT id,transport_disposition,provider_message_id,attempt_count,handoff_started_at FROM recipient_steps WHERE campaign_id='${campaign.campaignId}' AND transport_disposition='accepted' ORDER BY id`);
    const handedOff = await accepted();
    expect(handedOff).toEqual([expect.objectContaining({id:recipients[0].id,transport_disposition:'accepted',provider_message_id:expect.any(String),attempt_count:1,handoff_started_at:expect.any(Number)})]);
    await reloadPage(page);
    await page.getByRole('button',{name:'Pause campaign',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Sending paused by an operator'})).toBeVisible();
    await json(await control('pause'),200); // Repeat does not add another transition.
    const before = marketing().length;
    await site.control('/_golive/barrier',{action:'release'});
    await expect.poll(async () => (await site.rows(`SELECT lease_token FROM recipient_steps WHERE id='${recipients[1].id}'`))[0].lease_token,{timeout:60000}).toBeNull();
    await site.control('/_golive/clock',{advanceMs:31000});
    await site.control('/_golive/cron');
    expect(marketing()).toHaveLength(before);
    expect(await accepted()).toEqual(handedOff);
    const optedOut = recipients[2].destination;
    const [contact] = await site.rows(`SELECT id FROM contacts WHERE email='${optedOut}'`);
    const unsubscribe = await site.control('/_golive/unsubscribe-link',{contactId:contact.id});
    expect((await fetch(site.local(unsubscribe.url),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
    await reloadPage(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({path:info.outputPath(`dispatch-paused-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:'Resume campaign',exact:true}).click();
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
    expect(await site.rows(`SELECT r.destination,s.sequence,r.transport_disposition,r.skip_reason,r.attempt_count FROM recipient_steps r JOIN campaign_steps s ON s.id=r.step_id WHERE r.campaign_id='${campaign.campaignId}' ORDER BY r.destination,s.sequence`)).toEqual(
      [...emails].sort().flatMap(destination=>[1,2].map(sequence=>({destination,sequence,
        transport_disposition:destination===optedOut?'skipped':'accepted',
        skip_reason:destination===optedOut?'channel-not-subscribed':null,attempt_count:destination===optedOut?0:1}))),
    );
    expect((await accepted()).find(row=>row.id===handedOff[0].id)).toEqual(handedOff[0]);
    await site.control('/_golive/cron');
    expect(marketing()).toHaveLength(4);
    expect(await site.rows(`SELECT actor_id,action FROM lifecycle_audit_entries WHERE entity_id='${campaign.campaignId}' AND action IN ('paused','resumed') ORDER BY occurred_at,rowid`)).toEqual([
      {actor_id:'go-live-owner',action:'paused'},{actor_id:'go-live-owner',action:'resumed'},
      {actor_id:'go-live-owner',action:'paused'},{actor_id:'go-live-owner',action:'resumed'},
    ]);
    await reloadPage(page);
    await expect(page.getByRole('heading',{name:'Spring market reminders',exact:true})).toBeVisible();
    await expect(page.locator('[data-step-id] [data-disposition=accepted] dd')).toHaveText(['2','2']);
    await expect(page.getByRole('button',{name:'Resume campaign',exact:true})).toHaveCount(0);
    await page.screenshot({path:info.outputPath(`pause-completed-${width}.png`),fullPage:true});
    expect((await control('pause')).status).toBe(409);
    const now = (await site.control('/_golive/clock')).now;
    const expired = await draftCampaign(site,cookie,'Window closes during pause',['expiry@example.test'],new Date(now+3600000));
    await approve(site,cookie,expired);
    await openPage(page,`${site.runtime.url}/app/campaigns/${expired.campaignId}/scheduled`);
    await page.getByRole('button',{name:'Pause campaign',exact:true}).click();
    await expect(page.getByRole('button',{name:'Resume campaign',exact:true})).toBeVisible();
    await site.control('/_golive/clock',{advanceMs:4*3600000});
    await page.getByRole('button',{name:'Resume campaign',exact:true}).click();
    await site.control('/_golive/cron');
    expect(await site.rows(`SELECT transport_disposition,skip_reason,attempt_count FROM recipient_steps WHERE campaign_id='${expired.campaignId}'`)).toEqual([{transport_disposition:'skipped',skip_reason:'send-window-expired',attempt_count:0}]);
    await reloadPage(page);
    await expect(page.locator('[data-skip-reason="send-window-expired"] dd')).toHaveText('1');
    expect(await site.rows(`SELECT actor_id,action FROM lifecycle_audit_entries WHERE entity_id='${expired.campaignId}' AND action IN ('paused','resumed') ORDER BY occurred_at,rowid`)).toEqual([
      {actor_id:'go-live-owner',action:'paused'},{actor_id:'go-live-owner',action:'resumed'},
    ]);
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
