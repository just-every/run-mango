import type {ErasureTable} from './declaration';
import type {ErasureRow} from './types';
import type {erasurePortability} from './portability';

/** Preserve historical approval attribution; invalidate authority and fence every
 * changed revision. Campaign and pending-recipient consequences have paged stages. */
export async function invalidateRevisions(db:D1Database,transfer:Awaited<ReturnType<typeof erasurePortability>>,table:ErasureTable,rows:ErasureRow[],reference:string){
  if(table.mode!=='redact')return [];
  const ids=[...new Set(rows.map(row=>table.table==='campaign_revisions'?row.id:table.table==='campaigns'?row.active_revision_id:table.table.startsWith('campaign_')?row.revision_id:null).filter(Boolean))];
  if(!ids.length)return [];
  const revisions=(await db.prepare("SELECT id,state FROM campaign_revisions WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all<{id:string;state:string}>()).results;
  const fences=await Promise.all(revisions.map(row=>row.state==='erasure-invalidated'?[]:transfer.service.erasureStatements('campaign_revisions',{id:row.id})));
  return revisions.flatMap((row,index)=>[
    ...fences[index],
    ...(row.state==='erasure-invalidated'?[]:[db.prepare("UPDATE campaign_revisions SET state='erasure-invalidated' WHERE id=?").bind(row.id)]),
    // A later contact erasure can redact more text in an already-invalidated
    // revision. Record that change too, without clearing historical attribution.
    db.prepare("INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at) VALUES(?,?,'campaign',?,'erasure-redacted','system',?,'{}',?,?)").bind(crypto.randomUUID(),crypto.randomUUID(),reference,reference,Date.now(),Date.now()),
  ]);
}
