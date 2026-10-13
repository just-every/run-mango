import { d1RequestContext, readD1ImportJob, undoD1Import, type D1ImportContext } from '@/vendor/base/import-kit/src/d1/index';
import type { ImportJob } from '@/vendor/base/import-kit/src/types';
import { audienceStreamActions, isAudienceStream } from './import-stream';
import { changedSince, keepChangedContacts, type Written } from './import-keep';

/** Undo reverses a finished import as a whole. Before its first write it checks every contact the
 * import wrote and, when a person changed one since (they unsubscribed, confirmed consent, or an
 * operator edited it), refuses with nothing written: the import stays completed and can still be
 * undone once that is resolved. An opt-out or suppression alone is not a change (import-recorded).
 * Once an undo has started, a contact a person changes between its steps is kept as it is now, as
 * Abandon keeps it (import-keep), so a started undo always finishes. */
export async function undoImport(db: D1Database, salt: string, id: string, input: D1ImportContext): Promise<ImportJob> {
  // Checking reads count toward the same D1 request budget as the kit's undo.
  const context = d1RequestContext(input), reads = context.storage.database as unknown as D1Database;
  const stream = await isAudienceStream(id, context);
  const job = stream ? await audienceStreamActions.read(id, context) : await readD1ImportJob(id, context);
  if (job.state === 'completed') await refuseChanged(reads, salt, id, stream, context.destination);
  else if (job.state === 'undoing' && !(await keepChangedContacts(reads, salt, id, stream, context)).ready) return job;
  return stream ? audienceStreamActions.undo(id, context) : undoD1Import(id, context);
}

async function refuseChanged(db: D1Database, salt: string, id: string, stream: boolean, destination: string) {
  const jobs = JSON.stringify(stream ? (await db.prepare('SELECT job_id FROM ik_d1_stream_pages WHERE stream_id=?').bind(id).all<{ job_id: string }>()).results.map(row => row.job_id) : [id]);
  // An import a later one superseded is refused by the kit before any write, with its own reason.
  if (await db.prepare('SELECT 1 FROM ik_d1_history WHERE job_id IN (SELECT value FROM json_each(?)) LIMIT 1').bind(jobs).first()) return;
  for (let after = '';;) {
    const written = (await db.prepare(`SELECT id,target_id,json_extract(record_json,'$.appliedRevision') AS appliedRevision,json_extract(record_json,'$.valueHash') AS valueHash
      FROM ik_provenance WHERE job_id IN (SELECT value FROM json_each(?)) AND reversed=0 AND target_kind='contact' AND id>? ORDER BY id LIMIT 2000`).bind(jobs, after).all<Written & { id: string }>()).results;
    if (!written.length) return;
    // The kit's own code for a contact changed since the import: the route explains it (import-conflict).
    if ((await changedSince(db, salt, destination, written)).length) throw new Error('NATIVE_EDIT_CONFLICT');
    after = written.at(-1)!.id;
  }
}
