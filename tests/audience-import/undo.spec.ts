import {test,expect} from '@playwright/test';
import {native,files,consent,finish} from './native';
test('CONT-010/004 completed native effects undo durably, every opt-out and suppression stays, and repeated undo is safe',async()=>{
 const h=await native();try{const preview=await h.service.preview({files:await files(),consent},h.context);const job=await h.service.create(preview.fingerprint,h.context);await finish(h,job.id);
  const restrictions=async()=>(await h.f.db.prepare("SELECT (SELECT json_group_array(id) FROM (SELECT id FROM surviving_opt_outs ORDER BY id)) AS optOuts,(SELECT json_group_array(id) FROM (SELECT id FROM contact_suppressions ORDER BY id)) AS suppressions").first<{optOuts:string;suppressions:string}>())!;
  const applied=await restrictions();expect(JSON.parse(applied.optOuts).length).toBeGreaterThan(0);expect(JSON.parse(applied.suppressions).length).toBeGreaterThan(0);
  await h.service.undo(job.id,h.context);await finish(h,job.id);expect((await h.service.read(job.id,h.context)).state).toBe('undone');
  for(const table of ['contacts','contact_email_addresses','consent_evidence','consent_capture_metadata'])expect(await h.f.db.prepare(`SELECT count(*) AS count FROM ${table}`).first()).toEqual({count:0});
  expect(await restrictions()).toEqual(applied);
  expect((await h.service.undo(job.id,h.context)).state).toBe('undone');
 }finally{await h.close();}
});
test('CONT-004/006 undo preserves a later unsubscribe and suppression',async()=>{
 const h=await native();try{
  const source=(await files()).slice(0,1);const preview=await h.service.preview({files:source,consent},h.context);const job=await h.service.create(preview.fingerprint,h.context);await finish(h,job.id);
  const contact=await h.f.db.prepare("SELECT id FROM contacts WHERE email='subscribed@example.test'").first<{id:string}>();
  const token=await h.f.services.audienceService.issueUnsubscribeToken(contact!.id,'email');await h.f.services.audienceService.unsubscribeWithToken(token.token);
  await h.service.undo(job.id,h.context);await expect(finish(h,job.id)).rejects.toThrow();expect(await h.f.db.prepare('SELECT email_status FROM contacts WHERE id=?').bind(contact!.id).first()).toEqual({email_status:'unsubscribed'});
  await h.f.services.audienceService.recordProviderSuppression({destination:'subscribed@example.test',channel:'email',cause:'hard',occurredAt:new Date(),providerEventId:'later-bounce'});
  await expect(h.service.undo(job.id,h.context)).rejects.toThrow();expect(await h.f.db.prepare('SELECT email_status FROM contacts WHERE id=?').bind(contact!.id).first()).toEqual({email_status:'suppressed'});
 }finally{await h.close();}
});
test('CONT-004/013 undoing a new profile preserves an optout that existed before import',async()=>{
 const h=await native();try{
  await h.f.services.audienceService.recordChannelOptOut({destination:'prior@example.test',channel:'email',reason:'erasure-survivor',occurredAt:new Date()});
  const preview=await h.service.preview({files:[{name:'prior.csv',preset:'csv-subscribed',csv:'Email Address\nprior@example.test'}]},h.context);const job=await h.service.create(preview.fingerprint,h.context);await finish(h,job.id);await h.service.undo(job.id,h.context);await finish(h,job.id);
  expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:0});expect(await h.f.db.prepare('SELECT reason FROM surviving_opt_outs').first()).toEqual({reason:'erasure-survivor'});
 }finally{await h.close();}
});
