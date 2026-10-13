import {test,expect} from '@playwright/test';
import {invitationRuntime} from '../../operations/fixtures/invitation-runtime.mjs';
import {eraseHttp} from './erase';

type Fixture=Awaited<ReturnType<typeof invitationRuntime>>;
async function capture(f:Fixture,cookie:string,email:string,displayName=email){
 const response=await f.call('/api/contacts/consent',{cookie,method:'POST',body:{contact:{email,displayName},channel:'email',brandOrLegalSender:'Mango',messageCategory:'offers',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',captureMethod:'form',captureSource:'Operator capture',consentText:'I agree to weekly offers.',consentVersion:'v1',occurredAt:new Date().toISOString()}});
 expect(response.status).toBe(201);return (await response.json()).contact;
}
async function snapshot(f:Fixture){
 const tables=(await f.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('_cf_METADATA','test_barriers') ORDER BY name").all()).results;
 return Promise.all(tables.map(async({name})=>({name,rows:(await f.db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()).results})));
}
async function held(f:Fixture,id:string){await expect.poll(async()=>Boolean(await f.db.prepare('SELECT id FROM test_barriers WHERE id=?').bind(id).first())).toBe(true);}
async function release(f:Fixture,id:string){await f.db.prepare('UPDATE test_barriers SET released=1 WHERE id=?').bind(id).run();}

test('CONT-013 merge and erasure admission serialize without stranded subjects, locks or refusal side effects',async()=>{
 test.setTimeout(180000);const f=await invitationRuntime();const running:Promise<Response>[]=[];
 try{
  const cookie=await f.bootstrap();
  const preview=await f.call('/api/audience/import-preview',{cookie,method:'POST',body:{files:[{name:'racing-contacts.csv',preset:'csv-unsubscribed',csv:'Email Address\nmerge-old@example.test\nmerge-survivor@example.test'}]}});expect(preview.status).toBe(200);
  let imported=await f.call('/api/audience/imports',{cookie,method:'POST',body:{fingerprint:(await preview.json()).fingerprint}});expect(imported.status).toBe(200);let {job}=await imported.json();
  while(['queued','applying'].includes(job.state)){imported=await f.call(`/api/audience/imports/${job.id}/resume`,{cookie,method:'POST',body:{}});expect(imported.status).toBe(200);({job}=await imported.json());}expect(job.state).toBe('completed');
  const a=await f.db.prepare("SELECT id FROM contacts WHERE email='merge-old@example.test'").first(),b=await f.db.prepare("SELECT id FROM contacts WHERE email='merge-survivor@example.test'").first(),other=await capture(f,cookie,'merge-independent@example.test');
  // Capture before merge, then let the entire public merge commit first.
  const deletion=f.call(`/api/contacts/${a.id}`,{cookie,method:'DELETE',headers:{'X-Test-Barrier':'merge-completes','X-Test-Sql-Prefix':'SELECT * FROM contacts WHERE id=?'}});running.push(deletion);await held(f,'merge-completes');
  expect((await f.call('/api/contacts/merge',{cookie,method:'POST',body:{survivorContactId:b.id,mergedContactId:a.id}})).status).toBe(200);
  const before=await snapshot(f);await release(f,'merge-completes');expect((await deletion).status).toBe(404);expect(await snapshot(f)).toEqual(before);
  expect((await f.call('/api/audience',{cookie})).status).toBe(200);
  // While another merge owns its locks, erasure of even an unrelated contact
  // must not change the global generation and break that merge's cleanup.
  const c=await capture(f,cookie,'merge-third@example.test');
  const merging=f.call('/api/contacts/merge',{cookie,method:'POST',headers:{'X-Test-Barrier':'merge-locked','X-Test-Target':b.id,'X-Test-Sql-Prefix':'select "id", "email", "display_name"'},body:{survivorContactId:b.id,mergedContactId:c.id}});running.push(merging);await held(f,'merge-locked');
  expect((await f.db.prepare('SELECT count(*) n FROM contacts WHERE merge_lock IS NOT NULL').first()).n).toBe(2);
  const locked=await snapshot(f);
  for(const id of [b.id,c.id,other.id])expect((await f.call(`/api/contacts/${id}`,{cookie,method:'DELETE'})).status).toBe(409);
  expect(await snapshot(f)).toEqual(locked);await release(f,'merge-locked');expect((await merging).status).toBe(200);
  expect((await f.db.prepare('SELECT count(*) n FROM contacts WHERE merge_lock IS NOT NULL').first()).n).toBe(0);
  // An already-admitted merge paused before its lock transaction must also
  // lose to erasure without stranding any locks after the generation changes.
  const lateMerge=f.call('/api/contacts/merge',{cookie,method:'POST',headers:{'X-Test-Barrier':'erasure-first','X-Test-Sql-Prefix':'UPDATE contacts SET merge_lock','X-Test-Before-Batch':'1'},body:{survivorContactId:other.id,mergedContactId:b.id}});running.push(lateMerge);await held(f,'erasure-first');
  const begun=await f.call(`/api/contacts/${b.id}`,{cookie,method:'DELETE'});expect(begun.status).toBe(202);
  await release(f,'erasure-first');expect((await lateMerge).status).toBe(409);
  expect((await f.call('/api/contacts/merge',{cookie,method:'POST',body:{survivorContactId:other.id,mergedContactId:b.id}})).status).toBe(409);
  expect((await eraseHttp(f,cookie,b.id)).state).toBe('complete');
  expect(await f.db.prepare('SELECT id,merge_lock FROM contacts WHERE id=?').bind(other.id).first()).toEqual({id:other.id,merge_lock:null});
  expect((await f.call('/api/audience',{cookie})).status).toBe(200);
 }finally{await f.db.prepare('UPDATE test_barriers SET released=1').run();await Promise.allSettled(running);await f.close();}
});

test('CONT-013 changed contact rejects stale deletion and known manual names survive rename and merge for later redaction of attributed copies',async()=>{
 test.setTimeout(180000);const f=await invitationRuntime();let deletion:Promise<Response>|undefined;
 try{
  const cookie=await f.bootstrap(),oldName='Manual Originalnamecanary',laterName='Manual Changednamecanary';
  const person=await capture(f,cookie,'manual-old@example.test',oldName),survivor=await capture(f,cookie,'manual-survivor@example.test','CurrentSurvivorCanary');
  const rule=JSON.stringify({version:1,operator:'any',predicates:[{sourceType:'contact',field:'displayName',comparator:'eq',value:oldName},{sourceType:'contact',field:'email',comparator:'eq',value:person.email}]});
  expect((await f.call('/api/audience/segments',{cookie,method:'POST',body:{name:'Known names',inclusionRuleJson:rule,exclusionRulesJson:'[]'}})).status).toBe(201);
  const draft=await(await f.call('/api/campaigns',{cookie,method:'POST',body:{mode:'blank'}})).json();
  expect((await f.call(`/api/campaign-revisions/${draft.revisionId}`,{cookie,method:'PATCH',body:{emailBody:`<p>${oldName} and ${laterName} (${person.email})</p>`}})).status).toBe(200);
  deletion=f.call(`/api/contacts/${person.id}`,{cookie,method:'DELETE',headers:{'X-Test-Barrier':'name-changed','X-Test-Sql-Prefix':'SELECT * FROM contacts WHERE id=?'}});await held(f,'name-changed');
  await capture(f,cookie,person.email,laterName);const before=await snapshot(f);await release(f,'name-changed');expect((await deletion).status).toBe(409);expect(await snapshot(f)).toEqual(before);
  expect((await f.call('/api/contacts/merge',{cookie,method:'POST',body:{survivorContactId:survivor.id,mergedContactId:person.id}})).status).toBe(200);
  expect((await f.db.prepare("SELECT detail FROM contact_history WHERE contact_id=? AND kind='contact-name'").bind(survivor.id).all()).results.map(row=>row.detail).sort()).toEqual([oldName,laterName].sort());
  expect((await f.db.prepare('SELECT count(*) n FROM audience_import_plans').first()).n).toBe(0);
  expect((await eraseHttp(f,cookie,survivor.id)).state).toBe('complete');
  // test_mail is the external provider recorder, outside product custody.
  const after=JSON.stringify((await snapshot(f)).filter(row=>row.name!=='test_mail'));for(const value of [oldName,laterName,person.email,survivor.email,'CurrentSurvivorCanary'])expect(after).not.toContain(value);
  expect((await f.db.prepare('SELECT state FROM campaign_revisions WHERE id=?').bind(draft.revisionId).first()).state).toBe('erasure-invalidated');
 }finally{await f.db.prepare('UPDATE test_barriers SET released=1').run();await deletion?.catch(()=>{});await f.close();}
});
