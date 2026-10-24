import {readArchive} from '../../src/vendor/base/portability/index.mjs';
import {createHmac} from 'node:crypto';
import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {resendWebhookSecret} from './resend-bindings';
import {installation,json,sender,draftCampaign} from './harness';
import {openPage} from '../support/navigation';
export async function resendConnectionJourney(page:Page,info:TestInfo){
  const edge=await providerEdge(),site=await installation(edge,eventSigner());
  try{
    const owner=await site.open(),key='synthetic-mango-130',state=edge.resend.connection;
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie:owner,body:sender}),200);
    const admin=await site.open('synthetic-mango-131@example.test','synthetic-mango-131');await json(await site.call('/api/operators/synthetic-mango-131/role',{method:'PUT',cookie:owner,body:{role:'admin'}}),200);
    await site.open('synthetic-mango-132@example.test','synthetic-mango-132');await json(await site.call('/api/operators/synthetic-mango-132/role',{method:'PUT',cookie:owner,body:{role:'author'}}),200);
    const prepare=()=>site.call('/api/settings/sending/review',{method:'POST',cookie:owner,body:{provider:'resend',apiKey:key}});
    state.fullAccess=false;expect((await json(await prepare(),422)).missing).toContain('Full access API key: webhook management');expect(state.mutations).toEqual([]);state.fullAccess=true;
    await page.context().clearCookies();await page.context().addCookies([{name:owner.split('=')[0],value:owner.split('=')[1],url:site.runtime.url}]);
    await openPage(page,site.runtime.url+'/app/settings');await page.getByRole('combobox',{name:'Sending provider',exact:true}).selectOption('resend');await page.getByLabel('Resend API key',{exact:true}).fill(key);await page.getByRole('button',{name:'Review Resend key',exact:true}).click();
    const panel=page.locator('#sending');await expect(panel.getByRole('group',{name:'Review Resend connection'})).toContainText('/webhooks/mail/resend');expect(state.mutations).toEqual([]);
    for(const width of [1440,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect((await new AxeBuilder({page}).include('#sending').options({iframes:false}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);await panel.screenshot({path:info.outputPath(`resend-review-${width}.png`)});}
    await page.getByRole('button',{name:'Connect Resend',exact:true}).click();await expect(panel).toContainText('delivery-events-missing');
    expect(state.mutations).toHaveLength(1);expect(state.mutations[0]).toMatchObject({method:'POST',path:'/webhooks',body:{endpoint:site.origin+'/webhooks/mail/resend',events:['email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed']}});
    expect(state.webhooks.find(hook=>hook.id===state.other.id)).toEqual(state.other);
    const reconnect=await json(await prepare(),200);await json(await site.call('/api/settings/sending/connect',{method:'POST',cookie:owner,body:{proposalId:reconnect.proposalId}}),200);expect(state.mutations).toHaveLength(1);
    expect(JSON.stringify(await site.rows('SELECT secret_cipher FROM sending_connection'))).not.toContain(key);expect(JSON.stringify(await site.rows('SELECT secret_cipher FROM sending_connection'))).not.toContain(resendWebhookSecret);
    expect(JSON.stringify(await json(await site.call('/api/settings/sending',{cookie:owner}),200))).not.toContain(resendWebhookSecret);expect(await page.locator('body').innerText()).not.toContain(resendWebhookSecret);expect(site.runtime.logs()).not.toContain(resendWebhookSecret);
    const exported=await json(await site.call('/api/portability/exports',{method:'POST',cookie:owner,headers:{Origin:site.runtime.url},body:{}}),201);let progress;do{progress=await json(await site.call(`/api/portability/exports/${exported.id}/advance`,{method:'POST',cookie:owner,headers:{Origin:site.runtime.url},body:{}}),200);}while(progress.phase!=='complete');const archive=await site.call(`/api/portability/exports/${exported.id}/download`,{cookie:owner,headers:{Origin:site.runtime.url}});expect(archive.status).toBe(200);const records=[];for await(const record of readArchive(archive.body!))records.push(record);expect(JSON.stringify(records)).not.toContain(key);expect(JSON.stringify(records)).not.toContain(resendWebhookSecret);
    const raw=JSON.stringify({type:'email.delivered',data:{email_id:'synthetic-mango-130-mail',to:['owner@example.test']}}),before=await site.count('provider_fact_inbox');
    expect((await site.call('/webhooks/mail/resend',{method:'POST',raw})).status).toBe(401);
    const id='synthetic-mango-130-event',timestamp=String(Math.floor(Date.now()/1000)-600),signature=createHmac('sha256',Buffer.from(resendWebhookSecret.slice(6),'base64')).update(id+'.'+timestamp+'.'+raw).digest('base64');
    expect((await site.call('/webhooks/mail/resend',{method:'POST',raw,headers:{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':'v1,'+signature}})).status).toBe(401);expect(await site.count('provider_fact_inbox')).toBe(before);
    const campaign=await draftCampaign(site,owner,'Synthetic Resend health',[],new Date(Date.now()+3600000));
    for(const failure of [401,403,404]){
      state.readStatus=failure;await site.control('/_golive/clock',{advanceMs:300001});
      const reason=failure===404?'delivery-webhook-missing':'sending-key-revoked';
      const checks=await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie:owner,body:{revisionId:campaign.revisionId}}),200);expect(JSON.stringify(checks)).toContain(reason);
      const status=await json(await site.call('/api/settings/sending',{cookie:owner}),200);expect(status.connection.error).toBe(reason);
      await openPage(page,site.runtime.url+'/app');await expect(page.getByRole('alert',{name:'Sending connection',exact:true})).toContainText(reason);
      for(const width of [1440,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);expect((await new AxeBuilder({page}).include('main').options({iframes:false}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);await page.screenshot({path:info.outputPath(`sending-alert-${failure}-${width}.png`),fullPage:true});}
      const pending=await site.rows("SELECT detail_json FROM lifecycle_audit_entries WHERE action='sending-alert-notice' AND json_extract(detail_json,'$.state')='pending'");
      for(const notice of pending){const due=JSON.parse(notice.detail_json).retryAt;if(due){const clock=await site.control('/_golive/clock');await site.control('/_golive/clock',{advanceMs:Math.max(1,due-clock.now+1)});await json(await site.call('/api/settings/sending',{cookie:owner}),200);}}
      const notices=await site.rows(`SELECT detail_json FROM lifecycle_audit_entries WHERE action='sending-alert-notice' AND json_extract(detail_json,'$.reason')='${reason}'`);expect(notices).toHaveLength(2);expect(notices.every(row=>JSON.parse(row.detail_json).state==='accepted')).toBe(true);
      for(const email of ['owner@example.test','synthetic-mango-131@example.test'])expect(edge.sends.some(send=>send.to===email&&send.body.content.some((part:any)=>String(part.value).includes(reason)))).toBe(true);
      state.readStatus=0;
    }
    expect(site.runtime.logs()).not.toContain(key);expect(edge.unexpected).toEqual([]);
  }finally{await site.runtime.close();await edge.close();}
}
