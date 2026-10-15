import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { sqlStatements } from './sql-statements.mjs';
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
export const secret = 'synthetic-integration-test-secret-more-than-thirty-two-bytes';
export const setup = 'integration-test-setup-more-than-thirty-two-bytes';
export async function runtime(webhookPublicKey = 'test-public-key', seedLegacy = false, admission = {}) {
  const source = `
    import { testIdentity } from './tests/support/test-identity';
    import { localSessionCookieName } from './tests/support/local-session';
    import { createApp } from './src/core/app/app';
    import { createProductionPlatform, createLocalPlatform } from './src/core/platform/runtime';
    import { createAppServices } from './src/core/app/app';
    export default { async fetch(envelope, env) {
      const input = await envelope.json();
      globalThis.fetch = async (url, options) => {
        if (env.MAIL_PROVIDER === 'rer') {
          if (url !== env.MAIL_RELAY_URL) throw new Error('Unexpected relay transport');
          await env.DB.prepare('INSERT INTO test_mail(body,url,method,authorization,content_type,redirect) VALUES(?,?,?,?,?,?)')
            .bind(options.body,url,options.method,options.headers.Authorization,options.headers['Content-Type'],options.redirect).run();
          return Response.json(input.relayStatus === 202 ? {accepted:true} : {error:'test relay refusal'},
            {status:input.relayStatus ?? 202,headers:input.relayStatus === 429 ? {'Retry-After':'1'} : {}});
        }
        if (url !== 'https://api.sendgrid.com/v3/mail/send') throw new Error('Unexpected test transport');
        await env.DB.prepare('INSERT INTO test_mail(body) VALUES(?)').bind(options.body).run();
        return new Response(null, { status: 202, headers: { 'x-message-id': 'test-provider-message' } });
      };
      if (input.url.endsWith('/__test/local-sessions')) {
        const platform = createLocalPlatform(env, 'local-test-session-secret-more-than-32-bytes');
        const auth = createAppServices(platform).authService;
        await testIdentity(platform).importLocalDemoOperator({id:'local-owner',email:'local@example.test',displayName:'Local'},new Date());
        const expired = await testIdentity(platform).createTestSession('local-owner',new Date(Date.now()-31*86400000));
        const active = await testIdentity(platform).createTestSession('local-owner');
        const request = (session, method = 'GET') => new Request('http://127.0.0.1/api/operator', {method,headers:{Host:'127.0.0.1',Origin:'http://127.0.0.1',Cookie:localSessionCookieName('http://127.0.0.1')+'='+session.token}});
        const values = {expired:!!await auth.authenticate(request(expired)),active:!!await auth.authenticate(request(active))};
        await auth.signOut(request(active,'POST'));
        values.revoked=!!await auth.authenticate(request(active));
        return Response.json(values);
      }
      const request = new Request(input.url, { method: input.method, headers: input.headers, ...(input.body ? {body: input.body} : {}) });
      return createApp(env, createProductionPlatform(env)).fetch(request, env);
    }};`;
  const bundled = await build({ stdin: { contents: source, resolveDir: process.cwd(), sourcefile: 'base-integration.ts', loader: 'ts' },
    external: ['node:*'],
    bundle: true, write: false, format: 'esm', platform: 'browser', alias: { '@': resolve('src') } });
  const bindings = { SESSION_SIGNING_KEY: secret, AUTH_SETUP_TOKEN: setup, INITIAL_OPERATOR_EMAILS: 'owner@example.test',
    CONTACT_HASH_SALT: secret, MANGO_LOCAL_HASH_AUTHORITY: 'contact-salt-v1', MAIL_PROVIDER: 'sendgrid', MAIL_PROVIDER_API_KEY: 'test-api-key', MAIL_AUTH_FROM: 'owner@example.test',
    MAIL_WEBHOOK_SECRET: webhookPublicKey, MAIL_WEBHOOK_ID: 'test-hook', MANGO_PUBLIC_BASE_URL: 'https://mango.example.test',
    MANGO_APP_VERSION: 'integration', MANGO_ALLOWED_LINK_HOSTS: 'example.test', MANGO_TEST_EMAIL_ALLOWLIST: 'owner@example.test',
    MANGO_RECONCILIATION_INTERVAL_MINUTES: '15', MANGO_UNRESOLVED_OUTCOME_HOURS: '48', MANGO_EMAIL_HANDOFFS_PER_MINUTE: '10',
    MANGO_DELIVERABILITY_WINDOW_DAYS: '30', MAIL_SENDER_NAME: 'Example', MAIL_REPLY_TO: 'owner@example.test', MAIL_PHYSICAL_ADDRESS: 'Test address' };
  Object.assign(bindings, admission);
  if (admission.OWNER_EMAIL) for (const name of ['INITIAL_OPERATOR_EMAILS','SESSION_SIGNING_KEY','AUTH_SETUP_TOKEN']) delete bindings[name];
  const mf = new Miniflare({ host: '127.0.0.1', cf: false, telemetry: {enabled:false}, workers: [{ config: {
    name: 'base-adoption-test', type: 'worker', compatibilityDate: '2026-09-01',
    compatibilityFlags: ['nodejs_compat'],
    manifest: {mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:bundled.outputFiles[0].text}}},
    env: { ...Object.fromEntries(Object.entries(bindings).map(([key,value]) => [key,{type:'json',value}])), DB: {type:'d1',id:crypto.randomUUID()} },
  } }] });
  try {
    const db = await mf.getD1Database('DB');
    for (const file of (await readdir('migrations/core')).filter(name => name.endsWith('.sql')).sort()) {
      if (seedLegacy && file === '0015_base_operator_auth.sql') {
        await db.prepare("INSERT INTO operators(id,email,display_name,is_initial,removed_at,created_at,updated_at) VALUES('legacy-owner','owner@example.test','Original owner',1,NULL,10,10),('legacy-removed','removed@example.test','Removed operator',0,20,10,20)").run();
        await db.prepare("INSERT INTO operator_sessions(id,operator_id,token_digest,expires_at,last_active_at,created_at,updated_at) VALUES('legacy-session','legacy-owner','legacy-token-digest',9999999999999,10,10,10)").run();
        await db.prepare("INSERT INTO campaigns(id,state,created_at,updated_at) VALUES('legacy-campaign','draft',10,10)").run();
        await db.prepare("INSERT INTO campaign_state_transitions(id,campaign_id,from_state,to_state,actor_type,actor_id,occurred_at,created_at) VALUES('legacy-action','legacy-campaign','draft','draft','operator','legacy-removed',10,10)").run();
      }
      for (const sql of sqlStatements(await readFile(`migrations/core/${file}`, 'utf8'))) await db.prepare(sql).run();
    }
    await db.prepare('CREATE TABLE test_mail(id INTEGER PRIMARY KEY,body TEXT NOT NULL,url TEXT,method TEXT,authorization TEXT,content_type TEXT,redirect TEXT)').run();
    async function call(path, { method = 'GET', cookie, body, headers = {}, origin = 'https://mango.example.test', relayStatus = 202, form = false } = {}) {
      return mf.dispatchFetch('http://localhost/test-dispatch', { method:'POST', redirect:'manual', body:JSON.stringify({
        url:`https://mango.example.test${path}`, method, relayStatus, headers:{Host:'mango.example.test',Origin:origin,'CF-Connecting-IP':'192.0.2.1',
          ...(cookie ? {Cookie:cookie}:{}), 'Content-Type':form?'application/x-www-form-urlencoded':'application/json', ...headers}, ...(body ? {body:form?new URLSearchParams(body).toString():JSON.stringify(body)}:{}) }) });
    }
    return { db, call, close: () => mf.dispose(), async token() {
      const row = await db.prepare('SELECT body FROM test_mail ORDER BY id DESC LIMIT 1').first();
      return new URL((bindings.MAIL_PROVIDER === 'rer' ? JSON.parse(row.body).text : JSON.parse(row.body).content[0].value).match(/https:\/\/\S+/)[0]).searchParams.get('token');
    } };
  } catch (error) { await mf.dispose(); throw error; }
}
