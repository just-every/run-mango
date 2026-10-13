import { expect, test } from '@playwright/test';
import { readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { contract } from '../contract';
import { authorityRuntime, signIn } from './authority-runtime.mjs';
import { nativeDatabase, preview, seedAuthority, snapshot } from './authority-data.mjs';

contract('CONT-006', 'forced setup retains suppression and opt-out authority while invalidating prior native sessions', async ({ browser }) => {
  test.setTimeout(600000);
  const runtime = await authorityRuntime();
  const context = await browser.newContext(), page = await context.newPage();
  try {
    await runtime.setup(false);
    const initial = await runtime.variables();
    for (const key of ['SESSION_SIGNING_KEY', 'AUTH_SETUP_TOKEN', 'CONTACT_HASH_SALT']) expect(/^[a-f0-9]{64}$/.test(initial[key])).toBe(true);
    expect(new Set(['SESSION_SIGNING_KEY', 'AUTH_SETUP_TOKEN', 'CONTACT_HASH_SALT'].map(key => initial[key])).size).toBe(3);
    await runtime.start();
    await signIn(page, runtime.url);
    expect((await page.request.get(runtime.url + '/api/campaigns')).status()).toBe(200);
    await runtime.stop();
    const varsPath = join(runtime.checkout, '.dev.vars');
    const priorText = await readFile(varsPath, 'utf8');
    const authority = initial.CONTACT_HASH_SALT;
    let db = await nativeDatabase(runtime.checkout);
    const protectedRows = seedAuthority(db, authority, 'prior');
    let before = snapshot(db); db.close();
    await runtime.setup(false);
    expect(await readFile(varsPath, 'utf8') === priorText).toBe(true);
    // Setup deliberately creates fresh sign-in mail. The failed migration and
    // rotations must preserve the complete state after that successful rerun.
    db = await nativeDatabase(runtime.checkout); const afterSetup = snapshot(db); db.close();
    for (const [table, rows] of Object.entries(before)) {
      if (['oa_limits', 'oa_tokens', 'rer_mail_development_outbox'].includes(table)) continue;
      const stable = (values: any[]) => table === 'operators' ? values.map(({ updated_at, ...row }) => row) : values;
      expect(JSON.stringify(stable(afterSetup[table])) === JSON.stringify(stable(rows)), table).toBe(true);
    }
    before = afterSetup;
    const invalidMigration = join(runtime.checkout, 'migrations/core/0099_authority_failure.sql');
    await writeFile(invalidMigration, 'INVALID MIGRATION FOR FAILURE RESTORE TEST;');
    await expect(runtime.setup(true)).rejects.toThrow();
    expect(await readFile(varsPath, 'utf8') === priorText).toBe(true);
    await rm(invalidMigration);
    db = await nativeDatabase(runtime.checkout); const afterFailure = snapshot(db); db.close(); expect(JSON.stringify(afterFailure) === JSON.stringify(before)).toBe(true);
    for (let rotation = 0; rotation < 2; rotation++) {
      const previous = await runtime.variables();
      await runtime.setup(true);
      const next = await runtime.variables();
      expect(next.SESSION_SIGNING_KEY !== previous.SESSION_SIGNING_KEY).toBe(true);
      expect(next.AUTH_SETUP_TOKEN !== previous.AUTH_SETUP_TOKEN).toBe(true);
      expect((await stat(varsPath)).mode & 0o777).toBe(0o600);
      db = await nativeDatabase(runtime.checkout); const afterRotation = snapshot(db); db.close(); expect(JSON.stringify(afterRotation) === JSON.stringify(before)).toBe(true);
    }
    const current = await runtime.variables();
    db = await nativeDatabase(runtime.checkout);
    const currentRows = seedAuthority(db, current.CONTACT_HASH_SALT, 'current'); db.close();
    await runtime.start();
    expect((await page.request.get(runtime.url + '/api/campaigns')).status()).toBe(401);
    await signIn(page, runtime.url);
    const rows = [...protectedRows, ...currentRows];
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const result = await preview(page.request, runtime.url, rows);
      await test.info().attach(`authority-${width}`, { contentType: 'application/json', body: JSON.stringify({
        width, authority: 'CONTACT_HASH_SALT', storedPriorSuppressions: before.contact_suppressions,
        storedPriorOptOuts: before.surviving_opt_outs, counts: result.counts,
        rows: result.rows.map(({ email, status }) => ({ email, status })),
      }) });
      expect(result.counts.suppressed).toBe(10);
      expect(result.counts.unsubscribed).toBe(2);
      for (const row of rows) expect(result.rows.find(item => item.email === row.email)?.status).toBe(row.status);
    }
    expect(current.CONTACT_HASH_SALT === authority).toBe(true);
    const result = await preview(page.request, runtime.url, rows);
    const imported = await page.request.post(runtime.url + '/api/audience/imports', { headers: { Origin: runtime.url }, data: { fingerprint: result.fingerprint } });
    expect(imported.status()).toBe(200);
    let { job } = await imported.json(), batches = 0;
    while (['queued', 'applying'].includes(job.state)) {
      expect(++batches).toBeLessThanOrEqual(rows.length);
      const previousCheckpoint = job.checkpoint;
      const resumed = await page.request.post(`${runtime.url}/api/audience/imports/${job.id}/resume`, { headers: { Origin: runtime.url }, data: {} });
      expect(resumed.status()).toBe(200);
      ({ job } = await resumed.json());
      expect(job.checkpoint).toBeGreaterThan(previousCheckpoint);
    }
    expect(job.state).toBe('completed');
    await runtime.stop();
    db = await nativeDatabase(runtime.checkout);
    try {
      expect(db.prepare('SELECT COUNT(*) AS n FROM oa_operators').get().n).toBe(1);
      for (const row of rows) expect(db.prepare('SELECT email_status FROM contacts WHERE email=?').get(row.email).email_status).toBe(row.status);
      expect(db.prepare('SELECT COUNT(*) AS n FROM contact_suppressions').get().n).toBe(10);
      // Import adds surviving opt-outs for restrictive suppression statuses as
      // well; the two original standalone opt-outs keep their exact records.
      expect(db.prepare('SELECT COUNT(*) AS n FROM surviving_opt_outs').get().n).toBe(12);
      expect(db.prepare("SELECT * FROM surviving_opt_outs WHERE id='prior-opt-out'").get()).toEqual(before.surviving_opt_outs[0]);
      expect(db.prepare('SELECT COUNT(*) AS n FROM campaigns').get().n).toBe(0);
    } finally { db.close(); }
    const good = await readFile(varsPath, 'utf8');
    const damaged = good.replace(/^CONTACT_HASH_SALT=.*$/m, 'CONTACT_HASH_SALT=');
    await writeFile(varsPath, damaged);
    await expect(runtime.setup(true)).rejects.toThrow();
    expect(await readFile(varsPath, 'utf8') === damaged).toBe(true);
    await expect(runtime.command(['dev'])).rejects.toThrow();
    await writeFile(varsPath, good);
    const backup = join(runtime.directory, 'saved.dev.vars');
    await rename(varsPath, backup);
    try { await expect(runtime.setup(false)).rejects.toThrow(); }
    finally { await rename(backup, varsPath); }
  } finally { await context.close(); await runtime.close(); }
});
