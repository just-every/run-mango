import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import {invitationRuntime} from '../../operations/fixtures/invitation-runtime.mjs';
import {eraseHttp} from './erase';
import {parseCsv} from '../../src/core/features/audience/csv';

function decoded(value:unknown):string{
 if(Array.isArray(value))return value.map(decoded).join('\n');
 if(value&&typeof value==='object')return Object.entries(value).map(([key,item])=>key+' '+decoded(item)).join('\n');
 if(typeof value!=='string')return String(value);
 let result=value;
 try{const parsed=JSON.parse(value);if(typeof parsed==='object'&&parsed)result+='\n'+decoded(parsed);}catch{}
 if(value.length>=16&&value.length%4===0&&/^[A-Za-z0-9+/]+={0,2}$/.test(value)){
  const text=Buffer.from(value,'base64').toString('utf8');if(text!==value&&Buffer.from(text).toString('base64')===value)result+='\n'+decoded(text);
 }
 return result;
}
async function importFile(f:any,cookie:string,input:unknown){
 const response=await f.call('/api/audience/import-preview',{cookie,method:'POST',body:input});expect(response.status).toBe(200);const preview=await response.json();
 const created=await f.call('/api/audience/imports',{cookie,method:'POST',body:{fingerprint:preview.fingerprint}});expect(created.status).toBe(200);let {job}=await created.json();
 while(['queued','applying'].includes(job.state)){const next=await f.call(`/api/audience/imports/${job.id}/resume`,{cookie,method:'POST',body:{}});expect(next.status).toBe(200);({job}=await next.json());}
 expect(job.state).toBe('completed');return job;
}
test('CONT-013 public erasure resumes, keeps each restriction, withdraws complete source custody, redacts attributed copies, leaves shared text and keeps reimport unsendable',async()=>{
 const salt='synthetic-mango-erasure-contact-salt-more-than-thirty-two-bytes',local=(address:string)=>createHash('sha256').update(`${salt}:${address}`).digest('hex');
 test.setTimeout(180000);const f=await invitationRuntime({contactHashSalt:salt});try{
  const cookie=await f.bootstrap(),email='privacy-cascade-canary@example.test',name='Canary Privacyperson',cleaned='privacy-cleaned@example.test';
  const input={files:[{name:`${name} (${email}).csv`,preset:'csv-unsubscribed',csv:`Email Address,First Name,OPTIN_IP,NOTES\n${email},${name},198.51.100.189,OriginalPrivateMessage\n${email},DuplicatePrivatePerson,198.51.100.189,DuplicatePrivateMessage\nprivacy-alias@example.test,Ann,,AliasPrivateMessage\nsurvivor@example.test,Annual survivor,,Safe original`},{name:`cleaned (${cleaned}).csv`,preset:'csv-cleaned',csv:`Email Address\n${cleaned}`}]};
  const job=await importFile(f,cookie,input);const contact=await f.db.prepare('SELECT id FROM contacts WHERE email=?').bind(email).first();
  // An opted-out alias and a suppressed (cleaned) contact both merge into the erased contact.
  for(const address of ['privacy-alias@example.test',cleaned]){const merged=await f.db.prepare('SELECT id FROM contacts WHERE email=?').bind(address).first();
   expect((await f.call('/api/contacts/merge',{cookie,method:'POST',body:{survivorContactId:contact.id,mergedContactId:merged.id}})).status).toBe(200);}
  const restrictions=async()=>Promise.all(['SELECT destination_hash,channel,reason,occurred_at FROM surviving_opt_outs ORDER BY destination_hash,reason','SELECT destination_hash,channel,cause,occurred_at,contact_id FROM contact_suppressions ORDER BY destination_hash,cause'].map(async sql=>(await f.db.prepare(sql).all()).results));
  const [optOuts,suppressions]=await restrictions();
  expect(optOuts.map((row:any)=>[row.destination_hash,row.reason])).toEqual(expect.arrayContaining([[local(email),'import-unsubscribed'],[local('privacy-alias@example.test'),'import-unsubscribed'],[local(cleaned),'import-suppressed']]));
  expect(suppressions).toEqual([expect.objectContaining({destination_hash:local(cleaned),channel:'email',cause:'import-cleaned-or-bounced',contact_id:expect.any(String)})]);
  const rule=JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'email',comparator:'eq',value:email}]});
  expect((await f.call('/api/audience/segments',{cookie,method:'POST',body:{name:'Saved private rule',inclusionRuleJson:rule,exclusionRulesJson:'[]'}})).status).toBe(201);
  const draft=await(await f.call('/api/campaigns',{cookie,method:'POST',body:{mode:'blank'}})).json();
  expect((await f.call(`/api/campaign-revisions/${draft.revisionId}`,{cookie,method:'PATCH',body:{name:`For ${name}`,inclusionRuleJson:rule,emailBody:`<p>${JSON.stringify({nested:Buffer.from(email).toString('base64')})}</p>`}})).status).toBe(200);
  expect((await f.db.prepare('SELECT email_body FROM campaign_revisions WHERE id=?').bind(draft.revisionId).first()).email_body).toContain(Buffer.from(email).toString('base64'));
  expect((await f.call('/api/campaign-templates',{cookie,method:'POST',body:{revisionId:draft.revisionId,name:`Template for ${name}`}})).status).toBe(201);
  await f.db.prepare('INSERT INTO newsletter_archive(id,campaign_id,revision_id,title,description,sender,body,sent_at,published_at) VALUES(?,?,?,?,?,?,?,?,?)').bind('privacy-public-copy',draft.campaignId,draft.revisionId,`A letter for ${name}`,'A published letter','Example',`<p>${email}</p>`,Date.now(),Date.now()).run();
  await f.bucket.put('private-note.json',JSON.stringify({payload:Buffer.from(email).toString('base64')}),{customMetadata:{label:name}});
  await f.bucket.put('unrelated-asset.txt','An annual letter survives.');await f.bucket.put('empty-asset.txt','');
  // Shared text that merely spells the merged alias's name ("Ann") or ordinary
  // words is nobody's personal data: erasure must leave it byte-equal.
  const shared=await(await f.call('/api/campaigns',{cookie,method:'POST',body:{mode:'blank'}})).json();
  expect((await f.call(`/api/campaign-revisions/${shared.revisionId}`,{cookie,method:'PATCH',body:{name:'Ann picks for Annual members',emailBody:'<p>Ann says: mark your calendar for the Annual Marketing day.</p>'}})).status).toBe(200);
  expect((await f.call('/api/audience/segments',{cookie,method:'POST',body:{name:'Ann regulars',inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'displayName',comparator:'eq',value:'Ann'}]}),exclusionRulesJson:'[]'}})).status).toBe(201);
  await f.bucket.put('shared/ann-letter.txt','Ann wrote: mark your calendar.',{customMetadata:{label:'Ann'}});
  const sharedRows=async()=>[(await f.db.prepare('SELECT * FROM campaign_revisions WHERE id=?').bind(shared.revisionId).first()),(await f.db.prepare("SELECT * FROM audience_segments WHERE name='Ann regulars'").first()),(await f.db.prepare("SELECT * FROM contacts WHERE email='survivor@example.test'").first())];
  const sharedBefore=await sharedRows();
  const before=await f.db.prepare('SELECT * FROM contacts WHERE id=?').bind(contact.id).first();
  expect((await f.call(`/api/contacts/${contact.id}`,{method:'DELETE'})).status).toBe(401);
  expect((await f.call(`/api/contacts/${contact.id}`,{cookie,method:'DELETE',origin:'https://foreign.test'})).status).toBe(403);
  expect(await f.db.prepare('SELECT * FROM contacts WHERE id=?').bind(contact.id).first()).toEqual(before);
  const concurrent=f.call('/api/audience/import-preview',{cookie,method:'POST',headers:{'X-Test-Barrier':'erasure-preview-race','X-Test-Sql-Prefix':'SELECT fingerprint,plan_json FROM audience_import_plans'},body:{files:[{name:'race.csv',preset:'csv-unsubscribed',csv:`Email Address,First Name\n${email},ConcurrentPrivatePerson`}]}});
  await expect.poll(async()=>Boolean(await f.db.prepare("SELECT id FROM test_barriers WHERE id='erasure-preview-race'").first())).toBe(true);
  const started=await f.call(`/api/contacts/${contact.id}`,{cookie,method:'DELETE'});expect(started.status).toBe(202);const pending=(await started.json()).receipt;
  expect((await f.call('/api/audience/import-preview',{cookie,method:'POST',body:input})).status).toBe(503);
  // A distinct request resumes persisted progress; no caller-local scope is needed.
  expect((await(await f.call(`/api/audience/erasures/${pending.reference}`,{cookie})).json()).receipt.state).toBe('pending');
  const receipt=await eraseHttp(f,cookie,contact.id);expect(receipt.state).toBe('complete');expect(receipt.reference).toBe(pending.reference);expect(receipt.retainedChannels).toEqual(['email']);
  // Each restricted identity, opted-out and suppressed aliases included, keeps its own hash, channel,
  // reason and occurrence time and gains an erasure opt-out; the suppression stays a detached suppression.
  const [keptOptOuts,keptSuppressions]=await restrictions();
  expect(keptOptOuts.filter((row:any)=>row.reason!=='erasure-opt-out')).toEqual(optOuts);
  expect(keptOptOuts.filter((row:any)=>row.reason==='erasure-opt-out').map((row:any)=>row.destination_hash).sort()).toEqual([email,'privacy-alias@example.test',cleaned].map(local).sort());
  expect(keptSuppressions).toEqual(suppressions.map((row:any)=>({...row,contact_id:null})));
  await f.db.prepare("UPDATE test_barriers SET released=1 WHERE id='erasure-preview-race'").run();
  expect((await concurrent).status).toBeGreaterThanOrEqual(400);
  const tables=(await f.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_cf_METADATA'").all()).results;
  const dump=[];for(const {name:table}of tables)dump.push({table,rows:(await f.db.prepare(`SELECT * FROM "${table.replaceAll('"','""')}"`).all()).results});
  expect(await f.bucket.get('private-note.json')).toBeNull();expect(await(await f.bucket.get('unrelated-asset.txt'))!.text()).toBe('An annual letter survives.');
  expect(await sharedRows()).toEqual(sharedBefore);const letter=await f.bucket.get('shared/ann-letter.txt');expect(await letter!.text()).toBe('Ann wrote: mark your calendar.');expect(letter!.customMetadata).toEqual({label:'Ann'});
  expect(JSON.stringify(dump)).not.toContain(Buffer.from(email).toString('base64'));
  const all=decoded(dump);for(const canary of [email,name,'DuplicatePrivatePerson','OriginalPrivateMessage','DuplicatePrivateMessage','198.51.100.189','privacy-alias@example.test','AliasPrivateMessage',cleaned,contact.id])expect(all).not.toContain(canary);
  expect(await f.db.prepare("SELECT email_status,display_name FROM contacts WHERE email='survivor@example.test'").first()).toEqual({email_status:'unsubscribed',display_name:'Annual survivor'});
  expect((await f.db.prepare("SELECT count(*) AS n FROM lifecycle_audit_entries WHERE action='erased'").first()).n).toBe(1);
  expect((await f.db.prepare('SELECT state FROM campaign_revisions WHERE id=?').bind(draft.revisionId).first()).state).toBe('erasure-invalidated');
  expect((await f.call(`/api/audience/imports/${job.id}/undo`,{cookie,method:'POST',body:{}})).status).toBeGreaterThanOrEqual(400);
  expect(await(await f.call('/api/audience/export',{cookie})).text()).not.toContain(email);
  await importFile(f,cookie,input);expect(await f.db.prepare('SELECT email_status FROM contacts WHERE email=?').bind(email).first()).toEqual({email_status:'unsubscribed'});
  expect(await f.db.prepare("SELECT email_status FROM contacts WHERE email='privacy-alias@example.test'").first()).toEqual({email_status:'unsubscribed'});
  expect(await f.db.prepare('SELECT email_status FROM contacts WHERE email=?').bind(cleaned).first()).toEqual({email_status:'suppressed'});
  const audience=await(await f.call('/api/campaign-authoring/audience',{cookie,method:'POST',body:{inclusionRuleJson:rule,exclusionRulesJson:'[]',channels:['email']}})).json();expect(audience.eligibleCount).toBe(0);
  expect((await f.db.prepare('SELECT count(*) AS n FROM test_mail').first()).n).toBe(0);
 }finally{await f.close();}
});
async function capture(f:any,cookie:string,email:string,displayName:string){
 const response=await f.call('/api/contacts/consent',{cookie,method:'POST',body:{contact:{email,displayName},channel:'email',brandOrLegalSender:'Mango',messageCategory:'offers',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',captureMethod:'form',captureSource:'Operator capture',consentText:'I agree to weekly offers.',consentVersion:'v1',occurredAt:new Date().toISOString()}});
 expect(response.status).toBe(201);return (await response.json()).contact;
}
test('CONT-013 erasure removes an address inside URLs and storage keys and keeps longer addresses that contain it',async()=>{
 test.setTimeout(120000);const f=await invitationRuntime();try{
  const cookie=await f.bootstrap(),ann=await capture(f,cookie,'ann@x.test','Ann Lee');await capture(f,cookie,'xann@x.test','Xavier Ann');
  const draft=await(await f.call('/api/campaigns',{cookie,method:'POST',body:{mode:'blank'}})).json();
  expect((await f.call(`/api/campaign-revisions/${draft.revisionId}`,{cookie,method:'PATCH',body:{name:'Survey',emailBody:'<p><a href="https://shop.test/survey?email=ann@x.test&src=news">Survey</a> https://shop.test/u/ann@x.test/prefs and https://shop.test/u/xann@x.test/prefs or ann@x.test.example</p>'}})).status).toBe(200);
  const file=(address:string,extension:string)=>`exports/${address}.${extension}`;
  const kept=['contacts/xann@x.test/avatar.png','contacts/ann@x.test.example/avatar.png','exports/ann@x.test.example',file('xann@x.test','json'),file('ann@x.test.example','json')];
  for(const key of ['contacts/ann@x.test/avatar.png',file('ann@x.test','json'),file('ANN@x.test','csv.gz'),...kept])await f.bucket.put(key,'neutral bytes');
  const keys=async()=>(await f.bucket.list()).objects.map((object:{key:string})=>object.key).sort();
  const before=await keys();
  expect((await eraseHttp(f,cookie,ann.id)).state).toBe('complete');
  const body=(await f.db.prepare('SELECT email_body FROM campaign_revisions WHERE id=?').bind(draft.revisionId).first()).email_body;
  // Saved in canonical form (CAMP-022), which writes the query's & as &amp; inside the attribute.
  expect(body).toContain('https://shop.test/survey?email=[erased]&amp;src=news');expect(body).toContain('https://shop.test/u/[erased]/prefs');
  expect(body).toContain('https://shop.test/u/xann@x.test/prefs or ann@x.test.example');
  expect(before).toHaveLength(kept.length+3);expect(await keys()).toEqual([...kept].sort());
 }finally{await f.close();}
});
test('CONT-013 a capture IP shared with another person never touches their separate import',async()=>{
 test.setTimeout(120000);const f=await invitationRuntime();try{
  const cookie=await f.bootstrap();
  const when=new Date(Date.now()-60000).toISOString();
  await importFile(f,cookie,{files:[{name:'monday.csv',preset:'csv-subscribed',csv:`Email Address,First Name,OPTIN_IP,OPTIN_TIME,CONFIRM_TIME\nerin@x.test,Erin Fairweather,198.51.100.20,${when},${when}`}],consent:{brandOrLegalSender:'Mango',messageCategory:'newsletter',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',consentText:'I agree to receive weekly newsletters.',consentVersion:'original-v1'}});
  const theirs=await importFile(f,cookie,{files:[{name:'tuesday.csv',preset:'csv-unsubscribed',csv:'Email Address,First Name,OPTIN_IP\nolive@x.test,Olive Other,198.51.100.20'}]});
  const erin=await f.db.prepare("SELECT id FROM contacts WHERE email='erin@x.test'").first(),olive=await f.db.prepare("SELECT id FROM contacts WHERE email='olive@x.test'").first();
  // Prior data can hold a detached suppression under another authority's hash.
  const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
  const prior=hash('prior-authority:erin@x.test'),portable=hash('mango-audience-export-v1:erin@x.test');
  await f.db.prepare("INSERT INTO contact_suppressions(id,contact_id,channel,destination_hash,cause,occurred_at,created_at,updated_at) VALUES('legacy-prior-suppression',NULL,'email',?,'hard-bounce',1,1,1)").bind(prior).run();
  await f.db.prepare('INSERT INTO audience_portable_hashes VALUES(?,?)').bind(prior,portable).run();
  const oliveRows=async()=>[await f.db.prepare('SELECT * FROM audience_import_observations WHERE contact_id=?').bind(olive.id).all(),await f.db.prepare('SELECT * FROM ik_jobs WHERE id=?').bind(theirs.id).all(),await f.db.prepare('SELECT * FROM audience_import_plan_contacts WHERE contact_id=?').bind(olive.id).all()].map(result=>result.results);
  const before=await oliveRows();expect(JSON.stringify(before)).toContain('198.51.100.20');
  expect((await eraseHttp(f,cookie,erin.id)).state).toBe('complete');
  const exported=await f.call('/api/audience/export',{cookie}),csv=await exported.text();
  expect({status:exported.status,restriction:exported.ok?parseCsv(csv).map(row=>JSON.parse(row.ledger_json).opt_outs).find(line=>line?.hash===portable):null}).toEqual({status:200,restriction:{hash:portable,surviving_opt_outs:[],contact_suppressions:[{id:'legacy-prior-suppression',contact_id:null,channel:'email',destination_hash:portable,cause:'hard-bounce',occurred_at:1,provider_event_id:null,created_at:1,updated_at:1}]}});
  expect(await oliveRows()).toEqual(before);
  expect((await f.call(`/api/audience/imports/${theirs.id}/undo`,{cookie,method:'POST',body:{}})).status).toBe(200);
 }finally{await f.close();}
});
