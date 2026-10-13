import { sqlStatements } from '../../operations/sql-statements.mjs';
import {test, expect} from '@playwright/test';
import {createRequire} from 'node:module';
import {mkdtemp, readdir, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {composeFixture} from './test-runtime';
const require=createRequire(import.meta.url);
const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');

test('observation and revocation survive complete native Worker and D1 runtime disposal',async()=>{
  const persistence=await mkdtemp(join(tmpdir(),'mango-sender-restart-'));
  const options={host:'127.0.0.1',port: 0,cf:false,telemetry:{enabled:false},resourcePersistencePath:persistence,
    workers:[{config:{name:'sender-restart',type:'worker',compatibilityDate:'2026-08-31',manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:'export default {fetch(){return new Response("restart");}}'}}},env:{DB:{type:'d1',id:'sender-persistent-proof'}}}}]};
  let runtime=new Miniflare(options), fixture:ReturnType<typeof composeFixture>|undefined;
  try {
    let db=await runtime.getD1Database('DB');
    for(const file of (await readdir('migrations/core')).filter(file=>file.endsWith('.sql')).sort()) await db.batch(sqlStatements((await readFile(`migrations/core/${file}`,'utf8'))).map(sql=>db.prepare(sql)));
    fixture=composeFixture(db,false); await fixture.prove();
    const first=await fixture.verifier.inspect('Mango <offers@example.test>');
    expect(first.ready).toBe(true);
    await fixture.dispose(); fixture=undefined; await runtime.dispose();
    runtime=new Miniflare(options); db=await runtime.getD1Database('DB'); fixture=composeFixture(db,false);
    const restored=await fixture.verifier.inspect('Mango <offers@example.test>');
    expect(restored.ready).toBe(true);
    expect(restored.observation).toEqual(first.observation);
    expect(fixture.outbound).toHaveLength(0);
    await fixture.verifier.revoke();
    await fixture.dispose(); fixture=undefined; await runtime.dispose();
    runtime=new Miniflare(options); db=await runtime.getD1Database('DB'); fixture=composeFixture(db,false);
    expect(await fixture.verifier.inspect('Mango <offers@example.test>')).toMatchObject({ready:false,reason:'observation-revoked'});
    expect(fixture.outbound).toHaveLength(0);
  } finally {await fixture?.dispose();await runtime.dispose();await rm(persistence,{recursive:true,force:true});}
});
