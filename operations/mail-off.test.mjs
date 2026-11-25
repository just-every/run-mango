import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { runtime } from './base-runtime.mjs';
import { ownerSigninDigest } from '../node_modules/@runeditrun/rer/modules/operator-auth/owner-signin-grant.mjs';

// Mail off (MAIL_PROVIDER=none, rer's mail-off deploy): no sender or key, nothing sent, and the owner signs in
// with the link `rer signin` writes into Base's oa_owner_signins. Only the network edge is fake: any mail request throws.
const mailOff = { MAIL_PROVIDER: 'none', MAIL_PROVIDER_API_KEY: undefined, MAIL_AUTH_FROM: undefined, MAIL_WEBHOOK_SECRET: undefined, MAIL_WEBHOOK_ID: undefined };

test('with mail off the sign-in email is refused and the owner signs in with the rer signin link', async () => {
  const app = await runtime('unused', false, mailOff);
  try {
    const refused = await app.call('/auth/magic-link', { method: 'POST', form: true, body: { email: 'owner@example.test', returnTo: '/app' } });
    assert.notEqual(refused.status, 202);
    assert.match(await refused.text(), /Email is off for this installation/);
    assert.equal((await app.db.prepare('SELECT count(*) AS n FROM test_mail').first()).n, 0);

    const now = Date.now(), token = randomBytes(32).toString('base64url');
    await app.db.prepare("INSERT INTO oa_operators(id,email,display_name,role,status,version,created_at) VALUES('owner-1','owner@example.test','Owner','owner','active',1,?)").bind(now).run();
    await app.db.prepare('INSERT INTO oa_owner_signins(id,token_hash,operator_id,operator_version,created_at,expires_at) VALUES(?,?,?,?,?,?)')
      .bind('grant-1', await ownerSigninDigest(token), 'owner-1', 1, now, now + 900_000).run();
    const confirm = await app.call(`/auth/owner-signin?token=${token}`);
    assert.equal(confirm.status, 200);
    assert.match(await confirm.text(), /owner@example\.test/);
    const signedIn = await app.call(`/auth/owner-signin?token=${token}`, { method: 'POST' });
    assert.match(signedIn.headers.get('set-cookie') ?? '', /operator_session=/);
    assert.equal((await app.call(`/auth/owner-signin?token=${token}`)).status, 404, 'the link works once');
  } finally { await app.close(); }
});
