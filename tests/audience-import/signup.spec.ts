import {test,expect} from '@playwright/test';
import {native} from './native';
import {createSignupRoutes,signupDescription} from '../../src/core/features/audience/signup-routes';
function client(h:Awaited<ReturnType<typeof native>>){const app=createSignupRoutes(h.f.services.audienceService,h.f.platform,h.f.db);return(body:unknown,ip='192.0.2.44')=>app.request('https://mango.example.test/subscribe',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':ip},body:JSON.stringify({...{disclosure:signupDescription(h.f.platform).disclosure},...(body as object)})});}
test('CONT-003/009 public signup remains pending until single-use expiring confirmation and records source time method IP',async()=>{
 const h=await native();try{
  const call=client(h);const start=Date.now();expect((await call({email:'new@example.test',displayName:'New person',consent:true})).status).toBe(202);expect(h.f.outbound).toHaveLength(1);
  const row=await h.f.db.prepare('SELECT email_status FROM contacts').first();expect(row).toEqual({email_status:'pending'});
  const evidence=await h.f.db.prepare('SELECT e.*,m.capture_ip FROM consent_evidence e JOIN consent_capture_metadata m ON m.id=e.id').first();expect(Number(evidence?.occurred_at)).toBeGreaterThanOrEqual(start);expect(evidence).toMatchObject({capture_source:'https://mango.example.test/subscribe',capture_method:'hosted-signup-form',capture_ip:'192.0.2.44',confirmed_at:null});
  const token=new URL(h.f.outbound[0].text.match(/https:\/\/\S+/)[0]).pathname.split('/').at(-1)!;
  expect((await h.f.services.audienceService.confirmConsent(token,new Date(),'192.0.2.45')).kind).toBe('confirmed');
  expect((await h.f.services.audienceService.confirmConsent(token)).kind).toBe('already-confirmed');
  expect(await h.f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'subscribed'});
  expect(await h.f.db.prepare('SELECT confirmation_ip FROM consent_capture_metadata').first()).toEqual({confirmation_ip:'192.0.2.45'});
  expect((await call({email:'expired@example.test',consent:true},'192.0.2.46')).status).toBe(202);
  const expired=new URL(h.f.outbound[1].text.match(/https:\/\/\S+/)[0]).pathname.split('/').at(-1)!;
  expect((await h.f.services.audienceService.confirmConsent(expired,new Date(Date.now()+31*86400000))).kind).toBe('invalid');
  expect(await h.f.db.prepare("SELECT email_status FROM contacts WHERE email='expired@example.test'").first()).toEqual({email_status:'pending'});
 }finally{await h.close();}
});
test('CONT-009 durable signup limits, body bounds, honeypot and concurrent destination claim prevent extra provider calls',async()=>{
 const h=await native();try{
  const call=client(h);
  expect((await call({email:'bot@example.test',consent:true,website:'spam'})).status).toBe(202);expect(h.f.outbound).toHaveLength(0);
  expect((await call({email:'bad',consent:false})).status).toBe(400);expect((await call({email:'large@example.test',consent:true,displayName:'x'.repeat(9000)})).status).toBe(400);
  const results=await Promise.all(Array.from({length:8},(_,i)=>call({email:'race@example.test',consent:true},`192.0.2.${100+i}`)));expect(results.every(response=>[202,429].includes(response.status))).toBeTruthy();expect(h.f.outbound).toHaveLength(1);
  for(let index=0;index<3;index++)await call({email:'x@example.test',consent:false});expect((await call({email:'rate@example.test',consent:true})).status).toBe(429);
  expect(h.f.outbound).toHaveLength(1);
 }finally{await h.close();}
});
test('CONT-004/006/009 later optout blocks confirmation and uncertain confirmation delivery is never automatically repeated',async()=>{
 const h=await native();try{
  const call=client(h);await call({email:'optout@example.test',consent:true});const token=new URL(h.f.outbound[0].text.match(/https:\/\/\S+/)[0]).pathname.split('/').at(-1)!;
  const contact=await h.f.db.prepare('SELECT id FROM contacts').first<{id:string}>();const unsubscribe=await h.f.services.audienceService.issueUnsubscribeToken(contact!.id,'email');await h.f.services.audienceService.unsubscribeWithToken(unsubscribe.token);
  expect((await h.f.services.audienceService.confirmConsent(token)).kind).toBe('blocked-by-later-opt-out');expect(await h.f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'unsubscribed'});
  let attempts=0;h.f.platform.mailer.send=async()=>{attempts++;return{disposition:'handoff-unknown',providerMessageId:'uncertain'};};
  expect((await call({email:'uncertain@example.test',consent:true},'192.0.2.66')).status).toBe(503);expect((await call({email:'uncertain@example.test',consent:true},'192.0.2.67')).status).toBe(503);expect(attempts).toBe(1);
  h.f.platform.mailer.send=async()=>{throw new Error('SECRET-provider-body-and-sql');};const failure=await call({email:'private-error@example.test',consent:true},'192.0.2.68');expect(failure.status).toBe(503);expect(await failure.text()).not.toContain('SECRET');
 }finally{await h.close();}
});
test('CONT-009 public confirmation replay is used, private and cannot claim a later unsubscribe was reversed',async()=>{
 const h=await native();try{
  const {createAudiencePublicRoutes}=await import('../../src/core/features/audience/public-routes');const app=createAudiencePublicRoutes(h.f.services.audienceService);
  await client(h)({email:'once@example.test',consent:true});const url=h.f.outbound[0].text.match(/https:\/\/\S+/)[0];const landing=await app.request(url);expect(landing.status).toBe(200);expect(await landing.text()).toContain('Confirm subscription');const response=await app.request(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'});expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  const contact=await h.f.db.prepare('SELECT id FROM contacts').first<{id:string}>();const unsubscribe=await h.f.services.audienceService.issueUnsubscribeToken(contact!.id,'email');await h.f.services.audienceService.unsubscribeWithToken(unsubscribe.token);
  expect((await app.request(url)).status).toBe(410);expect(await h.f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'unsubscribed'});
 }finally{await h.close();}
});
test('CONT-003 a stale or missing rendered disclosure cannot capture changed sender consent',async()=>{
 const h=await native();try{
  const old=signupDescription(h.f.platform).disclosure;h.f.platform.config.mailSender.displayName='Changed newsletter';const call=client(h);
  expect((await call({email:'stale@example.test',consent:true,disclosure:old})).status).toBe(409);
  expect((await call({email:'missing@example.test',consent:true,disclosure:undefined})).status).toBe(409);
  expect(h.f.outbound).toHaveLength(0);expect(await h.f.db.prepare('SELECT count(*) AS count FROM consent_evidence').first()).toEqual({count:0});
 }finally{await h.close();}
});
