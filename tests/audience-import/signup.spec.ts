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
test('CONT-007/009 signed SMS signup confirms once; linked STOP is durable and HELP/START cannot subscribe or duplicate replies',async()=>{
 const h=await native();const {smsEdge}=await import('./sms-edge');const edge=smsEdge(h);
 try{
  const {createSmsSignupRoutes,smsSignupDescription}=await import('../../src/core/features/sms/signup');
  const {createSmsInboundRoutes}=await import('../../src/core/features/sms/inbound');
  const {createAudiencePublicRoutes}=await import('../../src/core/features/audience/public-routes');
  const {deliverSmsService,resumeSmsServices}=await import('../../src/core/features/sms/service-delivery');
  const signup=createSmsSignupRoutes(h.f.platform,h.f.services.audienceService),inbound=createSmsInboundRoutes(h.f.platform),publicRoutes=createAudiencePublicRoutes(h.f.services.audienceService);
  const request=()=>signup.request('https://mango.example.test/subscribe/sms',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.88'},body:JSON.stringify({phone:'+61411111111',consent:true,timeZone:'Australia/Brisbane',disclosure:smsSignupDescription(h.f.platform)!.disclosure})});
  expect((await request()).status).toBe(202);
  const {smsWindow}=await import('../../src/core/features/sms/policy');
  let allowed=new Date();while(![0,60000,120000].every(offset=>smsWindow(edge.policy,new Date(allowed.getTime()+offset),'Australia/Brisbane','recipient-supplied-signup',Date.now()).allowed))allowed=new Date(allowed.getTime()+60000);
  const drain=()=>resumeSmsServices(h.f.platform,new Date(allowed.getTime()+60000));
  const service=await h.f.db.prepare('SELECT id,state FROM sms_service_messages').first<{id:string;state:string}>();
  expect(service).toBeTruthy();
  if(service!.state==='queued'){
   expect(edge.requests).toHaveLength(0);
   await deliverSmsService(h.f.platform,service!.id,allowed);
  }
  expect(edge.requests).toHaveLength(1);const sent=edge.requests[0].messages[0];expect(sent.message).toContain('News');expect(sent.message).toContain('Weekly');const {smsComplianceBlock}=await import('../../src/core/features/sms/content');expect(sent.message.endsWith(smsComplianceBlock(edge.policy,'61400000010'))).toBe(true);
  const confirmation=sent.message.match(/https:\/\/[^\s]+/)[0].replace(/\.$/,'');
  expect((await publicRoutes.request(confirmation)).status).toBe(200);
  expect(await h.f.db.prepare('SELECT sms_status,email_status FROM contacts').first()).toEqual({sms_status:'pending',email_status:'non-subscribed'});
  const confirm=()=>publicRoutes.request(confirmation,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:true})});
  expect((await confirm()).status).toBe(200);expect((await confirm()).status).toBe(410);
  const payload={type:'inbound',to:'61400000010',sender:'61411111111',message:'STOP',received_at:new Date().toISOString().slice(0,19).replace('T',' '),original_message_id:'sms-1',original_custom_ref:sent.custom_ref};
  expect((await inbound.request('https://mango.example.test/webhooks/sms/mobile-message',{...edge.signed(payload),headers:{'X-MM-Signature':'forged'}})).status).toBe(401);
  expect((await inbound.request('https://mango.example.test/webhooks/sms/mobile-message',edge.signed({...payload,to:'61400000099'}))).status).toBe(400);
  expect((await inbound.request('https://mango.example.test/webhooks/sms/mobile-message',edge.signed({...payload,message:'HELP',original_message_id:'other-recipient-message'}))).status).toBe(400);
  const post=(value:Record<string,unknown>)=>inbound.request('https://mango.example.test/webhooks/sms/mobile-message',edge.signed(value));
  payload.original_message_id='';payload.original_custom_ref='';
  expect((await Promise.all([post(payload),post(payload)])).map(response=>response.status)).toEqual([204,204]);await drain();expect(await h.f.db.prepare('SELECT sms_status FROM contacts').first()).toEqual({sms_status:'unsubscribed'});
  expect((await post(payload)).status).toBe(204);expect(edge.requests).toHaveLength(2);
  expect(edge.requests[1].ignore_unsubscribes).toBe(true);
  expect((await post({...payload,message:'HELP',original_message_id:'sms-1',original_custom_ref:sent.custom_ref})).status).toBe(204);await drain();expect(edge.requests.at(-1)!.messages[0].message).toContain('help@example.test');
  expect((await post({...payload,message:'START',original_message_id:'sms-1',original_custom_ref:sent.custom_ref})).status).toBe(204);await drain();expect(edge.requests.at(-1)!.messages[0].message).toContain('/subscribe?channel=sms');
  expect(await h.f.db.prepare('SELECT sms_status FROM contacts').first()).toEqual({sms_status:'unsubscribed'});
  await deliverSmsService(h.f.platform,service!.id);expect(edge.requests).toHaveLength(4);
  const unknown={...payload,sender:'61499999999'};
  expect((await post(unknown)).status).toBe(204);expect((await post(unknown)).status).toBe(204);
  expect(await h.f.db.prepare("SELECT count(*) AS n FROM contact_phones WHERE phone_e164='+61499999999'").first()).toEqual({n:0});
  const importInput={files:[{name:'after-stop.csv',preset:'csv-non-subscribed' as const,csv:'phone,sms_status,sms_brand,sms_program,sms_category,sms_frequency,sms_jurisdiction,sms_consent_text,sms_consent_version,sms_capture_method,sms_capture_source,sms_occurred_at,sms_confirmed_at\n+61499999999,subscribed,Mango,News,newsletter,Weekly,AU,I agree,v1,signup,original-form,2026-01-01T00:00:00Z,2026-01-02T00:00:00Z'}]};
  const reviewed=await h.service.preview(importInput,h.context);const imported=await h.service.create(reviewed.fingerprint,h.context);
  const {finish}=await import('./native');await finish(h,imported.id);
  expect(await h.f.db.prepare("SELECT channel_status FROM contact_phones WHERE phone_e164='+61499999999'").first()).toEqual({channel_status:'unsubscribed'});
  expect(edge.requests).toHaveLength(4);

 }finally{edge.restore();await h.close();}
});
test('CONT-009 SMS uncertainty, disabled ingress and service expiry never resend or disclose a challenge',async()=>{
 const h=await native();const {smsEdge}=await import('./sms-edge');const edge=smsEdge(h);
 try{
  const {createSmsSignupRoutes,smsSignupDescription}=await import('../../src/core/features/sms/signup');
  const {createSmsInboundRoutes}=await import('../../src/core/features/sms/inbound');
  const {resumeSmsServices,deliverSmsService}=await import('../../src/core/features/sms/service-delivery');
  const {smsWindow}=await import('../../src/core/features/sms/policy');
  const signup=createSmsSignupRoutes(h.f.platform,h.f.services.audienceService);
  const call=(phone:string,ip:string)=>signup.request('https://mango.example.test/subscribe/sms',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':ip},body:JSON.stringify({phone,consent:true,timeZone:'Australia/Brisbane',disclosure:smsSignupDescription(h.f.platform)!.disclosure})});
  edge.loseResponse();const response=await call('+61411111111','192.0.2.90');expect([202,503]).toContain(response.status);
  let now=new Date();while(!smsWindow(edge.policy,now,'Australia/Brisbane','signup',Date.now()).allowed)now=new Date(now.getTime()+60000);
  const row=await h.f.db.prepare('SELECT id FROM sms_service_messages').first<{id:string}>();await deliverSmsService(h.f.platform,row!.id,now);
  expect(edge.requests).toHaveLength(1);expect(await h.f.db.prepare('SELECT state,payload_ciphertext FROM sms_service_messages').first()).toEqual({state:'uncertain',payload_ciphertext:null});
  await resumeSmsServices(h.f.platform,new Date(now.getTime()+86400000));await call('+61411111111','192.0.2.91');expect(edge.requests).toHaveLength(1);
  const configured=h.f.platform.config.modules.sms;h.f.platform.config.modules.sms={enabled:false,requiredInputs:['SMS_PROGRAMME_POLICY'],missingInputs:['SMS_PROGRAMME_POLICY'],detail:'SMS_PROGRAMME_POLICY is required.'};
  const inbound=createSmsInboundRoutes(h.f.platform);expect((await inbound.request('https://mango.example.test/webhooks/sms/mobile-message',{method:'POST',body:'{}'})).status).toBe(503);expect(await h.f.db.prepare('SELECT count(*) AS n FROM sms_inbound_receipts').first()).toEqual({n:0});
  h.f.platform.config.modules.sms=configured;
  edge.policy.providerWindows=[{days:[0,1,2,3,4,5,6],startMinute:0,endMinute:1}];
  expect((await call('+61422222222','192.0.2.92')).status).toBe(202);
  await h.f.db.prepare("UPDATE sms_service_messages SET expires_at=?,next_at=? WHERE state='queued'").bind(Date.now()-1,Date.now()+86400000).run();
  await resumeSmsServices(h.f.platform);expect(edge.requests).toHaveLength(1);expect(await h.f.db.prepare("SELECT state,payload_ciphertext FROM sms_service_messages WHERE state='expired'").first()).toEqual({state:'expired',payload_ciphertext:null});
  expect((await call('+61433333333','192.0.2.93')).status).toBe(202);
  const drift=await h.f.db.prepare("SELECT id FROM sms_service_messages WHERE state='queued'").first<{id:string}>();
  edge.policy.frequency='Monthly';await deliverSmsService(h.f.platform,drift!.id);
  expect(await h.f.db.prepare('SELECT state,reason FROM sms_service_messages WHERE id=?').bind(drift!.id).first()).toEqual({state:'blocked',reason:'sms-programme-policy-changed'});
  edge.policy.frequency='Weekly';edge.policy.providerWindows=[{days:[0,1,2,3,4,5,6],startMinute:0,endMinute:19*60}];
  // The fixture provider closes before Mango's house window, so this proves its independent restriction.
  const closing=Math.floor(Date.now()/86400000)*86400000+9*3600000;
  edge.setClock(closing-1000);let reads=0,before=0,after=0;
  edge.onSenderRead(()=>{if(++reads===2){before=Date.now();edge.setClock(closing);after=Date.now();}});
  expect((await call('+61444444444','192.0.2.94')).status).toBe(202);
  expect(before).toBeLessThan(closing);expect(after).toBeGreaterThanOrEqual(closing);expect(reads).toBe(2);
  expect(edge.requests).toHaveLength(1);
  expect(await h.f.db.prepare("SELECT state,reason FROM sms_service_messages WHERE state='queued'").first()).toEqual({state:'queued',reason:'sms-quiet-window'});

 }finally{edge.restore();await h.close();}
});

test('CONT-009 email provider preflight deferral reports no handoff and releases only its durable claim',async()=>{
 const h=await native();try{
  const {createAppServices}=await import('../../src/core/app/app');
  Object.assign(h.f.platform,h.f.originalProduction());h.f.services=createAppServices(h.f.platform);
  const retryAt=Date.now()+60000;
  await h.f.db.prepare('INSERT INTO provider_pacing(scope,next_at,updated_at) VALUES(?,?,?)').bind(`resend:${h.f.platform.config.deliveryPolicies!.resend!.account}`,retryAt,Date.now()).run();
  const response=await client(h)({email:'deferred@example.test',consent:true});
  expect(response.status).toBe(503);expect(response.headers.get('Retry-After')).toBeTruthy();
  expect(await response.json(),JSON.stringify({pacing:(await h.f.db.prepare('SELECT scope,next_at FROM provider_pacing').all()).results,holds:(await h.f.db.prepare('SELECT provider,scope,reason FROM provider_holds WHERE held=1').all()).results})).toMatchObject({error:'confirmation_deferred',retryAt:new Date(retryAt).toISOString()});
  expect(h.f.outbound).toHaveLength(0);
  expect(await h.f.db.prepare('SELECT count(*) AS n FROM consent_handoff_claims').first()).toEqual({n:0});
  expect(await h.f.db.prepare("SELECT kind FROM contact_history WHERE kind='confirmation-deferred'").first()).toEqual({kind:'confirmation-deferred'});
  expect(await h.f.db.prepare('SELECT outcome FROM external_cost_facts').first()).toEqual({outcome:'not-sent'});
  expect(await h.f.db.prepare('SELECT email_status FROM contacts').first()).toEqual({email_status:'pending'});
  await h.f.db.prepare('DELETE FROM provider_pacing').run();
  expect((await client(h)({email:'deferred@example.test',consent:true},'192.0.2.101')).status).toBe(503);
  expect(h.f.outbound).toHaveLength(0); // the failed signup is never mislabeled queued or replayed
 }finally{await h.close();}
});
