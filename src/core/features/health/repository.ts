import { sql } from 'drizzle-orm';

import type { Database } from '@/core/platform/db/client';

export interface HealthRepository {
  ping(): Promise<void>;
}

export function createHealthRepository(database: Database): HealthRepository {
  return {
    async ping() {
      await database.run(sql`select 1`);
    },
  };
}
