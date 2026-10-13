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
