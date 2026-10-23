import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHmac,randomBytes} from 'node:crypto';
import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {openPage} from '../support/navigation';
import {archiveRecords} from '../portability/flows';
import {json,installation,type Installation} from './harness';
import {eventSigner} from './sendgrid-events';
import type {providerEdge} from './edge';

export async function proveReviewLoyalty(site:Installation,owner:string,page:Page,info:TestInfo,edge:Awaited<ReturnType<typeof providerEdge>>) {
  const endpoint='/api/settings/integrations/reviews-loyalty';
  const admin=await site.open('review-admin@example.test','review-admin'),manager=await site.open('review-manager@example.test','review-manager');
  for(const [id,role] of [['review-admin','admin'],['review-manager','manager']])await json(await site.call('/api/operators/'+id+'/role',{method:'PUT',cookie:owner,body:{role}}),200);
  expect((await site.call(endpoint,{cookie:manager})).status).toBe(403);
  expect((await site.call(endpoint+'/judgeme',{method:'PUT',cookie:manager,body:{}})).status).toBe(403);
  const creator=await json(await site.call('/api/settings/integrations',{method:'POST',cookie:owner,body:{name:'Non-subscribed review fixture',scopes:['contacts:write']}}),201);
  const profile=await json(await site.call('/api/integrations/v1/contacts',{method:'PUT',headers:{Authorization:`Bearer ${creator.token}`},body:{email:'review-reader@example.test',segmentName:'Review observations',subscribe:false}}),200);
  const contactId=profile.contact.id,contactsBefore=await site.count('contacts'),consentBefore=await site.count('consent_evidence'),mailBefore=edge.sends.length;
  const secrets={judgeme:'synthetic-judge-'+randomBytes(16).toString('hex'),okendo:'whsec_'+randomBytes(32).toString('base64'),smile:'synthetic-smile-'+randomBytes(16).toString('hex')};
  await page.context().addCookies([{name:owner.split('=')[0],value:owner.split('=')[1],url:site.runtime.url}]);
  await page.setViewportSize({width:1440,height:1000});await openPage(page,site.runtime.url+'/app/settings');
  const panel=page.getByRole('region',{name:'Reviews and loyalty'});
  await expect(panel.getByLabel('Review or loyalty app')).toBeEnabled();
  await panel.getByLabel('Account or store ID').fill('review-store');
  await panel.getByLabel('Review and loyalty signing secret').fill(secrets.judgeme);
  await panel.getByLabel('I have checked that this secret').check();
  await panel.getByRole('button',{name:'Connect app',exact:true}).click();
  await expect(panel.getByRole('status')).toContainText('Connected to review-store');
  await expect(panel.getByLabel('Review and loyalty signing secret')).toHaveValue('');
  for(const [app,cookie,accountId] of [['okendo',admin,'review-subscriber'],['smile',owner,'42']] as const)
    await json(await site.call(endpoint+'/'+app,{method:'PUT',cookie,body:{accountId,secret:secrets[app],exclusiveSecret:true}}),200);
  expect(await json(await site.call(endpoint+'/yotpo',{method:'PUT',cookie:owner,body:{accountId:'unverified',secret:'synthetic-unverified',exclusiveSecret:true}}),409)).toEqual({error:'adapter_signature_protocol_unverified'});
  const clock=await site.control('/_golive/clock');
  const timestamp=String(Math.floor(clock.now/1000)),occurredAt=new Date(clock.now-1000).toISOString();
  const judge={review:{id:'review-one',created_at:occurredAt,reviewer:{email:'review-reader@example.test'},rating:5}};
  const okendo={resourceType:'review',topic:'create',sequenceNumber:'1',resource:{subscriberId:'review-subscriber',reviewId:'okendo-one',dateCreated:occurredAt,reviewer:{email:'review-reader@example.test'},rating:4}};
  const smile={account_id:42,topic:'customer/updated',data:{customer:{id:501,email:'review-reader@example.test',updated_at:occurredAt,points_balance:25,vip_tier:{id:1,name:'Gold'}}}};
  function headers(app:keyof typeof secrets,raw:string,at=timestamp) {
    if(app==='judgeme')return {'Judgeme-Hmac-Sha256':createHmac('sha256',secrets.judgeme).update(raw).digest('hex')};
    if(app==='smile')return {'Smile-Timestamp':at,'Smile-Signature':createHmac('sha256',secrets.smile).update(at+'.'+raw).digest('base64')};
    const id='msg_'+createHmac('sha256','synthetic-edge-message-id').update(raw).digest('hex');
    return {'svix-id':id,'svix-timestamp':at,'svix-signature':'v1,'+createHmac('sha256',Buffer.from(secrets.okendo.slice(6),'base64')).update(id+'.'+at+'.'+raw).digest('base64')};
  }
  const post=(app:string,body:unknown,signed=true,at=timestamp)=>{
    const raw=JSON.stringify(body);return site.call('/webhooks/commerce/engagement/'+app,{method:'POST',raw,headers:{'Content-Type':'application/json',...(signed?headers(app as keyof typeof secrets,raw,at):{})}});
  };
  for(const [app,body] of [['judgeme',judge],['okendo',okendo],['smile',smile]] as const) {
    const unsigned=await post(app,body,false);expect(unsigned.status).toBe(401);expect((await unsigned.json()).error).toMatch(/invalid_adapter_signature|adapter_signature_expired/);
    await json(await post(app,body),200);
    expect(await json(await post(app,body),409)).toEqual({error:'adapter_webhook_replayed'});
  }
  expect(await json(await post('smile',{...smile,account_id:99}),401)).toEqual({error:'adapter_account_mismatch'});
  expect(await json(await post('smile',smile,true,String(Number(timestamp)-301)),401)).toEqual({error:'adapter_signature_expired'});
  const earning={resourceType:'loyalty_earning_transaction',topic:'create',sequenceNumber:'2',resource:{subscriberId:'review-subscriber',loyaltyTransactionId:'earning-one',date:occurredAt,customer:{email:'review-reader@example.test'},status:'complete',amount:50}};
  const tier={resourceType:'loyalty_customer',topic:'update',sequenceNumber:'3',resource:{subscriberId:'review-subscriber',loyaltyCustomerId:'loyalty-one',dateTierEntered:occurredAt,customer:{email:'review-reader@example.test'},vipTierId:'gold',vipTierName:'Gold'}};
  await json(await post('okendo',earning),200);await json(await post('okendo',tier),200);
  const unknown={review:{...judge.review,id:'unknown-one',reviewer:{email:'unmatched-review@example.test'}}};
  const unknownResponses=await Promise.all([post('judgeme',unknown),post('judgeme',unknown)]);
  expect(unknownResponses.map(r=>r.status).sort()).toEqual([200,409]);
  const inventory=await json(await site.call(endpoint,{cookie:owner}),200);
  expect(inventory.apps.find((a:any)=>a.id==='judgeme').connection.unmatchedCount).toBe(1);
  for(const secret of Object.values(secrets))expect(JSON.stringify(inventory)).not.toContain(secret);
  expect(await site.count('contacts')).toBe(contactsBefore);expect(await site.count('consent_evidence')).toBe(consentBefore);expect(edge.sends).toHaveLength(mailBefore);
  const detail=await json(await site.call('/api/contacts/'+contactId,{cookie:owner}),200);
  expect(detail.contact.emailStatus).toBe('non-subscribed');
  const facts=detail.timeline.filter((v:any)=>['review.submitted','loyalty.profile_observed','loyalty.points_earned','loyalty.tier_changed'].includes(v.kind));
  expect(facts).toHaveLength(5);expect(facts.map((v:any)=>v.source)).toEqual(expect.arrayContaining(['judgeme · custom-event','okendo · custom-event','smile · custom-event']));
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/hydration|hydrated.*match/i.test(m.text()))errors.push(m.text());});
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+'/app/settings');
    await expect(panel.getByLabel('Review or loyalty app')).toBeEnabled();
    await expect(panel.getByRole('status')).toContainText('1 unmatched events');
    await expect(panel.getByLabel('Review and loyalty signing secret')).toHaveValue('');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
    await panel.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('review-loyalty-'+width+'.png'),fullPage:true});
    await panel.getByLabel('Review or loyalty app').selectOption('yotpo');await expect(panel).toContainText('connection disabled');expect(await panel.getByRole('button',{name:'Connect app',exact:true}).count()).toBe(0);
  }
  expect(errors).toEqual([]);
  const archive=await archiveRecords({call:(path:string,init:any)=>site.call(path,{...init,headers:{...init.headers,Origin:site.runtime.url}})},owner),rows=archive.filter(r=>r.kind==='part').flatMap(p=>p.items).filter(r=>r.kind==='row');
  expect(rows.some(r=>r.table==='review_loyalty_connections')).toBe(false);expect(rows.filter(r=>r.table==='review_loyalty_receipts')).toHaveLength(6);
  for(const secret of Object.values(secrets))expect(JSON.stringify(archive)).not.toContain(secret);
  expect(JSON.stringify(await site.rows('SELECT * FROM review_loyalty_receipts'))).not.toContain('unmatched-review@example.test');
  const directory=await mkdtemp(join(tmpdir(),'mango-review-restore-'));
  const options={token:site.runtime.token,stateDirectory:join(directory,'state')};
  const signer=eventSigner();
  let restored=await installation(edge,signer,{...options,restore:true});
  try {
    let restoredOwner=await restored.open('restored-reviews@example.test','restored-review-owner');
    const call=(path:string,body:unknown,method='POST')=>restored.call('/api/portability/'+path,{cookie:restoredOwner,method,body,headers:{Origin:restored.runtime.url}});
    const {id}=await json(await call('imports',{confirmed:true,manifest:archive[0]}),201);
    for(const part of archive.filter(r=>r.kind==='part'))await json(await call('imports/'+id+'/parts/'+part.index,part,'PUT'),200);
    await json(await call('imports/'+id+'/finalize',{contentHash:archive.at(-1).contentHash,archiveHash:archive.at(-1).archiveHash,laterJournal:{sourceIdentity:archive[0].sourceIdentity,epoch:archive[0].epoch,journal:archive[0].journal}}),200);
    expect(await restored.count('review_loyalty_receipts')).toBe(6);expect(await restored.count('review_loyalty_connections')).toBe(0);
    expect(await restored.rows("SELECT count(*) n FROM source_records WHERE provider IN ('judgeme','okendo','smile')")).toEqual([{n:5}]);
    expect(await json(await restored.call('/webhooks/commerce/engagement/judgeme',{method:'POST',raw:JSON.stringify(judge),headers:{'Content-Type':'application/json',...headers('judgeme',JSON.stringify(judge))}}),503)).toEqual({error:'restore_in_progress'});
    await restored.runtime.close();restored=await installation(edge,signer,{...options,restore:false});
    restoredOwner=await restored.open('restored-reviews@example.test','restored-review-owner');
    const restoredInventory=await json(await restored.call(endpoint,{cookie:restoredOwner}),200);
    expect(restoredInventory.apps.every((a:any)=>a.connection===null)).toBe(true);
    expect(await json(await restored.call('/webhooks/commerce/engagement/judgeme',{method:'POST',raw:JSON.stringify(judge),headers:{'Content-Type':'application/json',...headers('judgeme',JSON.stringify(judge))}}),409)).toEqual({error:'adapter_not_connected'});
  } finally {await restored.runtime.close();await rm(directory,{recursive:true,force:true});}

  let {receipt}=await json(await site.call('/api/contacts/'+contactId,{method:'DELETE',cookie:owner}),202);
  while(receipt.state==='pending') {
    const response=await site.call('/api/audience/erasures/'+receipt.reference+'/resume',{method:'POST',cookie:owner,body:{}});
    const result=await response.json();
    expect(response.status).toBe(result.receipt.state==='pending'?202:200);
    receipt=result.receipt;
  }
  expect(receipt.state).toBe('complete');
  expect(await site.rows(`SELECT count(*) n FROM source_records WHERE contact_id='${contactId}'`)).toEqual([{n:0}]);
  expect(await json(await post('judgeme',judge),409)).toEqual({error:'adapter_webhook_replayed'});
  // Reconnection rotates authority without reopening an old provider fact.
  await json(await site.call(endpoint+'/judgeme',{method:'PUT',cookie:owner,body:{accountId:'review-store',secret:secrets.judgeme,exclusiveSecret:true}}),200);
  expect(await json(await post('judgeme',judge),409)).toEqual({error:'adapter_webhook_replayed'});
  await json(await site.call(endpoint+'/smile',{method:'DELETE',cookie:admin}),200);
  expect(await json(await post('smile',smile),409)).toEqual({error:'adapter_not_connected'});
}
