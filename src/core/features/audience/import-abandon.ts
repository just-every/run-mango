import { d1RequestContext, readD1ImportJob, rollbackD1Import, type D1ImportContext } from '@/vendor/base/import-kit/src/d1/index';
import type { ImportJob } from '@/vendor/base/import-kit/src/types';
import { audienceStreamActions, isAudienceStream } from './import-stream';
import { unfinished } from './import-hold';
import { keepChangedContacts, keptAction } from './import-keep';
import { audienceImportActor } from './import-authority';

const action = 'import.abandoned';
const conflicts = /\b(NATIVE_EDIT_CONFLICT|IMPORT_ATOMIC_GUARD|TARGET_REVISION_CONFLICT)\b/;

/** Abandon an import stopped partway, and continue it: the import kit rolls back exactly what it
 * wrote. A contact that existed before gets its earlier snapshot back, a contact it created is
 * removed, and every opt-out and suppression stays. A large import's pages reverse through the
 * stream's own undo. Every call first keeps each contact a person changed since the import wrote
 * it (import-keep), so a change made between calls never stops the rollback: it always finishes.
 * The audit line is recorded once the kit holds the reversal. */
export async function abandonImport(db: D1Database, salt: string, id: string, input: D1ImportContext): Promise<ImportJob> {
  // Keeping reads count toward the same D1 request budget as the kit's rollback.
  const context = d1RequestContext(input), reads = context.storage.database as unknown as D1Database;
  const stream = await isAudienceStream(id, context);
  const read = () => stream ? audienceStreamActions.read(id, context) : readD1ImportJob(id, context);
  const before = await read();
  const stopped = stream ? before.state === 'applying' : unfinished.includes(before.state);
  if (!stopped && !await abandoned(db, id)) throw new Error(before.state === 'completed' ? 'ABANDON_REQUIRES_UNFINISHED_IMPORT' : 'IMPORT_NOT_ABANDONABLE');
  try {
    // The first step records the reversal intent; a person's change in its batch is kept on the
    // retry, and one made while a step runs is kept on the next.
    for (let attempt = 0; ; attempt++) {
      if (!(await keepChangedContacts(reads, salt, id, stream, context)).ready) return await read();
      try {
        return stream ? await audienceStreamActions.undo(id, context) : await rollbackD1Import(id, context);
      } catch (error) {
        if (attempt >= 2 || !(error instanceof Error && conflicts.test(error.message))) throw error;
      }
    }
  } finally {
    const after = await read().catch(() => undefined);
    if (stopped && after && ['rolling_back', 'rolled_back', 'undoing', 'undone'].includes(after.state)) {
      const now = Date.now();
      await db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
        VALUES(?,?,'audience-import',?,?,'operator',?,?,?,?) ON CONFLICT(operation_key) DO NOTHING`)
        .bind(crypto.randomUUID(), `${action}:${id}`, id, action, audienceImportActor(context), JSON.stringify({ written: before.checkpoint, total: before.total }), now, now).run();
    }
  }
}

/** An import being abandoned continues through Abandon's own steps, never the kit's plain resume. */
export async function abandoning(db: D1Database, id: string) {
  return Boolean(await db.prepare("SELECT 1 WHERE EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?) OR EXISTS(SELECT 1 FROM ik_jobs WHERE id=? AND state='rolling_back')").bind(`${action}:${id}`, id).first());
}

export async function abandoned(db: D1Database, id: string) {
  return Boolean(await db.prepare("SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?").bind(`${action}:${id}`).first());
}

/** When and by whom each listed import was abandoned, and how many contacts it rolled back
 * and kept because a person changed them (import-keep). */
export async function abandonments(db: D1Database, ids: string[]) {
  const rows = (await db.prepare(`SELECT a.entity_id AS id,a.occurred_at AS at,o.display_name AS name,
      (SELECT count(*) FROM lifecycle_audit_entries k WHERE k.entity_type='audience-import' AND k.action=? AND k.entity_id=a.entity_id) AS kept,
      (SELECT count(*) FROM ik_provenance p WHERE p.reversed=1 AND (p.job_id=a.entity_id OR p.job_id IN (SELECT job_id FROM ik_d1_stream_pages WHERE stream_id=a.entity_id))) AS reversed
    FROM lifecycle_audit_entries a LEFT JOIN oa_operators o ON o.id=a.actor_id
    WHERE a.entity_type='audience-import' AND a.action=? AND a.entity_id IN (SELECT value FROM json_each(?))`).bind(keptAction, action, JSON.stringify(ids)).all<{ id: string; at: number; name: string | null; kept: number; reversed: number }>()).results;
  return new Map(rows.map(row => [row.id, { abandonedAt: row.at, abandonedBy: row.name, rolledBack: row.reversed - row.kept, kept: row.kept }]));
}
