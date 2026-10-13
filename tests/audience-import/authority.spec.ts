import { expect, test } from '@playwright/test';
import { audienceImportContext } from '../../src/core/features/audience/import-service';
import { ownedTables } from '../../src/core/features/audience/import-target';
import { hashToken } from '../../src/vendor/base/operator-auth/crypto.mjs';
import type { D1ImportContext } from '../../src/vendor/base/import-kit/src/d1/index';
import { native } from './native';

type Harness = Awaited<ReturnType<typeof native>>;
const operatorId = 'import-authority-operator';
const sessionId = 'import-authority-session';
const input = { files: [{ name: 'authority.csv', preset: 'csv-unsubscribed',
  csv: 'Email Address\nfirst@example.test\nsecond@example.test' }] };

async function nativeContext(h: Harness) {
  const now = Date.now();
  const token = 'a'.repeat(43);
  const tokenHash = await hashToken(h.f.platform.config.sessionSigningKey, 'session', token);
  await h.f.db.prepare(`INSERT INTO oa_operators(id,email,display_name,role,status,version,created_at)
    VALUES (?,'authority@example.test','Import operator','member','active',1,?)`).bind(operatorId, now).run();
  await h.f.db.prepare(`INSERT INTO oa_sessions(id,token_hash,operator_id,operator_version,kind,created_at,expires_at)
    VALUES (?,?,?,1,'native',?,?)`).bind(sessionId, tokenHash, operatorId, now, now + 60_000).run();
  const context = await audienceImportContext(h.f.platform, operatorId,
    new Request('https://mango.example.test/api/audience/imports', { headers: { cookie: `__Host-operator_session=${token}` } }));
  return { ...context, batchSize: 1, maxBatches: 1 };
}

async function snapshot(h: Harness) {
  const imported = (await h.f.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'ik_%' ORDER BY name").all<{ name: string }>()).results;
  const tables = [...ownedTables, 'mango_import_revisions', 'audience_import_plans', ...imported.map(row => row.name)];
  return Object.fromEntries(await Promise.all(tables.map(async table =>
    [table, (await h.f.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results])));
}

function expireBeforeCommit(h: Harness, context: D1ImportContext) {
  const db = context.storage.database;
  let preflights = 0;
  let expiresAt: number | undefined;
  context.storage.database = {
    prepare: sql => db.prepare(sql),
    async batch(statements) {
      // Base's authorize/read batches contain only guards and cleanup. Expire the
      // real native session after those succeed, immediately before a write batch.
      if (statements.length > 4 && expiresAt === undefined) {
        expect(preflights).toBeGreaterThan(0);
        expiresAt = Date.now() - 100;
        await h.f.db.prepare('UPDATE oa_sessions SET expires_at=? WHERE id=?').bind(expiresAt, sessionId).run();
      }
      const result = await db.batch(statements);
      preflights++;
      return result;
    },
  };
  return () => {
    expect(expiresAt).toBeDefined();
    expect(expiresAt!).toBeLessThanOrEqual(Date.now() - 100);
  };
}

test('BASE-ACCESS-002 CONT-010 native session expiry between preflight and create commits no import state', async () => {
  const h = await native();
  try {
    const context = await nativeContext(h);
    const preview = await h.service.preview(input, context);
    const before = await snapshot(h);
    const expired = expireBeforeCommit(h, context);
    await expect(h.service.create(preview.fingerprint, context)).rejects.toThrow('IMPORT_ATOMIC_GUARD');
    expired();
    expect(await snapshot(h)).toEqual(before);
  } finally { await h.close(); }
});

test('BASE-ACCESS-002 CONT-010 native session expiry after resume preflight preserves contacts and checkpoint', async () => {
  const h = await native();
  try {
    const context = await nativeContext(h);
    const preview = await h.service.preview(input, context);
    const job = await h.service.create(preview.fingerprint, context);
    expect(job).toMatchObject({ state: 'applying', checkpoint: 1, total: 2 });
    expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({ count: 1 });
    const before = await snapshot(h);
    const expired = expireBeforeCommit(h, context);
    await expect(h.service.resume(job.id, context)).rejects.toThrow('IMPORT_ATOMIC_GUARD');
    expired();
    expect(await snapshot(h)).toEqual(before);
  } finally { await h.close(); }
});
