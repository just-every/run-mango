import {createPortability} from '@/vendor/base/portability/index.mjs';
import {batchedPreparation} from './batched-preparation';
/** Erasure-only public service: no tables are offered for export here. The
 * adapted engine advances its source floor in each native deletion transaction. */
export async function erasurePortability(db:D1Database){
  const preparation=batchedPreparation(db);
  const service=await createPortability({db:preparation.db,policy:{product:'just-every/mango',excludeTables:['%']}});
  return {service:{
    erasureStatements:async(...args:Parameters<typeof service.erasureStatements>)=>(await service.erasureStatements(...args)).map(preparation.unwrap),
    invalidateTransfersStatements:async()=>(await service.invalidateTransfersStatements()).map(statement=>({statement:preparation.unwrap(statement),sql:preparation.sql(statement)})),
  }};
}
