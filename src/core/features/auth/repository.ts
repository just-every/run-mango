import { eq } from 'drizzle-orm';

import type { Database } from '@/core/platform/db/client';

import { operators } from './schema';

export function createAuthRepository(database: Database) {
  return {
    database,
    async projectOperator(id: string, isInitial: boolean) {
      const now = Date.now();
      // Keep the native identity projection and its canonical read in one D1
      // transaction, rather than paying a second remote database round trip.
      const [, rows] = await database.$client.batch([
        database.$client.prepare(`INSERT INTO operators(id,email,display_name,is_initial,invited_at,removed_at,created_at,updated_at)
          SELECT id,email,display_name,?,created_at,CASE WHEN status='inactive' THEN ? ELSE NULL END,created_at,?
          FROM oa_operators WHERE id=?
          ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name,
          removed_at=CASE WHEN excluded.removed_at IS NULL THEN NULL ELSE COALESCE(operators.removed_at,excluded.removed_at) END,updated_at=excluded.updated_at
          WHERE operators.display_name IS NOT excluded.display_name
            OR (operators.removed_at IS NULL) IS NOT (excluded.removed_at IS NULL)`)
          .bind(isInitial ? 1 : 0, now, now, id),
        database.$client.prepare(`SELECT id,email,display_name AS displayName,is_initial AS isInitial,
          invited_at AS invitedAt,removed_at AS removedAt,created_at AS createdAt,updated_at AS updatedAt
          FROM operators WHERE id=?`).bind(id),
      ]);
      const row = rows.results[0] as undefined | {
        id: string; email: string; displayName: string; isInitial: number;
        invitedAt: number | null; removedAt: number | null; createdAt: number; updatedAt: number;
      };
      return row ? {...row, isInitial: Boolean(row.isInitial),
        invitedAt: row.invitedAt === null ? null : new Date(row.invitedAt),
        removedAt: row.removedAt === null ? null : new Date(row.removedAt),
        createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt)} : undefined;
    },
    async getOperator(id: string) {
      return database.query.operators.findFirst({ where: eq(operators.id, id) });
    },

  };
}
