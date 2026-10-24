import {wooCommerceEdge} from './woocommerce-edge';
import {readArchive} from '../../src/vendor/base/portability/index.mjs';
import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {providerEdge} from './edge';
import {sendgridConnectionEdge} from './sendgrid-connection-edge';
import {event,eventSigner} from './sendgrid-events';
import {installation,json,sender,confirmedContact,draftCampaign,signedPost} from './harness';
import {openPage} from '../support/navigation';

export async function sendingConnectionJourney(page:Page,info:TestInfo) {
  const signer=eventSigner(),provider=sendgridConnectionEdge(signer.publicKey),woo=wooCommerceEdge(),edge=await providerEdge({sending:provider.handle,woo:woo.handle,links:{'https://woo.example.test/':{}}}),site=await installation(edge,signer,{networkHosts:['woo.example.test']});
  try {
    const owner=await site.open(),apiKey='synthetic-mango-84';
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie:owner,body:sender}),200);
    const prepare=()=>site.call('/api/settings/sending/review',{method:'POST',cookie:owner,body:{apiKey}});
    const connect=(proposalId:string)=>site.call('/api/settings/sending/connect',{method:'POST',cookie:owner,body:{proposalId}});
    const transportReady=async()=>{const clock=await site.control('/_golive/clock'),[pacing]=await site.rows('SELECT max(next_at) due FROM provider_pacing');if(Number(pacing.due??0)>=clock.now)await site.control('/_golive/clock',{advanceMs:Number(pacing.due)-clock.now+1});};
    const admin=await site.open('synthetic-mango-85@example.test','synthetic-mango-85');
    await json(await site.call('/api/operators/synthetic-mango-85/role',{method:'PUT',cookie:owner,body:{role:'admin'}}),200);
    for(const [method,path,body] of [
      ['POST','/api/settings/sending/review',{apiKey}],
      ['POST','/api/settings/sending/connect',{proposalId:crypto.randomUUID()}],
      ['DELETE','/api/settings/sending',undefined],
    ] as const) expect(await json(await site.call(path,{method,cookie:admin,body}),403)).toMatchObject({error:'role_forbidden'});
    provider.state.scopes=['mail.send'];
    const missing=await json(await prepare(),422);expect(missing.missing).toEqual(expect.arrayContaining(['user.webhooks.event.settings.create','user.webhooks.event.test.create']));
    expect(provider.state.mutations).toEqual([]);
    provider.state.scopes=[...provider.scopes,'api_keys.create'];provider.state.maxAllowed=1;
    expect((await json(await prepare(),422)).detail).toContain('no free event webhook slot');expect(provider.state.mutations).toEqual([]);
    provider.state.maxAllowed=2;
    for(const failure of ['failSigning','failReadKey'] as const) {
      provider.state[failure]=true;
      const review=await json(await prepare(),200);expect((await connect(review.proposalId)).status).toBe(422);
      expect(provider.state.webhooks).toEqual([provider.existing]);
      expect(provider.state.mutations.at(-1)?.method).toBe('DELETE');
      provider.state[failure]=false;
      await json(await site.call('/api/settings/sending',{method:'DELETE',cookie:owner}),200);
    }
    await page.context().addCookies([{name:owner.split('=')[0],value:owner.split('=')[1],url:site.runtime.url}]);
    await openPage(page,site.runtime.url+'/app/settings');
    await page.getByLabel('SendGrid API key',{exact:true}).fill(apiKey);
    await page.getByRole('button',{name:'Review SendGrid key',exact:true}).click();
    const panel=page.getByRole('region',{name:'SendGrid',exact:true}),review=panel.getByLabel('Review SendGrid connection');
    await expect(review).toContainText('synthetic-mango-82');await expect(review).toContainText('https://mango.example.test/webhooks/mail/sendgrid');
    await expect(review).toContainText('Signing will be on');await expect(review).toContainText('delivered');await expect(review).toContainText('Broader than Mango needs');
    const before=provider.state.mutations.length;
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
      expect((await new AxeBuilder({page}).include('#sending').analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
      await panel.screenshot({path:info.outputPath(`sending-review-${width}.png`)});
    }
    expect(provider.state.mutations).toHaveLength(before);
    const connected=page.waitForResponse(response=>response.url().endsWith('/api/settings/sending/connect')&&response.request().method()==='POST');
    await page.getByRole('button',{name:'Connect SendGrid',exact:true}).click();
    const connectionResponse=await connected;expect(connectionResponse.status(),await connectionResponse.text()).toBe(200);
    await expect(panel).toContainText('delivery-events-missing');await expect(panel.getByRole('group',{name:'Review SendGrid connection'})).toHaveCount(0);
    const connectedActivity=(await json(await site.call('/api/activity?action=sending-connected&object=sendgrid',{cookie:owner}),200)).entries;
    expect(connectedActivity).toHaveLength(1);
    expect(connectedActivity[0]).toMatchObject({actorType:'operator',operatorId:'go-live-owner',action:'sending-connected',objectType:'integration',objectId:'sendgrid',detail:{provider:'sendgrid',lastFour:apiKey.slice(-4)}});
    expect(connectedActivity[0].occurredAt).toBeGreaterThan(0);
    expect(JSON.stringify(connectedActivity)).not.toContain(apiKey);
    const created=provider.state.webhooks.find(row=>row.id!==provider.existing.id);expect(created).toMatchObject({enabled:true,public_key:signer.publicKey,url:site.origin+'/webhooks/mail/sendgrid',friendly_name:'Mango '+site.origin});
    expect(provider.state.webhooks.find(row=>row.id===provider.existing.id)).toEqual(provider.existing);
    const state=await json(await site.call('/api/settings/sending',{cookie:owner}),200);
    expect(JSON.stringify(state)).not.toContain(apiKey);expect(JSON.stringify(state)).not.toContain(signer.publicKey);
    expect(JSON.stringify(await site.rows('SELECT secret_cipher FROM sending_connection'))).not.toContain(apiKey);
    expect(await page.locator('body').innerText()).not.toContain(apiKey);expect(site.runtime.logs()).not.toContain(apiKey);
    const replay=await json(await prepare(),200),creates=provider.state.mutations.filter(v=>v.method==='POST').length;
    await json(await connect(replay.proposalId),200);expect(provider.state.mutations.filter(v=>v.method==='POST')).toHaveLength(creates);
    expect((await connect(replay.proposalId)).status).toBe(422);
    const email='synthetic-mango-86@example.test';await confirmedContact(site,edge,owner,email,'Synthetic Mango reader');
    await transportReady();
    await site.control('/_golive/sender-evidence');
    const campaign=await draftCampaign(site,owner,'Synthetic Mango connected send',[email],new Date(Date.now()+60000));
    const approval=await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie:owner,body:{revisionId:campaign.revisionId}});
    expect(JSON.stringify(await json(approval,200))).toContain('delivery-events-missing');
    await json(await site.call('/api/settings/woocommerce',{method:'PUT',cookie:owner,body:{url:'https://woo.example.test/',key:'synthetic-mango-1',secret:'synthetic-mango-2',signingSecret:'synthetic-mango-89',exclusiveSecret:true,pluginEnabled:true}}),200);
    const flow=await json(await site.call('/api/flows',{method:'POST',cookie:owner,body:{kind:'woocommerce-abandoned-checkout',name:'Synthetic Mango checkout',tag:'synthetic-mango-checkout'}}),201);
    expect(await json(await site.call(`/api/flows/${flow.id}/activate`,{method:'POST',cookie:owner,body:{revisionId:flow.id}}),409)).toMatchObject({error:'delivery-events-missing'});
    const beforeEvents=await site.count('provider_fact_inbox');
    const unrelated=Buffer.from(JSON.stringify([event('delivered',email,Date.now(),'synthetic-mango-unrelated',{})]));
    expect((await site.call('/webhooks/mail/sendgrid',{method:'POST',raw:unrelated})).status).toBe(401);expect(await site.count('provider_fact_inbox')).toBe(beforeEvents);
    expect(await signedPost(site,'/webhooks/mail/sendgrid',unrelated,signer.headers(unrelated,String(Math.floor(Date.now()/1000)-301)))).toBe(401);expect(await site.count('provider_fact_inbox')).toBe(beforeEvents);
    expect(await signedPost(site,'/webhooks/mail/sendgrid',unrelated,signer.headers(unrelated))).toBe(204);
    expect((await json(await site.call('/api/settings/sending',{cookie:owner}),200)).connection.deliveryEventsVerified).toBe(false);
    await transportReady();
    await json(await site.call('/api/settings/sender/confirmation',{method:'POST',cookie:owner}),202);
    const check=edge.sends.findLast(send=>send.to==='owner@example.test');expect(check).toBeTruthy();
    const delivered=Buffer.from(JSON.stringify([event('delivered',check!.to,Date.now(),check!.messageId,{})]));
    expect(await signedPost(site,'/webhooks/mail/sendgrid',delivered,signer.headers(delivered))).toBe(204);
    expect((await json(await site.call('/api/settings/sending',{cookie:owner}),200)).connection.deliveryEventsVerified).toBe(true);
    await json(await site.call(`/api/flows/${flow.id}/activate`,{method:'POST',cookie:owner,body:{revisionId:flow.id}}),200);
    const allowed=await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie:owner,body:{revisionId:campaign.revisionId}}),200);
    expect(JSON.stringify(allowed)).not.toContain('"kind":"delivery-events-missing","status":"blocked"');
    await openPage(page,site.runtime.url+'/app/settings');await expect(panel).toContainText('Signed delivery events verified.');
    for(const width of [1440,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);expect((await new AxeBuilder({page}).include('#sending').analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);await panel.screenshot({path:info.outputPath(`sending-connected-${width}.png`)});}
    const {id}=await json(await site.call('/api/portability/exports',{method:'POST',cookie:owner,headers:{Origin:site.runtime.url},body:{}}),201);
    let progress;do {progress=await json(await site.call(`/api/portability/exports/${id}/advance`,{method:'POST',cookie:owner,headers:{Origin:site.runtime.url},body:{}}),200);}while(progress.phase!=='complete');
    const archive=await site.call(`/api/portability/exports/${id}/download`,{cookie:owner,headers:{Origin:site.runtime.url}});expect(archive.status).toBe(200);
    const exported=[];for await(const record of readArchive(archive.body!))exported.push(record);
    expect(JSON.stringify(exported)).not.toContain(apiKey);expect(JSON.stringify(exported)).not.toContain(signer.publicKey);
    expect(edge.unexpected).toEqual([]);
  }finally{await site.runtime.close();await edge.close();}
}
