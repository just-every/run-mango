import {expect,test} from '@playwright/test';
import {native} from './native';
import {createApp} from '../../src/core/app/app';
import {requests} from '../audience-controls/runtime';
import {identityDoors} from './identity-doors';

test('[CONT-003][CONT-004][CONT-009][FORM-001][FORM-007] public signup confirms once, resists duplicate capture and scanners, and never reverses a later opt-out',async()=>{
  test.setTimeout(90000);
  const h=await native();
  try {
    const f=h.f,app=createApp(f.bindings,f.platform,undefined,true),origin=f.platform.config.publicBaseUrl.origin;
    const call=(path:string,body?:unknown,method=body===undefined?'GET':'POST')=>app.fetch(new Request(origin+path,{method,headers:{'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.44'},...(body===undefined?{}:{body:JSON.stringify(body)})}),f.bindings);
    const info=await call('/subscribe/info');
    expect(info.status).toBe(200);
    const {disclosure}=await info.json() as {disclosure:string};
    const signup=(email:string,extra={})=>call('/subscribe',{email,consent:true,disclosure,...extra});
    const email=['synthetic-mango-55','example.test'].join('@');
    const mixedCase=['Synthetic-Mango-55','Example.Test'].join('@');
    expect((await signup('bot@example.test',{website:'spam'})).status).toBe(202);expect(f.outbound).toHaveLength(0);
    expect((await signup('stale@example.test',{disclosure:'stale-disclosure'})).status).toBe(409);
    for(const malformed of ['   ',['synthetic mango 55','example.test'].join('@'),['synthetic-mango-55','example'].join('@')]) {
      const refused=await signup(malformed);
      expect(refused.status).toBe(400);
      expect(await refused.json()).toMatchObject({error:'invalid_signup',fields:{email:expect.any(Array)}});
    }
    const noConsent=await signup(email,{consent:false});
    expect(noConsent.status).toBe(400);
    expect(await noConsent.json()).toMatchObject({error:'invalid_signup'});
    for(const table of ['contacts','contact_email_addresses','consent_evidence','consent_confirmations']) {
      expect((await f.db.prepare(`SELECT * FROM ${table}`).all()).results).toEqual([]);
    }
    expect(f.outbound).toHaveLength(0);
    const results=await Promise.all([signup(` \t${mixedCase}\r\n`),signup(mixedCase)]);
    expect(results.every(response=>response.status===202)).toBe(true);expect(f.outbound).toHaveLength(1);
    expect((await signup(email)).status).toBe(202);
    const contacts=(await f.db.prepare('SELECT id,email,email_status FROM contacts').all()).results;
    expect(contacts).toEqual([{id:expect.any(String),email,email_status:'pending'}]);
    const contactId=contacts[0].id as string;
    expect((await f.db.prepare('SELECT contact_id,email,channel_status FROM contact_email_addresses').all()).results)
      .toEqual([{contact_id:contactId,email,channel_status:'pending'}]);
    expect((await f.db.prepare('SELECT contact_id,destination FROM consent_evidence').all()).results)
      .toEqual([{contact_id:contactId,destination:email}]);
    expect((await f.db.prepare('SELECT contact_id,confirmed_at FROM consent_confirmations').all()).results)
      .toEqual([{contact_id:contactId,confirmed_at:null}]);
    expect(f.outbound).toHaveLength(1);
    expect(f.outbound[0].to).toEqual([email]);
    const api=await requests(f);
    expect((await api.call(`/api/contacts/${contactId}`,undefined,'GET',false)).status).toBe(401);
    const readIdentity=async(status:string)=>{
      const found=await api.json(`/api/contacts/search?address=${encodeURIComponent(mixedCase)}`);
      expect(found.contacts).toEqual([expect.objectContaining({id:contactId,email,emailStatus:status})]);
      const detail=await api.json(`/api/contacts/${contactId}`);
      expect(detail.contact).toMatchObject({id:contactId,email,emailStatus:status});
      expect(detail.emails).toEqual([expect.objectContaining({contactId,email,channelStatus:status})]);
    };
    await readIdentity('pending');
    expect(await f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'pending'});
    const link=new URL(f.outbound[0].text.match(/https:\/\/\S+/)![0]);
    expect((await call(link.pathname)).status).toBe(200);
    expect((await call(link.pathname,undefined,'HEAD')).status).toBe(200);
    expect(await f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'pending'});
    expect((await call(link.pathname,{confirm:true})).status).toBe(200);
    expect(await f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'subscribed'});
    await readIdentity('subscribed');
    expect(await f.db.prepare('SELECT capture_method,capture_source,confirmed_at FROM consent_evidence').first()).toMatchObject({capture_method:'hosted-signup-form',capture_source:origin+'/subscribe',confirmed_at:expect.any(Number)});
    expect((await call(link.pathname,{confirm:true})).status).toBe(410);
    const contact=await f.db.prepare('SELECT id FROM contacts').first<{id:string}>();
    const unsubscribe=await f.services.audienceService.issueUnsubscribeToken(contact!.id,'email');
    const target='/unsubscribe/'+unsubscribe.token;
    // Use the public unsubscribe link produced by the product, including its
    // affirmative POST; GET alone cannot unsubscribe a mailbox scanner.
    expect((await call(target)).status).toBe(200);
    expect((await app.fetch(new Request(origin+target,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'}),f.bindings)).status).toBe(200);
    expect(await f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'unsubscribed'});
    await readIdentity('unsubscribed');
    expect((await call(link.pathname)).status).toBe(410);
    expect(await f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'unsubscribed'});
    expect(f.outbound).toHaveLength(1);
    for(const table of ['campaigns','campaign_approval_requests','recipient_steps']) {
      expect((await f.db.prepare(`SELECT * FROM ${table}`).all()).results).toEqual([]);
    }
    expect(f.jobs).toEqual([]);
    await identityDoors(h,api,{id:contactId,email});
  } finally {await h.close();}
});
