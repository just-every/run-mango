import {expect,test} from '@playwright/test';
import {native} from './native';
import {createApp} from '../../src/core/app/app';
import {signupDescription} from '../../src/core/features/audience/signup-routes';

test('[CONT-003][CONT-004][CONT-009][FORM-001][FORM-007] public signup confirms once, resists duplicate capture and scanners, and never reverses a later opt-out',async()=>{
  const h=await native();
  try {
    const f=h.f,app=createApp(f.bindings,f.platform,undefined,true),origin=f.platform.config.publicBaseUrl.origin;
    const call=(path:string,body?:unknown,method=body===undefined?'GET':'POST')=>app.fetch(new Request(origin+path,{method,headers:{'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.44'},...(body===undefined?{}:{body:JSON.stringify(body)})}),f.bindings);
    const disclosure=signupDescription(f.platform).disclosure;
    const signup=(email:string,extra={})=>call('/subscribe',{email,consent:true,disclosure,...extra});
    expect((await signup('bot@example.test',{website:'spam'})).status).toBe(202);expect(f.outbound).toHaveLength(0);
    expect((await signup('stale@example.test',{disclosure:'stale-disclosure'})).status).toBe(409);
    const results=await Promise.all([signup('reader@example.test'),signup('reader@example.test')]);
    expect(results.every(response=>response.status===202)).toBe(true);expect(f.outbound).toHaveLength(1);
    expect(await f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'pending'});
    const link=new URL(f.outbound[0].text.match(/https:\/\/\S+/)![0]);
    expect((await call(link.pathname)).status).toBe(200);
    expect((await call(link.pathname,undefined,'HEAD')).status).toBe(200);
    expect(await f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'pending'});
    expect((await call(link.pathname,{confirm:true})).status).toBe(200);
    expect(await f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'subscribed'});
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
    expect((await call(link.pathname)).status).toBe(410);
    expect(await f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'unsubscribed'});
    expect(f.outbound).toHaveLength(1);
  } finally {await h.close();}
});
