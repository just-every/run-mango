import {invalidateRevisions} from './campaigns';
import {invalidateTransfers} from './transfers';
import {scanObject} from './objects';
import type {BlobStore} from '@/core/shared/platform';
import {retainRestrictions} from './restrictions';
import type {D1ImportContext,D1Sql} from '@/vendor/base/import-kit/src/d1/index';
import {contactErasureTables,importJobCascadeChildren} from './declaration';
import {discoverPlan} from './discovery';
import {readScope} from './scope';
import {hasLiteral} from './literals';
import {identifierNeedles} from './needles';
import {ambiguousFreeTextStore} from './free-text-admission';
import {eraseRow,quote} from './rows';
import {erasurePortability} from './portability';
import type {ErasureJob,ErasureReceipt,ErasureRow,ErasureScope} from './types';

export class ErasureAdmissionConflict extends Error {
  constructor(){super('The contact changed or a contact merge is in progress. Refresh the contact and retry deletion.');}
}
/** A kept record would still hold a name or note too short or common to match safely. */
export class ErasureAmbiguousText extends Error {
  constructor(readonly store:string){super(`A record in ${store} that names this contact also holds their name or a note that is too short or a single word to remove safely. Edit that record, then retry deletion.`);}
}

class ErasureProgressConflict extends Error {
  constructor(readonly current:ErasureJob){super('Another erasure continuation advanced this job.');}
}

type ErasureAuthority=Pick<D1ImportContext,'destination'|'authorization'>;
function receipt(job:ErasureJob):ErasureReceipt {
  const scope=JSON.parse(job.scope_json);
  return {reference:job.reference,state:job.state as 'pending'|'complete',requestedAt:new Date(job.requested_at).toISOString(),completedAt:job.completed_at?new Date(job.completed_at).toISOString():null,removed:JSON.parse(job.counts_json),retainedChannels:scope.channels};
}
export function createContactErasure(db:D1Database,salt:string,buckets:Record<string,BlobStore>={}){
  // Initialize the public helper once per service, rather than repeating its
  // schema discovery and lease setup for every durable erasure stage. Its
  // methods still read current source fences and transfer tables on every call.
  let portabilityService:ReturnType<typeof erasurePortability>|undefined;
  const loadPortability=()=>portabilityService??=erasurePortability(db).catch(error=>{
    portabilityService=undefined;throw error;
  });
  const read=(reference:string)=>db.prepare('SELECT * FROM audience_erasures WHERE reference=?').bind(reference).first<ErasureJob>();
  function authority(context:ErasureAuthority):D1PreparedStatement {
    const check=context.authorization.predicate('erase',context.destination);
    return db.prepare(`INSERT INTO audience_erasure_guard SELECT CASE WHEN (${check.sql}) THEN 1 ELSE 0 END`).bind(...check.params??[]);
  }
  const prepare=(row:D1Sql)=>db.prepare(row.sql).bind(...row.params??[]);
  async function commit(context:ErasureAuthority,statements:D1PreparedStatement[]){await db.batch([authority(context),...statements,authority(context),db.prepare('DELETE FROM audience_erasure_guard')]);}
  return {
    async read(reference:string){const job=await read(reference);return job?receipt(job):null;},
    async begin(id:string,context:ErasureAuthority){
      const prior=await db.prepare('SELECT * FROM audience_erasures WHERE subject_id=?').bind(id).first<ErasureJob>();if(prior)return receipt(prior);
      const scope=await readScope(db,id,salt);if(!scope)return null;
      const store=await ambiguousFreeTextStore(db,scope);if(store)throw new ErasureAmbiguousText(store);
      const reference=crypto.randomUUID(),now=Date.now();
      // Admission and all side effects share one native transaction. No erasure
      // may interrupt any multi-write merge, even one for a different contact:
      // that request must retain its generation until both locks are released.
      const unchanged=Object.entries(scope.subject);
      const admitted="EXISTS(SELECT 1 FROM audience_erasures WHERE reference=?)";
      const statements=[db.prepare(`INSERT INTO audience_erasures(reference,subject_id,state,scope_json,requested_at)
        SELECT ?,?,'pending',?,? WHERE NOT EXISTS(SELECT 1 FROM audience_erasures WHERE state='pending')
        AND NOT EXISTS(SELECT 1 FROM contacts WHERE merge_lock IS NOT NULL)
        AND EXISTS(SELECT 1 FROM contacts WHERE ${unchanged.map(([column])=>`${quote(column)} IS ?`).join(' AND ')})
        AND NOT EXISTS(WITH RECURSIVE identities(id) AS (SELECT ? UNION SELECT m.merged_contact_id FROM contact_merges m JOIN identities i ON m.survivor_contact_id=i.id)
          SELECT id FROM identities WHERE id NOT IN (SELECT value FROM json_each(?))
          UNION ALL SELECT value FROM json_each(?) WHERE value NOT IN (SELECT id FROM identities))`)
        .bind(reference,id,JSON.stringify(scope),now,...unchanged.map(([,value])=>value),id,JSON.stringify(scope.ids),JSON.stringify(scope.ids))];
      statements.push(...await retainRestrictions(db,salt,scope,reference,now));
      // Capture staged blob ownership before invalidating transfer manifests.
      statements.push(db.prepare(`INSERT INTO audience_erasure_blobs SELECT ?,o.bucket,o.key FROM rer_portability_owned o JOIN rer_portability_jobs j ON j.id=o.job WHERE j.phase<>'complete' AND ${admitted}`).bind(reference,reference));
      statements.push(db.prepare(`UPDATE ik_jobs SET state='invalid',fence=fence+1,lease_token=NULL,lease_expires=NULL WHERE id IN (SELECT value FROM json_each(?)) AND ${admitted}`).bind(JSON.stringify(scope.jobs),reference));
      statements.push(db.prepare(`UPDATE ik_d1_creation_plans SET released=1 WHERE job_id IN (SELECT value FROM json_each(?)) AND ${admitted}`).bind(JSON.stringify(scope.jobs),reference));
      // OPER-007: recorded with the admission it describes, and anonymised with the contact (CONT-013).
      statements.push(db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
        SELECT ?,?,'contact',?,'contact.erasure-started','operator',?,'{}',?,? WHERE ${admitted} ON CONFLICT(operation_key) DO NOTHING`)
        .bind(crypto.randomUUID(),`erasure-started:${reference}`,id,context.authorization.principalId,now,now,reference));
      await commit(context,statements);
      const accepted=await read(reference);
      if(!accepted){
        if(!await db.prepare('SELECT id FROM contacts WHERE id=?').bind(id).first())return null;
        throw new ErasureAdmissionConflict();
      }
      return receipt(accepted);
    },
    async advance(reference:string,context:ErasureAuthority){
      const job=await read(reference);if(!job)return null;if(job.state==='complete')return receipt(job);
      const progress=async(statements:D1PreparedStatement[])=>{
        try {
          // NULL intentionally identifies only this optimistic conflict through
          // the existing NOT NULL constraint. Authorization and other guards use
          // value=0 and remain hard failures. D1 rolls the entire batch back.
          await commit(context,[db.prepare("INSERT INTO audience_erasure_guard SELECT CASE WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE reference=? AND revision=? AND state='pending') THEN 1 ELSE NULL END").bind(reference,job.revision),...statements,db.prepare('UPDATE audience_erasures SET revision=revision+1 WHERE reference=?').bind(reference)]);
        } catch(error) {
          if(!(error instanceof Error)||!/^D1_ERROR: NOT NULL constraint failed: audience_erasure_guard\.value: SQLITE_CONSTRAINT(?: \(extended: SQLITE_CONSTRAINT_NOTNULL\))?$/.test(error.message))throw error;
          const check=context.authorization.predicate('erase',context.destination);
          const current=await db.prepare(`SELECT * FROM audience_erasures WHERE reference=? AND (${check.sql})`).bind(reference,...check.params??[]).first<ErasureJob>();
          if(!current||current.revision<=job.revision||current.requested_at!==job.requested_at
            || !(current.subject_id===job.subject_id||(current.state==='complete'&&current.subject_id===null)))throw error;
          throw new ErasureProgressConflict(current);
        }
        job.revision++;
      };
      try {
      if(job.stage===-3){
        const refreshed=await readScope(db,job.subject_id!,salt);if(!refreshed)throw new Error('Erasure subject disappeared.');
        // Enumerate/count transfer copies only after the pending write fence is
        // durable, so an earlier export cannot create a new table between reads.
        const transfer=await loadPortability();
        const cleanup=await invalidateTransfers(db,transfer,reference);
        await progress([db.prepare('UPDATE audience_erasures SET scope_json=?,stage=? WHERE reference=? AND stage=-3').bind(JSON.stringify(refreshed),cleanup.complete?-2:-3,reference),...cleanup.statements]);
        return receipt((await read(reference))!);
      }
      if(job.stage===-2){
        const scope=JSON.parse(job.scope_json) as ErasureScope;
        const next=await discoverPlan(db,scope,job.cursor);
        await progress([db.prepare('UPDATE audience_erasures SET scope_json=?,stage=?,cursor=? WHERE reference=? AND stage=-2 AND cursor=?').bind(JSON.stringify(scope),next.stage,next.cursor,reference,job.cursor)]);
        return receipt((await read(reference))!);
      }
      if(job.stage===-1){
        // Re-read after the durable database fence: a writer that finished between
        // initial discovery and lock acquisition is included before any deletion.
        const refreshed=await readScope(db,job.subject_id!,salt,(JSON.parse(job.scope_json) as ErasureScope).plans);if(!refreshed)throw new Error('Erasure subject disappeared before scope capture.');
        const discovered=JSON.parse(job.scope_json) as ErasureScope;
        for(const key of ['ips','freeText','unsafeText'] as const)refreshed[key]=[...new Set([...refreshed[key],...discovered[key]])];
        const statements=[db.prepare('UPDATE audience_erasures SET scope_json=?,stage=0 WHERE reference=? AND stage=-1').bind(JSON.stringify(refreshed),reference)];
        const now=Date.now();
        statements.push(...await retainRestrictions(db,salt,refreshed,reference,now));
        statements.push(db.prepare("UPDATE ik_jobs SET state='invalid',fence=fence+1,lease_token=NULL,lease_expires=NULL WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(refreshed.jobs)));
        statements.push(db.prepare('UPDATE ik_d1_creation_plans SET released=1 WHERE job_id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(refreshed.jobs)));
        await progress(statements);return receipt((await read(reference))!);
      }
      const scope=JSON.parse(job.scope_json) as ErasureScope,counts=JSON.parse(job.counts_json) as Record<string,number>;
      const transfer=await loadPortability();
      // Stage numbers are durable: append a reconciliation pass for older jobs
      // whose cursor already passed the original portable-mapping predicate.
      // It uses the same bounded, PK-fenced transaction as every declared table.
      const table=contactErasureTables[job.stage]??(job.stage===contactErasureTables.length
        ?contactErasureTables.find(table=>table.table==='audience_portable_hashes'):undefined);
      if(table){
        const columns=(await db.prepare(`PRAGMA table_info(${quote(table.table)})`).all<{name:string;pk:number}>()).results;
        if(!columns.length)throw new Error(`Erasure declaration table missing: ${table.table}`);
        const selected=table.where?.(scope);
        const pageSize=table.table==='ik_jobs'?50:table.mode==='redact'?30:140;
        const rows=(await db.prepare(`SELECT rowid AS _cursor,* FROM ${quote(table.table)} WHERE rowid>?${selected&&!table.literal?` AND (${selected.sql})`:''} ORDER BY rowid LIMIT ${pageSize}`).bind(job.cursor,...selected&&!table.literal?selected.params:[]).all<ErasureRow>()).results;
        let matches:ErasureRow[],direct:Set<number>;
        if(table.literal){
          direct=new Set(selected?(await db.prepare(`SELECT rowid AS _cursor FROM ${quote(table.table)} WHERE rowid>? AND rowid<=? AND (${selected.sql})`).bind(job.cursor,rows.at(-1)?._cursor??job.cursor,...selected.params).all<{_cursor:number}>()).results.map(row=>row._cursor):[]);
          // Outside its own scope a row is selected only by an exact identifier.
          matches=rows.filter(row=>direct.has(Number(row._cursor))||hasLiteral(row,identifierNeedles(scope)));
        }else{matches=rows;direct=new Set(rows.map(row=>Number(row._cursor)));}
        const statements:D1PreparedStatement[]=[];
        // Public portability advances the source floor and commits the fence with
        // its exact delete/redaction and durable cursor. A crash replays no row.
        const fences=await Promise.all(matches.map(row=>transfer.service.erasureStatements(table.table,Object.fromEntries(columns.filter(column=>column.pk).sort((a,b)=>a.pk-b.pk).map(column=>[column.name,row[column.name]])))));
        if(table.table==='ik_jobs'&&matches.length)for(const child of importJobCascadeChildren){
          const children=(await db.prepare(`SELECT job_id FROM ${quote(child)} WHERE job_id IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(matches.map(row=>row.id))).all<{job_id:string}>()).results;
          const childFences=await Promise.all(children.map(row=>transfer.service.erasureStatements(child,{job_id:row.job_id})));
          statements.push(...childFences.flat());counts[child]=(counts[child]??0)+children.length;
        }
        statements.push(...await invalidateRevisions(db,transfer,table,matches,reference));
        for(const [index,row] of matches.entries()){
          statements.push(...fences[index],...eraseRow(table,row,scope,reference,direct.has(Number(row._cursor))).map(prepare));
        }
        if(!table.mode?.startsWith('invalidate-'))counts[table.table]=(counts[table.table]??0)+matches.length;
        const stage=rows.length?job.stage:job.stage+1,cursor=rows.length?rows.at(-1)!._cursor:0;
        statements.push(db.prepare('UPDATE audience_erasures SET counts_json=?,stage=?,cursor=? WHERE reference=? AND stage=? AND cursor=?').bind(JSON.stringify(counts),stage,cursor,reference,job.stage,job.cursor));
        // Optimistic cursor assertion also serializes concurrent resume requests.
        statements.unshift(db.prepare('INSERT INTO audience_erasure_guard SELECT CASE WHEN EXISTS(SELECT 1 FROM audience_erasures WHERE reference=? AND stage=? AND cursor=?) THEN 1 ELSE 0 END').bind(reference,job.stage,job.cursor));
        await progress(statements);return receipt((await read(reference))!);
      }
      if(!JSON.parse(job.blob_scan_json).complete){
        const next=await scanObject(buckets,job.blob_scan_json,scope),statements=[];
        if(next.remove)statements.push(db.prepare('INSERT OR IGNORE INTO audience_erasure_blobs VALUES(?,?,?)').bind(reference,next.remove.bucket,next.remove.key));
        statements.push(db.prepare('UPDATE audience_erasures SET blob_scan_json=? WHERE reference=? AND blob_scan_json=?').bind(JSON.stringify(next.scan),reference,job.blob_scan_json));
        await progress(statements);return receipt((await read(reference))!);
      }
      const blobs=(await db.prepare('SELECT bucket,key FROM audience_erasure_blobs WHERE reference=? LIMIT 25').bind(reference).all<{bucket:string;key:string}>()).results;
      if(blobs.length){
        for(const blob of blobs){const bucket=buckets[blob.bucket];if(!bucket)throw new Error(`Erasure bucket unavailable: ${blob.bucket}`);await bucket.delete(blob.key);if(await bucket.get(blob.key))throw new Error('Erasure blob remains');counts.stored_objects=(counts.stored_objects??0)+1;await progress([db.prepare('DELETE FROM audience_erasure_blobs WHERE reference=? AND bucket=? AND key=?').bind(reference,blob.bucket,blob.key),db.prepare('UPDATE audience_erasures SET counts_json=? WHERE reference=?').bind(JSON.stringify(counts),reference)]);}
        return receipt((await read(reference))!);
      }
      const cleanup=await invalidateTransfers(db,transfer,reference);
      if(!cleanup.complete){await progress(cleanup.statements);return receipt((await read(reference))!);}
      const done=Date.now(),statements:D1PreparedStatement[]=[];
      for(const id of scope.ids)statements.push(...await transfer.service.erasureStatements('contacts',{id}),db.prepare('DELETE FROM contacts WHERE id=?').bind(id));
      counts.contacts=Number((await db.prepare('SELECT count(*) AS n FROM contacts WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(scope.ids)).first<{n:number}>())!.n);
      statements.push(db.prepare('UPDATE audience_erasures SET counts_json=? WHERE reference=?').bind(JSON.stringify(counts),reference),...cleanup.statements,db.prepare("UPDATE audience_erasures SET state='complete',subject_id=NULL,blob_scan_json='{}',scope_json=?,completed_at=? WHERE reference=?").bind(JSON.stringify({channels:scope.channels}),done,reference),db.prepare("INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at) VALUES(?,?,'contact',?,'erased','system',?,'{}',?,?)").bind(crypto.randomUUID(),crypto.randomUUID(),reference,reference,done,done));
      await progress(statements);return receipt((await read(reference))!);
      } catch(error) {
        if(error instanceof ErasureProgressConflict)return receipt(error.current);
        throw error;
      }
    },
  };
}
