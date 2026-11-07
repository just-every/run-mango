import {applySimplePage} from './page';
import type {Platform} from '@/core/shared/platform';
import {withErasureWriteFence} from '../erasure/write-fence';
import {pendingErasure} from '../erasure/maintenance';
import {activityStatement} from '@/core/features/auth/activity-record';
import {searchContacts} from './search';
import {actOnContact} from './actions';
import {authorized,bulkAuthoritySql} from './authority';
import {readBulkReceipt} from './receipt';
import type {BulkInput,BulkJob,BulkItem} from './types';

export async function startBulkJob(platform:Platform,input:BulkInput,principalId:string,sessionHash:string) {
  const db=platform.database.$client,id=crypto.randomUUID(),now=Date.now();
  const ids=[...new Set(input.contactIds??await searchContacts(platform,input.search!))];
  if(!ids.length)throw new Error('No contacts selected.');
  // One SQL statement freezes the complete selection atomically with its header.
  await db.batch([
    db.prepare(`INSERT INTO contact_bulk_jobs(id,action,value,channel,principal_id,session_hash,total,created_at,updated_at)
      SELECT ?,?,?,?,?,?,?,?,? WHERE ${bulkAuthoritySql}`).bind(id,input.action,input.value??null,input.channel,principalId,sessionHash,ids.length,now,now,sessionHash,principalId),
    db.prepare(`INSERT INTO contact_bulk_items(job_id,ordinal,contact_id,state,reason)
      SELECT ?,CAST(j.key AS INTEGER),c.id,CASE WHEN c.id IS NULL THEN 'refused' ELSE 'pending' END,CASE WHEN c.id IS NULL THEN 'contact-unavailable' END
      FROM json_each(?) j LEFT JOIN contacts c ON c.id=j.value WHERE EXISTS(SELECT 1 FROM contact_bulk_jobs WHERE id=?)`).bind(id,JSON.stringify(ids),id),
    db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
      SELECT ?,?,'contact-bulk',?,'bulk.requested','operator',?,?,?,? WHERE EXISTS(SELECT 1 FROM contact_bulk_jobs WHERE id=?)`)
      .bind(crypto.randomUUID(),`bulk:${id}`,id,principalId,JSON.stringify({action:input.action,count:ids.length}),now,now,id),
  ]);
  if(!await readBulkReceipt(db,id))throw new Error('Bulk authority is no longer active.');
  await enqueueBulk(platform,id);
  return readBulkReceipt(db,id);
}
async function enqueueBulk(platform:Platform,id:string){
  if(platform.config.local)return;
  try{await platform.jobs.enqueue({kind:'contact.bulk',idempotencyKey:`bulk:${id}:${crypto.randomUUID()}`,payload:{id}});}
  catch{await platform.database.$client.prepare("UPDATE contact_bulk_jobs SET error='Queue handoff delayed; resume this receipt or wait for scheduled recovery.' WHERE id=?").bind(id).run();}
}
export async function sweepBulkJobs(platform:Platform){
  const rows=(await platform.database.$client.prepare("SELECT id FROM contact_bulk_jobs WHERE state IN ('queued','running') AND (lease_until IS NULL OR lease_until<?) ORDER BY created_at LIMIT 10").bind(Date.now()).all<{id:string}>()).results;
  for(const row of rows)await enqueueBulk(platform,row.id);
}

/** A bounded page owns a durable lease. Replayed queue messages cannot run a second page concurrently. */
export async function advanceBulkJob(platform:Platform,id:string) {
  const db=platform.database.$client,token=crypto.randomUUID(),now=Date.now();
  const claimed=await db.prepare(`UPDATE contact_bulk_jobs SET lease_token=?,lease_until=?,state='running',error=NULL,updated_at=?
    WHERE id=? AND state IN ('queued','running') AND (lease_until IS NULL OR lease_until<?)`)
    .bind(token,now+120000,now,id,now).run();
  if(!claimed.meta.changes)return readBulkReceipt(db,id);
  const job=(await db.prepare('SELECT * FROM contact_bulk_jobs WHERE id=?').bind(id).first<BulkJob>())!;
  try {
    if(!await authorized(db,job))throw new Error('Initiating session or administrative authority was revoked.');
    if(job.action!=='erase'&&await pendingErasure(db)){await enqueueBulk(platform,id);return readBulkReceipt(db,id);}
    const work=async()=>{
      const items=(await db.prepare("SELECT ordinal,contact_id,erasure_reference FROM contact_bulk_items WHERE job_id=? AND state='pending' ORDER BY ordinal LIMIT ?").bind(id,job.action==='erase'?1:50).all<BulkItem>()).results;
      if(['tag','untag','export'].includes(job.action))await applySimplePage(db,job,items,token);
      else for(const item of items) {
        if(!await authorized(db,job))throw new Error('Initiating session or administrative authority was revoked.');
        const reason=await actOnContact(platform,job,item);
        if(reason==='pending-erasure')break;
        await db.batch([
          db.prepare(`UPDATE contact_bulk_items SET state=?,reason=? WHERE job_id=? AND ordinal=? AND EXISTS(SELECT 1 FROM contact_bulk_jobs WHERE id=? AND lease_token=?)`)
            .bind(reason?'refused':'succeeded',reason??null,id,item.ordinal,id,token),
          activityStatement(db,{key:`bulk-item:${id}:${item.ordinal}`,entityType:'contact-bulk',entityId:id,actorId:job.principal_id,action:'bulk.contact-processed',detail:{ordinal:item.ordinal,outcome:reason??'succeeded'}}),
        ]);
      }
      const pending=await db.prepare("SELECT 1 FROM contact_bulk_items WHERE job_id=? AND state='pending' LIMIT 1").bind(id).first();
      if(!pending)await db.prepare("UPDATE contact_bulk_jobs SET state='complete',updated_at=? WHERE id=? AND lease_token=?").bind(Date.now(),id,token).run();
      else await enqueueBulk(platform,id);
    };
    if(job.action==='erase')await work();else await withErasureWriteFence(db,work);
  } catch(error) {
    // Keep errors operational and address-free; individual privacy refusals are named in the receipt.
    await db.prepare("UPDATE contact_bulk_jobs SET state='failed',error=?,updated_at=? WHERE id=? AND lease_token=?")
      .bind(error instanceof Error&&error.message.includes('authority was revoked')?error.message:'Bulk action interrupted. Review the receipt before starting another action.',Date.now(),id,token).run();
    throw error;
  } finally {
    await db.prepare('UPDATE contact_bulk_jobs SET lease_token=NULL,lease_until=NULL WHERE id=? AND lease_token=?').bind(id,token).run();
  }
  return readBulkReceipt(db,id);
}
