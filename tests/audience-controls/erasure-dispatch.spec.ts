import {test,expect} from '@playwright/test';
import {runtime,importContacts,createCampaign,rule} from './runtime';
import {consumeLifecycleQueue} from '../../src/core/features/lifecycle';

test('CONT-013 erasure invalidates a real approval, excludes queued dispatch and keeps later sync and signup opted out',async()=>{
 test.setTimeout(180000);const h=await runtime();
 const queue=async(kind:string,payload:Record<string,unknown>)=>{
  let ack=0,retry=0;await consumeLifecycleQueue({messages:[{body:{kind,idempotencyKey:crypto.randomUUID(),payload},ack(){ack++},retry(){retry++}}]} as any,h.f.services.lifecycleRuntime);expect({ack,retry}).toEqual({ack:1,retry:0});
 };
 const erase=async(id:string)=>{let {receipt}=await h.json(`/api/contacts/${id}`,undefined,'DELETE');while(receipt.state==='pending')({receipt}=await h.json(`/api/audience/erasures/${receipt.reference}/resume`,{}));return receipt;};
 try {
  await h.f.prove();const [contact,survivor]=await importContacts(h,['subscribed','subscribed'],'erasure-approved');
  const campaign=await createCampaign(h,rule(),`Private recipient campaign for ${contact.email}`);
  await h.json(`/api/campaigns/${campaign.campaignId}/approve`,{revisionId:campaign.revisionId,idempotencyKey:'erasure-genuine-approval'});
  const before=await h.f.db.prepare('SELECT content_digest,approved_at,approved_by_operator_id FROM campaign_revisions WHERE id=?').bind(campaign.revisionId).first<any>();
  const recipient=await h.f.db.prepare('SELECT id,step_id FROM recipient_steps WHERE revision_id=? AND contact_id=?').bind(campaign.revisionId,contact.id).first<any>();expect(recipient).toBeTruthy();
  const sent=h.f.outbound.length;expect((await erase(contact.id)).retainedChannels).toEqual([]);
  expect(await h.f.db.prepare('SELECT content_digest,approved_at,approved_by_operator_id,state FROM campaign_revisions WHERE id=?').bind(campaign.revisionId).first()).toEqual({...before,state:'erasure-invalidated'});
  await queue('campaign.dispatch',{...campaign,stepId:recipient.step_id,channel:'email'});
  expect(h.f.outbound.length).toBe(sent);expect(await h.f.db.prepare('SELECT transport_disposition,destination FROM recipient_steps WHERE id=?').bind(recipient.id).first()).toEqual({transport_disposition:'skipped',destination:''});
  expect(await h.f.db.prepare('SELECT transport_disposition,destination FROM recipient_steps WHERE revision_id=? AND contact_id=?').bind(campaign.revisionId,survivor.id).first()).toEqual({transport_disposition:'skipped',destination:survivor.email});
  expect((await h.call(`/api/campaigns/${campaign.campaignId}/approve`,{revisionId:campaign.revisionId,idempotencyKey:'erasure-reapprove-old'})).status).toBe(409);
  const [optout]=await importContacts(h,['unsubscribed'],'erasure-optout');await erase(optout.id);
  const info=await h.json('/subscribe/info');expect((await h.call('/subscribe',{email:optout.email,consent:true,disclosure:info.disclosure})).status).toBe(202);
  expect(await h.f.db.prepare('SELECT email_status FROM contacts WHERE email=?').bind(optout.email).first()).toEqual({email_status:'unsubscribed'});expect(h.f.outbound.length).toBe(sent);
  const recaptured=await h.f.db.prepare('SELECT id FROM contacts WHERE email=?').bind(optout.email).first<any>();await erase(recaptured.id);
  h.f.customers.push({id:`gid://shopify/Customer/${h.f.customers.length+1}`,email:optout.email,phone:null,firstName:'Later source name',lastName:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),defaultAddress:null,emailMarketingConsent:null,smsMarketingConsent:null});
  await queue('source.sync',{sourceType:'customer',provider:'shopify'});
  expect(await h.f.db.prepare('SELECT email_status FROM contacts WHERE email=?').bind(optout.email).first()).toEqual({email_status:'unsubscribed'});
  const audience=await h.json('/api/campaign-authoring/audience',{inclusionRuleJson:rule('email',optout.email,'eq'),exclusionRulesJson:'[]',channels:['email']});expect(audience.eligibleCount).toBe(0);expect(h.f.outbound.length).toBe(sent);
 }finally{await h.dispose();}
});

test('CONT-013 a provider response already in flight cannot restore erased outbound data',async()=>{
 test.setTimeout(180000);const h=await runtime();let release:()=>void=()=>{},dispatch:Promise<void>|undefined;
 try {
  await h.f.prove();const [contact]=await importContacts(h,['subscribed'],'erasure-inflight');const campaign=await createCampaign(h,rule('email',contact.email,'eq'));
  await h.json(`/api/campaigns/${campaign.campaignId}/approve`,{revisionId:campaign.revisionId,idempotencyKey:'erasure-inflight-approval'});
  const recipient=await h.f.db.prepare('SELECT id,step_id FROM recipient_steps WHERE revision_id=?').bind(campaign.revisionId).first<any>();
  const transport=globalThis.fetch;let reached:()=>void=()=>{};const arrived=new Promise<void>(resolve=>{reached=resolve}),hold=new Promise<void>(resolve=>{release=resolve});
  globalThis.fetch=async(input,options)=>{
   if(String(input)==='https://api.resend.com/emails'&&options?.method==='POST'&&JSON.parse(String(options.body)).to.includes(contact.email)){reached();await hold;}
   return transport(input,options);
  };
  let ack=0,retry=0;const command={kind:'campaign.dispatch',idempotencyKey:'erasure-held-handoff',payload:{...campaign,stepId:recipient.step_id,channel:'email'}};
  dispatch=consumeLifecycleQueue({messages:[{body:command,ack(){ack++},retry(){retry++}}]} as any,h.f.services.lifecycleRuntime);
  await arrived;
  let {receipt}=await h.json(`/api/contacts/${contact.id}`,undefined,'DELETE');while(receipt.state==='pending')({receipt}=await h.json(`/api/audience/erasures/${receipt.reference}/resume`,{}));
  release();await dispatch;globalThis.fetch=transport;expect({ack,retry}).toEqual({ack:0,retry:1});
  // The one network handoff was authorised before deletion. Its later response
  // cannot reattach an address, payload, provider ID or delivery fact locally.
  expect(await h.f.db.prepare('SELECT destination,outbound_request_json,provider_message_id FROM recipient_steps WHERE id=?').bind(recipient.id).first()).toEqual({destination:'',outbound_request_json:null,provider_message_id:null});
  expect((await h.f.db.prepare('SELECT count(*) AS n FROM delivery_facts WHERE recipient_step_id=?').bind(recipient.id).first<any>()).n).toBe(0);
  const sent=h.f.outbound.length;await consumeLifecycleQueue({messages:[{body:command,ack(){ack++},retry(){retry++}}]} as any,h.f.services.lifecycleRuntime);expect(h.f.outbound.length).toBe(sent);
 }finally{release();await dispatch?.catch(()=>{});await h.dispose();}
});
