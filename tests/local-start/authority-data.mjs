import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export async function nativeDatabase(checkout) {
  const state = join(checkout, '.wrangler/state');
  const matches = [];
  for (const file of (await readdir(state, { recursive: true })).filter(file => file.endsWith('.sqlite'))) {
    const db = new DatabaseSync(join(state, file));
    if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='oa_operators'").get()) matches.push(db);
    else db.close();
  }
  assert.equal(matches.length, 1);
  return matches[0];
}

export function snapshot(db) {
  // D1's private write counter changes even when a migration transaction rolls
  // back. Snapshot every application table and the migration ledger.
  return Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_cf_METADATA' ORDER BY name").all()
    .map(({ name }) => [name, db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()]));
}

export function seedAuthority(db, salt, prefix) {
  const rows = ['hard-bounce', 'complaint', 'provider-suppression', 'soft-bounce-policy', 'retained-contact'].map(cause => ({
    id: `${prefix}-${cause}`, email: `${prefix}-${cause}@example.test`, cause, status: 'suppressed',
  }));
  for (const row of rows) {
    const hash = createHash('sha256').update(`${salt}:${row.email}`).digest('hex');
    const contact = row.cause === 'retained-contact' ? row.id : null;
    if (contact) {
      db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES(?,?,?,'subscribed','non-subscribed',1,1)").run(contact, row.email, 'Retained contact');
      db.prepare('INSERT INTO contact_email_addresses(id,contact_id,email,created_at,updated_at) VALUES(?,?,?,1,1)').run(contact, contact, row.email);
    }
    db.prepare('INSERT INTO contact_suppressions(id,contact_id,channel,destination_hash,cause,occurred_at,provider_event_id,created_at,updated_at) VALUES(?,?,\'email\',?,?,1,?,1,1)')
      .run(row.id, contact, hash, row.cause === 'retained-contact' ? 'hard-bounce' : row.cause, row.id);
  }
  const optedOut = { id: `${prefix}-opt-out`, email: `${prefix}-opt-out@example.test`, status: 'unsubscribed' };
  db.prepare("INSERT INTO surviving_opt_outs(id,destination_hash,channel,reason,occurred_at,created_at,updated_at) VALUES(?,?,'email','prior opt-out',1,1,1)")
    .run(optedOut.id, createHash('sha256').update(`${salt}:${optedOut.email}`).digest('hex'));
  return [...rows, optedOut];
}

export async function preview(request, url, rows) {
  const response = await request.post(url + '/api/audience/import-preview', { headers: { Origin: url }, data: {
    files: [{ name: 'retained-authority.csv', preset: 'csv-subscribed', csv: 'Email Address,OPTIN_TIME,CONFIRM_TIME\n' + rows.map(row => `${row.email},2026-09-01 10:00:00,2026-09-01 10:05:00`).join('\n') }],
    consent: { brandOrLegalSender: 'Mango', messageCategory: 'newsletter', frequencyDisclosure: 'Weekly', destinationJurisdiction: 'AU', consentText: 'I agree to receive weekly newsletters.', consentVersion: 'authority-test-v1' },
  } });
  assert.equal(response.status(), 200);
  return response.json();
}
