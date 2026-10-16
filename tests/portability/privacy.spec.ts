import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { portabilityRuntime, privateKey } from './runtime.mjs';
import { archiveRecords, durableRows, stageArchive, transferRequest } from './flows';
import { eraseHttp } from '../audience-import/erase';
import { readScope } from '../../src/core/features/audience/erasure/scope';
import { contactErasureTables } from '../../src/core/features/audience/erasure/declaration';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

test('CONT-013/DATA-001 populated upgrade retires legacy custody and resumes a pending old erasure cursor', async () => {
  const email = 'legacy-journal-person@example.test', portable = hash(`mango-audience-export-v1:${email}`);
  const local = hash(`${privateKey}:${email}`), prior = hash(`prior-source-salt:${email}`);
  const tombstone = hash(JSON.stringify(['old-source','audience_portable_hashes',{destination_hash: portable}]));
  const known = new Map([['old-source', 7], ['prior-source', 12], ['journal-only', 0], ['job-only', 21]]);
  const f = await portabilityRuntime({beforeMigration: async (file: string, db: D1Database, bucket: R2Bucket) => {
    if (file !== '0044_source_erasure_floors.sql') return;
    await db.batch([
      db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES('legacy-erased',?,'Legacy Journal Person','subscribed','never-subscribed',1,1)").bind(email),
      db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES('untouched','unrelated@example.test','Unrelated','unsubscribed','never-subscribed',1,1)"),
      db.prepare("INSERT INTO surviving_opt_outs VALUES('unrelated-opt-out','unrelated-hash','email','unsubscribe',1,1,1)"),
      ...[local, prior, portable].map(alias => db.prepare('INSERT INTO audience_portable_hashes VALUES(?,?)').bind(alias, portable)),
      db.prepare("INSERT INTO rer_portability_state(id,source_identity,epoch,import_job,applying) VALUES(1,'old-source',2,'legacy-pending',1)"),
      db.prepare("INSERT INTO rer_portability_epochs VALUES('old-source',7),('prior-source',12)"),
      db.prepare("INSERT INTO rer_portability_journal VALUES('old-source',?),('journal-only',?)").bind(tombstone,tombstone),
      db.prepare("CREATE TABLE rer_portability_snap_legacy(data TEXT)"),
      db.prepare('INSERT INTO rer_portability_snap_legacy VALUES(?)').bind(email),
      db.prepare("CREATE TABLE rer_portability_stage_legacy_meta(rer_portability_tombstone TEXT)"),
      db.prepare('INSERT INTO rer_portability_stage_legacy_meta VALUES(?)').bind(tombstone),
    ]);
    for (const [id,phase,source,epoch] of [['legacy-complete','complete','old-source',7],['legacy-pending','staging','job-only',21]]) {
      await db.prepare('INSERT INTO rer_portability_jobs(id,kind,actor,phase,metadata) VALUES(?,?,?,?,?)').bind(id,'import','legacy-owner',phase,JSON.stringify({manifest:{sourceIdentity:source,epoch,journal:[tombstone]}})).run();
      await db.prepare('INSERT INTO rer_portability_parts VALUES(?,0,?)').bind(id,tombstone).run();
      await db.prepare('INSERT INTO rer_portability_segments VALUES(?,0,0,?)').bind(id,email).run();
    }
    await db.prepare("INSERT INTO rer_portability_owned VALUES('legacy-pending','ASSETS_BUCKET','legacy-pending-object'),('legacy-complete','ASSETS_BUCKET','surviving-asset')").run();
    await bucket.put('legacy-pending-object',email); await bucket.put('surviving-asset','nonpersonal asset');
    const scope = await readScope(db,'legacy-erased',privateKey);
    const mappingStage = contactErasureTables.findIndex(table => table.table === 'audience_portable_hashes');
    await db.prepare('DELETE FROM audience_portable_hashes WHERE destination_hash=?').bind(local).run();
    await db.prepare("INSERT INTO audience_erasures(reference,subject_id,state,scope_json,counts_json,stage,requested_at) VALUES('old-pending','legacy-erased','pending',?,?,?,1)").bind(JSON.stringify(scope),JSON.stringify({audience_portable_hashes:1}),mappingStage+1).run();
  }});
  try {
    const floors = (await f.db.prepare('SELECT source,epoch FROM rer_portability_epochs').all()).results;
    for (const [source, epoch] of known) expect(floors.find(row => row.source === source)!.epoch).toBeGreaterThan(epoch);
    const state = await f.db.prepare('SELECT * FROM rer_portability_state').first<any>();
    expect(state.epoch).toBe(floors.find(row => row.source === state.source_identity)!.epoch);
    expect(state.import_job).toBeNull(); expect(state.applying).toBe(0);
    for (const table of ['rer_portability_journal','rer_portability_jobs','rer_portability_parts','rer_portability_segments','rer_portability_owned','rer_portability_retired_copies','rer_portability_retired_objects']) expect((await f.db.prepare(`SELECT count(*) AS n FROM ${table}`).first<any>()).n).toBe(0);
    expect((await f.db.prepare("SELECT name FROM sqlite_master WHERE name IN ('rer_portability_snap_legacy','rer_portability_stage_legacy_meta')").all()).results).toEqual([]);
    expect(await f.bucket.get('legacy-pending-object')).toBeNull(); expect(await (await f.bucket.get('surviving-asset'))!.text()).toBe('nonpersonal asset');
    expect((await f.call('/api/audience/export',{cookie:f.cookie})).status).toBe(503);
    expect((await transferRequest(f,'exports',{})).status).toBe(503);
    const restrictions = (await f.db.prepare('SELECT * FROM surviving_opt_outs').all()).results;
    const erased = await eraseHttp(f,f.cookie,'legacy-erased'); expect(erased.retainedChannels).toEqual([]);
    expect(erased.removed.audience_portable_hashes).toBe(3);
    expect((await f.db.prepare('SELECT * FROM surviving_opt_outs').all()).results).toEqual(restrictions);
    expect(await f.db.prepare("SELECT email FROM contacts WHERE id='untouched'").first()).toEqual({email:'unrelated@example.test'});
    const durable = await durableRows(f.db), archive = JSON.stringify(await archiveRecords(f));
    for (const value of [email,'legacy-erased',local,prior,portable,tombstone]) {expect(durable).not.toContain(value); expect(archive).not.toContain(value);}
  } finally {await f.close();}
});

test('CONT-013/DATA-001 invalid archive authority is refused before any durable admission mutation', async () => {
  const [source, target] = await Promise.all([portabilityRuntime(), portabilityRuntime({restore:true})]);
  try {
    await source.db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES('current-survivor','survivor@example.test','Survivor','subscribed','never-subscribed',1,1)").run();
    const records = await archiveRecords(source), manifest = records[0];
    const before = await durableRows(target.db);
    for (const mutation of [{journal:[hash('legacy-row')]},{journal:['malformed']},{sourceIdentity:''},{epoch:-1},{epoch:0.5}]) {
      const refused = await transferRequest(target,'imports',{confirmed:true,manifest:{...manifest,...mutation}});
      expect(refused.status).toBeGreaterThanOrEqual(400);
      expect(await durableRows(target.db)).toBe(before);
    }
  } finally {await source.close();await target.close();}
});

test('CONT-013/DATA-001 restore refuses a tampered or stale archive by name with no persistent effect, then restores a current one', async () => {
  test.setTimeout(240000);
  const [source, target] = await Promise.all([portabilityRuntime(), portabilityRuntime({restore:true})]);
  try {
    await source.db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES('erased-reader','reader@example.test','Erased reader','unsubscribed','never-subscribed',1,1)").run();
    const records = await archiveRecords(source), manifest = records[0], closing = records.at(-1);
    const hashes = {contentHash: closing.contentHash, archiveHash: closing.archiveHash};
    // The destination's own installation identity exists before any restore attempt.
    await target.db.prepare("INSERT INTO rer_portability_state(id,source_identity) VALUES(1,'destination-installation')").run();
    // Everything except the withdrawn job's own record must be exactly as before.
    const settled = async () => JSON.stringify([JSON.parse(await durableRows(target.db)).filter((t: any) => t.name !== 'rer_portability_jobs'), (await target.bucket.list()).objects.map((o: any) => o.key)]);
    const refuses = async (archive: any[], body: Record<string, unknown>, error: string) => {
      const before = await settled(), id = await stageArchive(target, archive);
      const refused = await transferRequest(target, `imports/${id}/finalize`, body);
      expect(refused.status).toBeGreaterThanOrEqual(400);
      expect((await refused.json()).error).toBe(error);
      expect(await settled()).toBe(before);
      expect((await (await transferRequest(target, `imports/${id}`, undefined, 'GET')).json()).phase).toBe('aborted');
    };
    const later = (change = {}) => ({...hashes, laterJournal: {sourceIdentity: manifest.sourceIdentity, epoch: manifest.epoch, journal: [], ...change}});
    await refuses(records, {contentHash: hash('tampered-content'), archiveHash: closing.archiveHash}, 'content_checksum');
    await refuses(records, {contentHash: closing.contentHash}, 'archive_checksum');
    await refuses(records, later({sourceIdentity: 'wrong-source'}), 'later_journal');
    await refuses(records, later({journal: ['malformed']}), 'invalid_journal');
    await refuses(records, {...hashes, laterJournal: null}, 'later_journal');
    await refuses(records, later({epoch: manifest.epoch + 1}), 'erasure_epoch');
    // The destination records a later erasure floor for this source.
    await target.db.prepare('INSERT INTO rer_portability_epochs(source,epoch) VALUES(?,?)').bind(manifest.sourceIdentity, manifest.epoch + 1).run();
    const floor = await settled();
    const stale = await transferRequest(target, 'imports', {confirmed: true, manifest});
    expect((await stale.json()).error).toBe('erasure_epoch');
    expect(await settled()).toBe(floor);
    // Relabelled identity or epoch with the original parts and hashes fails the archive's own binding.
    for (const change of [{sourceIdentity: 'altered-source-identity'}, {epoch: manifest.epoch + 1}]) {
      await refuses([{...manifest, ...change}, ...records.slice(1)], hashes, 'archive_checksum');
    }
    expect((await target.db.prepare('SELECT count(*) AS n FROM contacts').first<any>()).n).toBe(0);
    // A current archive above the floor still restores the same rows.
    await source.db.prepare('UPDATE rer_portability_state SET epoch=epoch+1').run();
    const current = await archiveRecords(source), currentId = await stageArchive(target, current);
    const accepted = await transferRequest(target, `imports/${currentId}/finalize`, {contentHash: current.at(-1).contentHash, archiveHash: current.at(-1).archiveHash});
    expect(accepted.status, await accepted.clone().text()).toBe(200);
    expect(await target.db.prepare("SELECT email,email_status FROM contacts WHERE id='erased-reader'").first()).toEqual({email: 'reader@example.test', email_status: 'unsubscribed'});
  } finally {await source.close();await target.close();}
});

test('CONT-013/DATA-001 atomic epoch race refuses stale readmission and current archive recovery preserves rows', async () => {
  const [source, target] = await Promise.all([portabilityRuntime(), portabilityRuntime({restore:true})]);
  try {
    await source.db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES('current-survivor','survivor@example.test','Survivor','subscribed','never-subscribed',1,1)").run();
    const records = await archiveRecords(source), manifest = records[0];
    const id = await stageArchive(target,records);
    // A real SQL commit advances authority after fence() and before final apply.
    const sourceSql = manifest.sourceIdentity.replaceAll("'","''");
    await target.db.prepare(`CREATE TRIGGER concurrent_erasure AFTER UPDATE OF applying ON rer_portability_state WHEN NEW.applying=1 BEGIN INSERT INTO rer_portability_epochs VALUES('${sourceSql}',${manifest.epoch+1}) ON CONFLICT(source) DO UPDATE SET epoch=excluded.epoch; END`).run();
    expect((await transferRequest(target,`imports/${id}/finalize`,{contentHash:records.at(-1).contentHash,archiveHash:records.at(-1).archiveHash})).status).toBe(500);
    expect((await target.db.prepare('SELECT count(*) AS n FROM contacts').first<any>()).n).toBe(0);
    expect((await target.db.prepare('SELECT epoch FROM rer_portability_epochs WHERE source=?').bind(manifest.sourceIdentity).first<any>()).epoch).toBeGreaterThan(manifest.epoch);
    await target.db.prepare('DROP TRIGGER concurrent_erasure').run();
    await transferRequest(target,`imports/${id}/abort`,{});
    expect((await transferRequest(target,'imports',{confirmed:true,manifest})).status).toBe(400);
    // Bring the source to the same current authority, then export real current rows.
    await source.db.prepare('UPDATE rer_portability_state SET epoch=epoch+1').run();
    const current = await archiveRecords(source), currentId = await stageArchive(target,current);
    const accepted = await transferRequest(target,`imports/${currentId}/finalize`,{contentHash:current.at(-1).contentHash,archiveHash:current.at(-1).archiveHash,laterJournal:{sourceIdentity:current[0].sourceIdentity,epoch:current[0].epoch,journal:[]}});
    expect(accepted.status,await accepted.clone().text()).toBe(200);
    expect(await target.db.prepare("SELECT email FROM contacts WHERE id='current-survivor'").first()).toEqual({email:'survivor@example.test'});
    expect((await target.db.prepare('SELECT * FROM rer_portability_journal').all()).results).toEqual([]);
  } finally {await source.close();await target.close();}
});
