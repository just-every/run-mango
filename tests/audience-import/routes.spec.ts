import {canonicalJson} from '../../src/vendor/base/import-kit/src/d1/index';
import {sha256} from '../../src/core/shared/ids';
import {eraseHttp} from './erase';
import {test,expect} from '@playwright/test';
import {invitationRuntime} from '../../operations/fixtures/invitation-runtime.mjs';
import {files,consent} from './native';
test('CONT-010 real Worker audience routes enforce session/origin and persist reviewed Base jobs',async()=>{
 const f=await invitationRuntime();try{
  expect((await f.call('/api/audience/import-presets')).status).toBe(401);const cookie=await f.bootstrap();const input={files:await files(),consent};
  expect((await f.call('/api/audience/import-preview',{cookie,method:'POST',body:input,origin:'https://foreign.test'})).status).toBe(403);
  const previewResponse=await f.call('/api/audience/import-preview',{cookie,method:'POST',body:input});expect(previewResponse.status).toBe(200);const preview=await previewResponse.json();expect(preview.counts).toMatchObject({created:4,updated:0,rejected:0,unsubscribed:2,suppressed:1});
  const response=await f.call('/api/audience/imports',{cookie,method:'POST',body:{fingerprint:preview.fingerprint}});expect(response.status).toBe(200);expect((await response.json()).job.state).toBe('completed');
  expect(preview.rows.every((row:object)=>!Object.hasOwn(row,'propertyColumns'))).toBe(true);
  expect(await f.db.prepare('SELECT source_digest FROM audience_import_plans WHERE fingerprint=?').bind(preview.fingerprint).first()).toEqual({source_digest:await sha256(canonicalJson({input,incumbentSources:null}))});
  expect((await f.call('/api/settings/properties',{cookie,method:'POST',body:{key:'synthetic_mango_1510',label:'synthetic-mango-1510',type:'date',options:[]}})).status).toBe(201);
  const repeat=await f.call('/api/audience/import-preview',{cookie,method:'POST',body:input});expect(repeat.status).toBe(200);expect((await repeat.json()).fingerprint).toBe(preview.fingerprint);
  const replay=await f.call('/api/audience/imports',{cookie,method:'POST',body:{fingerprint:preview.fingerprint}});expect(replay.status).toBe(200);expect((await replay.json()).job.state).toBe('completed');
  const exported=await f.call('/api/audience/export',{cookie});expect(exported.status).toBe(200);expect(exported.headers.get('content-type')).toContain('text/csv');expect(await exported.text()).toContain('ledger_json');
  const list=await f.call('/api/audience/imports',{cookie});expect(list.status).toBe(200);expect((await list.json()).jobs).toHaveLength(1);
  const signup=await f.call('/api/audience/signup',{cookie});expect((await signup.json()).embed).toContain('https://mango.example.test/subscribe');
 }finally{await f.close();}
});
test('CONT-013 erasure removes import originals and reviewed plans as well as contact consent',async()=>{
 const f=await invitationRuntime();try{
  const cookie=await f.bootstrap();const input={files:[{name:'erasure.csv',preset:'csv-unsubscribed',csv:'Email Address\nerase@example.test'}]};
  const preview=await(await f.call('/api/audience/import-preview',{cookie,method:'POST',body:input})).json();expect((await f.call('/api/audience/imports',{cookie,method:'POST',body:{fingerprint:preview.fingerprint}})).status).toBe(200);
  const contact=await f.db.prepare('SELECT id FROM contacts').first();expect((await eraseHttp(f,cookie,contact.id)).state).toBe('complete');
  for(const table of ['contacts','consent_evidence','audience_import_observations','ik_originals','ik_jobs','audience_import_plans'])expect(await f.db.prepare(`SELECT count(*) AS count FROM ${table}`).first()).toEqual({count:0});expect(await f.db.prepare('SELECT count(*) AS count FROM surviving_opt_outs').first()).toEqual({count:1});
 }finally{await f.close();}
});
test('CONT-010 legacy direct contact import is unavailable even to an authenticated operator',async()=>{
 const f=await invitationRuntime();try{const cookie=await f.bootstrap();const response=await f.call('/api/contacts/import',{cookie,method:'POST',body:{csv:'email\nlegacy@example.test'}});expect(response.status).toBe(404);expect(await f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:0});}finally{await f.close();}
});
test('CONT-013 erasure purges preview plan chunks and their identity index',async()=>{
 const f=await invitationRuntime();try{const cookie=await f.bootstrap();const input={files:[{name:'chunk-erasure.csv',preset:'csv-unsubscribed',csv:'Email Address\nerase-chunks@example.test'}]};const preview=await(await f.call('/api/audience/import-preview',{cookie,method:'POST',body:input})).json();
 expect((await f.call('/api/audience/imports',{cookie,method:'POST',body:{fingerprint:preview.fingerprint}})).status).toBe(200);
 expect(Number((await f.db.prepare('SELECT count(*) AS count FROM audience_import_plan_chunks').first()).count)).toBeGreaterThan(0);
 const contact=await f.db.prepare('SELECT id FROM contacts').first();expect((await eraseHttp(f,cookie,contact.id)).state).toBe('complete');
 for(const table of ['audience_import_plans','audience_import_plan_chunks','audience_import_plan_contacts'])expect(await f.db.prepare(`SELECT count(*) AS count FROM ${table}`).first()).toEqual({count:0});
 }finally{await f.close();}
});
test('CONT-003/004/010 CSV phone and email routes preserve independent evidence, reject identity conflicts and retain SMS restrictions through undo',async()=>{
 const f=await invitationRuntime();try{
  const cookie=await f.bootstrap();
  const preview=async(input:unknown)=>{const response=await f.call('/api/audience/import-preview',{cookie,method:'POST',body:input});expect(response.status).toBe(200);return response.json();};
  const apply=async(fingerprint:string)=>{const response=await f.call('/api/audience/imports',{cookie,method:'POST',body:{fingerprint}});expect(response.status).toBe(200);let {job}=await response.json();while(['queued','applying'].includes(job.state)){const response=await f.call(`/api/audience/imports/${job.id}/resume`,{cookie,method:'POST',body:{}});expect(response.status).toBe(200);job=(await response.json()).job;}expect(job.state).toBe('completed');return job;};
  const headers='email,phone,sms_status,sms_brand,sms_program,sms_category,sms_frequency,sms_jurisdiction,sms_consent_text,sms_consent_version,sms_capture_method,sms_capture_source,sms_occurred_at,sms_confirmed_at';
  const scope='Mango,News,newsletter,Weekly,AU,I agree,v1,signup,original-form,2026-01-01T00:00:00Z,2026-01-02T00:00:00Z';
  const input={consent,files:[{name:'sms.csv',preset:'csv-non-subscribed',csv:`${headers}\n,+61411111111,subscribed,${scope}\nboth@example.test,+61422222222,subscribed,${scope}\nmissing@example.test,+61433333333,subscribed${','.repeat(11)}\ninvalid@example.test,not-a-phone,subscribed,${scope}`}]};
  const reviewed=await preview(input);expect(reviewed.counts.rejected).toBe(1);expect(reviewed.rows.find((row:any)=>row.phone==='+61433333333').smsStatus).toBe('non-subscribed');
  const job=await apply(reviewed.fingerprint);expect((await apply((await preview(input)).fingerprint)).id).toBe(job.id);
  expect((await f.db.prepare('SELECT email,email_status,sms_status FROM contacts ORDER BY email').all()).results).toEqual([{email:null,email_status:'non-subscribed',sms_status:'subscribed'},{email:'both@example.test',email_status:'non-subscribed',sms_status:'subscribed'},{email:'missing@example.test',email_status:'non-subscribed',sms_status:'non-subscribed'}]);
  expect((await f.db.prepare('SELECT channel,destination,capture_source FROM consent_evidence ORDER BY destination').all()).results).toEqual([{channel:'sms',destination:'+61411111111',capture_source:'original-form'},{channel:'sms',destination:'+61422222222',capture_source:'original-form'}]);
  const phoneSearch=await f.call('/api/contacts/search?address=%2B61411111111',{cookie});expect(phoneSearch.status).toBe(200);expect((await phoneSearch.json()).contacts).toHaveLength(1);
  const conflict=await preview({files:[{name:'conflict.csv',preset:'csv-non-subscribed',csv:'email,phone\nboth@example.test,+61411111111'}]});expect(conflict.counts.rejected).toBe(1);
  const stop=await apply((await preview({files:[{name:'stop.csv',preset:'csv-non-subscribed',mapping:{sms_status:'chosen status'},csv:'phone,sms_status,chosen status\n+61444444444,unsubscribed,subscribed'}]})).fingerprint);
  expect((await f.call(`/api/audience/imports/${stop.id}/undo`,{cookie,method:'POST',body:{}})).status).toBe(200);
  expect(await f.db.prepare("SELECT count(*) AS n FROM surviving_opt_outs WHERE channel='sms'").first()).toEqual({n:1});
  await apply((await preview({files:[{name:'retry.csv',preset:'csv-non-subscribed',csv:`${headers}\n,+61444444444,subscribed,${scope}`}]})).fingerprint);
  expect(await f.db.prepare("SELECT channel_status FROM contact_phones WHERE phone_e164='+61444444444'").first()).toEqual({channel_status:'unsubscribed'});
  const exported=await f.call('/api/audience/export',{cookie});expect(exported.status).toBe(200);expect(await exported.text()).toContain('original-form');
  const stale=await preview({files:[{name:'stale.csv',preset:'csv-non-subscribed',csv:'email,phone\nrace@example.test,+61455555555'}]});
  await apply((await preview({files:[{name:'winner.csv',preset:'csv-non-subscribed',csv:'phone\n+61455555555'}]})).fingerprint);
  expect((await f.call('/api/audience/imports',{cookie,method:'POST',body:{fingerprint:stale.fingerprint}})).status).toBe(409);
  expect(await f.db.prepare("SELECT count(*) AS n FROM contacts WHERE email='race@example.test'").first()).toEqual({n:0});
 }finally{await f.close();}
});
