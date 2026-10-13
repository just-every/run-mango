import { sqlStatements } from '../../operations/sql-statements.mjs';
import { createRequire } from 'node:module';
import { readdir, readFile } from 'node:fs/promises';
import { composeFixture } from './test-runtime';
export { draft } from './test-runtime';
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
export async function fixture(commerce = true) {
  const worker = new Miniflare({ host: '127.0.0.1', port: 0, cf: false, telemetry: { enabled: false }, workers: [{ config: {
    name: 'sender-native-d1', type: 'worker', compatibilityDate: '2026-08-31',
    manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: 'export default { fetch(){ return new Response("native D1"); } }' } } },
    env: { DB: { type: 'd1', id: crypto.randomUUID() } },
  } }] });
  const db = await worker.getD1Database('DB') as D1Database;
  for (const file of (await readdir('migrations/core')).filter(file => file.endsWith('.sql')).sort()) {
    await db.batch(sqlStatements((await readFile(`migrations/core/${file}`, 'utf8'))).map(sql => db.prepare(sql)));
  }
  const runtime = composeFixture(db, commerce);
  return { ...runtime, worker, async dispose() { await runtime.dispose(); await worker.dispose(); } };
}
