import {createBlobStore} from '../../src/core/platform/blobs';
import {createRequire} from 'node:module';
import {mkdtemp, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {composeFixture, draft} from '../sender-verification/test-runtime';
import {migrate} from '../prior-approval/fixture';
import {legacyApproval} from '../prior-approval/legacy';

const require = createRequire(import.meta.url);
const {Miniflare} = createRequire(require.resolve('wrangler/package.json'))('miniflare');
export const approvedFrom = 'Mango <offers@example.test>';
export async function native(legacy = false) {
  const path = await mkdtemp(join(tmpdir(), 'approval-binding-'));
  const worker = new Miniflare({host:'127.0.0.1',port: 0,cf:false,telemetry:{enabled:false},resourcePersistencePath:path,
    workers:[{config:{name:'approval-binding-native',type:'worker',compatibilityDate:'2026-08-31',
      manifest:{mainModule:'index.js',modules:{'index.js':{type:'esm',contents:'export default {fetch(){return new Response("native D1")}}'}}},
      env:{DB:{type:'d1',id:crypto.randomUUID()},ASSETS_BUCKET:{type:'r2',name:crypto.randomUUID()}}}}]});
  const db = await worker.getD1Database('DB') as D1Database;
  await migrate(db, 0, legacy ? 12 : undefined);
  const f = composeFixture(db);
  const bucket=await worker.getR2Bucket('ASSETS_BUCKET') as R2Bucket;f.bindings.ASSETS_BUCKET=bucket;f.platform.blobs=createBlobStore(bucket);
  return {f, upgrade:()=>migrate(db,13), async dispose(){await f.dispose();await worker.dispose();await rm(path,{recursive:true,force:true});}};
}
export async function approved(f:ReturnType<typeof composeFixture>) {
  await f.prove();
  const campaign = await draft(f);
  const result = await f.lifecycle.approval.approve(campaign);
  if (result.kind !== 'approved') throw new Error(`Native approval failed: ${JSON.stringify(result)}`);
  return campaign;
}
export async function historical(h:Awaited<ReturnType<typeof native>>) {
  const campaign = await legacyApproval(h.f);
  await h.upgrade();await h.f.prove();
  return campaign;
}
export async function rows(db:D1Database,table:string) {
  return JSON.stringify((await db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results);
}
export async function replacement(f:ReturnType<typeof composeFixture>,otherFrom:boolean) {
  if (otherFrom) {f.platform.config.mailSender.fromEmail='other@example.test';await f.prove();}
  const selected = await f.verifier.inspect(otherFrom ? 'Mango <other@example.test>' : approvedFrom);
  if (!selected.ready || !selected.lease) throw new Error('Replacement must be a genuinely verified inspection');
  if (otherFrom) {f.platform.config.mailSender.fromEmail='offers@example.test';await f.prove();}
  return selected.lease.id;
}
