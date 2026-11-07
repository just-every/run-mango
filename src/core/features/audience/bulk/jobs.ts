import type {Platform} from '@/core/shared/platform';
import {activityStatement} from '@/core/features/auth/activity-record';
import {ulid} from '@/core/shared/ids';
import {createContactErasure,ErasureAdmissionConflict,ErasureAmbiguousText} from '../erasure/service';
import {inlineActions,inlineLimit,sliceRunners,sliceSize,type BulkAction,type Item,type Outcome} from './actions';
import {pendingErasure} from '../erasure/maintenance';
import {withErasureWriteFence} from '../erasure/write-fence';
import {SearchRefusal,selectionCap,type PreparedSearch} from './search';

type JobRow={id:string;action:BulkAction;params_json:string;filter_fields_json:string;state:'preparing'|'running'|'complete'|'failed';total:number;erased_count:number;
  erasure_reference:string|null;error:string|null;actor_id:string;created_at:number;updated_at:number;completed_at:number|null};
export type Selection={kind:'ids';contactIds:string[]}|{kind:'search';search:PreparedSearch};
export type Receipt=Awaited<ReturnType<typeof readBulkReceipt>>;

const iso=(value:number|null)=>value===null?null:new Date(value).toISOString();
const readJob=(platform:Platform,id:string)=>platform.database.$client.prepare('SELECT * FROM contact_bulk_jobs WHERE id=?').bind(id).first<JobRow>();

/** Every selected contact is fixed into the job before it starts, so later edits to a search cannot widen it. */
async function resolveIds(selection:Selection) {
  if(selection.kind==='ids')return [...new Set(selection.contactIds)];
  const ids:string[]=[];let cursor='';
  for(;;){
    const page=await selection.search.ids(cursor,1000);
    ids.push(...page.ids);
    if(ids.length>selectionCap)throw new SearchRefusal('selection_too_large',400,`A bulk action can select at most ${selectionCap.toLocaleString('en-US')} contacts. Narrow the search.`);
    if(page.next===null)return ids;
    cursor=page.next;
  }
}

export type CreatedReceipt=NonNullable<Receipt>;
export async function createBulkJob(platform:Platform,input:{action:BulkAction;params:Record<string,string>;selection:Selection;actorId:string;confirmTotal?:number}) {
  const ids=await resolveIds(input.selection);
  if(!ids.length)throw new SearchRefusal('empty_selection',400,'No contacts match this selection.');
  if(ids.length>selectionCap)throw new SearchRefusal('selection_too_large',400,`A bulk action can select at most ${selectionCap.toLocaleString('en-US')} contacts.`);
  if(input.confirmTotal!==undefined&&input.confirmTotal!==ids.length)throw new SearchRefusal('selection_changed',400,`The selection now holds ${ids.length} contacts, not ${input.confirmTotal}. Review it and confirm again.`);
  const db=platform.database.$client,id=ulid(),now=Date.now();
  const fields=input.selection.kind==='search'?input.selection.search.fields:['selection'];
  await db.prepare(`INSERT INTO contact_bulk_jobs(id,action,params_json,filter_fields_json,state,total,actor_id,created_at,updated_at) VALUES(?,?,?,?, 'preparing',?,?,?,?)`)
    .bind(id,input.action,JSON.stringify(input.params),JSON.stringify(fields),ids.length,input.actorId,now,now).run();
  for(let start=0;start<ids.length;start+=500)
    await db.prepare('INSERT INTO contact_bulk_items(job_id,position,contact_id) SELECT ?,?+CAST(j.key AS INTEGER),j.value FROM json_each(?) j').bind(id,start,JSON.stringify(ids.slice(start,start+500))).run();
  await db.batch([
    db.prepare("UPDATE contact_bulk_jobs SET state='running' WHERE id=? AND state='preparing' AND (SELECT COUNT(*) FROM contact_bulk_items WHERE job_id=?)=total").bind(id,id),
    // OPER-007: the action and its affected-item count are recorded with the job (SURFACE-004 point 3 for erasure).
    activityStatement(db,{key:`bulk-started:${id}`,action:`contacts.bulk-${input.action}`,entityType:'contact-bulk-job',entityId:id,actorId:input.actorId,
      detail:{count:ids.length,action:input.action,filters:fields,...(input.action==='erase'?{destructive:true}:{})}}),
  ]);
  const created=(await readJob(platform,id))!;
  if(created.state!=='running')throw new Error('The bulk job could not record its whole selection.');
  if(inlineActions.includes(input.action)&&ids.length<=inlineLimit){
    let outcome:{waiting:boolean};
    do outcome=await advanceBulkJob(platform,id);while(!outcome.waiting&&(await readJob(platform,id))?.state==='running');
  }
  return (await readBulkReceipt(platform,id))!;
}

async function writeOutcomes(platform:Platform,job:JobRow,outcomes:Outcome[]) {
  const db=platform.database.$client,now=Date.now(),statements:D1PreparedStatement[]=[];
  const group=new Map<string,number[]>();
  for(const item of outcomes){const key=`${item.outcome}|${item.reason??''}`;group.set(key,[...group.get(key)??[],item.position]);}
  for(const [key,positions] of group){
    const [outcome,reason]=key.split('|');
    statements.push(db.prepare("UPDATE contact_bulk_items SET outcome=?,reason=? WHERE job_id=? AND outcome='pending' AND position IN (SELECT value FROM json_each(?))").bind(outcome,reason||null,job.id,JSON.stringify(positions)));
  }
  statements.push(finishStatement(platform,job.id,now));
  await db.batch(statements);
}
/** A job completes when nothing is pending and no member's erasure is still in flight. */
function finishStatement(platform:Platform,id:string,now:number) {
  return platform.database.$client.prepare(`UPDATE contact_bulk_jobs SET updated_at=?,
    state=CASE WHEN erasure_reference IS NULL AND NOT EXISTS(SELECT 1 FROM contact_bulk_items WHERE job_id=? AND outcome='pending') THEN 'complete' ELSE state END,
    completed_at=CASE WHEN erasure_reference IS NULL AND NOT EXISTS(SELECT 1 FROM contact_bulk_items WHERE job_id=? AND outcome='pending') THEN ? ELSE completed_at END
    WHERE id=? AND state='running'`).bind(now,id,id,now,id);
}
const nextPending=(platform:Platform,id:string,limit:number)=>platform.database.$client.prepare(
  "SELECT position,contact_id AS contactId FROM contact_bulk_items WHERE job_id=? AND outcome='pending' ORDER BY position LIMIT ?").bind(id,limit).all<Item>().then(result=>result.results);

/** Erasure runs through CONT-013's own service, one contact at a time, each step durable; the committed job is its authority. */
async function eraseStep(platform:Platform,job:JobRow):Promise<{waiting:boolean}> {
  const erasure=createContactErasure(platform.database.$client,platform.config.contactHashSalt,{ASSETS_BUCKET:platform.blobs});
  const context={destination:'mango',authorization:{principalId:job.actor_id,
    predicate:()=>({sql:"EXISTS(SELECT 1 FROM contact_bulk_jobs WHERE id=? AND action='erase' AND state='running')",params:[job.id]})}};
  const db=platform.database.$client;
  let reference=job.erasure_reference;
  if(!reference){
    const [next]=await nextPending(platform,job.id,1);
    if(!next){await finishStatement(platform,job.id,Date.now()).run();return {waiting:false};}
    let receipt;
    try{receipt=await erasure.begin(next.contactId,context);}
    catch(error){
      if(error instanceof ErasureAdmissionConflict)return {waiting:true};
      if(error instanceof ErasureAmbiguousText){await writeOutcomes(platform,job,[{position:next.position,outcome:'refused',reason:'ambiguous_text'}]);return {waiting:false};}
      throw error;
    }
    if(!receipt){await writeOutcomes(platform,job,[{position:next.position,outcome:'refused',reason:'contact_missing'}]);return {waiting:false};}
    await db.prepare('UPDATE contact_bulk_jobs SET erasure_reference=? WHERE id=? AND erasure_reference IS NULL').bind(receipt.reference,job.id).run();
    reference=receipt.reference;
  }
  for(let step=0;step<25;step++){
    const receipt=await erasure.advance(reference,context);
    if(!receipt)throw new Error('The erasure receipt disappeared.');
    if(receipt.state==='complete'){
      // Compare-and-set: only the continuation that sees the receipt first counts the erasure.
      await db.batch([
        db.prepare('UPDATE contact_bulk_jobs SET erased_count=erased_count+1,erasure_reference=NULL WHERE id=? AND erasure_reference=?').bind(job.id,reference),
        finishStatement(platform,job.id,Date.now()),
      ]);
      return {waiting:false};
    }
  }
  return {waiting:false};
}

/** One bounded slice. A failure is recorded on the job and stays visible until an operator resumes it. */
export async function advanceBulkJob(platform:Platform,id:string):Promise<{waiting:boolean}> {
  const job=await readJob(platform,id);
  if(!job||job.state!=='running')return {waiting:false};
  try{
    if(job.action==='erase')return await eraseStep(platform,job);
    // Other writes wait while any erasure is pending, and each slice runs inside the erasure write fence,
    // so a selection can never put personal data back after an erasure has scanned it.
    if(await pendingErasure(platform.database.$client))return {waiting:true};
    const run=job.action;
    return await withErasureWriteFence(platform.database.$client,async()=>{
      const items=await nextPending(platform,id,sliceSize[run]);
      if(!items.length){await finishStatement(platform,id,Date.now()).run();return {waiting:false};}
      await writeOutcomes(platform,job,await sliceRunners[run]({platform,jobId:id,params:JSON.parse(job.params_json)},items));
      return {waiting:false};
    });
  }catch(error){
    const message=error instanceof Error?error.message:'The bulk action failed.';
    // A pending erasure or a concurrent continuation is a pause, not a failure.
    if(/CONTACT_ERASURE_PENDING|Another erasure continuation/.test(message))return {waiting:true};
    await platform.database.$client.prepare("UPDATE contact_bulk_jobs SET state='failed',error=?,updated_at=? WHERE id=? AND state='running'").bind(message.slice(0,500),Date.now(),id).run();
    return {waiting:false};
  }
}

/** Operator retry of a failed job: nothing already done is repeated, because only pending contacts are read. */
export async function reopenBulkJob(platform:Platform,id:string) {
  await platform.database.$client.prepare("UPDATE contact_bulk_jobs SET state='running',error=NULL,updated_at=? WHERE id=? AND state='failed'").bind(Date.now(),id).run();
}

export async function readBulkReceipt(platform:Platform,id:string,refused:{after?:number;limit?:number}={}) {
  const db=platform.database.$client,job=await readJob(platform,id);
  if(!job)return null;
  const counts=new Map((await db.prepare('SELECT outcome,COUNT(*) AS n FROM contact_bulk_items WHERE job_id=? GROUP BY outcome').bind(id).all<{outcome:string;n:number}>()).results.map(row=>[row.outcome,row.n]));
  const limit=Math.min(Math.max(refused.limit??200,1),1000);
  const rows=(await db.prepare(`SELECT i.position,i.contact_id AS contactId,i.reason,c.display_name AS name,c.email FROM contact_bulk_items i LEFT JOIN contacts c ON c.id=i.contact_id
    WHERE i.job_id=? AND i.outcome='refused' AND i.position>? ORDER BY i.position LIMIT ?`).bind(id,refused.after??-1,limit+1).all<{position:number;contactId:string;reason:string;name:string|null;email:string|null}>()).results;
  const succeeded=(counts.get('done')??0)+job.erased_count,refusedCount=counts.get('refused')??0;
  return {id:job.id,action:job.action,state:job.state,params:JSON.parse(job.params_json) as Record<string,string>,filterFields:JSON.parse(job.filter_fields_json) as string[],
    total:job.total,processed:succeeded+refusedCount,succeeded,refused:refusedCount,error:job.error,createdAt:iso(job.created_at)!,completedAt:iso(job.completed_at),
    refusedContacts:rows.slice(0,limit).map(row=>({contactId:row.contactId,name:row.name??'Removed contact',email:row.email,reason:row.reason,position:row.position})),
    refusedNext:rows.length>limit?rows[limit-1].position:null};
}

export async function recentBulkJobs(platform:Platform) {
  const rows=(await platform.database.$client.prepare('SELECT id FROM contact_bulk_jobs ORDER BY created_at DESC,id DESC LIMIT 10').all<{id:string}>()).results;
  return Promise.all(rows.map(row=>readBulkReceipt(platform,row.id,{limit:1})));
}

export async function bulkJobAction(platform:Platform,id:string) {return (await readJob(platform,id))?.action;}

/** The CSV lists the contacts the export job finished, read as they are now; erased contacts are simply absent. */
export async function exportRows(platform:Platform,id:string) {
  return (await platform.database.$client.prepare(`SELECT c.id,c.display_name AS name,
      (SELECT group_concat(a.email,'; ') FROM contact_email_addresses a WHERE a.contact_id=c.id) AS emails,
      (SELECT group_concat(p.phone_e164,'; ') FROM contact_phones p WHERE p.contact_id=c.id) AS phones,
      c.email_status AS emailStatus,c.sms_status AS smsStatus,
      COALESCE((SELECT group_concat(t.value,'; ') FROM integration_contact_profiles pr,json_each(pr.tags_json) t WHERE pr.contact_id=c.id),'') AS tags
    FROM contact_bulk_items i JOIN contacts c ON c.id=i.contact_id WHERE i.job_id=? AND i.outcome='done' ORDER BY i.position`).bind(id).all<Record<string,string|null>>()).results;
}
