import { sqlStatements } from '../../operations/sql-statements.mjs';
import {createRequire} from 'node:module';
import {mkdtemp, readdir, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {composeFixture} from '../sender-verification/test-runtime';
export {draft} from './historical-draft';
export {legacyApproval, approvalBytes} from './legacy';
const require = createRequire(import.meta.url);
const {Miniflare} = createRequire(require.resolve('wrangler/package.json'))('miniflare');
export async function migrate(db: D1Database, from = 0, until = 99) {
  for (const file of (await readdir('migrations/core')).filter(file => file.endsWith('.sql')).sort()) {
    const number = Number(file.slice(0,4));
    if (number < from || number > until) continue;
    await db.batch(sqlStatements((await readFile(`migrations/core/${file}`,'utf8'))).map(sql=>db.prepare(sql)));
  }
}
export async function fixture(legacy = true) {
  const persistence = await mkdtemp(join(tmpdir(),'mango-prior-approval-'));
  const options = {host:'127.0.0.1',port: 0,cf:false,telemetry:{enabled:false},resourcePersistencePath:persistence,
    workers:[{config:{name:'prior-approval-native',type:'worker',compatibilityDate:'2026-08-31',
      manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:'export default {fetch(){return new Response("D1");}}'}}},
      env:{DB:{type:'d1',id:'prior-approval'}}}}]};
  let worker = new Miniflare(options);
  let db = await worker.getD1Database('DB') as D1Database;
  await migrate(db,0,legacy ? 12 : 99);
  let runtime = composeFixture(db);
  return {get current(){return runtime;},
    async upgrade(){await migrate(db,13);},
    async restart(){await runtime.dispose();await worker.dispose();worker=new Miniflare(options);db=await worker.getD1Database('DB');runtime=composeFixture(db);return runtime;},
    async dispose(){await runtime.dispose();await worker.dispose();await rm(persistence,{recursive:true,force:true});}};
}
