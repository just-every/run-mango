import type {BulkJob,BulkItem} from './types';
import {bulkAuthoritySql} from './authority';
import {activityStatement} from '@/core/features/auth/activity-record';
/** Apply one native transaction: a killed or duplicated page is either wholly saved or absent. */
export async function applySimplePage(db:D1Database,job:BulkJob,items:BulkItem[],token:string) {
  if(!items.length)return;
  const ordinals=JSON.stringify(items.map(item=>item.ordinal)),statements:D1PreparedStatement[]=[];
  const selected="job_id=? AND ordinal IN (SELECT value FROM json_each(?)) AND state='pending'";
  statements.push(db.prepare(`INSERT INTO audience_erasure_guard SELECT CASE WHEN ${bulkAuthoritySql} AND EXISTS(SELECT 1 FROM contact_bulk_jobs WHERE id=? AND lease_token=?) THEN 1 ELSE 0 END`).bind(job.session_hash,job.principal_id,job.id,token));
  if(job.action!=='export')statements.push(db.prepare(`INSERT INTO contact_tag_overrides(contact_id,tag,present)
    SELECT i.contact_id,?,? FROM contact_bulk_items i JOIN contacts c ON c.id=i.contact_id
    WHERE ${selected} AND c.merge_lock IS NULL
    ON CONFLICT(contact_id,tag) DO UPDATE SET present=excluded.present`).bind(job.value,job.action==='tag'?1:0,job.id,ordinals));
  statements.push(db.prepare(`UPDATE contact_bulk_items SET
    state=CASE WHEN NOT EXISTS(SELECT 1 FROM contacts c WHERE c.id=contact_id AND c.merge_lock IS NULL) THEN 'refused' ELSE 'succeeded' END,
    reason=CASE WHEN NOT EXISTS(SELECT 1 FROM contacts c WHERE c.id=contact_id) THEN 'contact-erased' WHEN EXISTS(SELECT 1 FROM contacts c WHERE c.id=contact_id AND c.merge_lock IS NOT NULL) THEN 'contact-merge-in-progress' END
    WHERE ${selected}`).bind(job.id,ordinals));
  statements.push(activityStatement(db,{key:`bulk-page:${job.id}:${items[0].ordinal}`,entityType:'contact-bulk',entityId:job.id,actorId:job.principal_id,action:'bulk.page-processed',detail:{count:items.length,action:job.action}}));
  statements.push(db.prepare('DELETE FROM audience_erasure_guard'));
  await db.batch(statements);
}
