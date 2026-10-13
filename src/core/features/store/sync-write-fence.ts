import { getTableColumns, getTableName, sql } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { Database } from '@/core/platform/db/client';
import { SourceSyncBusyError } from './sync-run-repository';

export type SyncWriteFence = {runId: string; token: string; now: () => Date};
export function syncWritePredicate(fence: SyncWriteFence) {
  return sql`EXISTS (SELECT 1 FROM source_sync_runs WHERE id = ${fence.runId} AND state = 'running' AND lease_token = ${fence.token} AND lease_expires_at > ${fence.now().getTime()})`;
}
/** The ownership predicate is part of each mutation, so a replacement owner
 * cannot be followed by a stale write between an application check and SQL. */
export async function fencedInsert(database: Database, table: SQLiteTable, values: Record<string, unknown>, fence: SyncWriteFence,
  conflict?: {target: string[]; update: string[]}) {
  const columns = getTableColumns(table);
  const keys = Object.keys(values).filter(key => values[key] !== undefined);
  const column = (key: string) => sql.identifier(columns[key].name);
  const targets = sql.join(keys.map(column), sql`, `);
  const bound = sql.join(keys.map(key => sql.param(values[key], columns[key])), sql`, `);
  const clause = conflict
    ? conflict.update.length
      ? sql`ON CONFLICT (${sql.join(conflict.target.map(column), sql`, `)}) DO UPDATE SET ${sql.join(conflict.update.map(key => sql`${column(key)} = excluded.${column(key)}`), sql`, `)} WHERE ${syncWritePredicate(fence)}`
      : sql`ON CONFLICT DO NOTHING`
    : sql``;
  const result = await database.run(sql`INSERT INTO ${sql.identifier(getTableName(table))} (${targets}) SELECT ${bound} WHERE ${syncWritePredicate(fence)} ${clause}`);
  if (!result.meta.changes && !(await database.get(sql`SELECT 1 AS owned WHERE ${syncWritePredicate(fence)}`))) {
    throw new SourceSyncBusyError('Sync lease changed during ingestion.');
  }
  return result;
}
