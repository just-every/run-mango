import {test,expect} from '@playwright/test';
import {native,files,consent,finish} from './native';
import {createAudienceImportService} from '../../src/core/features/audience/import-service';
test('CONT-003/004/006/010 suppression-first real D1 import resumes after runtime interruption and repeats without effects',async()=>{
 const h=await native();try{
  const input={files:await files(),consent};const preview=await h.service.preview(input,h.context);expect(preview.rows.filter(r=>r.email==='conflict@example.test').some(r=>r.status==='unsubscribed')).toBeTruthy();
  let job=await h.service.create(preview.fingerprint,h.context);expect(job.state).toBe('applying');
  expect((await h.f.db.prepare('SELECT email,email_status FROM contacts').all()).results).toEqual([{email:'cleaned@example.test',email_status:'suppressed'}]);
  const resumed=await h.restart();h.context.storage.database=resumed.db;h.service=createAudienceImportService(resumed.platform);
  job=await finish(h,job.id);expect(job.state).toBe('completed');
  const statuses=(await resumed.db.prepare('SELECT email,email_status FROM contacts ORDER BY email').all()).results;
  expect(statuses).toEqual([{email:'cleaned@example.test',email_status:'suppressed'},{email:'conflict@example.test',email_status:'unsubscribed'},{email:'subscribed@example.test',email_status:'subscribed'},{email:'unsubscribed@example.test',email_status:'unsubscribed'}]);
  const evidence=await resumed.db.prepare('SELECT c.capture_source,c.occurred_at,m.capture_ip,m.confirmation_ip FROM consent_evidence c JOIN consent_capture_metadata m ON m.id=c.id').first();
  expect(evidence).toMatchObject({capture_source:'CSV import: subscribed.csv',occurred_at:Date.parse('2026-09-01T10:00:00Z'),capture_ip:'192.0.2.10',confirmation_ip:'192.0.2.11'});
  const repeat=await h.service.preview(input,h.context);expect(repeat.fingerprint).toBe(preview.fingerprint);expect((await h.service.create(repeat.fingerprint,h.context)).id).toBe(job.id);
  expect(await resumed.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:4});
 }finally{await h.close();}
});
test('CONT-010 atomic native collision and revoked authority fail before any import effect',async()=>{
 const h=await native();try{const preview=await h.service.preview({files:await files(),consent},h.context);await h.f.db.prepare("UPDATE test_import_authority SET active=0").run();await expect(h.service.create(preview.fingerprint,h.context)).rejects.toThrow();expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:0});}finally{await h.close();}
});
test('CONT-004/006 native wrong-preset import honors Email Marketing Status rather than subscribed selection',async()=>{
 const h=await native();try{
  const preview=await h.service.preview({consent,files:[{name:'full-header.csv',preset:'csv-subscribed',csv:'Email Address,Email Marketing Status,OPTIN_TIME,OPTIN_IP,CONFIRM_TIME,CONFIRM_IP,MEMBER_RATING,TAGS\nstop@example.test,unsubscribed,2026-09-01 10:00:00,192.0.2.1,2026-09-01 10:05:00,192.0.2.1,2,newsletter\ncleaned@example.test,cleaned,2026-09-01 10:00:00,192.0.2.2,2026-09-01 10:05:00,192.0.2.2,2,newsletter'}]},h.context);
  const job=await h.service.create(preview.fingerprint,h.context);await finish(h,job.id);expect((await h.f.db.prepare('SELECT email_status FROM contacts ORDER BY email').all()).results).toEqual([{email_status:'suppressed'},{email_status:'unsubscribed'}]);expect(await h.f.db.prepare("SELECT count(*) AS count FROM contacts WHERE email_status='subscribed'").first()).toEqual({count:0});
 }finally{await h.close();}
});
test('CONT-010 a changed mapping invalidates cached preview while identical artifact and consent reuse original effects',async()=>{
 const h=await native();try{const input={files:(await files()).slice(0,1),consent};const first=await h.service.preview(input,h.context);const job=await h.service.create(first.fingerprint,h.context);await finish(h,job.id);
  const before=(await h.f.db.prepare('SELECT count(*) AS count FROM consent_evidence').first());const repeated=await h.service.preview({consent,files:input.files},h.context);expect(repeated.fingerprint).toBe(first.fingerprint);expect((await h.service.create(repeated.fingerprint,h.context)).id).toBe(job.id);expect(await h.f.db.prepare('SELECT count(*) AS count FROM consent_evidence').first()).toEqual(before);
  const changed=await h.service.preview({files:input.files,consent:{...consent,consentVersion:'different-scope'}},h.context);expect(changed.fingerprint).not.toBe(first.fingerprint);await expect(h.service.create(changed.fingerprint,h.context)).rejects.toThrow();
 }finally{await h.close();}
});
test('CONT-010 chunked preview custody detects missing or edited bytes before apply',async()=>{
 const h=await native();try{
  const preview=await h.service.preview({files:await files(),consent},h.context);
  const chunk=await h.f.db.prepare('SELECT ordinal,content FROM audience_import_plan_chunks WHERE fingerprint=? ORDER BY ordinal LIMIT 1').bind(preview.fingerprint).first<{ordinal:number;content:string}>();
  await h.f.db.prepare('UPDATE audience_import_plan_chunks SET content=? WHERE fingerprint=? AND ordinal=?').bind(chunk!.content+' ',preview.fingerprint,chunk!.ordinal).run();
  await expect(h.service.create(preview.fingerprint,h.context)).rejects.toThrow('custody has changed');
  await h.f.db.prepare('DELETE FROM audience_import_plan_chunks WHERE fingerprint=? AND ordinal=?').bind(preview.fingerprint,chunk!.ordinal).run();
  await expect(h.service.create(preview.fingerprint,h.context)).rejects.toThrow('custody is incomplete');
  expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:0});
 }finally{await h.close();}
});
test('CONT-010 a rewritten custody digest cannot change the reviewed plan fingerprint',async()=>{
 const h=await native();try{
  const preview=await h.service.preview({files:await files(),consent},h.context);
  const {sha256}=await import('../../src/vendor/base/import-kit/src/d1/index');
  const chunks=(await h.f.db.prepare('SELECT ordinal,content FROM audience_import_plan_chunks WHERE fingerprint=? ORDER BY ordinal').bind(preview.fingerprint).all<{ordinal:number;content:string}>()).results;
  const plan=JSON.parse(chunks.map(row=>row.content).join(''));plan.counts.rejected++;
  const changed=JSON.stringify(plan);
  await h.f.db.prepare('DELETE FROM audience_import_plan_chunks WHERE fingerprint=?').bind(preview.fingerprint).run();
  await h.f.db.prepare('INSERT INTO audience_import_plan_chunks(fingerprint,ordinal,content) VALUES(?,0,?)').bind(preview.fingerprint,changed).run();
  await h.f.db.prepare('UPDATE audience_import_plans SET plan_json=? WHERE fingerprint=?').bind(JSON.stringify({format:'mango-plan-chunks-v1',chunks:1,sha256:sha256(changed)}),preview.fingerprint).run();
  await expect(h.service.create(preview.fingerprint,h.context)).rejects.toThrow('fingerprint has changed');
  expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:0});
 }finally{await h.close();}
});
test('CONT-010 an existing inline reviewed plan remains readable and fingerprint fenced',async()=>{
 const h=await native();try{
  const preview=await h.service.preview({files:await files(),consent},h.context);
  const chunks=(await h.f.db.prepare('SELECT content FROM audience_import_plan_chunks WHERE fingerprint=? ORDER BY ordinal').bind(preview.fingerprint).all<{content:string}>()).results;
  const original=chunks.map(row=>row.content).join('');
  await h.f.db.prepare('UPDATE audience_import_plans SET plan_json=? WHERE fingerprint=?').bind(original,preview.fingerprint).run();
  await h.f.db.prepare('DELETE FROM audience_import_plan_chunks WHERE fingerprint=?').bind(preview.fingerprint).run();
  const changed=JSON.parse(original);changed.counts.rejected++;
  await h.f.db.prepare('UPDATE audience_import_plans SET plan_json=? WHERE fingerprint=?').bind(JSON.stringify(changed),preview.fingerprint).run();
  await expect(h.service.create(preview.fingerprint,h.context)).rejects.toThrow('fingerprint has changed');
  expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:0});
  await h.f.db.prepare('UPDATE audience_import_plans SET plan_json=? WHERE fingerprint=?').bind(original,preview.fingerprint).run();
  const job=await h.service.create(preview.fingerprint,h.context);expect((await finish(h,job.id)).state).toBe('completed');
  expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:4});
 }finally{await h.close();}
});
test('CONT-010/013 preview chunks and erasure identities commit atomically',async()=>{
 const h=await native();try{
  await h.f.db.prepare("CREATE TRIGGER test_reject_plan_identity BEFORE INSERT ON audience_import_plan_contacts BEGIN SELECT RAISE(ABORT,'test identity index failure'); END").run();
  await expect(h.service.preview({files:await files(),consent},h.context)).rejects.toThrow('test identity index failure');
  for(const table of ['audience_import_plans','audience_import_plan_chunks','audience_import_plan_contacts'])expect(await h.f.db.prepare(`SELECT count(*) AS count FROM ${table}`).first()).toEqual({count:0});
 }finally{await h.close();}
});
