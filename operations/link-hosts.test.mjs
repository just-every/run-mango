import assert from 'node:assert/strict';
import { test } from 'node:test';
import { invitationRuntime, confirmedOwner } from './fixtures/invitation-runtime.mjs';

test('newsletter link policy defaults to the app, persists owner changes and resets without weakening session or origin checks', async () => {
  const f = await invitationRuntime({environment: {MANGO_ALLOWED_LINK_HOSTS: '', MAIL_WEBHOOK_SECRET: '', MAIL_WEBHOOK_ID: ''}});
  const path = '/api/settings/link-hosts';
  try {
    assert.equal((await f.call(path)).status, 401);
    const cookie = await confirmedOwner(f);
    const defaults = [
      {host: 'mango.example.test', source: 'Deployment host'},
      {host: 'www.instagram.com', source: 'Social defaults'},
      {host: 'www.facebook.com', source: 'Social defaults'},
      {host: 'www.tiktok.com', source: 'Social defaults'},
      {host: 'www.youtube.com', source: 'Social defaults'},
      {host: 'www.linkedin.com', source: 'Social defaults'},
      {host: 'x.com', source: 'Social defaults'},
      {host: 'www.pinterest.com', source: 'Social defaults'},
    ];
    const initial = await (await f.call(path, {cookie})).json();
    const read = async () => (await (await f.call(path, {cookie})).json()).hosts;
    assert.deepEqual(initial.hosts, defaults.map(row => row.host));
    assert.deepEqual(initial.sources, defaults);
    const save = (hosts, options = {}) => f.call(path, {method: 'PUT', cookie, body: {hosts}, ...options});
    assert.equal((await save('shop.example.test', {origin: 'https://attacker.test'})).status, 403);
    assert.equal((await save('https://shop.example.test/path')).status, 400);
    assert.deepEqual(await read(), defaults.map(row => row.host));
    assert.equal((await save('Shop.Example.test, news.example.test, shop.example.test')).status, 200);
    assert.deepEqual(await read(), ['shop.example.test', 'news.example.test']);
    assert.equal((await save('')).status, 200);
    assert.deepEqual(await read(), ['mango.example.test']);
    await f.call('/auth/signout', {method: 'POST', cookie, body: {}});
    assert.equal((await save('attacker.test')).status, 401);
  } finally {await f.close();}
});
