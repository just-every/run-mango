import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { freePort } from '../support/free-port.mjs';
import { sqlStatements } from '../../operations/sql-statements.mjs';
const require = createRequire(import.meta.url);
const { Miniflare, convertV4MiniflareOptions } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
export const privateKey = 'synthetic-portable-test-private-key-at-least-thirty-two-bytes';
export async function portabilityRuntime({ restore = false, key = privateKey, beforeMigration } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'mango-portability-')), port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const bundled = await build({ entryPoints: [resolve('tests/portability/worker.ts')], bundle: true, write: false,
    format: 'esm', platform: 'browser', external: ['node:*'], alias: { '@': resolve('src') }, logLevel: 'silent' });
  let bindings = { MANGO_PUBLIC_BASE_URL: origin, INITIAL_OPERATOR_EMAILS: 'owner@example.test',
    SESSION_SIGNING_KEY: key, CONTACT_HASH_SALT: key, AUTH_SETUP_TOKEN: privateKey,
    MANGO_LOCAL_HASH_AUTHORITY: 'contact-salt-v1', MANGO_RESTORE_MODE: restore ? '1' : '0' };
  const start = () => new Miniflare({ ...convertV4MiniflareOptions({ host: '127.0.0.1', port, cf: false, modules: true,
    script: bundled.outputFiles[0].text, compatibilityDate: '2026-09-01', compatibilityFlags: ['nodejs_compat'],
    d1Databases: { DB: 'mango-portable' }, r2Buckets: { ASSETS_BUCKET: 'mango-assets' }, bindings }),
    resourcePersistencePath: join(directory, 'state') });
  let mf = start();
  try {
    let db = await mf.getD1Database('DB'), bucket = await mf.getR2Bucket('ASSETS_BUCKET');
    for (const file of (await readdir('migrations/core')).filter(name => name.endsWith('.sql')).sort()) {
      await beforeMigration?.(file,db,bucket);
      const statements = sqlStatements(await readFile(`migrations/core/${file}`, 'utf8'));
      if (statements.length) await db.batch(statements.map(sql => db.prepare(sql)));
    }
    const call = (path, { method = 'GET', cookie, body, origin: requestOrigin = origin } = {}) => fetch(origin + path, {
      method, redirect: 'manual', headers: { Origin: requestOrigin, ...(cookie ? { Cookie: cookie } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    await mf.ready;
    const response = await call('/auth/bootstrap', { method: 'POST', body: { token: privateKey, displayName: 'Owner' } });
    if (response.status !== 303) throw new Error('Native owner bootstrap failed: ' + response.status);
    const cookie = response.headers.get('set-cookie').split(';')[0];
    const actor = (await (await call('/api/operator', { cookie })).json()).operator;
    return { directory, origin, cookie, actor, call, get db() { return db; }, get bucket() { return bucket; },
      async resume() { await mf.dispose(); bindings = { ...bindings, MANGO_RESTORE_MODE: '0' }; mf = start(); await mf.ready;
        db = await mf.getD1Database('DB'); bucket = await mf.getR2Bucket('ASSETS_BUCKET'); },
      async close() { try { await mf.dispose(); } finally { await rm(directory, { recursive: true, force: true }); } } };
  } catch (error) { await mf.dispose(); await rm(directory, { recursive: true, force: true }); throw error; }
}
