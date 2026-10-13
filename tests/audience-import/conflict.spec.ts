import {test,expect} from '@playwright/test';
import {native,files,consent,finish} from './native';
import {parseCsv,encodeCsv} from '../../src/core/features/audience/csv';
test('CONT-004/006 suppression arriving after review is preserved and the contact is written suppressed',async()=>{
 const h=await native();try{
  const preview=await h.service.preview({files:(await files()).slice(0,1),consent},h.context);
  await h.f.services.audienceService.recordProviderSuppression({destination:'subscribed@example.test',channel:'email',cause:'hard',occurredAt:new Date(),providerEventId:'late-preview-block'});
  const suppression=await h.f.db.prepare("SELECT * FROM contact_suppressions WHERE provider_event_id='late-preview-block'").first();
  expect((await finish(h,(await h.service.create(preview.fingerprint,h.context)).id)).state).toBe('completed');
  expect(await h.f.db.prepare("SELECT c.email_status AS contact,a.channel_status AS address FROM contacts c JOIN contact_email_addresses a ON a.contact_id=c.id WHERE c.email='subscribed@example.test'").first()).toEqual({contact:'suppressed',address:'suppressed'});
  expect(await h.f.db.prepare("SELECT * FROM contact_suppressions WHERE provider_event_id='late-preview-block'").first()).toEqual(suppression);
 }finally{await h.close();}
});
test('CONT-010 crafted export cannot reparent a different contact evidence by colliding native ID',async()=>{
 const h=await native();try{
  const preview=await h.service.preview({files:(await files()).slice(0,1),consent},h.context);const job=await h.service.create(preview.fingerprint,h.context);await finish(h,job.id);
  const row=parseCsv(await h.service.exportCsv())[0];const original=JSON.parse(row.ledger_json);const protectedEvidence=original.tables.consent_evidence[0];
  const ledger=structuredClone(original);const id='new-contact-id';ledger.tables.contacts[0].id=id;ledger.tables.contacts[0].email='injected@example.test';
  for(const [table,rows] of Object.entries(ledger.tables) as [string,any[]][]){for(const item of rows){if('contact_id'in item)item.contact_id=id;if(table==='contact_email_addresses'){item.id='new-address';item.email='injected@example.test';}if(table==='consent_evidence')item.destination='injected@example.test';if(table==='contact_history')item.id='new-history';} }
  ledger.identities[0].destination='injected@example.test';
  const crafted={...row,email:'injected@example.test',ledger_json:JSON.stringify(ledger)};const csv=encodeCsv([Object.keys(crafted),Object.values(crafted)]);
  const malicious=await h.service.preview({files:[{name:'collision.csv',preset:'mango',csv}]},h.context);
  expect(malicious.counts.rejected).toBe(0);await expect(h.service.create(malicious.fingerprint,h.context)).rejects.toThrow();
  expect(await h.f.db.prepare('SELECT contact_id FROM consent_evidence WHERE id=?').bind(protectedEvidence.id).first()).toEqual({contact_id:protectedEvidence.contact_id});
  expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:2});
 }finally{await h.close();}
});
test('CONT-004/010/013 contact and surviving optout IDs cannot overwrite unrelated native ownership',async()=>{
 const source=await native();let exported:string;try{const preview=await source.service.preview({files:[{name:'cleaned.csv',preset:'csv-cleaned',csv:'Email Address\nrestored@example.test'}]},source.context);await source.service.create(preview.fingerprint,source.context);exported=await source.service.exportCsv();}finally{await source.close();}
 const h=await native();try{
  const other=await h.f.services.audienceService.ensureContact({email:'other@example.test'},new Date());await h.f.services.audienceService.recordChannelOptOut({destination:'other@example.test',channel:'email',reason:'protect-other',occurredAt:new Date()});
  const existing=await h.f.db.prepare('SELECT * FROM surviving_opt_outs').first();
  const [original]=parseCsv(exported!);const ledger=JSON.parse(original.ledger_json);const owned=ledger.tables.surviving_opt_outs[0].id;ledger.tables.surviving_opt_outs[0].id=existing!.id;for(const row of ledger.tables.mango_audience_hashes)if(row.owned_opt_out_id===owned)row.owned_opt_out_id=existing!.id;
  const modified={...original,ledger_json:JSON.stringify(ledger)};const preview=await h.service.preview({files:[{name:'optout-collision.csv',preset:'mango',csv:encodeCsv([Object.keys(modified),Object.values(modified)])}]},h.context);expect(preview.counts.rejected).toBe(0);await expect(h.service.create(preview.fingerprint,h.context)).rejects.toThrow();expect(await h.f.db.prepare('SELECT * FROM surviving_opt_outs').first()).toEqual(existing);
  await h.f.services.audienceService.recordProviderSuppression({destination:'absent@example.test',channel:'email',cause:'provider-suppression',occurredAt:new Date(),providerEventId:'absent-protected'});
  const existingSuppression=await h.f.db.prepare("SELECT * FROM contact_suppressions WHERE provider_event_id='absent-protected'").first();
  const suppressedLedger=JSON.parse(original.ledger_json);const priorSuppression=suppressedLedger.tables.contact_suppressions[0].id;suppressedLedger.tables.contact_suppressions[0].id=existingSuppression!.id;suppressedLedger.tables.contact_suppressions[0].contact_id=null;
  for(const row of suppressedLedger.tables.mango_audience_hashes)row.owned_suppression_ids=JSON.stringify(JSON.parse(row.owned_suppression_ids).map((id:string)=>id===priorSuppression?existingSuppression!.id:id));
  const suppressedCsv={...original,ledger_json:JSON.stringify(suppressedLedger)};const suppressedPreview=await h.service.preview({files:[{name:'suppression-collision.csv',preset:'mango',csv:encodeCsv([Object.keys(suppressedCsv),Object.values(suppressedCsv)])}]},h.context);expect(suppressedPreview.counts.rejected).toBe(0);await expect(h.service.create(suppressedPreview.fingerprint,h.context)).rejects.toThrow();expect(await h.f.db.prepare("SELECT * FROM contact_suppressions WHERE provider_event_id='absent-protected'").first()).toEqual(existingSuppression);
  const collision=JSON.parse(original.ledger_json);collision.tables.contacts[0].id=other.contact.id;for(const rows of Object.values(collision.tables) as any[][])for(const row of rows)if('contact_id'in row)row.contact_id=other.contact.id;
  const malicious={...original,ledger_json:JSON.stringify(collision)};const rejected=await h.service.preview({files:[{name:'contact-collision.csv',preset:'mango',csv:encodeCsv([Object.keys(malicious),Object.values(malicious)])}]},h.context);expect(rejected.counts.rejected).toBe(1);expect(rejected.rows[0].reason).toContain('different canonical identity');
  expect(await h.f.db.prepare('SELECT email,email_status FROM contacts').first()).toEqual({email:'other@example.test',email_status:'unsubscribed'});
 }finally{await h.close();}
});
