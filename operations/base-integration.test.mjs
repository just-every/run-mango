import { generateKeyPairSync, sign } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { sqlStatements } from './sql-statements.mjs';
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const secret = 'integration-test-secret-more-than-thirty-two-bytes';
const setup = 'integration-test-setup-more-than-thirty-two-bytes';
async function runtime(webhookPublicKey = 'test-public-key', seedLegacy = false, admission = {}) {
  const source = `
    import { testIdentity } from './tests/support/test-identity';
    import { createApp } from './src/core/app/app';
    import { createProductionPlatform, createLocalPlatform } from './src/core/platform/runtime';
    import { createAppServices } from './src/core/app/app';
    export default { async fetch(envelope, env) {
      globalThis.fetch = async (url, options) => {
        if (url !== 'https://api.sendgrid.com/v3/mail/send') throw new Error('Unexpected test transport');
        await env.DB.prepare('INSERT INTO test_mail(body) VALUES(?)').bind(options.body).run();
        return new Response(null, { status: 202, headers: { 'x-message-id': 'test-provider-message' } });
      };
      const input = await envelope.json();
      if (input.url.endsWith('/__test/local-sessions')) {
        const platform = createLocalPlatform(env, 'local-test-session-secret-more-than-32-bytes');
        const auth = createAppServices(platform).authService;
        await testIdentity(platform).importLocalDemoOperator({id:'local-owner',email:'local@example.test',displayName:'Local'},new Date());
        const expired = await testIdentity(platform).createTestSession('local-owner',new Date(Date.now()-31*86400000));
        const active = await testIdentity(platform).createTestSession('local-owner');
        const request = (session, method = 'GET') => new Request('http://127.0.0.1/api/operator', {method,headers:{Host:'127.0.0.1',Origin:'http://127.0.0.1',Cookie:'operator_session_local='+session.token}});
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
    await db.prepare('CREATE TABLE test_mail(id INTEGER PRIMARY KEY,body TEXT NOT NULL)').run();
    async function call(path, { method = 'GET', cookie, body, headers = {}, origin = 'https://mango.example.test' } = {}) {
      return mf.dispatchFetch('http://localhost/test-dispatch', { method:'POST', redirect:'manual', body:JSON.stringify({
        url:`https://mango.example.test${path}`, method, headers:{Host:'mango.example.test',Origin:origin,'CF-Connecting-IP':'192.0.2.1',
          ...(cookie ? {Cookie:cookie}:{}), 'Content-Type':'application/json', ...headers}, ...(body ? {body:JSON.stringify(body)}:{}) }) });
    }
    return { db, call, close: () => mf.dispose(), async token() {
      const row = await db.prepare('SELECT body FROM test_mail ORDER BY id DESC LIMIT 1').first();
      return new URL(JSON.parse(row.body).content[0].value.match(/https:\/\/\S+/)[0]).searchParams.get('token');
    } };
  } catch (error) { await mf.dispose(); throw error; }
}

test('Base D1 auth: explicit bootstrap, signed-in APIs, email confirmation, single use, equal operators and revocation', async () => {
  const r = await runtime();
  try {
    assert.equal((await r.call('/api/operators')).status, 401);
    assert.equal((await r.call('/auth/bootstrap',{method:'POST',body:{token:setup,displayName:'Owner'},origin:'https://evil.test'})).status,403);
    const bootstrap = await r.call('/auth/bootstrap',{method:'POST',body:{token:setup,displayName:'Owner'}});
    assert.equal(bootstrap.status,303,await bootstrap.text());
    const bootstrapCookie = bootstrap.headers.get('set-cookie').split(';')[0];
    assert.equal(/^__Host-operator_session=/.test(bootstrapCookie),true);
    const owner = (await (await r.call('/api/operator',{cookie:bootstrapCookie})).json()).operator;
    assert.equal(owner.isInitial,true);
    assert.equal((await r.call('/auth/bootstrap',{method:'POST',body:{token:setup,displayName:'Again'}})).status,409);
    assert.equal((await r.call('/auth/magic-link',{method:'POST',body:{email:'owner@example.test'}})).status,202);
    const token = await r.token();
    const preview = await r.call(`/auth/confirm?token=${token}`);
    assert.equal(preview.status,200); assert.equal(preview.headers.has('set-cookie'),false);
    const confirmed = await r.call('/auth/confirm',{method:'POST',body:{token}});
    assert.equal(confirmed.status,303);
    const ownerCookie = confirmed.headers.get('set-cookie').split(';')[0];
    assert.equal((await r.call('/auth/confirm',{method:'POST',body:{token}})).status,400);
    const stored = await r.db.prepare('SELECT token_hash FROM oa_tokens WHERE kind = ?').bind('magic').first();
    assert.equal(stored.token_hash!==token,true);
    const invite = await r.call('/api/operators',{method:'POST',cookie:ownerCookie,body:{email:'other@example.test'}});
    assert.equal(invite.status,201,await invite.clone().text());
    const other = (await invite.json()).operator;
    const invited = await r.call('/auth/confirm',{method:'POST',body:{token:await r.token()}});
    assert.equal(invited.status,303);
    const otherCookie = invited.headers.get('set-cookie').split(';')[0];
    assert.equal((await r.call('/api/operators',{cookie:otherCookie})).status,200);
    assert.equal((await r.call(`/api/operators/${owner.id}`,{method:'DELETE',cookie:otherCookie})).status,400);
    assert.equal((await r.call(`/api/operators/${other.id}`,{method:'DELETE',cookie:ownerCookie})).status,204);
    assert.equal((await r.call('/api/operator',{cookie:otherCookie})).status,401);
    assert.ok((await r.db.prepare('SELECT removed_at FROM operators WHERE id=?').bind(other.id).first()).removed_at);
    const lastOwner = await r.call(`/api/operators/${owner.id}`,{method:'DELETE',cookie:ownerCookie});
    assert.equal(lastOwner.status,409);
    assert.deepEqual(await lastOwner.json(),{error:'last_owner'});
    assert.equal((await r.call('/auth/review-session',{method:'POST',body:{}})).status,404);
    const sender = await r.call('/api/settings/sender',{cookie:ownerCookie});
    assert.equal(sender.status,200); assert.equal((await sender.json()).validation.ready,false);
  } finally { await r.close(); }
});

test('Base local demo sessions preserve expired and revoked boundaries', async () => {
 const r=await runtime(); try { assert.deepEqual(await (await r.call('/__test/local-sessions')).json(), {expired:false,active:true,revoked:false}); } finally { await r.close(); }
});

const composition = () => ({name:'Authored newsletter',emailSubject:'A note',emailBody:'<p>News</p><a href="{{unsubscribeUrl}}">Unsubscribe</a>',
 emailText:'News. Unsubscribe: {{unsubscribeUrl}}',senderName:'Example',fromEmail:'owner@example.test',replyToEmail:'owner@example.test',
 physicalAddress:'Test address',messageCategory:'newsletter',audienceRule:'Recorded email subscribers',
 inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'emailStatus',comparator:'eq',value:'subscribed'}]}),
 exclusionRulesJson:'[]',steps:[{channel:'email',timezone:'Australia/Brisbane',scheduledAt:new Date(Date.now()+3600000).toISOString(),
 sendByAt:new Date(Date.now()+7200000).toISOString(),whyThisTime:'Operator schedule'}]});

test('CAMP-002: authored create-draft is session gated, validated and durable, with approval still blocked', async () => {
 const r=await runtime(); try {
  assert.equal((await r.call('/api/campaigns',{method:'POST',body:{composition:composition()}})).status,401);
  const auth=await r.call('/auth/bootstrap',{method:'POST',body:{token:setup,displayName:'Owner'}});
  const cookie=auth.headers.get('set-cookie').split(';')[0];
  assert.equal((await r.call('/api/campaigns',{method:'POST',cookie,body:{composition:{name:'Missing content'}}})).status,400);
  const created=await r.call('/api/campaigns',{method:'POST',cookie,body:{composition:composition()}});
  assert.equal(created.status,201,await created.clone().text());
  const ids=await created.json();
  const detail=await (await r.call(`/api/campaigns/${ids.campaignId}`,{cookie})).json();
  assert.equal(detail.campaign.state,'draft');assert.equal(detail.revision.name,'Authored newsletter');
  assert.equal(detail.revision.sourceTypesJson,'[]');assert.equal(detail.revision.approvedAt,null);
  assert.equal(detail.steps.length,1);
  const check=await r.call(`/api/campaigns/${ids.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:ids.revisionId}});
  assert.equal(check.status,200,await check.clone().text());
  assert.equal((await check.json()).eligibleCount,0);
  const consent=await r.call('/api/contacts/consent',{method:'POST',cookie,body:{contact:{email:'subscriber@example.test',displayName:'Subscriber'},
   channel:'email',brandOrLegalSender:'Example',messageCategory:'newsletter',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',
   captureMethod:'operator-recorded',captureSource:'test-signup',consentText:'Send me the weekly newsletter',consentVersion:'v1',occurredAt:new Date().toISOString()}});
  assert.equal(consent.status,201,await consent.clone().text());
  const email=JSON.parse((await r.db.prepare('SELECT body FROM test_mail ORDER BY id DESC LIMIT 1').first()).body);
  const confirmation=new URL(email.content[0].value.match(/https:\/\/\S+/)[0]);
  assert.equal((await r.call(confirmation.pathname)).status,200);
  // Previewing a confirmation never supplies affirmative consent. Preserve
  // pending exclusion until the real explicit confirmation POST succeeds.
  assert.equal((await r.call(confirmation.pathname,{method:'POST',body:{}})).status,400);
  const pendingReview=await(await r.call(`/api/campaigns/${ids.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:ids.revisionId}})).json();
  assert.equal(pendingReview.sourceStatus,'ok');assert.equal(pendingReview.candidateCount,0);assert.equal(pendingReview.eligibleCount,0);
  assert.equal((await r.db.prepare('SELECT email_status FROM contacts WHERE email=?').bind('subscriber@example.test').first()).email_status,'pending');
  assert.equal((await r.call(confirmation.pathname,{method:'POST',body:{confirm:true}})).status,200);
  assert.equal((await r.call(confirmation.pathname,{method:'POST',body:{confirm:true}})).status,410);
  const reviewed=await(await r.call(`/api/campaigns/${ids.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:ids.revisionId}})).json();
  assert.equal(reviewed.sourceStatus,'ok');assert.equal(reviewed.candidateCount,1);assert.equal(reviewed.eligibleCount,1);
  const approval=await r.call(`/api/campaigns/${ids.campaignId}/approve`,{method:'POST',cookie,body:{revisionId:ids.revisionId,idempotencyKey:'authored-campaign-request-1'}});
  assert.equal(approval.status,409);
  assert.equal((await r.db.prepare('SELECT count(*) AS count FROM recipient_steps').first()).count,0);
 } finally {await r.close();}
});

test('CONT-006/SEND-006: Base-verified SendGrid events persist before acknowledgement, reject invalid and conflicting replay', async () => {
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const r=await runtime(publicKey.export({type:'spki',format:'der'}).toString('base64'));
 try {
  const row={event:'bounce',type:'bounce',sg_event_id:'unique-signed-event',sg_message_id:'provider-message',email:'recipient@example.test',timestamp:Math.floor(Date.now()/1000)};
  const body=[row];const timestamp=String(row.timestamp);
  const headersFor=events => ({'x-twilio-email-event-webhook-timestamp':timestamp,
   'x-twilio-email-event-webhook-signature':sign('sha256',Buffer.from(timestamp+JSON.stringify(events)),privateKey).toString('base64')});
  const signed=headersFor(body);
  assert.equal((await r.call('/webhooks/mail/sendgrid',{method:'POST',body,headers:{...signed,'x-twilio-email-event-webhook-signature':'invalid'}})).status,500);
  assert.equal((await r.db.prepare('SELECT count(*) AS count FROM provider_fact_inbox').first()).count,0);
  assert.equal((await r.call('/webhooks/mail/sendgrid',{method:'POST',body,headers:signed})).status,204);
  const persisted=await r.db.prepare('SELECT provider,kind FROM provider_fact_inbox').first();
  assert.deepEqual(persisted,{provider:'sendgrid',kind:'bounced'});
  assert.equal((await r.call('/webhooks/mail/sendgrid',{method:'POST',body,headers:signed})).status,204);
  assert.equal((await r.db.prepare('SELECT count(*) AS count FROM provider_fact_inbox').first()).count,1);
  const changed=[{...row,email:'different@example.test'}];
  assert.equal((await r.call('/webhooks/mail/sendgrid',{method:'POST',body:changed,headers:headersFor(changed)})).status,500);
  assert.equal((await r.db.prepare('SELECT count(*) AS count FROM provider_fact_inbox').first()).count,1);
  const suppression=await r.db.prepare('SELECT COUNT(*) AS count FROM contact_suppressions').first();
  assert.equal(suppression.count,1);
 } finally {await r.close();}
});


test('Base additive migration retains operator IDs and removed history while invalidating old sessions',async()=>{
 const r=await runtime('test-public-key',true);try{
  const rows=await r.db.prepare('SELECT id,status FROM oa_operators ORDER BY id').all();
  assert.deepEqual(rows.results,[{id:'legacy-owner',status:'active'},{id:'legacy-removed',status:'inactive'}]);
  assert.equal((await r.db.prepare('SELECT actor_id FROM campaign_state_transitions WHERE id=?').bind('legacy-action').first()).actor_id,'legacy-removed');
  assert.equal((await r.db.prepare('SELECT count(*) AS count FROM oa_sessions').first()).count,0);
  assert.equal((await r.db.prepare('SELECT count(*) AS count FROM operator_sessions').first()).count,1);
  assert.equal((await r.call('/api/operators',{cookie:'mango_session=legacy-token'})).status,401);
  assert.equal((await r.call('/auth/bootstrap',{method:'POST',body:{token:setup,displayName:'Replacement'}})).status,409);
  assert.equal((await r.call('/auth/magic-link',{method:'POST',body:{email:'owner@example.test'}})).status,202);
  const login=await r.call('/auth/confirm',{method:'POST',body:{token:await r.token()}});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await(await r.call('/api/operator',{cookie})).json()).operator.id,'legacy-owner');
 }finally{await r.close();}
});


test('MGMT-001 signed owner admission binds issuer, installation and origin, is single use, and grants an ordinary native owner session', async () => {
  const pair = await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'}, true, ['sign','verify']);
  const publicKey = await crypto.subtle.exportKey('jwk',pair.publicKey);
  const r = await runtime('test-public-key',false,{OWNER_EMAIL:'owner@example.test',SESSION_SECRET:secret,SETUP_TOKEN:setup,
    RER_MANAGEMENT_ORIGIN:'https://manage.example.test',RER_OWNER_CLAIM_ISSUER:'https://manage.example.test',RER_INSTALLATION_ID:'mango-admission',
    RER_OWNER_CLAIM_PUBLIC_KEYS:JSON.stringify({owner:publicKey})});
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const claim = async extra => {
    const now=Math.floor(Date.now()/1000), data={v:1,iss:'https://manage.example.test',aud:'https://mango.example.test',installationId:'mango-admission',email:'owner@example.test',jti:crypto.randomUUID(),iat:now,exp:now+120,...extra};
    const signed=encode({alg:'ES256',typ:'rer-owner-claim+jwt',kid:'owner'})+'.'+encode(data);
    return signed+'.'+Buffer.from(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,new TextEncoder().encode(signed))).toString('base64url');
  };
  try {
    for (const method of ['GET','HEAD']) assert.equal((await r.call('/auth/owner-claim',{method})).status,200);
    assert.equal((await r.db.prepare('SELECT count(*) AS n FROM oa_operators').first()).n,0);
    assert.equal((await r.call('/api/editor/config')).status,401);
    for (const extra of [{aud:'https://evil.test'},{installationId:'another-installation'},{iss:'https://evil.test'},{email:'other@example.test'},{exp:1}]) {
      assert.equal((await r.call('/auth/owner-claim',{method:'POST',body:{token:await claim(extra)}})).status,403);
    }
    assert.equal((await r.db.prepare('SELECT count(*) AS n FROM oa_operators').first()).n,0);
    const token=await claim({});
    assert.equal((await r.call('/auth/owner-claim',{method:'POST',origin:'https://evil.test',body:{token}})).status,403);
    const admitted=await r.call('/auth/owner-claim',{method:'POST',body:{token,displayName:'Owner',returnTo:'/app'}});
    assert.equal(admitted.status,303);
    const cookie=admitted.headers.get('set-cookie').split(';')[0];
    assert.equal(/^__Host-operator_session=/.test(cookie),true);
    assert.equal((await r.call('/api/operator',{cookie})).status,200);
    const grant=await r.call('/api/editor/config',{cookie});assert.equal(grant.status,200);
    const data=await grant.json();assert.equal(data.config.installationId,'mango-admission');assert.ok(data.expiresAt>Date.now());
    assert.equal((await r.call('/auth/owner-claim',{method:'POST',body:{token}})).status,409);
    assert.equal((await r.call('/auth/owner-claim',{method:'POST',body:{token:await claim({})}})).status,409);
    assert.equal((await r.db.prepare('SELECT count(*) AS n FROM oa_operators').first()).n,1);
    assert.equal((await r.db.prepare('SELECT count(*) AS n FROM oc_owner_claims').first()).n,1);
    assert.equal((await r.call('/auth/signout',{method:'POST',cookie,body:{}})).status,204);
    assert.equal((await r.call('/api/editor/config',{cookie})).status,401);
  } finally {await r.close();}
});
