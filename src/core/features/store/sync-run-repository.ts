import type { Database } from '@/core/platform/db/client';
export type SyncRun = {
  id: string; provider: string; sourceType: string; state: 'queued' | 'running' | 'failed' | 'completed' | 'superseded';
  nextCursor: string | null; pages: number; records: number; leaseToken: string | null; leaseExpiresAt: number | null;
  lastError: string | null; createdAt: number; updatedAt: number; completedAt: number | null;
};
export class SourceSyncBusyError extends Error {}
const columns = `id, provider, source_type AS sourceType, state, next_cursor AS nextCursor, pages, records,
  lease_token AS leaseToken, lease_expires_at AS leaseExpiresAt, last_error AS lastError,
  created_at AS createdAt, updated_at AS updatedAt, completed_at AS completedAt`;
export function createSyncRunRepository(database: Database) {
  const client = database.$client;
  const get = (id: string) => client.prepare(`SELECT ${columns} FROM source_sync_runs WHERE id = ?`).bind(id).first<SyncRun>();
  const guard = `EXISTS (SELECT 1 FROM source_sync_runs WHERE id = ? AND state = 'running' AND lease_token = ? AND lease_expires_at > ?)`;
  function sourceState(sourceType: string, time: number, error: string | null, predicate: string, values: unknown[]) {
    return client.prepare(`INSERT INTO source_syncs (id, source_type, last_successful_at, last_error, created_at, updated_at)
      SELECT ?, ?, ?, ?, ?, ? WHERE ${predicate}
      ON CONFLICT(source_type) DO UPDATE SET last_error = excluded.last_error,
        last_successful_at = CASE WHEN excluded.last_error IS NULL THEN excluded.last_successful_at ELSE source_syncs.last_successful_at END,
        updated_at = excluded.updated_at WHERE source_syncs.updated_at <= excluded.updated_at`)
      .bind(`source_${sourceType}`, sourceType, error === null ? time : null, error, time, time, ...values);
  }
  return {
    get,
    async list() {
      const result = await client.prepare(`SELECT ${columns} FROM source_sync_runs WHERE state IN ('queued', 'running')
        OR rowid IN (SELECT MAX(rowid) FROM source_sync_runs GROUP BY provider, source_type)
        OR rowid IN (SELECT rowid FROM source_sync_runs ORDER BY rowid DESC LIMIT 50) ORDER BY rowid DESC`).all<SyncRun>();
      return result.results.map(({nextCursor: _cursor, leaseToken: _token, leaseExpiresAt: _lease, ...run}) => ({
        ...run, createdAt: new Date(run.createdAt), updatedAt: new Date(run.updatedAt), completedAt: run.completedAt === null ? null : new Date(run.completedAt),
      }));
    },
    async ensure(id: string, provider: string, sourceType: string, now: Date) {
      const existing = await get(id);
      if (existing) {
        if (existing.provider !== provider || existing.sourceType !== sourceType) throw new Error('A sync identity cannot be reused for another source.');
        if (existing.state !== 'failed') return existing;
        const time = now.getTime();
        await client.batch([
          client.prepare(`UPDATE source_sync_runs SET state = 'superseded', updated_at = ? WHERE id = ? AND state = 'failed'
            AND EXISTS (SELECT 1 FROM source_sync_runs newer WHERE newer.provider = source_sync_runs.provider
              AND newer.source_type = source_sync_runs.source_type AND newer.rowid > source_sync_runs.rowid)`).bind(time, id),
          client.prepare(`UPDATE source_sync_runs SET state = 'queued', last_error = NULL, updated_at = ? WHERE id = ? AND state = 'failed'
            AND NOT EXISTS (SELECT 1 FROM source_sync_runs other WHERE other.provider = source_sync_runs.provider
              AND other.source_type = source_sync_runs.source_type AND other.state IN ('queued', 'running'))`).bind(time, id),
          sourceState(sourceType, time, 'Full sync is queued; completion has not been confirmed.',
            `EXISTS (SELECT 1 FROM source_sync_runs WHERE id = ? AND state = 'queued')`, [id]),
        ]);
        const resumed = (await get(id))!;
        if (resumed.state === 'failed') throw new SourceSyncBusyError('Another sync for this source is already queued or running.');
        return resumed;
      }
      const time = now.getTime();
      const predicate = `EXISTS (SELECT 1 FROM source_sync_runs WHERE id = ? AND state = 'queued')`;
      await client.batch([
        client.prepare(`INSERT INTO source_sync_runs (id, provider, source_type, state, created_at, updated_at)
          SELECT ?, ?, ?, 'queued', ?, ? WHERE NOT EXISTS
          (SELECT 1 FROM source_sync_runs WHERE provider = ? AND source_type = ? AND state IN ('queued', 'running'))
          ON CONFLICT(id) DO NOTHING`).bind(id, provider, sourceType, time, time, provider, sourceType),
        client.prepare(`UPDATE source_sync_runs SET state = 'superseded', updated_at = ? WHERE provider = ? AND source_type = ? AND state = 'failed'
          AND rowid < (SELECT rowid FROM source_sync_runs WHERE id = ?)`).bind(time, provider, sourceType, id),
        sourceState(sourceType, time, 'Full sync is queued; completion has not been confirmed.', predicate, [id]),
      ]);
      const run = await get(id);
      if (!run) throw new SourceSyncBusyError('Another sync for this source is already queued or running.');
      if (run.provider !== provider || run.sourceType !== sourceType) throw new Error('A sync identity cannot be reused for another source.');
      return run;
    },
    async claim(id: string, now: Date, leaseMs: number) {
      const token = crypto.randomUUID(), time = now.getTime();
      const run = await get(id);
      if (!run || ['completed', 'superseded'].includes(run.state)) return null;
      await client.batch([
        client.prepare(`UPDATE source_sync_runs SET state = 'running', lease_token = ?, lease_expires_at = ?, last_error = NULL, updated_at = ?
          WHERE id = ? AND state IN ('queued', 'running', 'failed') AND (lease_token IS NULL OR lease_expires_at <= ?)
          AND NOT EXISTS (SELECT 1 FROM source_sync_runs other WHERE other.provider = source_sync_runs.provider
            AND other.source_type = source_sync_runs.source_type AND other.id <> source_sync_runs.id AND other.state IN ('queued', 'running'))`)
          .bind(token, time + leaseMs, time, id, time),
        sourceState(run.sourceType, time, 'Full sync is in progress; completion has not been confirmed.', guard, [id, token, time]),
      ]);
      const claimed = await get(id);
      return claimed?.leaseToken === token ? claimed : null;
    },
    async owns(id: string, token: string, now: Date) {
      return Boolean(await client.prepare(`SELECT 1 AS owned WHERE ${guard}`).bind(id, token, now.getTime()).first());
    },
    async hasCursor(id: string, digest: string) {
      return Boolean(await client.prepare('SELECT 1 AS seen FROM source_sync_cursors WHERE run_id = ? AND cursor_digest = ?').bind(id, digest).first());
    },
    async checkpoint(run: SyncRun, token: string, nextCursor: string | undefined, digest: string | undefined, records: number, now: Date, leaseMs: number) {
      const time = now.getTime(), values = [run.id, token, time];
      const statements: D1PreparedStatement[] = [];
      if (digest) statements.push(client.prepare(`INSERT INTO source_sync_cursors (run_id, cursor_digest) SELECT ?, ? WHERE ${guard}`).bind(run.id, digest, ...values));
      if (nextCursor === undefined) statements.push(sourceState(run.sourceType, time, null, guard, values));
      statements.push(client.prepare(`UPDATE source_sync_runs SET next_cursor = ?, pages = pages + 1, records = records + ?, state = ?,
        lease_token = ?, lease_expires_at = ?, last_error = NULL, updated_at = ?, completed_at = ? WHERE id = ? AND ${guard}`)
        .bind(nextCursor ?? null, records, nextCursor === undefined ? 'completed' : 'running', nextCursor === undefined ? null : token,
          nextCursor === undefined ? null : time + leaseMs, time, nextCursor === undefined ? time : null, run.id, ...values));
      const result = await client.batch(statements);
      if (!result.at(-1)?.meta.changes) throw new SourceSyncBusyError('Sync lease changed before its page could be checkpointed.');
      return (await get(run.id))!;
    },
    async release(run: SyncRun, token: string, now: Date) {
      const time = now.getTime();
      const result = await client.prepare(`UPDATE source_sync_runs SET state = 'queued', lease_token = NULL, lease_expires_at = NULL, updated_at = ?
        WHERE id = ? AND ${guard}`).bind(time, run.id, run.id, token, time).run();
      if (!result.meta.changes) throw new SourceSyncBusyError('Sync lease changed before continuation.');
    },
    async fail(run: SyncRun, token: string, error: string, now: Date) {
      const time = now.getTime(), detail = error.slice(0, 2000), values = [run.id, token, time];
      await client.batch([
        sourceState(run.sourceType, time, detail, guard, values),
        client.prepare(`UPDATE source_sync_runs SET state = 'failed', lease_token = NULL, lease_expires_at = NULL, last_error = ?, updated_at = ?
          WHERE id = ? AND ${guard}`).bind(detail, time, run.id, ...values),
      ]);
    },
    async enqueueFailed(run: SyncRun, error: string, now: Date) {
      const time = now.getTime(), detail = error.slice(0, 2000);
      const predicate = `EXISTS (SELECT 1 FROM source_sync_runs WHERE id = ? AND state = 'queued' AND lease_token IS NULL)`;
      await client.batch([
        sourceState(run.sourceType, time, detail, predicate, [run.id]),
        client.prepare(`UPDATE source_sync_runs SET state = 'failed', last_error = ?, updated_at = ? WHERE id = ? AND ${predicate}`).bind(detail, time, run.id, run.id),
      ]);
    },
  };
}
