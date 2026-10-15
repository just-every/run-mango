import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { sqlStatements } from '../sql-statements.mjs';
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const secret = 'synthetic-invitation-test-secret-more-than-thirty-two-bytes';
const setup = 'invitation-test-setup-more-than-thirty-two-bytes';
export const cookie = response => response.headers.get('set-cookie')?.split(';')[0];

export async function confirmedOwner(runtime) {
  await runtime.bootstrap();
  const requested = await runtime.call('/auth/magic-link', { method: 'POST', body: { email: 'owner@example.test' } });
  assert.equal(requested.status, 202);
  const confirmed = await runtime.call('/auth/confirm', { method: 'POST', body: { token: await runtime.token() } });
  assert.equal(confirmed.status, 303);
  const session = cookie(confirmed);
  assert.ok(session, 'Email confirmation must create the owner session');
  return session;
}

/** Join through Mango's invitation and Base's emailed confirmation. */
export async function confirmedInvite(runtime, actor, email) {
  const invited = await runtime.call('/api/operators', { method: 'POST', cookie: actor, body: { email } });
  assert.equal(invited.status, 201, await invited.clone().text());
  const confirmed = await runtime.call('/auth/confirm', { method: 'POST', body: { token: await runtime.token() } });
  assert.equal(confirmed.status, 303);
  const session = cookie(confirmed);
  assert.ok(session, 'Invitation confirmation must create an operator session');
  const current = await runtime.call('/api/operator', { cookie: session });
  assert.equal(current.status, 200);
  return { cookie: session, operator: (await current.json()).operator };
}

export async function invitationRuntime({ contactHashSalt = secret, environment = {} } = {}) {
  const bundled = await build({ entryPoints: [resolve('operations/fixtures/invitation-worker.ts')], bundle: true, write: false,
    format: 'esm', platform: 'browser', external: ['node:*'], alias: { '@': resolve('src') } });
  const bindings = { SESSION_SIGNING_KEY: secret, AUTH_SETUP_TOKEN: setup, INITIAL_OPERATOR_EMAILS: 'owner@example.test',
    CONTACT_HASH_SALT: contactHashSalt, MAIL_PROVIDER: 'sendgrid', MAIL_PROVIDER_API_KEY: 'test-api-key', MAIL_AUTH_FROM: 'owner@example.test',
    MAIL_WEBHOOK_SECRET: 'test-public-key', MAIL_WEBHOOK_ID: 'test-hook', MANGO_PUBLIC_BASE_URL: 'https://mango.example.test',
    MANGO_APP_VERSION: 'integration', MANGO_ALLOWED_LINK_HOSTS: 'example.test', MANGO_TEST_EMAIL_ALLOWLIST: 'owner@example.test',
    MANGO_RECONCILIATION_INTERVAL_MINUTES: '15', MANGO_UNRESOLVED_OUTCOME_HOURS: '48', MANGO_EMAIL_HANDOFFS_PER_MINUTE: '100000',
    MANGO_DELIVERABILITY_WINDOW_DAYS: '30', MAIL_SENDER_NAME: 'Example', MAIL_REPLY_TO: 'owner@example.test', MAIL_PHYSICAL_ADDRESS: 'Test address', ...environment };
  const mf = new Miniflare({ host: '127.0.0.1', cf: false, telemetry: { enabled: false }, workers: [{ config: {
    name: 'invitation-cancellation-test', type: 'worker', compatibilityDate: '2026-09-01', compatibilityFlags: ['nodejs_compat'],
    manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: bundled.outputFiles[0].text } } },
    env: { ...Object.fromEntries(Object.entries(bindings).map(([key, value]) => [key, { type: 'json', value }])), DB: { type: 'd1', id: crypto.randomUUID() }, ASSETS_BUCKET:{type:'r2',name:crypto.randomUUID()} },
  } }] });
  try {
    const db = await mf.getD1Database('DB');
    for (const file of (await readdir('migrations/core')).filter(name => name.endsWith('.sql')).sort()) {
      // Preserve migration and statement order, but cross the D1 bridge once per
      // migration instead of once per statement. These run on a fresh database.
      const statements = sqlStatements(await readFile(`migrations/core/${file}`, 'utf8'));
      if (statements.length) await db.batch(statements.map(sql => db.prepare(sql)));
    }
    await db.prepare('CREATE TABLE test_queue(id INTEGER PRIMARY KEY,body TEXT NOT NULL)').run();
    await db.prepare('CREATE TABLE test_mail(id INTEGER PRIMARY KEY,body TEXT NOT NULL)').run();
    await db.prepare('CREATE TABLE test_barriers(id TEXT PRIMARY KEY,released INTEGER NOT NULL)').run();
    async function call(path, { method = 'GET', cookie, body, headers = {}, origin = 'https://mango.example.test' } = {}) {
      return mf.dispatchFetch('http://localhost/test-dispatch', { method: 'POST', redirect: 'manual', body: JSON.stringify({
        url: `https://mango.example.test${path}`, method, headers: { Host: 'mango.example.test', Origin: origin, 'CF-Connecting-IP': '192.0.2.1',
          ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json', ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) }) });
    }
    return { db, bucket:await mf.getR2Bucket('ASSETS_BUCKET'), call, close: () => mf.dispose(), async bootstrap() {
      const response = await call('/auth/bootstrap', { method: 'POST', body: { token: setup, displayName: 'Owner' } });
      if (response.status !== 303) throw new Error(`Bootstrap failed: ${response.status}`);
      return cookie(response);
    }, async token() {
      const row = await db.prepare('SELECT body FROM test_mail ORDER BY id DESC LIMIT 1').first();
      return new URL(JSON.parse(row.body).content[0].value.match(/https:\/\/\S+/)[0]).searchParams.get('token');
    } };
  } catch (error) { await mf.dispose(); throw error; }
}
