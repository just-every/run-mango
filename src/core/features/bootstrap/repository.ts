import { eq } from 'drizzle-orm';

import type { Database } from '@/core/platform/db/client';
import { seedRuns } from '@/core/platform/db/seed-schema';

export function createBootstrapRepository(database: Database) {
  return {
    async isApplied(id: string) {
      return Boolean(await database.query.seedRuns.findFirst({ where: eq(seedRuns.id, id) }));
    },

    async recordApplied(id: string, appliedAt: Date) {
      await database.insert(seedRuns).values({ id, appliedAt }).onConflictDoNothing();
    },
  };
}
