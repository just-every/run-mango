import {readArchive} from '../../src/vendor/base/portability/index.mjs';
import {createHmac} from 'node:crypto';
import {expect,type Page,type TestInfo} from '@playwright/test';
import {createRequire} from 'node:module';
const localRequire=createRequire(import.meta.url);
const axeSource=createRequire(localRequire.resolve('@axe-core/playwright'))('axe-core').source as string;
import {providerEdge} from './edge';
import {resendWebhookSecret} from './resend-bindings';
import {json,sender,draftCampaign,type Installation} from './harness';
import {openPage} from '../support/navigation';
export async function resendConnectionJourney(site:Installation,edge:Awaited<ReturnType<typeof providerEdge>>,page:Page,info:TestInfo,owner:string,admin:string){
    const key='synthetic-mango-131',state=edge.resend.connection;
    await json(await site.call('/api/settings/sending',{method:'DELETE',cookie:owner}),200);
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie:owner,body:sender}),200);
    await json(await site.call('/api/settings/sending/review',{method:'POST',cookie:admin,body:{provider:'resend',apiKey:key}}),403);
    await site.open('synthetic-mango-132@example.test','synthetic-mango-132');await json(await site.call('/api/operators/synthetic-mango-132/role',{method:'PUT',cookie:owner,body:{role:'author'}}),200);
    const prepare=()=>site.call('/api/settings/sending/review',{method:'POST',cookie:owner,body:{provider:'resend',apiKey:key}});
    state.fullAccess=false;expect((await json(await prepare(),422)).missing).toContain('Full access API key: webhook management');expect(state.mutations).toEqual([]);state.fullAccess=true;
    const unauthorized=await json(await prepare(),200);await json(await site.call('/api/settings/sending/connect',{method:'POST',cookie:admin,body:{proposalId:unauthorized.proposalId}}),403);await json(await site.call('/api/settings/sending',{method:'DELETE',cookie:admin}),403);expect(state.mutations).toEqual([]);
    await page.context().clearCookies();await page.context().addCookies([{name:owner.split('=')[0],value:owner.split('=')[1],url:site.runtime.url}]);
    await openPage(page,site.runtime.url+'/app/settings');await page.getByRole('combobox',{name:'Sending provider',exact:true}).selectOption('resend');await page.getByLabel('Resend API key',{exact:true}).fill(key);await page.getByRole('button',{name:'Review Resend key',exact:true}).click();
    const panel=page.locator('#sending');await expect(panel.getByRole('group',{name:'Review Resend connection'})).toContainText('/webhooks/mail/resend');expect(state.mutations).toEqual([]);
    for(const width of [1440,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await page.evaluate(axeSource);const audit=await page.evaluate(async()=>(window as any).axe.run(document.querySelector('#sending'),{iframes:false}));expect(audit.violations.filter((v:any)=>v.impact==='serious'||v.impact==='critical')).toEqual([]);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);await panel.screenshot({path:info.outputPath(`resend-review-${width}.png`)});}
    await page.getByRole('button',{name:'Connect Resend',exact:true}).click();await expect(panel.getByRole('button',{name:'Disconnect Resend',exact:true})).toBeVisible();await expect(panel.getByRole('group',{name:'Review Resend connection'})).toHaveCount(0);await expect(panel).toContainText('delivery-events-missing');
    expect(state.mutations).toHaveLength(1);expect(state.mutations[0]).toMatchObject({method:'POST',path:'/webhooks',body:{endpoint:site.origin+'/webhooks/mail/resend',events:['email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed']}});
    expect(state.webhooks.find(hook=>hook.id===state.other.id)).toEqual(state.other);
    const reconnect=await json(await prepare(),200);await json(await site.call('/api/settings/sending/connect',{method:'POST',cookie:owner,body:{proposalId:reconnect.proposalId}}),200);expect(state.mutations).toHaveLength(1);
    const owned=state.webhooks.find(hook=>hook.id!==state.other.id)!,events=[...owned.events];owned.events=['email.sent'];
    const refused=await json(await prepare(),200);await json(await site.call('/api/settings/sending/connect',{method:'POST',cookie:owner,body:{proposalId:refused.proposalId}}),422);expect(state.mutations).toHaveLength(1);
    owned.events=events;const recovered=await json(await prepare(),200);await json(await site.call('/api/settings/sending/connect',{method:'POST',cookie:owner,body:{proposalId:recovered.proposalId}}),200);expect(state.mutations).toHaveLength(1);
    expect(JSON.stringify(await site.rows('SELECT secret_cipher FROM sending_connection'))).not.toContain(key);expect(JSON.stringify(await site.rows('SELECT secret_cipher FROM sending_connection'))).not.toContain(resendWebhookSecret);
    expect(JSON.stringify(await json(await site.call('/api/settings/sending',{cookie:owner}),200))).not.toContain(resendWebhookSecret);expect(await page.locator('body').innerText()).not.toContain(resendWebhookSecret);expect(site.runtime.logs()).not.toContain(resendWebhookSecret);
    const exported=await json(await site.call('/api/portability/exports',{method:'POST',cookie:owner,headers:{Origin:site.runtime.url},body:{}}),201);let progress;do{progress=await json(await site.call(`/api/portability/exports/${exported.id}/advance`,{method:'POST',cookie:owner,headers:{Origin:site.runtime.url},body:{}}),200);}while(progress.phase!=='complete');const archive=await site.call(`/api/portability/exports/${exported.id}/download`,{cookie:owner,headers:{Origin:site.runtime.url}});expect(archive.status).toBe(200);const records=[];for await(const record of readArchive(archive.body!))records.push(record);expect(JSON.stringify(records)).not.toContain(key);expect(JSON.stringify(records)).not.toContain(resendWebhookSecret);
    const raw=JSON.stringify({type:'email.delivered',data:{email_id:'synthetic-mango-130-mail',to:['owner@example.test']}}),before=await site.count('provider_fact_inbox');
    expect((await site.call('/webhooks/mail/resend',{method:'POST',raw})).status).toBe(401);
    const id='synthetic-mango-130-event',timestamp=String(Math.floor(Date.now()/1000)-600),signature=createHmac('sha256',Buffer.from(resendWebhookSecret.slice(6),'base64')).update(id+'.'+timestamp+'.'+raw).digest('base64');
    expect((await site.call('/webhooks/mail/resend',{method:'POST',raw,headers:{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':'v1,'+signature}})).status).toBe(401);expect(await site.count('provider_fact_inbox')).toBe(before);
    const clock=await site.control('/_golive/clock'),[pacing]=await site.rows('SELECT MAX(next_at) AS due FROM provider_pacing');if(Number(pacing.due??0)>=clock.now)await site.control('/_golive/clock',{advanceMs:Number(pacing.due)-clock.now+1});
    await json(await site.call('/api/settings/sender/confirmation',{method:'POST',cookie:owner}),202);
    const ownerCheck=edge.resend.sends.findLast(send=>send.body.to.includes('owner@example.test'));expect(ownerCheck).toBeTruthy();
    const delivered=JSON.stringify({type:'email.delivered',data:{email_id:ownerCheck!.messageId,to:['owner@example.test']}}),deliveryId='synthetic-mango-130-delivered',deliveryTimestamp=String(Math.floor((await site.control('/_golive/clock')).now/1000)),deliverySignature=createHmac('sha256',Buffer.from(resendWebhookSecret.slice(6),'base64')).update(deliveryId+'.'+deliveryTimestamp+'.'+delivered).digest('base64');
    expect((await site.call('/webhooks/mail/resend',{method:'POST',raw:delivered,headers:{'svix-id':deliveryId,'svix-timestamp':deliveryTimestamp,'svix-signature':'v1,'+deliverySignature}})).status).toBe(204);
    expect((await json(await site.call('/api/settings/sending',{cookie:owner}),200)).connection.deliveryEventsVerified).toBe(true);
    await openPage(page,site.runtime.url+'/app/settings');await expect(panel).toContainText('Signed delivery events verified.');await expect(panel).toContainText('Route in use: Settings sending connection');await expect(panel.getByRole('combobox',{name:'Sending provider',exact:true})).toHaveValue('resend');await expect(panel.getByLabel('Resend API key',{exact:true})).toBeVisible();
    for(const width of [1440,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await page.evaluate(axeSource);const audit=await page.evaluate(async()=>(window as any).axe.run(document.querySelector('#sending'),{iframes:false}));expect(audit.violations.filter((v:any)=>v.impact==='serious'||v.impact==='critical')).toEqual([]);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);await panel.screenshot({path:info.outputPath(`resend-connected-${width}.png`)});}
    const campaign=await draftCampaign(site,owner,'Synthetic Resend health',['synthetic-mango-133@example.test'],new Date(Date.now()+3600000));
    for(const failure of [401,403,404]){
      state.readStatus=failure;await site.control('/_golive/clock',{advanceMs:300001});
      const reason=failure===404?'delivery-webhook-missing':'sending-key-revoked';
      const checks=await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie:owner,body:{revisionId:campaign.revisionId}}),200);expect(JSON.stringify(checks)).toContain(reason);
      const blocked=await json(await site.call(`/api/campaigns/${campaign.campaignId}/approve`,{method:'POST',cookie:owner,body:{revisionId:campaign.revisionId,idempotencyKey:'synthetic-mango-133-'+failure}}),409);expect(JSON.stringify(blocked)).toContain(reason);
      const status=await json(await site.call('/api/settings/sending',{cookie:owner}),200);expect(status.connection.error).toBe(reason);
      await openPage(page,site.runtime.url+'/app');await expect(page.getByRole('alert',{name:'Sending connection',exact:true})).toContainText(reason);
      for(const width of [1440,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);await page.evaluate(axeSource);const audit=await page.evaluate(async()=>(window as any).axe.run(document.querySelector('main'),{iframes:false}));expect(audit.violations.filter((v:any)=>v.impact==='serious'||v.impact==='critical')).toEqual([]);await page.screenshot({path:info.outputPath(`sending-alert-${failure}-${width}.png`),fullPage:true});}
      const pending=await site.rows("SELECT detail_json FROM lifecycle_audit_entries WHERE action='sending-alert-notice' AND json_extract(detail_json,'$.state')='pending'");
      for(const notice of pending){const due=JSON.parse(notice.detail_json).retryAt;if(due){const clock=await site.control('/_golive/clock');await site.control('/_golive/clock',{advanceMs:Math.max(1,due-clock.now+1)});await json(await site.call('/api/settings/sending',{cookie:owner}),200);}}
      const notices=await site.rows(`SELECT detail_json FROM lifecycle_audit_entries WHERE action='sending-alert-notice' AND json_extract(detail_json,'$.reason')='${reason}'`);expect(notices).toHaveLength(2);expect(notices.every(row=>JSON.parse(row.detail_json).state==='accepted')).toBe(true);
      for(const email of ['owner@example.test','synthetic-mango-85@example.test'])expect(edge.sends.some(send=>send.to===email&&send.body.content.some((part:any)=>String(part.value).includes(reason)))).toBe(true);
      state.readStatus=0;
    }
    expect(site.runtime.logs()).not.toContain(key);expect(edge.unexpected).toEqual([]);
}

