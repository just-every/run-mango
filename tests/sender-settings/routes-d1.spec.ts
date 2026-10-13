// @ts-nocheck -- Real D1, Base sessions and operator routes; provider I/O is test-only.
import { expect, test } from '@playwright/test';
import { invitationRuntime, cookie, confirmedOwner } from '../../operations/fixtures/invitation-runtime.mjs';

test('OPER-002/003 native settings routes protect initial owners and revoke current sessions atomically', async () => {
  const f = await invitationRuntime();
  try {
    const owner = await confirmedOwner(f);
    const ownerId = (await (await f.call('/api/operator', { cookie: owner })).json()).operator.id;
    const invite = (email, actor = owner) => f.call('/api/operators', { method: 'POST', cookie: actor, body: { email } });
    const accept = async () => cookie(await f.call('/auth/confirm', { method: 'POST', body: { token: await f.token() } }));
    const otherResponse = await invite('other@example.test');
    expect(otherResponse.status).toBe(201);
    const otherId = (await otherResponse.json()).operator.id;
    const other = await accept();
    for (const path of ['/api/settings/sender', '/api/operators']) expect((await f.call(path)).status).toBe(401);
    const status = await f.call('/api/settings/sender', { cookie: owner });
    expect(status.status).toBe(200);
    expect((await status.json()).validation.state).toBe('error');
    const invalid = await invite('invalid', other);
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toBe('invalid_email');
    const created = await invite(' Invited@Example.Test ', other);
    expect(created.status).toBe(201);
    const added = (await created.json()).operator;
    expect(added.email).toBe('invited@example.test');
    const duplicate = await invite('invited@example.test', other);
    expect((await duplicate.json()).operator.id).toBe(added.id);
    expect(await f.db.prepare('SELECT count(*) AS count FROM operators WHERE email = ?').bind(added.email).first()).toEqual({ count: 1 });
    const protectedRemoval = await f.call(`/api/operators/${ownerId}`, { method: 'DELETE', cookie: other });
    expect(protectedRemoval.status).toBe(400);
    expect((await protectedRemoval.json()).error).toContain('initial operator');
    const removed = await f.call(`/api/operators/${otherId}`, { method: 'DELETE', cookie: other });
    expect(removed.status).toBe(204);
    expect(removed.headers.get('set-cookie')?.includes('Max-Age=0')).toBe(true);
    expect((await f.call('/api/operators', { cookie: other })).status).toBe(401);
    const stored = await f.db.prepare('SELECT removed_at FROM operators WHERE id = ?').bind(otherId).first();
    const session = await f.db.prepare('SELECT revoked_at FROM oa_sessions WHERE operator_id = ?').bind(otherId).first();
    expect(stored.removed_at).toBeTruthy();
    expect(session.revoked_at).toBeTruthy();
    // Base forbids a stale invitation reactivating an inactive operator.
    const reactivated = await invite('other@example.test');
    expect(reactivated.status).toBe(409);
    expect((await reactivated.json()).error).toBe('invitation_conflict');
    expect((await f.call('/api/operators', { cookie: other })).status).toBe(401);
    const lastOwner = await f.call(`/api/operators/${ownerId}`, { method: 'DELETE', cookie: owner });
    expect(lastOwner.status).toBe(409);
    expect((await lastOwner.json()).error).toBe('last_owner');
    expect((await f.call('/api/settings/sender', { cookie: owner })).status).toBe(200);
    await invite('final-owner@example.test');
    await accept();
    const ownerRemoval = await f.call(`/api/operators/${ownerId}`, { method: 'DELETE', cookie: owner });
    expect(ownerRemoval.status).toBe(204);
    expect((await f.call('/api/settings/sender', { cookie: owner })).status).toBe(401);
  } finally { await f.close(); }
});
