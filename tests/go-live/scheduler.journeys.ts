import {configuredCronDriver} from './cron-driver';
import { expect, test } from '@playwright/test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { providerEdge } from './edge';
import { event, eventSigner } from './sendgrid-events';
import { approve, confirmedContact, draftCampaign, installation, json, sender, signedPost } from './harness';

// The imported production Worker scheduled and queue exports use durable D1.
// Only SendGrid/DNS/receiver network boundaries are substituted by this harness.
test('[CAMP-010][CAMP-011][SEND-006] scheduler entries survive restart and preserve provider delivery truth', async ({page},info) => {
  const edge=await providerEdge(), signer=eventSigner();
  const directory=await mkdtemp(join(tmpdir(),'mango-scheduler-test-'));
  const options={token:crypto.randomUUID(),stateDirectory:join(directory,'state')};
  let site=await installation(edge,signer,options).catch(async error=>{
    await edge.close();
    await rm(directory,{recursive:true,force:true});
    throw error;
  });
  let driver:Awaited<ReturnType<typeof configuredCronDriver>>|undefined;
  try {
    let cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    const email='scheduler@example.test';
    await confirmedContact(site,edge,cookie,email,'Scheduler test');
    // Approval persists a future schedule. Only the independent configured
    // wall-clock Cron driver may initiate this first dispatch.
    // Just after a minute with >60s until the next five-minute boundary:
    // the old */5 schedule must fail, whatever wall-clock time starts this test.
    let minute=Math.floor(Date.now()/60000)+1;
    if(minute%5===4)minute++;
    const due=new Date(minute*60000+2000);
    const letter=await draftCampaign(site,cookie,'Scheduled newsletter',[email],due);
    expect((await approve(site,cookie,letter)).status).toBe('scheduled');
    const detail=async()=>json(await site.call(`/api/campaigns/${letter.campaignId}`,{cookie}),200);
    const handoffs=()=>edge.sends.filter(send=>send.to===email&&send.body.headers?.['List-Unsubscribe']);
    const delivered=async()=>(await detail()).results.steps[0].counts
      .filter((bucket:{disposition:string})=>bucket.disposition==='delivered').reduce((sum:number,bucket:{count:number})=>sum+bucket.count,0);
    expect((await detail()).scheduler).toMatchObject({state:'not-observed',lastTickAt:null,outcome:null});
    expect((await site.call(`/api/campaigns/${letter.campaignId}`)).status).toBe(401);
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);

    await page.setViewportSize({width:390,height:900});
    await page.goto(`${site.runtime.url}/app/campaigns/${letter.campaignId}/scheduled`);
    await expect(page.locator('[data-scheduler-state="not-observed"]')).toBeVisible();
    driver=await configuredCronDriver(site);
    await page.screenshot({path:info.outputPath('scheduler-waiting-390.png'),fullPage:true});
    expect(handoffs()).toHaveLength(0);
    while(Date.now()<due.getTime()) {
      expect(handoffs()).toHaveLength(0);
      expect(await site.rows(`SELECT started_at FROM step_dispatches WHERE step_id IN (SELECT id FROM campaign_steps WHERE revision_id='${letter.revisionId}')`)).toEqual([]);
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    await expect.poll(async()=> (await site.rows(`SELECT started_at FROM step_dispatches WHERE revision_id='${letter.revisionId}'`))[0]?.started_at,{timeout:60000,intervals:[100]}).toBeTruthy();
    const startedAt=Number((await site.rows(`SELECT started_at FROM step_dispatches WHERE revision_id='${letter.revisionId}'`))[0].started_at);
    expect(startedAt).toBeGreaterThanOrEqual(due.getTime());
    expect(startedAt-due.getTime()).toBeLessThanOrEqual(60000);
    await expect.poll(async()=>(await site.rows(`SELECT transport_disposition FROM recipient_steps WHERE campaign_id='${letter.campaignId}'`))[0]?.transport_disposition,
      {timeout:60000}).toBe('accepted');
    await driver.close();
    const receipt=JSON.stringify({driver:'Configured wall-clock driver; Vite does not initiate Cron Triggers; not hosted acceptance',ticks:driver.ticks,scheduledAt:due.toISOString(),startedAt:new Date(startedAt).toISOString(),latenessMs:startedAt-due.getTime()});
    await writeFile(info.outputPath('native-cron-punctuality.json'),receipt);
    console.log(`NATIVE_CRON_PUNCTUALITY ${receipt}`);
    await info.attach('native-cron-punctuality.json',{contentType:'application/json',body:receipt});
    driver=undefined;
    const old=Date.now()-60*60_000, enteredAfter=Date.now();
    await Promise.all([site.control('/_golive/cron',{scheduledTime:old}),site.control('/_golive/cron',{scheduledTime:old})]);
    const before=(await detail()).scheduler;
    expect(before).toMatchObject({state:'observed',scheduledFor:new Date(old).toISOString(),outcome:'completed'});
    expect(Date.parse(before.lastTickAt)).toBeGreaterThanOrEqual(enteredAfter);
    expect(Date.parse(before.finishedAt)).toBeGreaterThanOrEqual(Date.parse(before.lastTickAt));
    expect(await delivered()).toBe(0);
    await site.runtime.close();
    site=await installation(edge,signer,options);
    cookie=await site.open();
    expect((await detail()).scheduler).toEqual(before);
    await site.control('/_golive/cron',{scheduledTime:old-60_000});
    const after=(await detail()).scheduler;
    expect(Date.parse(after.lastTickAt)).toBeGreaterThanOrEqual(Date.parse(before.lastTickAt));
    expect(after.outcome).toBe('completed');
    expect(handoffs()).toHaveLength(1);
    expect(await site.rows(`SELECT COUNT(*) n FROM step_dispatches WHERE revision_id='${letter.revisionId}'`)).toEqual([{n:1}]);
    expect(await delivered()).toBe(0);
    const sent=handoffs()[0];
    const body=Buffer.from(JSON.stringify([event('delivered',email,Date.now()+1000,sent.messageId,sent.body.custom_args)]));
    expect(await signedPost(site,'/webhooks/mail/sendgrid',body,signer.headers(body))).toBe(204);
    expect(await delivered()).toBe(1);
    // A real production configuration failure records failure, never completion.
    const failed=await fetch(site.runtime.url+'/_golive/cron',{method:'POST',headers:{'X-Test-Token':site.runtime.token,'Content-Type':'application/json'},body:JSON.stringify({missingMailConfiguration:true})});
    expect(failed.status).toBe(500);
    expect((await detail()).scheduler.outcome).toBe('failed');
    await page.context().clearCookies();
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.goto(`${site.runtime.url}/app/campaigns/${letter.campaignId}/scheduled`);
    await expect(page.locator('[data-scheduler-outcome="failed"]')).toBeVisible();
    // Dismiss Vite's diagnostic for the deliberately failed Cron request before capturing the app.
    await page.keyboard.press('Escape');
    await page.screenshot({path:info.outputPath('scheduler-failed-390.png'),fullPage:true});
    // Restore records a real callback without dispatching or claiming completion.
    await site.runtime.close();
    site=await installation(edge,signer,{...options,restore:true});
    await site.control('/_golive/cron');
    expect(await site.rows('SELECT outcome FROM scheduler_observation')).toEqual([{outcome:'blocked-restore'}]);
    expect(handoffs()).toHaveLength(1);
    expect(edge.unexpected).toEqual([]);
  } finally {
    await driver?.close();
    await page.close();
    await site.runtime.close();
    await edge.close();
    await rm(directory,{recursive:true,force:true});
  }
});
