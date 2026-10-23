import {eraseFixture} from './erase';
import { test, expect } from '@playwright/test';
import { native } from './native';
import { createSignupRoutes, signupDescription } from '../../src/core/features/audience/signup-routes';
import { createAudiencePublicRoutes } from '../../src/core/features/audience/public-routes';

function client(f: Awaited<ReturnType<typeof native>>['f']) {
 const app = createSignupRoutes(f.services.audienceService, f.platform, f.db);
 return (email: string, ip = '192.0.2.44', extra: object = {}) => app.request('https://mango.example.test/subscribe', {method:'POST', headers:{'Content-Type':'application/json','CF-Connecting-IP':ip}, body:JSON.stringify({email,consent:true,disclosure:signupDescription(f.platform).disclosure,...extra})});
}
async function snapshot(db:D1Database) {
 return Promise.all(['contacts','consent_evidence','consent_confirmations','consent_capture_metadata','contact_history','audience_signup_requests','oa_limits'].map(table=>db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all().then(result=>result.results)));
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
for(const state of ['subscribed','suppressed','erased-optout'])test(`security: public capture preserves ${state} without mail or evidence`,async()=>{
 const h=await native();try{
  const call=client(h.f);await call('existing@example.test');const token=confirmationUrl(h.f).split('/').at(-1)!;await h.f.services.audienceService.confirmConsent(token);
  const contact=await h.f.db.prepare('SELECT id FROM contacts').first<{id:string}>();
  if(state==='erased-optout'){const action=await h.f.services.audienceService.issueUnsubscribeToken(contact!.id,'email');await h.f.services.audienceService.unsubscribeWithToken(action.token);}
  if(state==='suppressed')await h.f.services.audienceService.recordBounce({providerEventId:'hard-bounce',destination:'existing@example.test',kind:'hard',occurredAt:new Date()});
  if(state==='erased-optout')await eraseFixture(h.f,contact!.id);
  const before=await snapshot(h.f.db);const sent=h.f.outbound.length;
  expect((await call('existing@example.test','192.0.2.45')).status).toBe(202);expect(h.f.outbound).toHaveLength(sent);
  const after=await snapshot(h.f.db);
  if(state==='erased-optout'){expect(after[0]).toHaveLength(1);expect(after[0][0]).toMatchObject({email_status:'unsubscribed'});expect(after.slice(1,4)).toEqual(before.slice(1,4));expect(after[5]).toEqual(before[5]);expect(after[4]).toEqual([expect.objectContaining({kind:'resubscribe-refused'})]);}
  else {expect(after.slice(0,4)).toEqual(before.slice(0,4));expect(after[5]).toEqual(before[5]);
    if(state==='suppressed'){expect(after[4]).toHaveLength(before[4].length+1);expect(after[4]).toContainEqual(expect.objectContaining({kind:'resubscribe-refused'}));}
    else expect(after[4]).toEqual(before[4]);}
 }finally{await h.close();}
});
test('security: IPv6 equivalent addresses and interface rotation share a /64 budget; invalid IP fails closed',async()=>{
 const h=await native();try{
  const call=client(h.f);for(let i=0;i<5;i++)expect((await call(`v6-${i}@example.test`,`2001:db8:1:2::${i+1}`)).status).toBe(202);
  expect((await call('v6-block@example.test','2001:0db8:0001:0002:ffff:0:0:1')).status).toBe(429);
  for(const ip of ['invalid','999.1.2.3','2001:db8::1%eth0','192.0.2.1, 192.0.2.2'])expect((await call('invalid@example.test',ip)).status).toBe(400);
 }finally{await h.close();}
});
test('security: durable global last slot is atomic across addresses and networks and survives restart',async()=>{
 const h=await native();try{
  await h.f.db.prepare('INSERT INTO oa_limits(key,window,count) VALUES(?,?,?)').bind('signup-global',Math.floor(Date.now()/3600000),49).run();
  const results=await Promise.all(Array.from({length:6},(_,i)=>client(h.f)(`global-${i}@example.test`,`192.0.2.${60+i}`)));
  expect(results.filter(r=>r.status===202)).toHaveLength(1);for(const response of results.filter(r=>r.status===429)){expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);expect(await response.json()).toMatchObject({error:'rate_limited'});}expect(h.f.outbound).toHaveLength(1);expect(await h.f.db.prepare("SELECT count FROM oa_limits WHERE key='signup-global'").first()).toEqual({count:50});
  const restarted=await h.restart();expect((await client(restarted)('restart@example.test','198.51.100.1')).status).toBe(429);expect(restarted.outbound).toHaveLength(0);
  for(const [email,kind] of [['hard@example.test','hard'],['complaint@example.test','complaint']] as const){await restarted.services.audienceService.recordBounce({destination:email,kind,occurredAt:new Date(),providerEventId:`test-exhausted-${kind}`});const response=await client(restarted)(email,'198.51.100.2');expect(response.status).toBe(202);expect(await response.json()).toEqual({status:'confirmation-required'});}expect(restarted.outbound).toHaveLength(0);
 }finally{await h.close();}
});
test('security: configured Turnstile fails closed before storage for missing, bad, wrong scope, and unavailable verification',async()=>{
 const h=await native();try{
  Object.assign(h.f.platform.config,{signupTurnstile:{siteKey:'test-site',secretKey:'test-secret'}});const call=client(h.f);const before=await snapshot(h.f.db);
  expect((await call('missing@example.test')).status).toBe(400);expect(await snapshot(h.f.db)).toEqual(before);
  const original=globalThis.fetch;
  try{for(const reply of [{success:false},{success:true,action:'other',hostname:'mango.example.test'},{success:true,action:'newsletter-signup',hostname:'evil.example.test'},null]){
   globalThis.fetch=async (input,init)=>new URL(input instanceof Request ? input.url : String(input)).hostname === 'challenges.cloudflare.com' ? reply===null ? Promise.reject(new Error('unavailable')) : Response.json(reply) : original(input,init);
   expect((await call('bad@example.test','192.0.2.45',{'cf-turnstile-response':'token'})).status).toBe(400);expect(await snapshot(h.f.db)).toEqual(before);
  }
  globalThis.fetch=async(input,init)=>{if(new URL(input instanceof Request ? input.url : String(input)).hostname !== 'challenges.cloudflare.com')return original(input,init);const form=new URLSearchParams(await new Request(input,init).text());expect(form.get('secret')).toBe('test-secret');expect(form.get('response')).toBe('good-token');return Response.json({success:true,action:'newsletter-signup',hostname:'mango.example.test'});};
  expect((await call('valid@example.test','192.0.2.46',{'cf-turnstile-response':'good-token'})).status).toBe(202);expect(h.f.outbound).toHaveLength(1);
  }finally{globalThis.fetch=original;}
 }finally{await h.close();}
});
test('security: IPv4 mapped IPv6 shares the IPv4 budget',async()=>{
 const h=await native();try{const call=client(h.f);for(let i=0;i<5;i++)expect((await call(`mapped-${i}@example.test`,'192.0.2.44')).status).toBe(202);expect((await call('mapped-block@example.test','::ffff:c000:22c')).status).toBe(429);expect((await call('mapped-block2@example.test','::ffff:192.0.2.44')).status).toBe(429);}finally{await h.close();}
});
test('security: production rejects one-sided Turnstile and exposes only the public key',async()=>{
 const {readProductionConfig}=await import('../../src/core/platform/config');
 const env={SESSION_SIGNING_KEY:'test-signing-key-at-least-32-characters',INITIAL_OPERATOR_EMAILS:'operator@example.test',CONTACT_HASH_SALT:'test-salt',MAIL_PROVIDER: 'resend', MAIL_PROVIDER_API_KEY:'test-key',MAIL_AUTH_FROM:'sender@example.test',MAIL_WEBHOOK_SECRET:'test-webhook',MAIL_WEBHOOK_ID:'test-hook',MANGO_PUBLIC_BASE_URL:'https://mango.example.test',MANGO_APP_VERSION:'test',MANGO_ALLOWED_LINK_HOSTS:'example.test',MANGO_TEST_EMAIL_ALLOWLIST:'receiver@example.test',MANGO_RECONCILIATION_INTERVAL_MINUTES:'15',MANGO_UNRESOLVED_OUTCOME_HOURS:'1',MANGO_EMAIL_HANDOFFS_PER_MINUTE:'10',MANGO_DELIVERABILITY_WINDOW_DAYS:'30'};
 const parse=(extra:object)=>readProductionConfig({...env,...extra} as Parameters<typeof readProductionConfig>[0]);
 expect(()=>parse({TURNSTILE_SITE_KEY:'site'})).toThrow(/Turnstile/);expect(()=>parse({TURNSTILE_SECRET_KEY:'secret'})).toThrow(/Turnstile/);
 expect(parse({})).not.toHaveProperty('signupTurnstile');
 const configured=parse({TURNSTILE_SITE_KEY:'site',TURNSTILE_SECRET_KEY:'secret'});expect(configured).toHaveProperty('signupTurnstile',{siteKey:'site',secretKey:'secret'});
 const h=await native();try{Object.assign(h.f.platform.config,{signupTurnstile:{siteKey:'site',secretKey:'secret'}});expect(signupDescription(h.f.platform)).toHaveProperty('turnstileSiteKey','site');expect(JSON.stringify(signupDescription(h.f.platform))).not.toContain('secret');}finally{await h.close();}
});
for(const guard of ['expiry','optout','suppression'])test(`security: confirmation POST preserves ${guard} guard`,async()=>{
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
test('security: sender identity preflight rejects each missing required field without storage',async()=>{
 const h=await native();try{const identity={...h.f.platform.config.mailSender};for(const field of ['displayName','fromEmail','replyToEmail','physicalAddress'] as const){Object.assign(h.f.platform.config.mailSender,identity,{[field]:''});const before=await snapshot(h.f.db);expect((await client(h.f)('no-identity@example.test')).status).toBe(503);expect(await snapshot(h.f.db)).toEqual(before);}expect(h.f.outbound).toHaveLength(0);}finally{await h.close();}
});
test('security: configured hosted form publishes widget action and only public site key; default form omits widget',async()=>{
 const {createRequire}=await import('node:module');const {resolve}=await import('node:path');const require=createRequire(import.meta.url);
 const {build}=createRequire(require.resolve('wrangler'))('esbuild');
 const result=await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {SubscribePage} from './src/core/features/audience/ui/subscribe-page';export function render(info){return renderToStaticMarkup(<SubscribePage info={info}/>);}`,resolveDir:process.cwd(),sourcefile:'signup-render.tsx',loader:'tsx'},bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',alias:{'@':resolve('src')}});
 const compiled={exports:{} as {render:(info:object)=>string}};new Function('require','module','exports',result.outputFiles[0].text)(require,compiled,compiled.exports);
 const info={sender:'Newsletter',consentText:'I agree',frequencyDisclosure:'Weekly',disclosure:'test',privacyNote:'Stored by operator'};
 expect(compiled.exports.render(info)).not.toContain('data-sitekey');
 const html=compiled.exports.render({...info,turnstileSiteKey:'public-site-key'});expect(html).toContain('data-sitekey="public-site-key"');expect(html).toContain('data-action="newsletter-signup"');
});
test('security: durable allowance rolls forward only and never resets from a late older request',async()=>{
 const {takeSignupAllowance}=await import('../../src/core/features/audience/signup-security');const h=await native();try{
  expect(await takeSignupAllowance(h.f.db,'window-race',10,1)).toBe(true);expect(await takeSignupAllowance(h.f.db,'window-race',10,1)).toBe(false);
  expect(await takeSignupAllowance(h.f.db,'window-race',11,1)).toBe(true);expect(await takeSignupAllowance(h.f.db,'window-race',10,1)).toBe(false);expect(await takeSignupAllowance(h.f.db,'window-race',11,1)).toBe(false);
  expect(await h.f.db.prepare("SELECT window,count FROM oa_limits WHERE key='window-race'").first()).toEqual({window:11,count:1});
 }finally{await h.close();}
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
