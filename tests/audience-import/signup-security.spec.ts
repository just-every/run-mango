import {eraseFixture} from './erase';
import { test, expect } from '@playwright/test';
import { native } from './native';
import { createSignupRoutes, signupDescription } from '../../src/core/features/audience/signup-routes';
import { createAudiencePublicRoutes } from '../../src/core/features/audience/public-routes';

// Each case boots a native Worker and exercises the complete admission path.
test.describe.configure({ timeout: 120000 });

function client(f: Awaited<ReturnType<typeof native>>['f']) {
 const app = createSignupRoutes(f.services.audienceService, f.platform, f.db);
 return (email: string, ip = '192.0.2.44', extra: object = {}) => app.request('https://mango.example.test/subscribe', {method:'POST', headers:{'Content-Type':'application/json','CF-Connecting-IP':ip}, body:JSON.stringify({email,consent:true,disclosure:signupDescription(f.platform).disclosure,...extra})});
}
async function snapshot(db:D1Database) {
 return Promise.all(['contacts','consent_evidence','consent_confirmations','consent_capture_metadata','contact_history','audience_signup_requests','oa_limits'].map(table=>db.prepare(`SELECT * FROM ${table} ${table==='oa_limits'?"WHERE key NOT LIKE 'signup-challenge:%' AND key NOT LIKE 'signup-refused:%'":''} ORDER BY 1`).all().then(result=>result.results)));
}
function confirmationUrl(f:Awaited<ReturnType<typeof native>>['f']) { return f.outbound.at(-1)!.text.match(/https:\/\/\S+/)[0]; }

test('security: confirmation scanner GET and HEAD write nothing; affirmative POST alone consumes token',async()=>{
 const h=await native();try {
  await client(h.f)('scanner@example.test'); const url=confirmationUrl(h.f);const app=createAudiencePublicRoutes(h.f.services.audienceService); const before=await snapshot(h.f.db);
  const get=await app.request(url);expect(get.status).toBe(200);expect(await get.text()).toContain('method="post"');
  expect((await app.request(url,{method:'HEAD'})).status).toBe(200);expect(await snapshot(h.f.db)).toEqual(before);
  expect((await app.request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status).toBe(400);expect(await snapshot(h.f.db)).toEqual(before);
  const posted=await app.request(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'});expect(posted.status).toBe(200);
  expect(await h.f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'subscribed'});
  expect((await app.request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"confirm":true}'})).status).toBe(410);
 }finally{await h.close();}
});
test('security: public capture preserves subscribed, suppressed and erased-optout states without mail or evidence',async()=>{
 for(const state of ['subscribed','suppressed','erased-optout'])await test.step(`public capture preserves ${state}`,async()=>{
 const h=await native();try{
  const call=client(h.f);await call('existing@example.test');const token=confirmationUrl(h.f).split('/').at(-1)!;await h.f.services.audienceService.confirmConsent(token);
  const contact=await h.f.db.prepare('SELECT id FROM contacts').first<{id:string}>();
  if(state==='erased-optout'){const action=await h.f.services.audienceService.issueUnsubscribeToken(contact!.id,'email');await h.f.services.audienceService.unsubscribeWithToken(action.token);}
  if(state==='suppressed')await h.f.services.audienceService.recordBounce({providerEventId:'hard-bounce',destination:'existing@example.test',kind:'hard',occurredAt:new Date()});
  if(state==='erased-optout'){
    await call('synthetic-mango-bot@example.test','192.0.2.44',{website:'robot'});
    expect((await h.f.db.prepare("SELECT count(*) AS n FROM oa_limits WHERE key LIKE 'signup-refused:%'").first())!.n).toBeGreaterThan(0);
    await eraseFixture(h.f,contact!.id);
    // Legacy erasure discarded the reason: upgrading must never guess it was safe.
    await h.f.db.prepare("UPDATE surviving_opt_outs SET reason='erasure-opt-out'").run();
    expect((await h.f.db.prepare("SELECT count(*) AS n FROM oa_limits WHERE key LIKE 'signup-refused:%'").first())!.n).toBe(0);
  }
  const before=await snapshot(h.f.db);const sent=h.f.outbound.length;
  expect((await call('existing@example.test','192.0.2.45')).status).toBe(202);expect(h.f.outbound).toHaveLength(sent);
  const after=await snapshot(h.f.db);
  if(state==='erased-optout'){expect(after[0]).toHaveLength(0);expect(after.slice(0,6)).toEqual(before.slice(0,6));}
  else {expect(after.slice(0,4)).toEqual(before.slice(0,4));expect(after[5]).toEqual(before[5]);
    if(state==='suppressed'){expect(after[4]).toHaveLength(before[4].length+1);expect(after[4]).toContainEqual(expect.objectContaining({kind:'resubscribe-refused'}));}
    else expect(after[4]).toEqual(before[4]);}
 }finally{await h.close();}
 });
});
test('security: IPv6 equivalent addresses and interface rotation share a /64 budget; invalid IP fails closed',async()=>{
 const h=await native();try{
  const call=client(h.f);for(let i=0;i<30;i++)expect((await call(`v6-${i}@example.test`,`2001:db8:1:2::${i+1}`)).status).toBe(202);
  expect((await call('v6-block@example.test','2001:0db8:0001:0002:ffff:0:0:1')).status).toBe(429);
  for(const ip of ['invalid','999.1.2.3','2001:db8::1%eth0','192.0.2.1, 192.0.2.2'])expect((await call('invalid@example.test',ip)).status).toBe(400);
 }finally{await h.close();}
});
test('security: durable global allowance advances monotonically, reserves its last slot atomically and survives restart',async()=>{
 const h=await native();try{
  await test.step('durable allowance never resets from a late older request',async()=>{
 const {takeSignupAllowance}=await import('../../src/core/features/audience/signup-security');
  expect(await takeSignupAllowance(h.f.db,'window-race',10,1)).toBe(true);expect(await takeSignupAllowance(h.f.db,'window-race',10,1)).toBe(false);
  expect(await takeSignupAllowance(h.f.db,'window-race',11,1)).toBe(true);expect(await takeSignupAllowance(h.f.db,'window-race',10,1)).toBe(false);expect(await takeSignupAllowance(h.f.db,'window-race',11,1)).toBe(false);
  expect(await h.f.db.prepare("SELECT window,count FROM oa_limits WHERE key='window-race'").first()).toEqual({window:11,count:1});

  });
  await h.f.db.prepare('INSERT INTO oa_limits(key,window,count) VALUES(?,?,?)').bind('signup-global',Math.floor(Date.now()/3600000),999).run();
  const results=await Promise.all(Array.from({length:6},(_,i)=>client(h.f)(`global-${i}@example.test`,`192.0.2.${60+i}`)));
  expect(results.filter(r=>r.status===202)).toHaveLength(1);for(const response of results.filter(r=>r.status===429)){expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);expect(await response.json()).toMatchObject({error:'rate_limited'});}expect(h.f.outbound).toHaveLength(1);expect(await h.f.db.prepare("SELECT count FROM oa_limits WHERE key='signup-global'").first()).toEqual({count:1000});
  const restarted=await h.restart();expect((await client(restarted)('restart@example.test','198.51.100.1')).status).toBe(429);expect(restarted.outbound).toHaveLength(0);
  for(const [email,kind] of [['hard@example.test','hard'],['complaint@example.test','complaint']] as const){await restarted.services.audienceService.recordBounce({destination:email,kind,occurredAt:new Date(),providerEventId:`test-exhausted-${kind}`});const response=await client(restarted)(email,'198.51.100.2');expect(response.status).toBe(429);expect(await response.json()).toMatchObject({error:'rate_limited'});}expect(restarted.outbound).toHaveLength(0);
 }finally{await h.close();}
});
test('security: sender and Turnstile preflight fail closed before contact storage; valid challenge is single use',async()=>{
 const h=await native();try{
  const originalIdentity={...h.f.platform.config.mailSender};
  await test.step('sender preflight refuses each missing field without storage',async()=>{const identity={...h.f.platform.config.mailSender};for(const field of ['displayName','fromEmail','replyToEmail','physicalAddress'] as const){Object.assign(h.f.platform.config.mailSender,identity,{[field]:''});const before=await snapshot(h.f.db);expect((await client(h.f)('no-identity@example.test')).status).toBe(503);expect(await snapshot(h.f.db)).toEqual(before);}expect(h.f.outbound).toHaveLength(0);});
  Object.assign(h.f.platform.config.mailSender,originalIdentity);
  Object.assign(h.f.platform.config,{signupTurnstile:{siteKey:'test-site',secretKey:'test-secret'}});const call=client(h.f);const before=await snapshot(h.f.db);
  expect((await call('missing@example.test')).status).toBe(400);expect(await snapshot(h.f.db)).toEqual(before);
  const original=globalThis.fetch;
  try{for(const reply of [{success:false},{success:true,action:'other',hostname:'mango.example.test'},{success:true,action:'newsletter-signup',hostname:'evil.example.test'},null]){
   globalThis.fetch=async (input,init)=>new URL(input instanceof Request ? input.url : String(input)).hostname === 'challenges.cloudflare.com' ? reply===null ? Promise.reject(new Error('unavailable')) : Response.json(reply) : original(input,init);
   expect((await call('bad@example.test','192.0.2.45',{'cf-turnstile-response':crypto.randomUUID()})).status).toBe(400);expect(await snapshot(h.f.db)).toEqual(before);
  }
  globalThis.fetch=async(input,init)=>{if(new URL(input instanceof Request ? input.url : String(input)).hostname !== 'challenges.cloudflare.com')return original(input,init);const form=new URLSearchParams(await new Request(input,init).text());expect(form.get('secret')).toBe('test-secret');expect(['good-token','expired-token']).toContain(form.get('response'));return Response.json({success:true,challenge_ts:new Date(Date.now()-(form.get('response')==='expired-token'?301000:0)).toISOString(),action:'newsletter-signup',hostname:'mango.example.test'});};
  expect((await call('valid@example.test','192.0.2.46',{'cf-turnstile-response':'good-token'})).status).toBe(202);expect(h.f.outbound).toHaveLength(1);
  expect((await call('expired@example.test','192.0.2.46',{'cf-turnstile-response':'expired-token'})).status).toBe(400);
  expect((await call('reused@example.test','192.0.2.46',{'cf-turnstile-response':'good-token'})).status).toBe(400);expect(h.f.outbound).toHaveLength(1);
  }finally{globalThis.fetch=original;}
 }finally{await h.close();}
});

test('security: IPv4 mapped IPv6 shares the IPv4 budget',async()=>{
 const h=await native();try{const call=client(h.f);for(let i=0;i<30;i++)expect((await call(`mapped-${i}@example.test`,'192.0.2.44')).status).toBe(202);expect((await call('mapped-block@example.test','::ffff:c000:22c')).status).toBe(429);expect((await call('mapped-block2@example.test','::ffff:192.0.2.44')).status).toBe(429);}finally{await h.close();}
});

test('security: production rejects one-sided Turnstile and publishes only the public widget key and action',async()=>{
 const {readProductionConfig}=await import('../../src/core/platform/config');
 const env={SESSION_SIGNING_KEY:'test-signing-key-at-least-32-characters',INITIAL_OPERATOR_EMAILS:'operator@example.test',CONTACT_HASH_SALT:'test-salt',MAIL_PROVIDER: 'resend', MAIL_PROVIDER_API_KEY:'test-key',MAIL_AUTH_FROM:'sender@example.test',MAIL_WEBHOOK_SECRET:'test-webhook',MAIL_WEBHOOK_ID:'test-hook',MANGO_PUBLIC_BASE_URL:'https://mango.example.test',MANGO_APP_VERSION:'test',MANGO_ALLOWED_LINK_HOSTS:'example.test',MANGO_TEST_EMAIL_ALLOWLIST:'receiver@example.test',MANGO_RECONCILIATION_INTERVAL_MINUTES:'15',MANGO_UNRESOLVED_OUTCOME_HOURS:'1',MANGO_EMAIL_HANDOFFS_PER_MINUTE:'10',MANGO_DELIVERABILITY_WINDOW_DAYS:'30'};
 const parse=(extra:object)=>readProductionConfig({...env,...extra} as Parameters<typeof readProductionConfig>[0]);
 expect(()=>parse({TURNSTILE_SITE_KEY:'site'})).toThrow(/Turnstile/);expect(()=>parse({TURNSTILE_SECRET_KEY:'secret'})).toThrow(/Turnstile/);
 expect(parse({})).not.toHaveProperty('signupTurnstile');
 const configured=parse({TURNSTILE_SITE_KEY:'site',TURNSTILE_SECRET_KEY:'secret'});expect(configured).toHaveProperty('signupTurnstile',{siteKey:'site',secretKey:'secret'});
 const h=await native();try{Object.assign(h.f.platform.config,{signupTurnstile:{siteKey:'site',secretKey:'secret'}});expect(signupDescription(h.f.platform)).toHaveProperty('turnstileSiteKey','site');expect(JSON.stringify(signupDescription(h.f.platform))).not.toContain('secret');}finally{await h.close();}
 await test.step('hosted form exposes only the public widget key and action',async()=>{
 const {createRequire}=await import('node:module');const {resolve}=await import('node:path');const require=createRequire(import.meta.url);
 const {build}=createRequire(require.resolve('wrangler'))('esbuild');
 const result=await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {SubscribePage} from './src/core/features/audience/ui/subscribe-page';export function render(info){return renderToStaticMarkup(<SubscribePage info={info}/>);}`,resolveDir:process.cwd(),sourcefile:'signup-render.tsx',loader:'tsx'},bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',alias:{'@':resolve('src')}});
 const compiled={exports:{} as {render:(info:object)=>string}};new Function('require','module','exports',result.outputFiles[0].text)(require,compiled,compiled.exports);
 const info={sender:'Newsletter',consentText:'I agree',frequencyDisclosure:'Weekly',disclosure:'test',privacyNote:'Stored by operator'};
 expect(compiled.exports.render(info)).not.toContain('data-sitekey');
 const html=compiled.exports.render({...info,turnstileSiteKey:'public-site-key'});expect(html).toContain('data-sitekey="public-site-key"');expect(html).toContain('data-action="newsletter-signup"');
 });
});
test('security: confirmation POST preserves expiry, optout and suppression guards',async()=>{
 for(const guard of ['expiry','optout','suppression'])await test.step(`confirmation preserves ${guard} guard`,async()=>{
 const h=await native();try{
  await client(h.f)(`guard-${guard}@example.test`);const url=confirmationUrl(h.f);const app=createAudiencePublicRoutes(h.f.services.audienceService);const contact=await h.f.db.prepare('SELECT id FROM contacts').first<{id:string}>();
  if(guard==='expiry')await h.f.db.prepare('UPDATE consent_confirmations SET expires_at=?').bind(Date.now()-1).run();
  if(guard==='optout'){const action=await h.f.services.audienceService.issueUnsubscribeToken(contact!.id,'email');await h.f.services.audienceService.unsubscribeWithToken(action.token);}
  if(guard==='suppression')await h.f.services.audienceService.recordBounce({destination:`guard-${guard}@example.test`,kind:'hard',occurredAt:new Date(),providerEventId:`guard-${guard}`});
  const before=await snapshot(h.f.db);expect((await app.request(url)).status).toBe(404);expect(await snapshot(h.f.db)).toEqual(before);
  expect((await app.request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"confirm":true}'})).status).toBe(404);
  expect(await h.f.db.prepare('SELECT confirmed_at FROM consent_evidence').first()).toEqual({confirmed_at:null});
  expect(await h.f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:guard==='expiry'?'pending':guard==='optout'?'unsubscribed':'suppressed'});
 }finally{await h.close();}
 });
});

test('security: explicit ledger reconsent remains logged and confirmable after optout, but suppression never dispatches',async()=>{
 const h=await native();try{
  const input={contact:{email:'explicit@example.test'},channel:'email' as const,brandOrLegalSender:'Mango',messageCategory:'newsletter',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',captureMethod:'operator-recorded-affirmative-request',captureSource:'recipient-written-request',consentText:'Please resubscribe me to the weekly newsletter.',consentVersion:'v1',occurredAt:new Date(Date.now()-2000)};
  const initial=await h.f.services.audienceService.captureConsent(input);await h.f.services.audienceService.confirmConsent(initial.confirmation!.token);
  await h.f.services.audienceService.recordChannelOptOut({contactId:initial.contact.id,channel:'email',reason:'recipient-unsubscribe',occurredAt:new Date(Date.now()-1000)});
  const fresh=await h.f.services.audienceService.captureConsent({...input,occurredAt:new Date()});expect(fresh.confirmation).toBeTruthy();expect((await h.f.services.audienceService.confirmConsent(fresh.confirmation!.token)).kind).toBe('confirmed');
  await h.f.services.audienceService.recordBounce({destination:input.contact.email,kind:'hard',occurredAt:new Date(),providerEventId:'explicit-hard'});const sent=h.f.outbound.length;
  const blocked=await h.f.services.audienceService.captureConsent({...input,occurredAt:new Date(Date.now()+1)});expect(blocked.confirmation).toBeUndefined();expect(h.f.outbound).toHaveLength(sent);expect(await h.f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'suppressed'});
 }finally{await h.close();}
});

test('[CONT-027] a recipient-only unsubscribe suppression can confirm again while owner and mixed complaint blocks cannot',async()=>{
 const h=await native();try {
  const call=client(h.f),app=createAudiencePublicRoutes(h.f.services.audienceService);
  await call('returning@example.test');await h.f.services.audienceService.confirmConsent(confirmationUrl(h.f).split('/').at(-1)!);
  await h.f.services.audienceService.recordProviderSuppression({destination:'returning@example.test',channel:'email',cause:'recipient-unsubscribe',occurredAt:new Date(),providerEventId:'test-own-unsubscribe'});
  const sent=h.f.outbound.length;
  expect(await (await call('returning@example.test','192.0.2.45')).json()).toEqual({status:'confirmation-required'});
  expect(h.f.outbound).toHaveLength(sent+1);
  expect(await h.f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'suppressed'});
  const link=confirmationUrl(h.f);expect((await app.request(link)).status).toBe(200);
  expect((await app.request(link,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"confirm":true}'})).status).toBe(200);
  expect(await h.f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'subscribed'});
  expect(await h.f.db.prepare('SELECT count(*) n FROM contact_suppressions').first()).toEqual({n:0});
  expect((await h.f.db.prepare("SELECT kind,delta FROM list_growth_events WHERE delta=1 ORDER BY id DESC LIMIT 1").first())).toEqual({kind:'resubscribe',delta:1});
  expect(await h.f.db.prepare("SELECT kind FROM contact_history WHERE kind='resubscribed'").first()).toEqual({kind:'resubscribed'});
  await h.f.services.audienceService.recordBounce({destination:'returning@example.test',kind:'complaint',occurredAt:new Date(),providerEventId:'test-mixed-complaint'});
  await h.f.services.audienceService.recordProviderSuppression({destination:'returning@example.test',channel:'email',cause:'recipient-unsubscribe',occurredAt:new Date(),providerEventId:'test-new-own-unsubscribe'});
  expect(await (await call('returning@example.test','192.0.2.46')).json()).toEqual({status:'confirmation-required'});
  expect(h.f.outbound).toHaveLength(sent+1);
  await h.f.services.audienceService.recordProviderSuppression({destination:'owner-blocked@example.test',channel:'email',cause:'owner-requested',occurredAt:new Date(),providerEventId:'test-owner-block'});
  expect(await (await call('owner-blocked@example.test','192.0.2.47')).json()).toEqual({status:'confirmation-required'});
  expect(h.f.outbound).toHaveLength(sent+1);
  expect(await h.f.db.prepare("SELECT count(*) n FROM contact_suppressions WHERE cause IN ('complaint','owner-requested')").first()).toEqual({n:2});
  // Owner API suppression reasons are arbitrary text; calling it an unsubscribe never grants recipient authority.
  await h.f.services.audienceService.recordProviderSuppression({destination:'owner-labelled-unsubscribe@example.test',channel:'email',cause:'recipient-unsubscribe',occurredAt:new Date(),providerEventId:'integration:test-owner:unsubscribe'});
  expect(await (await call('owner-labelled-unsubscribe@example.test','198.51.100.20')).json()).toEqual({status:'confirmation-required'});
  expect(h.f.outbound).toHaveLength(sent+1);
 }finally{await h.close();}
});

test('[CONT-027] repeated public requests share the durable UTC destination allowance across restart and reopen on a new database day',async()=>{
 const h=await native();try {
  const {contact}=await h.f.services.audienceService.ensureContact({email:'daily-return@example.test'},new Date(Date.now()-2000));
  await h.f.services.audienceService.recordChannelOptOut({contactId:contact.id,channel:'email',reason:'recipient-unsubscribe',occurredAt:new Date(Date.now()-1000)});
  for(let request=0;request<4;request++) {
   const response=await client(h.f)('daily-return@example.test',`198.51.100.${request+1}`);
   expect(response.status).toBe(202);expect(await response.json()).toEqual({status:'confirmation-required'});
   expect(h.f.outbound).toHaveLength(Math.min(request+1,3));
  }
  const restarted=await h.restart();
  expect((await client(restarted)('daily-return@example.test','198.51.100.10')).status).toBe(202);expect(restarted.outbound).toHaveLength(0);
  const current=await restarted.db.prepare("SELECT CAST(strftime('%s','now') AS INTEGER)/86400 AS day").first<{day:number}>();
  // Reopen from the same persisted state a prior UTC day leaves behind.
  await restarted.db.prepare("UPDATE oa_limits SET window=? WHERE key LIKE 'signup-email:%'").bind(current!.day-1).run();
  expect((await client(restarted)('daily-return@example.test','198.51.100.11')).status).toBe(202);expect(restarted.outbound).toHaveLength(1);
  expect(await restarted.db.prepare("SELECT window,count FROM oa_limits WHERE key LIKE 'signup-email:%'").first()).toEqual({window:current!.day,count:1});
  expect(await restarted.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'unsubscribed'});
 }finally{await h.close();}
});


test('CONT-043 erased recipients confirm only new evidence; expiry removes recreated data and surviving suppression stays refused',async()=>{
 const h=await native(),realNow=Date.now;
 const {createRequire}=await import('node:module'),require=createRequire(import.meta.url);
 const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
 const blobs=new Miniflare({host:'127.0.0.1',port:0,cf:false,telemetry:{enabled:false},workers:[{
  config:{name:'synthetic-mango-430',type:'worker',compatibilityDate:'2026-08-31',
   manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:'export default {fetch(){return new Response("R2");}}'}}},
  env:{BUCKET:{type:'r2',name:'synthetic-mango-430'}}},
 }]});
 try {
  const {createBlobStore}=await import('../../src/core/platform/blobs');
  h.f.platform.blobs=createBlobStore(await blobs.getR2Bucket('BUCKET'));

  const call=client(h.f),app=createAudiencePublicRoutes(h.f.services.audienceService);
  const email=['synthetic-mango-430','example.test'].join('@');
  await call(email);const oldLink=confirmationUrl(h.f);
  expect((await app.request(oldLink,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"confirm":true}'})).status).toBe(200);
  const old=await h.f.db.prepare('SELECT id FROM contacts WHERE email=?').bind(email).first<{id:string}>();
  await h.f.services.audienceService.recordChannelOptOut({contactId:old!.id,channel:'email',reason:'recipient-unsubscribe',occurredAt:new Date(realNow()-1000)});
  const restrictions=async()=>(await h.f.db.prepare('SELECT * FROM surviving_opt_outs ORDER BY id').all()).results;
  const retained=await restrictions();expect(retained).toHaveLength(1);
  await eraseFixture(h.f,old!.id);
  expect(await restrictions()).toEqual(retained);
  expect(await h.f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(old!.id).first()).toBeNull();
  const sent=h.f.outbound.length;
  expect((await call(email)).status).toBe(202);expect(h.f.outbound).toHaveLength(sent+1);
  const fresh=await h.f.db.prepare('SELECT * FROM contacts WHERE email=?').bind(email).first<{id:string;email_status:string}>();
  expect(fresh!.id).not.toBe(old!.id);expect(fresh!.email_status).toBe('unsubscribed');
  const consent=await h.f.db.prepare('SELECT id,contact_id,confirmed_at FROM consent_evidence').all();
  expect(consent.results).toEqual([expect.objectContaining({contact_id:fresh!.id,confirmed_at:null})]);
  expect(await h.f.db.prepare('SELECT count(*) n FROM contact_history WHERE contact_id=?').bind(old!.id).first()).toEqual({n:0});
  const newLink=confirmationUrl(h.f),pending=await snapshot(h.f.db);
  expect((await app.request(oldLink,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"confirm":true}'})).status).toBe(404);
  expect(await snapshot(h.f.db)).toEqual(pending);
  expect((await app.request(newLink)).status).toBe(200);expect(await snapshot(h.f.db)).toEqual(pending);
  expect((await app.request(newLink,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"confirm":true}'})).status).toBe(200);
  expect(await h.f.db.prepare('SELECT email_status FROM contacts WHERE id=?').bind(fresh!.id).first()).toEqual({email_status:'subscribed'});
  expect(await h.f.db.prepare('SELECT contact_id,evidence_id FROM audience_opt_out_supersessions').all().then(r=>r.results)).toEqual([{contact_id:fresh!.id,evidence_id:consent.results[0].id}]);
  expect(await restrictions()).toEqual(retained);
  expect(await h.f.db.prepare('SELECT count(*) n FROM audience_resubscriptions').first()).toEqual({n:0});
  const confirmed=await snapshot(h.f.db);
  expect((await app.request(newLink,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"confirm":true}'})).status).toBe(410);
  expect(await snapshot(h.f.db)).toEqual(confirmed);

  // A second erased request expires on the persisted deadline, independent of UTC rollover.
  await h.f.services.audienceService.recordChannelOptOut({contactId:fresh!.id,channel:'email',reason:'recipient-unsubscribe',occurredAt:new Date()});
  await eraseFixture(h.f,fresh!.id);
  const beforeExpiry=await restrictions();
  expect((await call(email,'192.0.2.45')).status).toBe(202);
  const expiredLink=confirmationUrl(h.f);
  const expiry=await h.f.db.prepare('SELECT contact_id,expires_at FROM audience_resubscriptions').first<{contact_id:string;expires_at:number}>();
  expect(expiry).toBeTruthy();
  Date.now=()=>expiry!.expires_at+1;
  expect((await app.request(expiredLink,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"confirm":true}'})).status).toBe(404);
  const {runLifecycleCron,consumeLifecycleQueue}=await import('../../src/core/features/lifecycle');
  expect(await runLifecycleCron({},h.f.services.lifecycleRuntime)).toBe('blocked-erasure');
  // Queue transport delivers only commands actually emitted by the production Cron and continuation.
  for(let step=0;step<500;step++){
   const job=h.f.jobs.shift();if(!job)break;
   await consumeLifecycleQueue({messages:[{body:job,ack(){},retry(){throw new Error('Erasure continuation failed');}}]},h.f.services.lifecycleRuntime);
  }
  expect(await h.f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(expiry!.contact_id).first()).toBeNull();
  for(const table of ['consent_evidence','consent_confirmations','consent_capture_metadata','contact_history','audience_signup_requests','audience_resubscriptions'])expect(await h.f.db.prepare(`SELECT count(*) n FROM ${table}`).first(),table).toEqual({n:0});
  expect(await restrictions()).toEqual(beforeExpiry);
  Date.now=realNow;

  // A prior installation may have the explicit unsubscribe state without a ledger row.
  const legacyEmail=['synthetic-mango-433','example.test'].join('@');
  const legacy=await h.f.services.audienceService.ensureContact({email:legacyEmail},new Date(realNow()-2000));
  await h.f.db.batch([
   h.f.db.prepare("UPDATE contacts SET email_status='unsubscribed' WHERE id=?").bind(legacy.contact.id),
   h.f.db.prepare("UPDATE contact_email_addresses SET channel_status='unsubscribed' WHERE contact_id=?").bind(legacy.contact.id),
  ]);
  await eraseFixture(h.f,legacy.contact.id);
  expect(await h.f.db.prepare("SELECT reason FROM surviving_opt_outs WHERE reason='erasure-unsubscribe'").all().then(r=>r.results)).toEqual([{reason:'erasure-unsubscribe'}]);
  const beforeErasureConsent=h.f.outbound.length;
  expect((await call(legacyEmail,'192.0.2.47')).status).toBe(202);expect(h.f.outbound).toHaveLength(beforeErasureConsent+1);
  expect((await app.request(confirmationUrl(h.f),{method:'POST',headers:{'Content-Type':'application/json'},body:'{"confirm":true}'})).status).toBe(200);

  for(const cause of ['hard-bounce','complaint','recipient-unsubscribe']){
   const blocked=['synthetic-mango-431-'+cause,'example.test'].join('@');
   const {contact}=await h.f.services.audienceService.ensureContact({email:blocked},new Date());
   await h.f.services.audienceService.recordProviderSuppression({destination:blocked,channel:'email',cause,occurredAt:new Date(),providerEventId:`integration:synthetic-mango-431:${cause}`});
   await eraseFixture(h.f,contact.id);
   const before=await snapshot(h.f.db),mail=h.f.outbound.length,blocks=await restrictions();
   expect((await call(blocked,'192.0.2.46')).status).toBe(202);
   expect(h.f.outbound).toHaveLength(mail);expect((await snapshot(h.f.db)).slice(0,6)).toEqual(before.slice(0,6));
   expect(await restrictions()).toEqual(blocks);
  }
 }finally{Date.now=realNow;await blobs.dispose();await h.close();}
});
