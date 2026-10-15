import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { authorityRuntime, signIn } from './authority-runtime.mjs';
import { nativeDatabase, preview, seedAuthority, snapshot } from './authority-data.mjs';

for (const authority of ['session', 'contact'] as const) test(`[CONT-006] legacy ${authority} authority suppressions and opt-outs survive explicit upgrade and two native credential rotations`, async ({ browser }) => {
  test.setTimeout(600000);
  const runtime = await authorityRuntime();
  const context = await browser.newContext(), page = await context.newPage();
  try {
    await runtime.setup(false);
    const original = await runtime.variables();
    await runtime.start();
    await signIn(page, runtime.url);
    await runtime.stop();
    const varsPath = join(runtime.checkout, '.dev.vars');
    const legacyVars = (await readFile(varsPath, 'utf8')).replace(/^MANGO_LOCAL_HASH_AUTHORITY=.*\n/m, '');
    await writeFile(varsPath, legacyVars, { mode: 0o600 });
    // Historical local runtimes used SESSION_SIGNING_KEY even though setup also
    // wrote a different, unused CONTACT_HASH_SALT. Preserve both prior values.
    expect(original.SESSION_SIGNING_KEY === original.CONTACT_HASH_SALT).toBe(false);
    let db = await nativeDatabase(runtime.checkout);
    const effective = authority === 'session' ? original.SESSION_SIGNING_KEY : original.CONTACT_HASH_SALT;
    const rows = seedAuthority(db, effective, 'legacy');
    db.prepare("UPDATE sender_settings SET display_name='Newsletter',from_email='sender@example.test',reply_to_email='reply@example.test',physical_address='1 Test Street',updated_by='legacy-owner',created_at=1,updated_at=1 WHERE id='business'").run();
    const before = snapshot(db); db.close();
    await expect(runtime.command(['dev'])).rejects.toThrow();
    await expect(runtime.setup(true)).rejects.toThrow();
    expect(await readFile(varsPath, 'utf8') === legacyVars).toBe(true);
    db = await nativeDatabase(runtime.checkout); expect(JSON.stringify(snapshot(db)) === JSON.stringify(before)).toBe(true); db.close();
    for (let rotation = 0; rotation < 2; rotation++) {
      const previous = await runtime.variables();
      await runtime.setup(true, rotation === 0 ? [`--legacy-${authority}-authority`] : []);
      const current = await runtime.variables();
      expect(current.MANGO_LOCAL_HASH_AUTHORITY).toBe('contact-salt-v1');
      expect(current.CONTACT_HASH_SALT === effective).toBe(true);
      expect(current.SESSION_SIGNING_KEY === previous.SESSION_SIGNING_KEY).toBe(false);
      expect(current.AUTH_SETUP_TOKEN === previous.AUTH_SETUP_TOKEN).toBe(false);
      await runtime.start();
      expect((await page.request.get(runtime.url + '/api/campaigns')).status()).toBe(401);
      await page.setViewportSize({ width: rotation === 0 ? 1440 : 390, height: 900 });
      await signIn(page, runtime.url);
      const result = await preview(page.request, runtime.url, rows);
      expect(result.counts).toMatchObject({ suppressed: 5, unsubscribed: 1 });
      for (const row of rows) expect(result.rows.find(item => item.email === row.email)?.status).toBe(row.status);
      const description = await (await page.request.get(runtime.url + '/subscribe/info')).json();
      for (const [index, row] of rows.entries()) {
        const signup = await page.request.post(runtime.url + '/subscribe', {
          headers: { 'CF-Connecting-IP': `2001:db8:${rotation + 1}:${index + 1}::1` },
          data: { email: row.email, consent: true, disclosure: description.disclosure },
        });
        expect(signup.status()).toBe(202);
      }
      await runtime.stop();
      db = await nativeDatabase(runtime.checkout);
      expect(db.prepare('SELECT * FROM contact_suppressions ORDER BY rowid').all()).toEqual(before.contact_suppressions);
      expect(db.prepare('SELECT * FROM surviving_opt_outs ORDER BY rowid').all()).toEqual(before.surviving_opt_outs);
      expect(db.prepare('SELECT count(*) AS n FROM consent_evidence').get().n).toBe(0);
      // A signup for the surviving opt-out creates its contact already unsubscribed.
      expect(db.prepare('SELECT count(*) AS n FROM contacts').get().n).toBe(2);
      expect(db.prepare('SELECT email_status FROM contacts WHERE email=?').get(rows.find(row => row.status === 'unsubscribed')!.email)).toEqual({ email_status: 'unsubscribed' });
      db.close();
    }
    await runtime.start();
    const reviewed = await preview(page.request, runtime.url, rows);
    const response = await page.request.post(runtime.url + '/api/audience/imports', { headers: { Origin: runtime.url }, data: { fingerprint: reviewed.fingerprint } });
    expect(response.status()).toBe(200);
    let { job } = await response.json();
    for (let batch = 0; ['queued', 'applying'].includes(job.state); batch++) {
      expect(batch).toBeLessThan(rows.length);
      const resumed = await page.request.post(`${runtime.url}/api/audience/imports/${job.id}/resume`, { headers: { Origin: runtime.url }, data: {} });
      expect(resumed.status()).toBe(200); ({ job } = await resumed.json());
    }
    expect(job.state).toBe('completed');
    await runtime.stop();
    db = await nativeDatabase(runtime.checkout);
    try {
      for (const row of rows) expect(db.prepare('SELECT email_status FROM contacts WHERE email=?').get(row.email).email_status).toBe(row.status);
      expect(db.prepare('SELECT * FROM contact_suppressions ORDER BY rowid').all()).toEqual(before.contact_suppressions);
      expect(db.prepare("SELECT * FROM surviving_opt_outs WHERE id='legacy-opt-out'").get()).toEqual(before.surviving_opt_outs[0]);
      expect(db.prepare('SELECT count(*) AS n FROM consent_evidence').get().n).toBe(rows.length);
    } finally { db.close(); }
  } finally { await context.close(); await runtime.close(); }
});
