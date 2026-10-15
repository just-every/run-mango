import {eraseHttp} from './erase';
import {test,expect} from '@playwright/test';
import {native,files,consent,finish} from './native';
import {parseCsv} from '../../src/core/features/audience/csv';
import {invitationRuntime} from '../../operations/fixtures/invitation-runtime.mjs';
test('CONT-003/004/006/010 CSV roundtrip into a fresh differently salted D1 preserves all statuses and consent',async()=>{
 const first=await native('first-salt');let exported:string;try{const preview=await first.service.preview({files:await files(),consent},first.context);const job=await first.service.create(preview.fingerprint,first.context);await finish(first,job.id);
  await first.f.services.audienceService.captureConsent({contact:{email:'native@example.test'},channel:'email',...consent,captureMethod:'original-form',captureSource:'https://example.test/signup',captureIp:'192.0.2.99',occurredAt:new Date(),confirmationRequired:false});
  await first.f.services.audienceService.recordProviderSuppression({destination:'native@example.test',channel:'email',cause:'hard',occurredAt:new Date(),providerEventId:'native-bounce'});
  const sms=await first.service.preview({files:[{name:'original-sms.csv',preset:'csv-non-subscribed',csv:'phone,sms_status,sms_brand,sms_program,sms_category,sms_frequency,sms_jurisdiction,sms_consent_text,sms_consent_version,sms_capture_method,sms_capture_source,sms_occurred_at,sms_confirmed_at\n+61400111222,subscribed,Mango,Newsletter,newsletter,Weekly,AU,I agree,v1,original-sms-form,https://example.test/sms,2026-01-01T00:00:00Z,2026-01-02T00:00:00Z'}]},first.context);
  await finish(first,(await first.service.create(sms.fingerprint,first.context)).id);
  await first.f.services.audienceService.recordChannelOptOut({destination:'+61400111222',channel:'sms',reason:'STOP',occurredAt:new Date()});
  exported=await first.service.exportCsv();
 }finally{await first.close();}
 const second=await native('second-salt');try{const preview=await second.service.preview({files:[{name:'audience.csv',preset:'mango',csv:exported!}]},second.context);expect(preview.rows.filter(row=>row.reason)).toEqual([]);const job=await second.service.create(preview.fingerprint,second.context);await finish(second,job.id);
  const restored=await second.service.exportCsv();
  expect(restored).toBe(exported!);
  const projection=(csv:string)=>parseCsv(csv).map(({ledger_json,...row})=>({row,consent:JSON.parse(ledger_json).tables.consent_evidence,metadata:JSON.parse(ledger_json).tables.consent_capture_metadata,observations:JSON.parse(ledger_json).tables.audience_import_observations})).sort((a,b)=>a.row.email.localeCompare(b.row.email));
  expect(projection(restored)).toEqual(projection(exported!));
  const native=(await second.f.services.audienceService.list()).find(row=>row.email==='native@example.test');expect(native?.emailStatus).toBe('suppressed');
  expect(await second.f.db.prepare("SELECT count(*) AS count FROM contact_suppressions WHERE destination_hash IN (SELECT destination_hash FROM surviving_opt_outs)").first()).toEqual({count:2});
 }finally{await second.close();}
});
test('CONT-004/010 opt-outs whose contacts were undone or erased leave in the export and remain restricted under a different salt',async()=>{
 const optedOut='list-only@example.test',erased='erased-optout@example.test';
 const run=async(f:Awaited<ReturnType<typeof invitationRuntime>>,cookie:string,files:unknown[],input:Record<string,unknown>={})=>{
  const preview=await f.call('/api/audience/import-preview',{cookie,method:'POST',body:{files,...input}});expect(preview.status).toBe(200);
  let response=await f.call('/api/audience/imports',{cookie,method:'POST',body:{fingerprint:(await preview.json()).fingerprint}});expect(response.status).toBe(200);
  let {job}=await response.json();
  while(['queued','applying'].includes(job.state)){response=await f.call(`/api/audience/imports/${job.id}/resume`,{cookie,method:'POST',body:{}});expect(response.status).toBe(200);({job}=await response.json());}
  expect(job.state).toBe('completed');return job;
 };
 const first=await invitationRuntime({contactHashSalt:'first-installation-salt-more-than-thirty-two-bytes'});let exported='';
 try{
  const cookie=await first.bootstrap();
  // An unsubscribe list creates the contact; undoing the list removes it and keeps its opt-out.
  const list=await run(first,cookie,[{name:'unsubscribed.csv',preset:'csv-unsubscribed',csv:`Email Address\n${optedOut}`}]);
  let undo=await first.call(`/api/audience/imports/${list.id}/undo`,{cookie,method:'POST',body:{}});expect(undo.status).toBe(200);let {job}=await undo.json();
  while(job.state==='undoing'){undo=await first.call(`/api/audience/imports/${list.id}/resume`,{cookie,method:'POST',body:{}});({job}=await undo.json());}
  expect(job.state).toBe('undone');expect(await first.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:0});
  await run(first,cookie,[{name:'erased.csv',preset:'csv-unsubscribed',csv:`Email Address\n${erased}`}]);
  const subject=await first.db.prepare('SELECT id FROM contacts WHERE email=?').bind(erased).first<any>();
  expect((await eraseHttp(first,cookie,subject.id)).retainedChannels).toEqual(['email']);
  exported=await(await first.call('/api/audience/export',{cookie})).text();
  expect(exported).not.toContain(erased);
  expect(exported).not.toContain(optedOut);
 }finally{await first.close();}
 const second=await invitationRuntime({contactHashSalt:'second-installation-salt-more-than-thirty-two-bytes'});
 try{
  const cookie=await second.bootstrap();
  await run(second,cookie,[{name:'audience.csv',preset:'mango',csv:exported}]);
  // A later file with complete original consent for that address cannot subscribe it here.
  const confirmed=new Date(Date.now()-60_000).toISOString();
  await run(second,cookie,[{name:'subscribed.csv',preset:'csv-subscribed',csv:`Email Address,OPTIN_TIME,CONFIRM_TIME\n${optedOut},${confirmed},${confirmed}\n${erased},${confirmed},${confirmed}`}],{consent});
  for(const address of [optedOut,erased])expect(await second.db.prepare('SELECT c.email_status AS contact,a.channel_status AS address FROM contacts c JOIN contact_email_addresses a ON a.contact_id=c.id WHERE c.email=?').bind(address).first())
   .toEqual({contact:'unsubscribed',address:'unsubscribed'});
 }finally{await second.close();}
});
