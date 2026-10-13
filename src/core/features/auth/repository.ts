import { eq } from 'drizzle-orm';

import type { Database } from '@/core/platform/db/client';

import { operators } from './schema';

export function createAuthRepository(database: Database) {
  return {
    database,
    async getOperator(id: string) {
      return database.query.operators.findFirst({ where: eq(operators.id, id) });
    },

  };
}
