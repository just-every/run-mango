import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=process.cwd();
const load=name=>import(pathToFileURL(resolve(root,name)));
const require=createRequire(resolve(root,'package.json'));
const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const {sqlStatements}=await load('operations/sql-statements.mjs');
const {platformLedger}=await load('scripts/installer/migration-replay.mjs');
const spec=JSON.parse(await readFile('management/integration/deployment-spec.json','utf8'));
const baseline=new Set(execFileSync('git',['ls-tree','-r','--name-only','origin/main','--','migrations/core/'],{encoding:'utf8'}).trim().split('\n').map(p=>'core-'+p.split('/').at(-1)));
const native=new Miniflare({host:'127.0.0.1',port:0,cf:false,telemetry:{enabled:false},workers:[{config:{name:'migration-proof',type:'worker',compatibilityDate:'2026-08-31',manifest:{mainModule:'index.js',modules:{'index.js':{type:'esm',contents:'export default {fetch(){return new Response("fixture")}}'}}},env:{DB:{type:'d1',id:crypto.randomUUID()}}}}]});
try {
  const db=await native.getD1Database('DB');
  await db.prepare('CREATE TABLE rer_migrations (name TEXT PRIMARY KEY,sha256 TEXT NOT NULL,applied_at TEXT NOT NULL)').run();
  const apply=async row=>{
    const statements=sqlStatements(row.sql);
    await db.batch([...statements.map(sql=>db.prepare(sql)),db.prepare("INSERT INTO rer_migrations(name,sha256,applied_at) VALUES(?,?,?)").bind(row.name,row.sha256,new Date().toISOString())]);
  };
  for(const row of spec.migrations.filter(row=>baseline.has(row.name))) await apply(row);
  await db.prepare("INSERT INTO contacts(id,display_name,email_status,sms_status,created_at,updated_at) VALUES('synthetic-retained','Synthetic retained contact','subscribed','not-subscribed',1,1)").run();
  const before=await db.prepare("SELECT * FROM contacts WHERE id='synthetic-retained'").first();
  let refusal;
  try {await platformLedger(db,root,sqlStatements)} catch(error) {refusal=error.code??error.message;}
  assert.match(refusal,/migration_ledger:unapplied:0105_native_audience_authority.sql/);
  for(const row of spec.migrations.filter(row=>!baseline.has(row.name))) await apply(row);
  assert.equal(await platformLedger(db,root,sqlStatements),true);
  assert.deepEqual(await db.prepare("SELECT * FROM contacts WHERE id='synthetic-retained'").first(),before);
  const generation=async()=>(await db.prepare('SELECT generation FROM audience_source_authority WHERE id=1').first()).generation;
  const initial=await generation();
  await db.prepare("UPDATE contacts SET display_name='Synthetic changed contact' WHERE id='synthetic-retained'").run();
  assert.equal(await generation(),initial+1);
  console.log(JSON.stringify({door:'native Miniflare D1 + production platformLedger',main_migrations:baseline.size,candidate_migrations:spec.migrations.length,before:refusal,after:'platformLedger true; all SHA-256 identities accepted; retained contact unchanged; native update advances generation once'},null,2));
} finally {await native.dispose()}
