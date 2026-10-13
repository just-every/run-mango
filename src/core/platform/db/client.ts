import {erasureFencedDatabase} from '@/core/features/audience/erasure/write-fence';
import { drizzle } from 'drizzle-orm/d1';

import { schema } from './schema';

export function createDatabase(binding: D1Database) {
  return drizzle(erasureFencedDatabase(binding), { schema });
}

export type Database = ReturnType<typeof createDatabase>;
