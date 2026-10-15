import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtime, secret, setup } from './base-runtime.mjs';

test('Managed sign-in uses the published relay, retries fresh links after Retry-After, and reports credential refusal', async () => {
  const relayUrl = 'https://manage.example.test/api/managed-mail/send';
  const relayKey = 'synthetic-installation-mail-key';
  const r = await runtime('unused', false, { OWNER_EMAIL: 'owner@example.test', SESSION_SECRET: secret, SETUP_TOKEN: setup,
    MAIL_PROVIDER: 'rer', MAIL_FROM: 'signin@example.test', MAIL_API_KEY: relayKey, MAIL_RELAY_URL: relayUrl,
    MAIL_PROVIDER_API_KEY: '', MAIL_AUTH_FROM: '', MAIL_WEBHOOK_SECRET: '', MAIL_WEBHOOK_ID: '', MANGO_EMAIL_HANDOFFS_PER_MINUTE: '60000' });
  const send = (relayStatus = 202) => r.call('/auth/magic-link', { method: 'POST', form: true, body: {email:'owner@example.test'}, relayStatus });
  try {
    assert.equal((await r.call('/auth/bootstrap', { method:'POST', body:{token:setup,displayName:'Owner'} })).status, 303);
    const sent = await send();
    assert.equal(sent.status, 202);
    const captured = await r.db.prepare('SELECT * FROM test_mail ORDER BY id DESC LIMIT 1').first();
    assert.equal(captured.url, relayUrl);
    assert.equal(captured.method, 'POST');
    assert.equal(captured.redirect, 'manual');
    assert.equal(captured.authorization, `Bearer ${relayKey}`);
    assert.equal(captured.content_type, 'application/json');
    const body = JSON.parse(captured.body);
    assert.deepEqual(Object.keys(body).sort(), ['html','subject','text','to']);
    assert.equal(body.to, 'owner@example.test');
    assert.ok(body.subject && body.text && body.html);
    const token = await r.token();
    assert.ok(body.text.includes(token) && body.html.includes(token));
    assert.equal((await r.call(`/auth/confirm?token=${token}`)).status, 200);
    const confirmed = await r.call('/auth/confirm', {method:'POST',body:{token}});
    assert.equal(confirmed.status, 303);
    const cookie = confirmed.headers.get('set-cookie').split(';')[0];
    assert.equal((await r.call('/api/operator', {cookie})).status, 200);

    const limitedAt = Date.now();
    assert.equal((await send(429)).status, 503);
    const refusedToken = await r.token();
    assert.equal((await r.call(`/auth/confirm?token=${refusedToken}`)).status, 400);
    const pacing = await r.db.prepare('SELECT next_at FROM provider_pacing WHERE scope=?').bind('rer:installation').first();
    assert.ok(pacing.next_at >= limitedAt + 1000);
    const before = (await r.db.prepare('SELECT count(*) n FROM test_mail').first()).n;
    assert.equal((await send()).status, 503);
    assert.equal((await r.db.prepare('SELECT count(*) n FROM test_mail').first()).n, before);
    await new Promise(resolve => setTimeout(resolve, Math.max(0, pacing.next_at - Date.now() + 20)));
    assert.equal((await send()).status, 202);
    const retryToken = await r.token();
    assert.notEqual(retryToken, refusedToken);
    assert.equal((await r.call('/auth/confirm', {method:'POST',body:{token:retryToken}})).status, 303);

    const refused = await send(401);
    assert.equal(refused.status, 503);
    assert.match(refused.headers.get('content-type'), /text\/html/);
    assert.equal((await r.call(`/auth/confirm?token=${await r.token()}`)).status, 400);
    assert.equal((await r.call('/api/operator', {cookie})).status, 200);
  } finally { await r.close(); }
});
