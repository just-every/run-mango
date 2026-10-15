import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { invitationRuntime } from '../../operations/fixtures/invitation-runtime.mjs';
import { eraseHttp } from './erase';
import { consent } from './native';
import { archiveRecords, durableRows as dump } from '../portability/flows';
import { contactErasureTables } from '../../src/core/features/audience/erasure/declaration';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
async function importCsv(f: any, cookie: string, csv: string, preset = 'mango') {
  const previewResponse = await f.call('/api/audience/import-preview', { cookie, method: 'POST', body: { files: [{ name: 'contacts.csv', csv, preset }], consent } });
  expect(previewResponse.status).toBe(200);
  const preview = await previewResponse.json();
  const response = await f.call('/api/audience/imports', { cookie, method: 'POST', body: { fingerprint: preview.fingerprint } });
  expect(response.status).toBe(200);
  let { job } = await response.json();
  while (['queued', 'applying'].includes(job.state)) {
    const next = await f.call(`/api/audience/imports/${job.id}/resume`, { cookie, method: 'POST', body: {} });
    expect(next.status).toBe(200); ({ job } = await next.json());
  }
  expect(job.state).toBe('completed'); return { job, preview };
}
for (const passedMappingStage of [false, true]) test(`CONT-013 different-salt imported subscribed erasure removes every mapping alias and source custody${passedMappingStage ? ' after a pre-upgrade mapping cursor' : ''}`, async () => {
  const sourceSalt = 'source-installation-private-contact-salt-123456';
  const destinationSalt = 'destination-installation-private-contact-salt-123456';
  const email = 'subscribed-erasure@example.test', survivor = 'independent-survivor@example.test';
  const when = new Date(Date.now() - 60_000).toISOString();
  const source = await invitationRuntime({ contactHashSalt: sourceSalt });
  let exported = '';
  try {
    const cookie = await source.bootstrap();
    await importCsv(source, cookie, `Email Address,OPTIN_TIME,CONFIRM_TIME\n${email},${when},${when}\n${survivor},${when},${when}`, 'csv-subscribed');
    const response = await source.call('/api/audience/export', { cookie }); expect(response.status).toBe(200); exported = await response.text();
  } finally { await source.close(); }
  const f = await invitationRuntime({ contactHashSalt: destinationSalt });
  try {
    const cookie = await f.bootstrap();
    const { job, preview } = await importCsv(f, cookie, exported);
    const contact = await f.db.prepare('SELECT id,email_status FROM contacts WHERE email=?').bind(email).first<any>();
    expect(contact.email_status).toBe('subscribed');
    const portable = hash(`mango-audience-export-v1:${email}`), local = hash(`${destinationSalt}:${email}`), prior = hash(`${sourceSalt}:${email}`);
    // Populated prior-data aliases: the schema permits older mappings keyed by
    // the exported identity or an earlier installation authority. No application
    // behavior is replaced; deletion must handle all persisted mapping rows.
    const aliases = [prior, portable, ...passedMappingStage ? Array.from({ length: 300 }, (_, index) => hash(`older-authority-${index}:${email}`)) : []];
    await f.db.batch(aliases.map(alias => f.db.prepare('INSERT INTO audience_portable_hashes VALUES(?,?)').bind(alias, portable)));
    const survivorRows = async () => {
      const id = (await f.db.prepare('SELECT id FROM contacts WHERE email=?').bind(survivor).first<any>()).id;
      const results = await f.db.batch(['consent_evidence', 'contact_history', 'audience_import_observations'].map(table => f.db.prepare(`SELECT * FROM ${table} WHERE contact_id=? ORDER BY id`).bind(id)));
      return results.map((result: D1Result) => result.results);
    };
    const unrelated = await survivorRows();
    const before = await dump(f.db); for (const value of [email, contact.id, local, prior, portable]) expect(before).toContain(value);
    const started = await f.call(`/api/contacts/${contact.id}`, { cookie, method: 'DELETE' }); expect(started.status).toBe(202);
    const reference = (await started.json()).receipt.reference;
    let pending = await f.db.prepare('SELECT stage,scope_json FROM audience_erasures WHERE reference=?').bind(reference).first<any>();
    while (pending.stage < 0) {
      const next = await f.call(`/api/audience/erasures/${reference}/resume`, { cookie, method: 'POST', body: {} }); expect([200,202]).toContain(next.status);
      pending = await f.db.prepare('SELECT stage,scope_json FROM audience_erasures WHERE reference=?').bind(reference).first<any>();
    }
    // A durable scope made by the earlier implementation knows only today's
    // salted hash. Resume must still remove mapping aliases without a migration.
    expect(JSON.parse(pending.scope_json).hashes).toEqual([local]);
    if (passedMappingStage) {
      const advance = async () => {
        const response = await f.call(`/api/audience/erasures/${reference}/resume`, { cookie, method: 'POST', body: {} });
        expect([200,202]).toContain(response.status);
        pending = await f.db.prepare('SELECT stage,cursor,scope_json FROM audience_erasures WHERE reference=?').bind(reference).first<any>();
        return (await response.json()).receipt;
      };
      const mappingStage = contactErasureTables.findIndex(table => table.table === 'audience_portable_hashes');
      while (pending.stage < mappingStage) await advance();
      expect(pending.stage).toBe(mappingStage);
      // Before this upgrade, this exact stage removed the local key and advanced
      // while source-salt and portable-key aliases remained. Persist that prior
      // state, including its count, without changing or skipping later tables.
      await f.db.batch([
        f.db.prepare('DELETE FROM audience_portable_hashes WHERE destination_hash=?').bind(local),
        f.db.prepare("UPDATE audience_erasures SET stage=?,cursor=0,counts_json=json_set(counts_json,'$.audience_portable_hashes',1) WHERE reference=?").bind(mappingStage + 1, reference),
      ]);
      pending.stage = mappingStage + 1;
      while (pending.stage < contactErasureTables.length) await advance();
      const remaining = async () => (await f.db.prepare('SELECT count(*) AS n FROM audience_portable_hashes WHERE portable_hash=?').bind(portable).first<any>()).n;
      expect(await remaining()).toBe(aliases.length);
      expect((await f.call('/api/audience/export', { cookie })).status).toBe(503);
      expect((await advance()).state).toBe('pending');
      // One request commits a bounded page. The next HTTP request must resume
      // its durable cursor and eventually cover aliases beyond that page.
      expect(await remaining()).toBeGreaterThan(0);
      expect(await remaining()).toBeLessThan(aliases.length);
      expect(pending.stage).toBe(contactErasureTables.length);
      expect(pending.cursor).toBeGreaterThan(0);
    }
    const erased = await eraseHttp(f, cookie, contact.id);
    expect(erased.retainedChannels).toEqual([]);
    expect(erased.removed.audience_portable_hashes).toBe(aliases.length + 1);
    const after = await dump(f.db);
    for (const value of [email, contact.id, local, prior, portable, Buffer.from(exported).toString('base64')]) expect(after).not.toContain(value);
    const authority = await f.db.prepare('SELECT source_identity FROM rer_portability_state WHERE id=1').first<any>();
    for (const alias of [local, ...aliases]) expect(after).not.toContain(hash(JSON.stringify([authority.source_identity, 'audience_portable_hashes', { destination_hash: alias }])));
    expect((await f.db.prepare('SELECT * FROM rer_portability_journal').all()).results).toEqual([]);
    const currentArchive = JSON.stringify(await archiveRecords(f, cookie));
    const currentCsv = await (await f.call('/api/audience/export', { cookie })).text();
    for (const value of [email, contact.id, local, prior, portable]) {
      expect(currentArchive).not.toContain(value); expect(currentCsv).not.toContain(value);
    }
    expect(await survivorRows()).toEqual(unrelated);
    for (const action of ['resume', 'undo']) expect((await f.call(`/api/audience/imports/${job.id}/${action}`, { cookie, method: 'POST', body: {} })).status).toBeGreaterThanOrEqual(400);
    expect((await f.call('/api/audience/imports', { cookie, method: 'POST', body: { fingerprint: preview.fingerprint } })).status).toBe(409);
    expect(await f.db.prepare('SELECT id FROM contacts WHERE email=?').bind(email).first()).toBeNull();
  } finally { await f.close(); }
});

test('CONT-004/010 legacy detached opt-outs and suppressions refuse a lossy CSV and still exclude later imports', async () => {
  const salt = 'legacy-contact-authority-more-than-thirty-two-bytes';
  const f = await invitationRuntime({ contactHashSalt: salt });
  try {
    const cookie = await f.bootstrap(), optedOut = 'old-optout@example.test', suppressed = 'old-suppression@example.test';
    const now = Date.now() - 60_000;
    // These are the rows supported before migration 0038 introduced portable
    // mappings: their original contact no longer exists and the mapping is absent.
    await f.db.prepare("INSERT INTO surviving_opt_outs(id,destination_hash,channel,reason,occurred_at,created_at,updated_at) VALUES('legacy-optout',?,'email','unsubscribe',?,?,?)").bind(hash(`${salt}:${optedOut}`), now, now, now).run();
    const refuse = async () => {
      const response = await f.call('/api/audience/export', { cookie });
      expect(response.status).toBe(409); expect(response.headers.get('content-disposition')).toBeNull();
      const result = await response.json(); expect(result.error).toBe('complete_csv_unavailable');
      expect(result.detail).toContain('rer export'); expect(result.detail).toContain('.dev.vars');
      expect(result.help).toBe('/docs/backup-and-export#export-and-restore-a-local-copy');
    };
    await refuse();
    await f.db.prepare("INSERT INTO contact_suppressions(id,contact_id,channel,destination_hash,cause,occurred_at,provider_event_id,created_at,updated_at) VALUES('legacy-suppression',NULL,'email',?,'hard-bounce',?,NULL,?,?)").bind(hash(`${salt}:${suppressed}`), now, now, now).run();
    const restrictions = await dump(f.db); await refuse(); expect(await dump(f.db)).toBe(restrictions);
    const when = new Date(now).toISOString();
    await importCsv(f, cookie, `Email Address,OPTIN_TIME,CONFIRM_TIME\n${optedOut},${when},${when}`, 'csv-subscribed');
    // Only suppression is still detached here, so it must independently refuse.
    await refuse();
    await importCsv(f, cookie, `Email Address,OPTIN_TIME,CONFIRM_TIME\n${suppressed},${when},${when}`, 'csv-subscribed');
    expect((await f.db.prepare('SELECT email_status FROM contacts WHERE email=?').bind(optedOut).first<any>()).email_status).toBe('unsubscribed');
    expect((await f.db.prepare('SELECT email_status FROM contacts WHERE email=?').bind(suppressed).first<any>()).email_status).toBe('suppressed');
    const response = await f.call('/api/audience/export', { cookie }); expect(response.status).toBe(200);
    const exported = await response.text(); expect(exported).toContain('legacy-optout'); expect(exported).toContain('legacy-suppression');
    const rule = JSON.stringify({ version: 1, operator: 'all', predicates: [{ sourceType: 'contact', field: 'email', comparator: 'contains', value: '@example.test' }] });
    const audience = await f.call('/api/campaign-authoring/audience', { cookie, method: 'POST', body: { inclusionRuleJson: rule, exclusionRulesJson: '[]', channels: ['email'] } });
    expect(audience.status).toBe(200); expect((await audience.json()).eligibleCount).toBe(0);
    expect((await f.db.prepare('SELECT count(*) AS n FROM test_mail').first<any>()).n).toBe(0);
    // A legacy attached row with an old authority hash is not portable merely
    // because readAudienceSnapshots found it through contact_id.
    const owner = (await f.db.prepare('SELECT id FROM contacts WHERE email=?').bind(suppressed).first<any>()).id;
    await f.db.prepare("INSERT INTO contact_suppressions(id,contact_id,channel,destination_hash,cause,occurred_at,provider_event_id,created_at,updated_at) VALUES('attached-old-authority',?,'email',?,'hard-bounce',?,NULL,?,?)").bind(owner, hash(`previous-authority:${suppressed}`), now, now, now).run();
    await refuse();
  } finally { await f.close(); }
});
