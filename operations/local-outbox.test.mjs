import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import { contract } from '../tests/contract.js';
import { createD1DevelopmentOutbox, createDevelopmentOutboxHandler } from '../src/vendor/base/mail/src/development/index.mjs';

contract('OPER-001', 'Base outbox browsing uses read-only SQL, bounded summaries and complete attachment details', async () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec(await readFile(new URL('../migrations/core/0022_local_mail_outbox.sql', import.meta.url), 'utf8'));
    const db = {
      prepare(sql) { return { bind(...values) { return { sql, values }; } }; },
      async batch(statements) {
        sqlite.exec('BEGIN');
        try {
          const results = statements.map(({ sql, values }) => ({ success: true, results: sqlite.prepare(sql).all(...values) }));
          sqlite.exec('COMMIT'); return results;
        } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
      },
    };
    let now = 1000;
    const outbox = createD1DevelopmentOutbox({ db, maxAgeMs: 100, maxMessages: 2, clock: () => now });
    const message = deliveryId => ({ deliveryId, from: 'sender@example.test', to: ['reader@example.test'], subject: 'Local capture', text: 'Saved locally', attachments: [{ filename: 'raw.bin', contentType: 'application/octet-stream', content: Uint8Array.of(0, 255, 128, 10) }] });
    for (const id of ['first', 'second', 'third']) await outbox.put(message(id));
    const before = sqlite.prepare('SELECT * FROM rer_mail_development_outbox ORDER BY sequence').all();
    sqlite.exec('PRAGMA query_only = ON');
    const rows = await outbox.list();
    assert.deepEqual(rows.map(row => row.message.deliveryId), ['third', 'second']);
    assert.equal('attachments' in rows[0].message, false);
    const detail = await outbox.get(rows[0].id);
    assert.deepEqual(detail.message, message('third'));
    assert.ok(detail.message.attachments[0].content instanceof Uint8Array);
    const limited = createD1DevelopmentOutbox({ db, maxMessages: 1, clock: () => now });
    assert.deepEqual((await limited.list()).map(row => row.message.deliveryId), ['third']);
    const handler = createDevelopmentOutboxHandler({ local: true, origin: 'http://127.0.0.1:15660', outbox });
    for (const method of ['GET', 'HEAD']) for (const query of ['', `?message=${rows[0].id}`]) {
      const response = await handler(new Request(`http://127.0.0.1:15660/__dev/outbox${query}`, { method, headers: { host: '127.0.0.1:15660' } }));
      assert.equal(response.status, 200);
    }
    now = 1100;
    assert.deepEqual(await outbox.list(), []);
    assert.equal(await outbox.get(rows[0].id), null);
    assert.deepEqual(sqlite.prepare('SELECT * FROM rer_mail_development_outbox ORDER BY sequence').all(), before);
    sqlite.exec('PRAGMA query_only = OFF');
    await outbox.put(message('fresh'));
    assert.deepEqual((await outbox.list()).map(row => row.message.deliveryId), ['fresh']);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM rer_mail_development_outbox').get().count, 1);
  } finally { sqlite.close(); }
});

contract('OPER-001', 'Base local setup completion requires the CLI proof and an active owner, and is unavailable in production', async () => {
  const { createHmac, randomBytes } = await import('node:crypto');
  const { completeLocalSetup } = await import('../src/core/features/auth/setup-complete.ts');
  const sqlite = new DatabaseSync(':memory:');
  try {
    for (const name of (await readdir(new URL('../migrations/core/', import.meta.url))).filter(name => name.endsWith('.sql')).sort()) {
      sqlite.exec(await readFile(new URL(`../migrations/core/${name}`, import.meta.url), 'utf8'));
    }
    const db = { prepare(sql) {
      const statement = sqlite.prepare(sql);
      const bound = values => ({ bind: (...next) => bound(next), first: async () => statement.get(...values) ?? null,
        run: async () => ({ success: true, meta: statement.run(...values) }) });
      return bound([]);
    } };
    const secret = randomBytes(32).toString('hex');
    const proof = createHmac('sha256', secret).update('local-cli\0sign-in').digest('hex');
    const config = { local: true, publicBaseUrl: new URL('http://127.0.0.1:15660'), initialOperatorEmails: ['owner@example.test'], sessionSigningKey: secret };
    const call = (value = proof, local = true) => {
      const origin = local ? 'http://127.0.0.1:15660' : 'https://mango.example.test';
      return completeLocalSetup(new Request(`${origin}/auth/setup-complete`, { method: 'POST', headers: { Host: new URL(origin).host, Origin: origin, 'Content-Type': 'application/json', ...(value ? { 'x-rer-local-cli': value } : {}) }, body: '{}' }), db, { ...config, local, publicBaseUrl: new URL(origin) });
    };
    assert.equal((await call()).status, 403);
    sqlite.prepare('INSERT INTO oa_operators(id,email,display_name,role,status,version,created_at) VALUES(?,?,?,?,?,?,?)').run('owner', 'owner@example.test', 'Owner', 'owner', 'active', 1, 1);
    sqlite.prepare('INSERT INTO oa_bootstrap(singleton,claim_id,claimed_at) VALUES(1,?,1)').run('owner');
    for (const [value, local] of [[undefined, false], ['', true], ['wrong-proof', true]]) {
      assert.equal((await call(value, local)).status, 403);
      assert.equal(sqlite.prepare('SELECT first_setup FROM oa_auth_settings').get().first_setup, 1);
    }
    const response = await call();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { complete: true });
    assert.equal(sqlite.prepare('SELECT first_setup FROM oa_auth_settings').get().first_setup, 0);
  } finally { sqlite.close(); }
});
