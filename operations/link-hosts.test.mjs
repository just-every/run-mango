import assert from 'node:assert/strict';
import { test } from 'node:test';
import { invitationRuntime, confirmedOwner } from './fixtures/invitation-runtime.mjs';

test('newsletter link policy defaults to the app, persists owner changes and resets without weakening session or origin checks', async () => {
  const f = await invitationRuntime({environment: {MANGO_ALLOWED_LINK_HOSTS: '', MAIL_WEBHOOK_SECRET: '', MAIL_WEBHOOK_ID: ''}});
  const path = '/api/settings/link-hosts';
  try {
    assert.equal((await f.call(path)).status, 401);
    const cookie = await confirmedOwner(f);
    const read = async () => (await (await f.call(path, {cookie})).json()).hosts;
    assert.deepEqual(await read(), ['mango.example.test']);
    const save = (hosts, options = {}) => f.call(path, {method: 'PUT', cookie, body: {hosts}, ...options});
    assert.equal((await save('shop.example.test', {origin: 'https://attacker.test'})).status, 403);
    assert.equal((await save('https://shop.example.test/path')).status, 400);
    assert.deepEqual(await read(), ['mango.example.test']);
    assert.equal((await save('Shop.Example.test, news.example.test, shop.example.test')).status, 200);
    assert.deepEqual(await read(), ['shop.example.test', 'news.example.test']);
    assert.equal((await save('')).status, 200);
    assert.deepEqual(await read(), ['mango.example.test']);
    await f.call('/auth/signout', {method: 'POST', cookie, body: {}});
    assert.equal((await save('attacker.test')).status, 401);
  } finally {await f.close();}
});
