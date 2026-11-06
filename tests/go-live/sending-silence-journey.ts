import {createHmac} from 'node:crypto';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect,type Page,type TestInfo} from '@playwright/test';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {resendKey,resendWebhookSecret} from './resend-bindings';
import {installation,json,sender,consent,draftCampaign,approve} from './harness';
import {openPage} from '../support/navigation';

/** Real Settings, approval, webhook, Cron and Queue doors; only providers are at an edge. */
export async function sendingSilenceJourney(page:Page,info:TestInfo) {
  const edge=await providerEdge(),signer=eventSigner(),directory=await mkdtemp(join(tmpdir(),'mango-silence-'));
  const options={token:crypto.randomUUID(),stateDirectory:join(directory,'state'),mailProvider:'resend' as const};
  let site=await installation(edge,signer,options);
  const observations:Record<string,unknown>={};
  const address=(n:number)=>['synthetic-mango-'+n,'example.test'].join('@');
  const reason='delivery-events-silent',day=86400000;
  try {
    let owner=await site.open();
    const now=async()=>Number((await site.control('/_golive/clock')).now);
    const advance=async(ms:number)=>{const clock=await site.control('/_golive/clock',{advanceMs:ms,hold:true});edge.resend.setClock(clock.now);return clock.now as number;};
    await advance(0);
    const transportReady=async()=>{const [pacing]=await site.rows('SELECT MAX(next_at) AS due FROM provider_pacing');await advance(Math.max(1,Number(pacing.due??0)-await now()+1));};
    const status=async()=>json(await site.call('/api/settings/sending',{cookie:owner}),200);
    const postEvent=async(messageId:string,to:string,occurredAt:number,valid=true)=>{
      const raw=JSON.stringify({type:'email.delivered',created_at:new Date(occurredAt).toISOString(),data:{email_id:messageId,to:[to]}});
      const id=crypto.randomUUID(),timestamp=String(Math.floor(await now()/1000));
      const signature=createHmac('sha256',Buffer.from(resendWebhookSecret.slice(6),'base64')).update(id+'.'+timestamp+'.'+raw).digest('base64');
      return (await site.call('/webhooks/mail/resend',{method:'POST',raw,headers:{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':'v1,'+(valid?signature:'synthetic-mango-refused')}})).status;
    };
    const connect=async()=>{
      const review=await json(await site.call('/api/settings/sending/review',{method:'POST',cookie:owner,body:{provider:'resend',apiKey:resendKey}}),200);
      await json(await site.call('/api/settings/sending/connect',{method:'POST',cookie:owner,body:{proposalId:review.proposalId}}),200);
      await transportReady();
      await json(await site.call('/api/settings/sender/confirmation',{method:'POST',cookie:owner}),202);
      const diagnostic=edge.resend.sends.at(-1)!;
      expect(await postEvent(diagnostic.messageId,diagnostic.body.to[0],await now())).toBe(204);
      expect((await status()).connection.deliveryEventsVerified).toBe(true);
      await transportReady();await site.control('/_golive/sender-evidence');
      return diagnostic;
    };
    const confirm=async(n:number)=>{
      await transportReady();
      await json(await site.call('/api/contacts/consent',{method:'POST',cookie:owner,body:{...consent,contact:{email:address(n),displayName:'Synthetic reader '+n},occurredAt:new Date(await now()).toISOString()}}),201);
      const message=edge.resend.sends.findLast(send=>send.body.to[0]===address(n))!;
      const link=/https:\/\/\S+\/consent\/confirm\/\S+/.exec(message.body.text)![0];
      expect((await fetch(site.local(link),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
    };
    const recipients=(revision:string)=>site.rows(`SELECT id,destination,transport_disposition,skip_reason,attempt_count,send_by_at,last_error_code,sending_generation,sending_accepted_at,sending_signed_event_at,provider_message_id FROM recipient_steps WHERE revision_id='${revision}'`);
    const marketing=()=>edge.resend.sends.filter(send=>send.body.headers?.['List-Unsubscribe']);
    const notices=()=>site.rows("SELECT detail_json FROM lifecycle_audit_entries WHERE action='sending-alert-notice' AND json_extract(detail_json,'$.reason')='delivery-events-silent'");
    const drainNotices=async()=>{
      for(let i=0;i<3;i++){
        const pending=(await notices()).map(row=>JSON.parse(row.detail_json)).filter(row=>row.state==='pending');
        if(!pending.length)break;
        const due=Math.max(...pending.map(row=>Number(row.retryAt??0)));
        await advance(Math.max(1500,due-await now()+1));
        await status();
      }
    };
    const screens=async(label:string,path:string)=>{
      await page.context().clearCookies();await page.context().addCookies([{name:owner.split('=')[0],value:owner.split('=')[1],url:site.runtime.url}]);
      await page.setViewportSize({width:1440,height:1000});await openPage(page,site.runtime.url+path);
      if(path==='/app')await expect(page.getByRole('alert',{name:'Sending connection',exact:true})).toContainText(reason);
      else {await expect(page.locator('#sending')).toContainText(reason);await expect(page.locator('#sending')).not.toContainText('delivery-events-missing');}
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
      expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
      for(const width of [1440,390]){await page.setViewportSize({width,height:1000});if(path==='/app/settings')await page.locator('#sending').screenshot({path:info.outputPath(`${label}-${width}.png`)});else await page.screenshot({path:info.outputPath(`${label}-${width}.png`),fullPage:true});}
    };
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie:owner,body:sender}),200);
    await connect();
    // An idle installation and its diagnostic are never a missing marketing stream.
    await advance(day+300001);await site.control('/_golive/cron');
    expect((await status()).connection.error).toBeNull();expect(await notices()).toEqual([]);
    observations.idle={error:null,marketing:marketing().length};
    await transportReady();await site.control('/_golive/sender-evidence');
    for(const n of [141,142,143])await confirm(n);
    const valid=await draftCampaign(site,owner,'Synthetic signed stream',[address(141)],new Date(await now()-1000));
    await transportReady();await approve(site,owner,valid);
    await expect.poll(async()=>(await recipients(valid.revisionId))[0]?.transport_disposition,{timeout:60000}).toBe('accepted');
    const [validReceipt]=await recipients(valid.revisionId);
    await advance(23*3600000);const eventAt=await now();
    expect(await postEvent(validReceipt.provider_message_id,address(141),eventAt)).toBe(204);
    await advance(2*3600000);await site.control('/_golive/cron');
    expect((await status()).connection.error).toBeNull();
    expect((await recipients(valid.revisionId))[0].sending_signed_event_at).toBe(eventAt);
    observations.validEvent={receipt:validReceipt.id,eventAt,error:null};
    // Replacement gets a new generation even when the account keeps its owned webhook.
    const diagnostic=await connect();
    const [connection]=await site.rows('SELECT generation FROM sending_connection');
    expect(connection.generation).not.toBe(validReceipt.sending_generation);
    const oldAdmin=await site.open(address(144),'synthetic-mango-144');
    await json(await site.call('/api/operators/synthetic-mango-144/role',{method:'PUT',cookie:owner,body:{role:'admin'}}),200);
    const currentAdmin=await site.open(address(145),'synthetic-mango-145');
    await json(await site.call('/api/operators/synthetic-mango-145/role',{method:'PUT',cookie:owner,body:{role:'admin'}}),200);
    await json(await site.call('/api/operators/synthetic-mango-144/role',{method:'PUT',cookie:owner,body:{role:'author'}}),200);
    expect(oldAdmin).not.toBe(currentAdmin);
    const silent=await draftCampaign(site,owner,'Synthetic silent stream',[address(142)],new Date(await now()-1000));
    await transportReady();await approve(site,owner,silent);
    await expect.poll(async()=>(await recipients(silent.revisionId))[0]?.transport_disposition,{timeout:60000}).toBe('accepted');
    const [receipt]=await recipients(silent.revisionId);
    expect(receipt).toMatchObject({sending_generation:connection.generation,sending_signed_event_at:null});expect(receipt.sending_accepted_at).toBeGreaterThan(0);
    const pendingAt=receipt.sending_accepted_at+day+15*60000;
    const pending=await draftCampaign(site,owner,'Synthetic pending silent email',[address(143)],new Date(pendingAt));await approve(site,owner,pending);
    const [originalPending]=await recipients(pending.revisionId);expect(originalPending).toMatchObject({transport_disposition:'queued',attempt_count:0,sending_accepted_at:null});
    const contender=await draftCampaign(site,owner,'Synthetic refused silent approval',[address(143)],new Date(pendingAt+60000));
    // A real provider lookup may report delivery, but is not a signed event receipt.
    edge.resend.deliver(receipt.provider_message_id);await advance(300001);await site.control('/_golive/cron');
    await expect.poll(async()=>Number((await site.rows(`SELECT count(*) AS n FROM delivery_facts WHERE recipient_step_id='${receipt.id}' AND kind='delivered'`))[0].n),{timeout:60000}).toBe(1);
    expect((await recipients(silent.revisionId))[0].sending_signed_event_at).toBeNull();
    await advance(receipt.sending_accepted_at+day-1-await now());await site.control('/_golive/cron');
    expect((await status()).connection.error).toBeNull();
    await advance(300001);await site.control('/_golive/cron');
    expect((await site.rows('SELECT last_error FROM sending_connection'))[0].last_error).toBe(reason);
    expect((await status()).connection).toMatchObject({error:reason,deliveryEventsVerified:false});await drainNotices();
    const sentNotices=(await notices()).map(row=>JSON.parse(row.detail_json));
    expect(sentNotices.map(row=>row.operatorId).sort()).toEqual(['go-live-owner','synthetic-mango-145']);expect(sentNotices.every(row=>row.state==='accepted')).toBe(true);
    const mailNotices=()=>edge.resend.sends.filter(send=>send.body.subject==='Mango sending connection needs attention'&&send.body.text.includes(reason));
    expect(mailNotices().map(send=>send.body.to[0]).sort()).toEqual([diagnostic.body.to[0],address(145)].sort());
    const blocked=await json(await site.call(`/api/campaigns/${contender.campaignId}/approve`,{method:'POST',cookie:owner,body:{revisionId:contender.revisionId,idempotencyKey:'synthetic-mango-146'}}),409);
    expect(JSON.stringify(blocked)).toContain(reason);expect(await recipients(contender.revisionId)).toEqual([]);
    await screens('sending-silence-home','/app');await screens('sending-silence-settings','/app/settings');
    // Valid signatures for diagnostics, unrelated traffic and old connections cannot recover.
    for(const [messageId,to,occurredAt] of [
      [diagnostic.messageId,diagnostic.body.to[0],await now()],
      ['synthetic-mango-unrelated',address(142),await now()],
      [validReceipt.provider_message_id,address(141),await now()],
      [receipt.provider_message_id,address(141),await now()],
      [receipt.provider_message_id,address(142),receipt.sending_accepted_at-day],
    ] as const)expect(await postEvent(messageId,to,occurredAt)).toBe(204);
    expect(await postEvent(receipt.provider_message_id,address(142),await now(),false)).toBe(401);
    await advance(300001);await site.control('/_golive/cron');expect((await status()).connection.error).toBe(reason);
    expect((await recipients(silent.revisionId))[0].sending_signed_event_at).toBeNull();
    const beforeHandoffs=marketing().length;
    await advance(pendingAt+1-await now());await site.control('/_golive/cron');
    await expect.poll(async()=>(await recipients(pending.revisionId))[0].last_error_code,{timeout:60000}).toBe('provider-authority-unavailable');
    expect((await recipients(pending.revisionId))[0]).toMatchObject({transport_disposition:'queued',attempt_count:0,send_by_at:originalPending.send_by_at});expect(marketing()).toHaveLength(beforeHandoffs);
    const restartAt=await now();await site.runtime.close();site=await installation(edge,signer,options);
    await advance(Math.max(0,restartAt-await now()));owner=await site.open();
    await site.control('/_golive/cron');expect((await status()).connection.error).toBe(reason);
    await advance(300001);await site.control('/_golive/cron');await drainNotices();
    expect(await notices()).toHaveLength(2);expect(mailNotices()).toHaveLength(2);expect(marketing()).toHaveLength(beforeHandoffs);
    await advance(originalPending.send_by_at+1-await now());await site.control('/_golive/cron');
    await expect.poll(async()=>(await recipients(pending.revisionId))[0].transport_disposition,{timeout:60000}).toBe('skipped');
    expect((await recipients(pending.revisionId))[0]).toMatchObject({skip_reason:'send-window-expired',attempt_count:0,send_by_at:originalPending.send_by_at,sending_accepted_at:null});
    expect(marketing()).toHaveLength(beforeHandoffs);
    // The supported recovery needs a current correlated signed marketing event.
    const recoveredAt=await now();expect(await postEvent(receipt.provider_message_id,address(142),recoveredAt)).toBe(204);
    await advance(300001);await site.control('/_golive/cron');expect((await status()).connection).toMatchObject({error:null,deliveryEventsVerified:true});
    // Replaying the earlier signed payload preserves its original event time.
    expect(await postEvent(receipt.provider_message_id,address(142),receipt.sending_accepted_at-day)).toBe(204);
    expect((await recipients(silent.revisionId))[0].sending_signed_event_at).toBe(recoveredAt);
    expect((await recipients(pending.revisionId))[0].transport_disposition).toBe('skipped');expect(marketing()).toHaveLength(beforeHandoffs);
    observations.silence={generation:connection.generation,accepted:receipt.id,reason,noticeOperators:sentNotices.map(row=>row.operatorId),pendingBefore:originalPending,pendingAfter:(await recipients(pending.revisionId))[0],marketingHandoffs:beforeHandoffs,restarted:true,recoveredOnlyWithCurrentSignedMarketing:true};
    expect(edge.unexpected).toEqual([]);
  } finally {
    await writeFile(info.outputPath('sending-silence-observations.json'),JSON.stringify(observations,null,2)+'\n');
    await site.runtime.close();await edge.close();await rm(directory,{recursive:true,force:true});
  }
}
