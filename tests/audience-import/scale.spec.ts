import {eraseFixture} from './erase';
import {readAudiencePlan} from '../../src/core/features/audience/import-plans';
import {test,expect} from '@playwright/test';
import {native,consent} from './native';
import {createAudienceImportService} from '../../src/core/features/audience/import-service';
import {parseCsv} from '../../src/core/features/audience/csv';
import {meter} from './d1-meter';
import {importLifecycle} from './lifecycle-flow';

async function seed(db:D1Database,count:number){
 const rows=Array.from({length:count},(_,i)=>({id:`scale-${i}`,email:`scale${i}@example.test`,name:`Original ${i}`}));
 await db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) SELECT json_extract(value,'$.id'),json_extract(value,'$.email'),json_extract(value,'$.name'),'non-subscribed','non-subscribed',1,1 FROM json_each(?)").bind(JSON.stringify(rows)).run();
 await db.prepare("INSERT INTO contact_email_addresses(id,contact_id,email,channel_status,created_at,updated_at) SELECT id||'-email',id,email,email_status,1,1 FROM contacts").run();
 await db.prepare("INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at) SELECT id||'-history',id,'original','Original history',1,1,1 FROM contacts").run();
}
function check(stats:ReturnType<ReturnType<typeof meter>['stats']>){console.log('D1 scale limits',stats);expect(stats.count).toBeLessThanOrEqual(1000);expect(stats.maxBindings).toBeLessThanOrEqual(100);expect(stats.maxSqlBytes).toBeLessThanOrEqual(100000);}
for(const existing of [false,true])test(`CONT-010 1001-row mixed preview stays within D1 statement limits (${existing?'existing':'new'}) @release`,async()=>{
 const h=await native();try{
  if(existing)await seed(h.f.db,1001);
  const measured=meter(h.f.db);const service=createAudienceImportService({...h.f.platform,database:{$client:measured.db}} as typeof h.f.platform);h.context.storage.database=measured.db;
  const csv='Email Address,Email Marketing Status,OPTIN_TIME,CONFIRM_TIME\n'+Array.from({length:1001},(_,i)=>`scale${i}@example.test,${['subscribed','unsubscribed','cleaned'][i%3]},2026-09-01 10:00:00,2026-09-01 10:05:00`).join('\n');
  const preview=await service.preview({consent,files:[{name:'scale.csv',preset:'csv-subscribed',csv}]},h.context);
  expect(preview.rows).toHaveLength(1001);expect(preview.counts).toMatchObject({created:existing?0:1001,updated:existing?1001:0,rejected:0,unsubscribed:334,suppressed:333});check(measured.stats());
  const plan=await readAudiencePlan(h.f.db,(await h.f.db.prepare('SELECT fingerprint,plan_json FROM audience_import_plans').first<{fingerprint:string;plan_json:string}>())!);
  const planBytes=new TextEncoder().encode(JSON.stringify(plan)).length;expect(planBytes).toBeGreaterThan(2000000);console.log('D1 scale plan bytes',planBytes);
  const chunks=(await h.f.db.prepare('SELECT content FROM audience_import_plan_chunks ORDER BY ordinal').all<{content:string}>()).results;
  expect(chunks.length).toBeGreaterThan(1);expect(Math.max(...chunks.map(row=>new TextEncoder().encode(row.content).length))).toBeLessThan(2000000);
  expect(plan.entries.every((entry:any)=>entry.effects[0].value.tables.consent_evidence.length===(entry.source.payload.status==='subscribed'?1:0))).toBeTruthy();
  if(existing)expect(plan.entries.every((entry:any)=>entry.effects[0].value.tables.contact_history.some((row:any)=>row.detail==='Original history'))).toBeTruthy();
 }finally{await h.close();}
});
test('CONT-010 complete 1001-contact export stays within D1 statement limits @release',async()=>{
 const h=await native();try{await seed(h.f.db,1001);const measured=meter(h.f.db);const service=createAudienceImportService({...h.f.platform,database:{$client:measured.db}} as typeof h.f.platform);
 const rows=parseCsv(await service.exportCsv());expect(rows).toHaveLength(1001);expect(rows.every(row=>JSON.parse(row.ledger_json).tables.contact_history[0].detail==='Original history')).toBeTruthy();check(measured.stats());
 }finally{await h.close();}
});
test('CONT-010 1001-contact apply resume repeat and undo each fit one D1 invocation @release', async()=>{
 test.setTimeout(45*60_000);
 await importLifecycle(1001);
});
test('CONT-013 erasure removes large Base plan and original chunks after partial import',async()=>{
 const h=await native();try{
  h.context.batchSize=10;
  const measured=meter(h.f.db);h.context.storage.database=measured.db;
  const service=createAudienceImportService({...h.f.platform,database:{$client:measured.db}} as typeof h.f.platform);
  test.setTimeout(600000);
  const csv='Email Address,First Name,Original Notes\n'+Array.from({length:1001},(_,i)=>`erase-scale${i}@example.test,Original name,${'Original byte preservation '.repeat(90)}`).join('\n');
  expect(new TextEncoder().encode(csv).length).toBeGreaterThan(2000000);
  const preview=await service.preview({files:[{name:'large-original.csv',preset:'csv-non-subscribed',csv}]},h.context);check(measured.stats());
  measured.reset();const job=await service.create(preview.fingerprint,h.context);expect(job.state).toBe('applying');check(measured.stats());
  measured.reset();
  const {readD1ImportOriginals}=await import('../../src/vendor/base/import-kit/src/d1/index');
  const originals=await readD1ImportOriginals(job.id,h.context);check(measured.stats());
  measured.reset();
  const artifact=originals.find(original=>original.kind==='artifact'&&original.name==='large-original.csv');
  expect(artifact?.original.status).toBe('retained');
  expect(artifact?.original.status==='retained'&&Buffer.from(artifact.original.base64,'base64').equals(Buffer.from(csv,'utf8'))).toBe(true);
  // Base v3 stores exact originals as canonical Base64 TEXT. Check the stored
  // representation independently of Base's reader, then retain the raw byte
  // length and identity guarantees of the former BLOB-storage assertion.
  const chunks=(await h.f.db.prepare('SELECT ordinal,bytes FROM ik_d1_original_chunks WHERE job_id=? ORDER BY ordinal').bind(job.id).all<{ordinal:number;bytes:string}>()).results;
  expect(chunks.map(chunk=>chunk.ordinal)).toEqual(chunks.map((_,index)=>index));
  const storedBase64=chunks.map(chunk=>chunk.bytes).join('');
  expect(storedBase64).toBe(Buffer.from(csv,'utf8').toString('base64'));
  expect(await h.f.db.prepare('SELECT SUM(length(bytes)) AS size FROM ik_d1_original_chunks WHERE job_id=?').bind(job.id).first()).toEqual({size:Buffer.from(csv,'utf8').toString('base64').length});
  const storedBytes=Buffer.from(storedBase64,'base64');
  expect(storedBytes.length).toBe(new TextEncoder().encode(csv).length);
  expect(storedBytes.equals(Buffer.from(csv,'utf8'))).toBe(true);
  for(const table of ['ik_d1_plan_chunks','ik_d1_original_chunks'])expect(Number((await h.f.db.prepare(`SELECT count(*) AS count FROM ${table} WHERE job_id=?`).bind(job.id).first<{count:number}>())!.count)).toBeGreaterThan(0);
  const contact=await h.f.db.prepare('SELECT id FROM contacts ORDER BY id LIMIT 1').first<{id:string}>();
  await eraseFixture(h.f,contact!.id);
  expect(await h.f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(contact!.id).first()).toBeNull();
  expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:9});
  for(const table of ['ik_jobs','ik_d1_plan_chunks','ik_d1_original_chunks','ik_originals','audience_import_plans','audience_import_plan_chunks','audience_import_plan_contacts'])expect(await h.f.db.prepare(`SELECT count(*) AS count FROM ${table}`).first()).toEqual({count:0});
  await expect(h.service.resume(job.id,h.context)).rejects.toThrow();
 }finally{await h.close();}
});
