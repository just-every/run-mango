import {quote} from './rows';
import type {erasurePortability} from './portability';

/** Page the statements supplied by Base, in their original order. The durable
 * pending fence prevents new transfers; resumption re-enumerates remaining copies.
 * SQL metadata is used only to count artifacts, never to implement journal writes. */
export async function invalidateTransfers(db:D1Database,transfer:Awaited<ReturnType<typeof erasurePortability>>,reference:string){
  const all=await transfer.service.invalidateTransfersStatements(),page=all.slice(0,120);
  const statements:D1PreparedStatement[]=[];
  for(const item of page){
    const drop=/^DROP TABLE "((?:[^"]|"")+)"$/.exec(item.sql);
    const remove=/^DELETE FROM (rer_portability_segments|rer_portability_parts|rer_portability_jobs)$/.exec(item.sql);
    const tables=drop?[drop[1].replaceAll('""','"')]:remove?[remove[1],...(remove[1]==='rer_portability_jobs'?['rer_portability_owned']:[])]:[];
    if(!tables.length&&item.sql!=='UPDATE rer_portability_state SET import_job=NULL,applying=0 WHERE id=1')throw new Error('Unsupported public transfer cleanup statement');
    if(tables.length){
      const count=tables.map(table=>`(SELECT count(*) FROM ${quote(table)})`).join('+');
      statements.push(db.prepare(`UPDATE audience_erasures SET counts_json=json_set(counts_json,'$.transfer_artifacts',COALESCE(json_extract(counts_json,'$.transfer_artifacts'),0)+${count}) WHERE reference=?`).bind(reference));
    }
    statements.push(item.statement);
  }
  return {statements,complete:page.length===all.length};
}
