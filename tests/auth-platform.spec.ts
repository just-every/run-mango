// @ts-nocheck -- The integration harness uses real Worker/D1 and Base auth.
import { expect, test } from '@playwright/test';
import { invitationRuntime, cookie } from '../operations/fixtures/invitation-runtime.mjs';
import { createHmac } from 'node:crypto';

test('magic links are hashed, single-use, and create an authenticated operator session', async () => {
  const fixture = await invitationRuntime();
  try {
    await fixture.bootstrap();
    const requested = await fixture.call('/auth/magic-link', { method: 'POST', body: { email: 'owner@example.test' } });
    expect(requested.status).toBe(202);
    const sent = (await fixture.db.prepare('SELECT body FROM test_mail').all()).results;
    expect(sent.length).toBe(1);
    const message = JSON.parse(sent[0].body);
    expect(JSON.stringify(message.custom_args ?? {}).includes('owner@example.test')).toBe(false);
    const token = await fixture.token();
    expect(Boolean(token)).toBe(true);
    const stored = await fixture.db.prepare('SELECT token_hash FROM oa_tokens').first();
    expect(stored.token_hash !== token).toBe(true);
    expect(stored.token_hash === createHmac('sha256', 'invitation-test-secret-more-than-thirty-two-bytes').update(`link\0${token}`).digest('hex')).toBe(true);
    const firstUse = await fixture.call('/auth/confirm', { method: 'POST', body: { token } });
    expect(firstUse.status).toBe(303);
    const session = cookie(firstUse);
    const operator = await fixture.call('/api/operator', { cookie: session });
    expect((await operator.json()).operator.email).toBe('owner@example.test');
    const replay = await fixture.call('/auth/confirm', { method: 'POST', body: { token } });
    expect(replay.status).toBe(400);
    expect(replay.headers.has('set-cookie')).toBe(false);
    const sessionRow = await fixture.db.prepare("SELECT token_hash FROM oa_sessions WHERE kind='native' ORDER BY created_at DESC LIMIT 1").first();
    expect(sessionRow.token_hash !== session.split('=')[1]).toBe(true);
    expect((await fixture.call('/api/operator', { cookie: session })).status).toBe(200);
  } finally { await fixture.close(); }
});
