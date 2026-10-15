import { canonicalJson, sha256, type D1ImportContext } from '@/vendor/base/import-kit/src/d1/index';
import { atomic, guard, sql } from '@/vendor/base/import-kit/src/d1/database';
import { remaining } from '@/vendor/base/import-kit/src/d1/budget';
import type { D1Sql } from '@/vendor/base/import-kit/src/d1/types';
import { readAudienceSnapshots, snapshotTargets } from './import-read';
import { audienceImportActor } from './import-authority';

// Abandoning keeps a contact a person changed since the import wrote it (they unsubscribed,
// confirmed consent, or an operator edited it): Mango releases the import's claim on it, as the
// kit's own reversal records it, without writing its earlier details back, and records it as
// kept. Everything else rolls back. An opt-out or suppression alone is not a change
// (import-recorded): that contact rolls back and keeps the restriction.

export const keptAction = 'import.abandon.kept';
const columns = 'id,job_id,ordinal,effect_ordinal,source_identity,destination,target_kind,target_id,reversed,record_json';
type Provenance = { id: string; job_id: string; target_id: string; source_identity: string; record_json: string };

/** The job a rollback step reverses next: the import, or a large import's latest unreversed page. */
async function reversing(db: D1Database, id: string, stream: boolean) {
  const job = stream
    ? await db.prepare(`SELECT j.id,j.state,j.fence FROM ik_d1_stream_pages p JOIN ik_jobs j ON j.id=p.job_id WHERE p.stream_id=? AND j.state NOT IN ('undone','rolled_back') ORDER BY p.ordinal DESC LIMIT 1`).bind(id).first<{ id: string; state: string; fence: number }>()
    : await db.prepare('SELECT id,state,fence FROM ik_jobs WHERE id=?').bind(id).first<{ id: string; state: string; fence: number }>();
  return job && ['rolling_back', 'undoing'].includes(job.state) ? job : undefined;
}

export type Written = { target_id: string; appliedRevision: string; valueHash: string };

/** Of these written contacts, those a person changed since: not at the value and revision the import wrote. */
export async function changedSince<Row extends Written>(db: D1Database, salt: string, destination: string, rows: Row[]) {
  const targets = await snapshotTargets(db, destination, await readAudienceSnapshots(db, salt, rows.map(row => row.target_id)), true);
  return rows.filter(row => {
    const target = targets.get(row.target_id);
    return !target || target.revision !== row.appliedRevision || sha256(canonicalJson(target.value)) !== row.valueHash;
  });
}

async function changed(db: D1Database, salt: string, destination: string, rows: Provenance[]) {
  const written = rows.map(row => { const { appliedRevision, valueHash } = JSON.parse(row.record_json) as Omit<Written, 'target_id'>; return { row, target_id: row.target_id, appliedRevision, valueHash }; });
  return (await changedSince(db, salt, destination, written)).map(item => item.row);
}

/** Releases every changed contact among the effects the next rollback step reverses. Each
 * release is fenced on the job's reversal state and the exact claim. ready: the next step
 * reverses only unchanged contacts; otherwise this request's D1 budget ran low first. */
export async function keepChangedContacts(db: D1Database, salt: string, importId: string, stream: boolean, context: D1ImportContext) {
  for (;;) {
    const job = await reversing(db, importId, stream);
    if (!job) return { ready: true };
    if (remaining(context) < 400) return { ready: false };
    const next = (await db.prepare(`SELECT ${columns} FROM ik_provenance WHERE job_id=? AND reversed=0 ORDER BY ordinal DESC,effect_ordinal DESC LIMIT ?`)
      .bind(job.id, (context.batchSize ?? 100) * (context.maxBatches ?? 1)).all<Provenance>()).results;
    const release = next.length ? await changed(db, salt, context.destination, next) : [];
    if (!release.length) return { ready: true };
    const statements: D1Sql[] = [guard(sql('EXISTS(SELECT 1 FROM ik_jobs WHERE id=? AND state=? AND fence=?)', job.id, job.state, job.fence))];
    const now = Date.now();
    for (const row of release) {
      const record = JSON.parse(row.record_json);
      statements.push(
        guard(sql('EXISTS(SELECT 1 FROM ik_provenance WHERE id=? AND reversed=0 AND record_json=?)', row.id, row.record_json)),
        sql('UPDATE ik_provenance SET reversed=1,record_json=? WHERE id=?', canonicalJson({ ...record, reversed: true }), row.id),
        // An earlier import this one superseded attributes the contact again, as the kit's reversal restores it.
        sql(`INSERT INTO ik_provenance(${columns}) SELECT ${columns} FROM ik_d1_history WHERE successor_id=?`, row.id),
        sql('DELETE FROM ik_d1_history WHERE successor_id=?', row.id),
        sql('DELETE FROM ik_sources WHERE job_id=? AND identity=? AND NOT EXISTS(SELECT 1 FROM ik_provenance WHERE source_identity=? AND reversed=0) AND NOT EXISTS(SELECT 1 FROM ik_d1_history WHERE source_identity=?)', job.id, row.source_identity, row.source_identity, row.source_identity),
        sql(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
          VALUES(?,?,'audience-import',?,?,'operator',?,?,?,?) ON CONFLICT(operation_key) DO NOTHING`,
        crypto.randomUUID(), `${keptAction}:${row.id}`, importId, keptAction, audienceImportActor(context), JSON.stringify({ contactId: row.target_id, kept: 'changed by the person' }), now, now));
    }
    await atomic(context, job.state === 'undoing' ? 'undo' : 'rollback', statements);
  }
}
