import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import { contract } from '../tests/contract.js';

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
