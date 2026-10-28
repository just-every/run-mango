import type {Portability} from '@/vendor/base/portability/index.mjs';
// @ts-expect-error Base's journal helpers are portable ESM without declarations.
import {erasureStatements, invalidateTransfersStatements} from '@/vendor/base/portability/journal.mjs';
import {wireDatabase} from '@/vendor/base/d1-transport/index.mjs';
import {batchedPreparation} from './batched-preparation';
/** Prepare Base's journal fences directly: erasure needs no archive catalogue.
 * The caller commits the source floor with its native deletion and cursor. */
export async function erasurePortability(db:D1Database){
  const preparation=batchedPreparation(db);
  const journalDatabase=wireDatabase(preparation.db);
  return {service:{
    // Mango's journal advances a source-wide floor without retaining row keys.
    erasureStatements:async(..._args:Parameters<Portability['erasureStatements']>)=>{
      const statements:D1PreparedStatement[]=await erasureStatements(journalDatabase);
      return statements.map(preparation.unwrap);
    },
    invalidateTransfersStatements:async()=>{
      const statements:D1PreparedStatement[]=await invalidateTransfersStatements(journalDatabase);
      return statements.map(statement=>({statement:preparation.unwrap(statement),sql:preparation.sql(statement)}));
    },
  }};
}
