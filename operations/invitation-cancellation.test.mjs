import assert from 'node:assert/strict';
import { test } from 'node:test';
import { invitationRuntime, cookie, confirmedOwner } from './fixtures/invitation-runtime.mjs';

async function invite(r, actor, email) {
  const response = await r.call('/api/operators', { method: 'POST', cookie: actor, body: { email } });
  assert.equal(response.status, 201, await response.clone().text());
  return { ...(await response.json()), token: await r.token() };
}
async function join(r, actor, email) {
  const result = await invite(r, actor, email);
  const response = await r.call('/auth/confirm', { method: 'POST', body: { token: result.token } });
  assert.equal(response.status, 303);
  return { ...result, cookie: cookie(response) };
}
async function list(r, actor) { return (await (await r.call('/api/operators', { cookie: actor })).json()).operators; }
async function unavailable(r, token) {
  for (const method of ['GET', 'HEAD']) assert.equal((await r.call(`/auth/confirm?token=${token}`, { method })).status, 400);
  const response = await r.call('/auth/confirm', { method: 'POST', body: { token } });
  assert.equal(response.status, 400);
  assert.equal(response.headers.has('set-cookie'), false);
}

test('OPER-001/002/003: pending removal cancels Base invitation links and preserves attributed history', async () => {
  const r = await invitationRuntime();
  try {
    const owner = await confirmedOwner(r);
    const teammate = await join(r, owner, 'teammate@example.test');
    const pending = await invite(r, owner, 'pending@example.test');
    assert.equal(pending.operator.status, 'invited');
    assert.equal((await list(r, teammate.cookie)).find(row => row.id === pending.operator.id).status, 'invited');
    const before = await r.db.prepare('SELECT * FROM operators WHERE id=?').bind(pending.operator.id).first();
    const bootstrap = await r.db.prepare('SELECT * FROM oa_bootstrap').first();
    await r.db.prepare("INSERT INTO campaigns(id,state,created_at,updated_at) VALUES('history-campaign','draft',10,10)").run();
    await r.db.prepare("INSERT INTO campaign_state_transitions(id,campaign_id,from_state,to_state,actor_type,actor_id,occurred_at,created_at) VALUES('history-entry','history-campaign','draft','draft','operator',?,10,10)").bind(pending.operator.id).run();
    assert.equal((await r.call(`/auth/confirm?token=${pending.token}`)).status, 200);
    const removed = await r.call(`/api/operators/${pending.operator.id}`, { method: 'DELETE', cookie: teammate.cookie });
    assert.equal(removed.status, 204, await removed.text());
    assert.equal((await list(r, owner)).some(row => row.id === pending.operator.id), false);
    await unavailable(r, pending.token);
    const after = await r.db.prepare('SELECT * FROM operators WHERE id=?').bind(pending.operator.id).first();
    assert.ok(after.removed_at);
    assert.deepEqual({ ...after, removed_at: before.removed_at, updated_at: before.updated_at }, before);
    assert.equal((await r.db.prepare('SELECT actor_id FROM campaign_state_transitions WHERE id=?').bind('history-entry').first()).actor_id, pending.operator.id);
    assert.deepEqual(await r.db.prepare('SELECT * FROM oa_bootstrap').first(), bootstrap);
    assert.equal((await r.db.prepare('SELECT count(*) AS n FROM oa_sessions WHERE operator_id=?').bind(pending.operator.id).first()).n, 0);
    await r.db.prepare('DELETE FROM oa_tokens WHERE operator_id=?').bind(pending.operator.id).run();
    await assert.rejects(r.db.prepare("UPDATE oa_operators SET status='active' WHERE id=?").bind(pending.operator.id).run(), /invitation_required/);
    assert.equal((await r.call('/api/operator', { cookie: teammate.cookie })).status, 200);
  } finally { await r.close(); }
});

test('BASE-ACCESS-001/OPER-002: cancellation requires native session and exact Origin, with initial/last operator safeguards', async () => {
  const r = await invitationRuntime();
  try {
    const owner = await confirmedOwner(r);
    const teammate = await join(r, owner, 'teammate@example.test');
    const pending = await invite(r, owner, 'pending@example.test');
    const path = `/api/operators/${pending.operator.id}`;
    assert.equal((await r.call(path, { method: 'DELETE' })).status, 401);
    assert.equal((await r.call(path, { method: 'DELETE', cookie: owner, origin: 'https://attacker.test' })).status, 403);
    assert.equal((await r.call('/auth/invite/cancel', { method: 'POST', cookie: owner, body: { operatorId: pending.operator.id } })).status, 404);
    const initial = (await list(r, owner)).find(row => row.isInitial);
    assert.equal((await r.call(`/api/operators/${initial.id}`, { method: 'DELETE', cookie: teammate.cookie })).status, 400);
    assert.equal((await r.call('/auth/signout', { method: 'POST', cookie: teammate.cookie, body: {} })).status, 204);
    assert.equal((await r.call(path, { method: 'DELETE', cookie: teammate.cookie })).status, 401);
    assert.equal((await r.call(`/auth/confirm?token=${pending.token}`)).status, 200);
    assert.equal((await r.call(`/api/operators/${teammate.operator.id}`, { method: 'DELETE', cookie: owner })).status, 204);
    const last = await r.call(`/api/operators/${initial.id}`, { method: 'DELETE', cookie: owner });
    assert.equal(last.status, 409);
    assert.deepEqual(await last.json(), { error: 'last_owner' });
    assert.equal((await r.call(path, { method: 'DELETE', cookie: owner })).status, 204);
    await unavailable(r, pending.token);
  } finally { await r.close(); }
});

async function awaitBarrier(db, id) {
  const deadline = Date.now() + 5000;
  while (!await db.prepare('SELECT id FROM test_barriers WHERE id=?').bind(id).first()) {
    if (Date.now() > deadline) throw new Error('Removal did not reach Base target lookup');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
for (const change of ['confirmed', 'actor-revoked']) test(`OPER-002: held pending removal fails visibly after ${change}, and the refreshed list reflects authority`, async () => {
  const r = await invitationRuntime();
  let held, barrier;
  try {
    const owner = await confirmedOwner(r);
    const pending = await invite(r, owner, 'pending@example.test');
    barrier = crypto.randomUUID();
    held = r.call(`/api/operators/${pending.operator.id}`, { method: 'DELETE', cookie: owner,
      headers: { 'X-Test-Barrier': barrier, 'X-Test-Target': pending.operator.id } });
    await awaitBarrier(r.db, barrier);
    let joined;
    if (change === 'confirmed') {
      joined = await r.call('/auth/confirm', { method: 'POST', body: { token: pending.token } });
      assert.equal(joined.status, 303);
    } else assert.equal((await r.call('/auth/signout', { method: 'POST', cookie: owner, body: {} })).status, 204);
    await r.db.prepare('UPDATE test_barriers SET released=1 WHERE id=?').bind(barrier).run();
    const response = await held;
    assert.equal(response.status, change === 'confirmed' ? 409 : 401);
    assert.deepEqual(await response.json(), { error: change === 'confirmed' ? 'authority_changed' : 'unauthenticated' });
    assert.equal((await r.db.prepare('SELECT removed_at FROM operators WHERE id=?').bind(pending.operator.id).first()).removed_at, null);
    if (joined) {
      assert.equal((await list(r, owner)).find(row => row.id === pending.operator.id).status, 'active');
      assert.equal((await r.call('/api/operator', { cookie: cookie(joined) })).status, 200);
      // A fresh explicit removal may remove the now-active operator.
      assert.equal((await r.call(`/api/operators/${pending.operator.id}`, { method: 'DELETE', cookie: owner })).status, 204);
      assert.equal((await r.call('/api/operator', { cookie: cookie(joined) })).status, 401);
    } else assert.equal((await r.call(`/auth/confirm?token=${pending.token}`)).status, 200);
  } finally {
    try {
      if (barrier) await r.db.prepare('UPDATE test_barriers SET released=1 WHERE id=?').bind(barrier).run();
      if (held) await held;
    } finally { await r.close(); }
  }
});
