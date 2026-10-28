import {propertyDefinitions} from './properties/read';
import { apiImageReport } from '../move-in/incumbent-images';
import {applySourceExtras,undoSourceExtras} from '../move-in/source-extras';
import {csvReview,csvReconciliation,recordCsvAttestations} from '../move-in/csv-review';
import {csvAttestations,sourceIdentity} from '../move-in/csv-sources';
// @ts-expect-error Portable Base ESM has no separate declaration for this helper.
import { localCookieName } from '@/vendor/base/operator-auth/http.mjs';
import {audiencePreviewBudget} from './import-query-budget';
import {sharedAudienceImport} from './import-authority';
import {createAudienceStream,isAudienceStream,audienceStreamActions} from './import-stream';
import {readAudiencePlan,saveAudiencePlan} from './import-plans';
import type {IncumbentFile} from '../move-in/incumbent-policy';
import {readImportState} from './import-state';
import { Buffer } from 'node:buffer';
import { canonicalJson, planD1Import, createD1ImportJob, applyD1ImportBatches, resumeD1Import, readD1ImportJob, type D1ImportContext } from '@/vendor/base/import-kit/src/d1/index';
import type { SourceBundle, ImportPlan, TargetEffect, Json } from '@/vendor/base/import-kit/src/types';
import { hashToken } from '@/vendor/base/operator-auth/crypto.mjs';
import { sha256 } from '@/core/shared/ids';
import type { Platform } from '@/core/shared/platform';
import { normalizeImport, restrictiveRank } from './import-normalize';
import { createAudienceImportTarget, validateSnapshot } from './import-target';
import { importSnapshot } from './import-snapshot';
import { heldRows, heldStatus } from './import-held';
import { applyStartRestrictions } from './import-start';
import { optOutCsvRow, optOutLines, optOutRows } from './import-opt-out-lines';
import { heldContacts, holdReason, unfinished } from './import-hold';
import { abandonImport, abandoning, abandonments } from './import-abandon';
import { undoImport } from './import-undo';
import { encodeCsv } from './csv';
import { portableAudienceSnapshot } from './import-export';
import type { AudienceSnapshot, ImportInput } from './import-types';

const planned=holdReason.running;
function previewCounts(plan:ImportPlan) {
  const effects=plan.entries.flatMap(entry=>entry.effects), held=heldRows(plan);
  // An opt-out-only line counts toward the restrictions it restores, never as a contact.
  const statuses=[...effects.map(effect=>{const c=(effect.value as unknown as AudienceSnapshot).tables.contacts[0];return restrictiveRank[String(c.sms_status)]>restrictiveRank[String(c.email_status)]?c.sms_status:c.email_status;}),...held.map(row=>restrictiveRank[row.smsStatus]>restrictiveRank[row.status]?row.smsStatus:row.status),...optOutRows(plan).map(row=>row.status)];
  return {...plan.counts,created:effects.filter(effect=>!effect.expectedRevision).length,updated:effects.filter(effect=>effect.expectedRevision).length+held.length,
    unsubscribed:statuses.filter(status=>status==='unsubscribed').length,suppressed:statuses.filter(status=>status==='suppressed').length};
}

export async function audienceImportContext(platform: Platform, principalId: string, request: Request): Promise<D1ImportContext> {
  const name = platform.config.local === true ? localCookieName('operator_session_local', request.url) : '__Host-operator_session';
  const cookies=(request.headers.get('cookie') ?? '').split(';').map(value=>value.trim());
  const names=[name];
  const selected=names.map(cookieName=>cookies.find(value=>value.startsWith(`${cookieName}=`))).find(Boolean);
  const token=selected?.slice(selected.indexOf('=')+1) ?? '';
  const tokenHash = await hashToken(platform.config.sessionSigningKey, 'session', token);
  return { destination:'mango',namespace:'mango-audience-v1',mappingVersion:'mango-audience-v1',batchSize:10,maxBatches:1,
    storage:{database:platform.database.$client,targets:createAudienceImportTarget(platform.config.contactHashSalt)},
    authorization:{principalId,predicate:()=>({sql:`EXISTS(SELECT 1 FROM oa_sessions s JOIN oa_operators o ON o.id=s.operator_id WHERE s.token_hash=? AND o.id=? AND o.status='active' AND s.operator_version=o.version AND s.revoked_at IS NULL AND s.expires_at>CAST(ROUND((julianday('now')-2440587.5)*86400000) AS INTEGER))`,params:[tokenHash,principalId]})},
  };
}
export function createAudienceImportService(platform: Platform) {
  const db = platform.database.$client;
  // An archive's contacts are continued and undone with the archive, never as a separate CSV import.
  const finish=async<T extends {id:string;state:string}>(job:T,context:D1ImportContext,plan?:ImportPlan)=>{
    if(!['completed','undone','rolled_back'].includes(job.state))return job;
    if(!plan){const key=await db.prepare('SELECT operation_key FROM ik_jobs WHERE id=? UNION ALL SELECT operation_key FROM ik_d1_streams WHERE id=?').bind(job.id,job.id).first<{operation_key:string}>();const stored=key?await db.prepare('SELECT fingerprint,plan_json FROM audience_import_plans WHERE fingerprint=?').bind(key.operation_key).first<{fingerprint:string;plan_json:string}>():null;if(stored&&JSON.parse(stored.plan_json).hasSourceExtras===true)plan=await readAudiencePlan(db,stored);}
    if(plan){if(job.state==='completed')await applySourceExtras(platform,plan,context.authorization.principalId);else await undoSourceExtras(platform,plan);}
    return job;
  };
  const notArchive=async(id:string)=>{if(await db.prepare('SELECT 1 FROM move_in_archives WHERE audience_stream=?').bind(id).first())throw new Error('This import belongs to an archive move-in. Continue or undo it from the archive.');};
  return {
    /** Everything Preview shows, computed with reads only. */
    /** A contact that another import still attributes, after that import was undone or the
     * contact changed since, keeps everything Mango holds; only an unsubscribed or suppressed
     * row still applies its opt-out to it. archive: a contact that existed before an archive
     * move-in keeps its name (the exported name stays in the import observation). */
    async review(input: ImportInput, context: D1ImportContext, previewDb: D1Database = db, options: {archive?: boolean;incumbentSources?:Record<string,IncumbentFile>} = {}) {
      const csvProof=options.incumbentSources?[]:await csvAttestations(input,previewDb);
      const csvSources=Object.fromEntries(input.files.flatMap(file=>{const id=sourceIdentity(file.preset,file.name),record=csvProof.find(r=>r.sourceKey===id.sourceKey);return record?[[file.name,{...record,exportCreatedAt:record.exportCreatedAt}]]:[];}));
      const incumbentSources=options.incumbentSources??csvSources;
      const normalized = normalizeImport(input,incumbentSources);
      if(input.sourceExtras&&normalized.rows.length)normalized.rows[0].sourceExtras=input.sourceExtras;
      for(const proof of csvProof){const file=input.files.find(f=>sourceIdentity(f.preset,f.name).sourceKey===proof.sourceKey);const row=normalized.rows.find(r=>r.file===file?.name);if(row)row.sourceAttestation=proof;}
      const previewContext = {...context,storage:{...context.storage,database:previewDb}};
       const effects = new Map<string,TargetEffect>(); const now = Date.now();
      // One native effect per canonical identity, across every file. All restrictive
      // rows are handled before any sendable row, including between resume calls.
      const winners = new Map<string,typeof normalized.rows[number]>();
      for (const row of normalized.rows.filter(row=>!row.reason&&!row.optOuts)) {
        if(row.ledger){try{validateSnapshot(row.ledger);}catch(error){row.reason=error instanceof Error?error.message:'Invalid audience ledger.';continue;}}
        const key=row.email || row.phone || String(row.ledger?.tables.contact_phones[0]?.phone_e164);
        const previous = winners.get(key);
        if(previous && previous.phone !== row.phone){previous.reason=row.reason='Duplicate identity has conflicting phone/email assignments. Resolve the identities explicitly.';continue;}
        // Name completeness is independent of which row supplies the restrictive status.
        // Carry it forward as each duplicate arrives, including three or more files.
        if(previous){const name=previous.displayName.trim().length>=row.displayName.trim().length?previous.displayName:row.displayName;previous.sourceDisplayName??=previous.displayName;row.sourceDisplayName=row.displayName;previous.displayName=row.displayName=name;}
        if(previous && restrictiveRank[row.smsStatus]>restrictiveRank[previous.smsStatus]){previous.smsStatus=row.smsStatus;previous.values={...previous.values,...Object.fromEntries(Object.entries(row.values).filter(([key])=>key.startsWith('sms_')))};}
        if(previous && restrictiveRank[previous.smsStatus]>restrictiveRank[row.smsStatus]){row.smsStatus=previous.smsStatus;row.values={...row.values,...Object.fromEntries(Object.entries(previous.values).filter(([key])=>key.startsWith('sms_')))};}
        if (!previous || restrictiveRank[row.status] > restrictiveRank[previous.status]) winners.set(key,row);
      }
      const phoneRows=new Map<string,typeof normalized.rows[number]>();
      for(const row of winners.values())if(row.phone){const other=phoneRows.get(row.phone);if(other&&other.email!==row.email){other.reason=row.reason='Phone appears with different email identities. Resolve the identities explicitly.';}else phoneRows.set(row.phone,row);}
      normalized.rows.sort((a,b)=>restrictiveRank[b.status]-restrictiveRank[a.status]);
      const artifacts = await Promise.all(input.files.map(async file=>({name:file.name,sha256:await sha256(file.csv),size:new TextEncoder().encode(file.csv).length,original:{status:'available' as const,base64:Buffer.from(file.csv,'utf8').toString('base64')}})));
      const state=await readImportState(previewDb,[...winners.values()],platform.config.contactHashSalt,context.destination);
      for(const source of Object.values(incumbentSources))if(source.accepted)state.activeAttestations.add(source.id);
      const held=await heldContacts(previewDb,context.destination,state);
      // A contact an unfinished import has planned but not written yet is that import's to create.
      // Only an import that has written rows counts: a refused Start wrote nothing and holds nothing.
      const unwritten=[...winners.keys()].filter(identity=>!state.byIdentity.has(identity));
      const plannedIdentities=new Set(unwritten.length?(await previewDb.prepare(`SELECT DISTINCT c.email FROM audience_import_plan_contacts c WHERE c.contact_id<>'' AND c.email IN (SELECT value FROM json_each(?))
        AND EXISTS(SELECT 1 FROM ik_jobs j WHERE j.destination=? AND j.state IN (SELECT value FROM json_each(?)) AND ((j.operation_key=c.fingerprint AND j.checkpoint>0)
          OR j.id IN (SELECT p.job_id FROM ik_d1_stream_pages p JOIN ik_d1_streams s ON s.id=p.stream_id WHERE s.operation_key=c.fingerprint
            AND EXISTS(SELECT 1 FROM ik_d1_stream_pages q JOIN ik_jobs k ON k.id=q.job_id WHERE q.stream_id=s.id AND k.checkpoint>0))))`)
        .bind(JSON.stringify(unwritten),context.destination,JSON.stringify(unfinished)).all<{email:string}>()).results.map(row=>row.email):[]);
      const source: SourceBundle = {records:[],artifacts,diagnostics:[]};
      for (const [index,row] of normalized.rows.entries()) {
        const sourceId = `${input.origin?`${input.origin}:`:''}${artifacts.find(artifact=>artifact.name===row.file)!.sha256}:${index}:${row.file}:${row.row}`;
        // An opt-out-only line takes no contact effect: the import writes it when it starts (import-start).
        if (row.optOuts) row.warnings.push('An opt-out for an address no contact holds: it is restored before any contact is written and stays when the import is undone.');
        else if (!row.reason && winners.get(row.email || row.phone || String(row.ledger?.tables.contact_phones[0]?.phone_e164))===row) {
          const destination=row.email||row.phone;
          const contactId=state.byIdentity.get(destination) ?? state.byIdentity.get(row.phone) ?? null, holder=contactId?held.get(contactId):plannedIdentities.has(destination)?planned:undefined;
          const emailOwner=state.byIdentity.get(row.email),phoneOwner=state.byIdentity.get(row.phone);
          if(emailOwner&&phoneOwner&&emailOwner!==phoneOwner){row.reason='Email and phone belong to different contacts. Resolve the identities explicitly.';}
          else if(holder&&Math.max(restrictiveRank[row.status],restrictiveRank[row.smsStatus])>=restrictiveRank.unsubscribed){
            if(row.email)row.status=heldStatus(state,contactId,row.status,await sha256(`${platform.config.contactHashSalt}:${row.email}`));
            if(row.phone)row.smsStatus=heldStatus(state,contactId,row.smsStatus,await sha256(`${platform.config.contactHashSalt}:${row.phone}`),'sms');
            row.held={contactId,reason:`${holder}; its ${row.status==='suppressed'?'suppression':'opt-out'} is applied and its other details are left ${contactId?'as they are now':'to that import'}.`};
            row.warnings.push(row.held.reason);
          }
          else if(holder){row.skipped=`${holder}; left ${contactId?'as it is now':'to that import'}.`;row.warnings.push(row.skipped);}
          else try {
            const native = await importSnapshot(state,row,input,platform.config.contactHashSalt,now,sourceId,options.archive===true);
            row.status=native.status;
            if(native.kept)row.warnings.push(native.kept);
            const current=state.targets.get(native.id);
            effects.set(sourceId,{targetKind:'contact',targetId:native.id,value:native.snapshot as unknown as Json,...(current?{expectedRevision:current.revision}:{})});
          } catch(error) { row.reason=error instanceof Error ? error.message : 'Invalid audience row.'; }
        } else if (!row.reason) row.warnings.push('Duplicate destination combined with its most restrictive channel statuses in this import.');
        source.records.push({namespace:context.namespace,kind:'contact',sourceId,payload:row as unknown as Json,payloadHash:await sha256(canonicalJson(row)),artifactHash:artifacts.find(artifact=>artifact.name===row.file)!.sha256,location:{artifact:row.file,row:row.row}});
      }
      const plan = await planD1Import(source,{version:context.mappingVersion,map:record=>{
        const row=record.payload as unknown as typeof normalized.rows[number];
        return {effects:effects.has(record.sourceId)?[effects.get(record.sourceId)!]:[],...(row.reason?{rejection:row.reason}:{})};
      }},previewContext);
      return {normalized,effects,source,plan,now};
    },
    async preview(input: ImportInput, context: D1ImportContext, options: {archive?: boolean;incumbentSources?:Record<string,IncumbentFile>} = {}) {
      const budget = audiencePreviewBudget(db);
      const previewDb = budget.db;
      // Review normalizes first, so an over-cap or malformed input is refused before any query.
      const {normalized,effects,source,plan,now}=await this.review(input,context,previewDb,options);
      const sourceDigest=await sha256(canonicalJson({input,incumbentSources:options.incumbentSources??null,propertyDefinitions:await propertyDefinitions(previewDb)}));
      const existing=await previewDb.prepare('SELECT fingerprint,plan_json FROM audience_import_plans WHERE source_digest=? AND principal_id=?').bind(sourceDigest,context.authorization.principalId).first<{fingerprint:string;plan_json:string}>();
      if(existing){
        // Reuse a review while every row still targets the same contact revision, or
        // once an import has started from it. Otherwise the audience changed since
        // this unused review (for example a signup created one of its contacts).
        const cached=await readAudiencePlan(previewDb,existing);
        const target=(effect?:TargetEffect)=>effect?(effect.expectedRevision===undefined?'new':`${effect.targetId}@${effect.expectedRevision}`):'none';
        const current=cached.entries.length===source.records.length&&cached.entries.every(entry=>target(entry.effects[0])===target(effects.get(entry.source.sourceId)));
        // A review whose import was abandoned or undone stays with that import; the same file is reviewed afresh.
        const users=await previewDb.prepare("SELECT j.state FROM ik_jobs j WHERE j.destination=? AND j.principal_id=? AND (j.operation_key=? OR j.id IN (SELECT p.job_id FROM ik_d1_stream_pages p JOIN ik_d1_streams s ON s.id=p.stream_id WHERE s.destination=? AND s.principal_id=? AND s.operation_key=?))").bind(context.destination,context.authorization.principalId,existing.fingerprint,context.destination,context.authorization.principalId,existing.fingerprint).all<{state:string}>();
        const used=users.results.length>0,reversed=used&&users.results.every(row=>['rolled_back','undone'].includes(row.state));
        if(reversed)await previewDb.prepare("UPDATE audience_import_plans SET source_digest=source_digest||':reversed:'||fingerprint WHERE fingerprint=?").bind(existing.fingerprint).run();
        else if(current||used){const rows=cached.entries.map(entry=>entry.source.payload as unknown as typeof normalized.rows[number]);return {...csvReview(cached),fingerprint:cached.fingerprint,counts:previewCounts(cached),columns:normalized.columns,rows:rows.map(({values,ledger,optOuts,...row})=>({...row,...(optOuts?{optOut:true}:{})})),warnings:rows.flatMap(row=>row.warnings)};}
        else{
          const unused="NOT EXISTS(SELECT 1 FROM ik_jobs WHERE operation_key=?) AND NOT EXISTS(SELECT 1 FROM ik_d1_streams WHERE operation_key=?)";
          await previewDb.batch(['audience_import_plan_chunks','audience_import_plan_contacts','audience_import_plans'].map(table=>previewDb.prepare(`DELETE FROM ${table} WHERE fingerprint=? AND ${unused}`).bind(existing.fingerprint,existing.fingerprint,existing.fingerprint)));
        }
      }
      await saveAudiencePlan(previewDb,plan,context.authorization.principalId,sourceDigest,now,budget);
      const saved=await previewDb.prepare('SELECT fingerprint,plan_json FROM audience_import_plans WHERE source_digest=? AND principal_id=?').bind(sourceDigest,context.authorization.principalId).first<{fingerprint:string;plan_json:string}>();
      const retained=await readAudiencePlan(previewDb,saved!);const retainedRows=retained.entries.map(entry=>entry.source.payload as unknown as typeof normalized.rows[number]);
      return {...csvReview(retained),fingerprint:retained.fingerprint,counts:previewCounts(retained),columns:normalized.columns,rows:retainedRows.map(({values,ledger,optOuts,...row})=>({...row,...(optOuts?{optOut:true}:{})})),warnings:retainedRows.flatMap(row=>row.warnings)};
    },
    async create(fingerprint: string, context: D1ImportContext, actor?:{operator:{id:string;role:string};request:Request}) {
      const row=await db.prepare('SELECT fingerprint,plan_json FROM audience_import_plans WHERE fingerprint=? AND principal_id=?').bind(fingerprint,context.authorization.principalId).first<{fingerprint:string;plan_json:string}>();
      if(!row) throw new Error('Review this import before applying it.');
      const plan=await readAudiencePlan(db,row);
      if(plan.entries.some(e=>(e.source.payload as unknown as {sourceAttestation?:unknown}).sourceAttestation)){if(!actor)throw new Error('Source attestation requires the applying operator.');await recordCsvAttestations(db,plan,actor.operator,actor.request,platform.config.local===true);}
      await applyStartRestrictions(db,platform.config.contactHashSalt,plan);
      if(plan.entries.length>10000)return createAudienceStream(plan,context);
      const reviewed={...context,reviewedFingerprint:fingerprint,operationKey:fingerprint};
      const job=await createD1ImportJob(plan,reviewed);
      return finish(await applyD1ImportBatches(job,reviewed),context,plan);
    },
    report:async(id:string,input:D1ImportContext)=>{
      const context=await sharedAudienceImport(id,input);
      if(await isAudienceStream(id,context))await audienceStreamActions.read(id,context);else await readD1ImportJob(id,context);
      const job=await db.prepare('SELECT operation_key FROM ik_jobs WHERE id=? UNION ALL SELECT operation_key FROM ik_d1_streams WHERE id=?').bind(id,id).first<{operation_key:string}>();
      const stored=job?await db.prepare('SELECT fingerprint,plan_json FROM audience_import_plans WHERE fingerprint=?').bind(job.operation_key).first<{fingerprint:string;plan_json:string}>():null;
      if(!stored)throw new Error('The reviewed source is no longer held.');
      const plan = await readAudiencePlan(db,stored);
      return csvReconciliation(plan)+'\n'+await apiImageReport(db,'csv:'+plan.fingerprint);
    },
    read:async(id:string,input:D1ImportContext)=>{
      const context=await sharedAudienceImport(id,input);
      return await isAudienceStream(id,context)?audienceStreamActions.read(id,context):readD1ImportJob(id,context);
    },
    resume:async(id:string,context:D1ImportContext)=>{
      context=await sharedAudienceImport(id,context);
      await notArchive(id);
      if(await abandoning(db,id))return abandonImport(db,platform.config.contactHashSalt,id,context);
      const stream=await isAudienceStream(id,context);
      // An undo continues through Undo's own steps, never the kit's plain resume.
      if((stream?await audienceStreamActions.read(id,context):await readD1ImportJob(id,context)).state==='undoing')return undoImport(db,platform.config.contactHashSalt,id,context);
      return finish(await (stream?audienceStreamActions.resume(id,context):resumeD1Import(id,context)),context);
    },
    undo:async(id:string,context:D1ImportContext)=>{await notArchive(id);const shared=await sharedAudienceImport(id,context);return finish(await undoImport(db,platform.config.contactHashSalt,id,shared),shared);},
    abandon:async(id:string,context:D1ImportContext)=>{await notArchive(id);return abandonImport(db,platform.config.contactHashSalt,id,await sharedAudienceImport(id,context));},
    abandonments:(ids:string[])=>abandonments(db,ids),
    async jobs() {
      // A stream is published with its page jobs, so it lists at their position.
      return (await db.prepare("SELECT id FROM (SELECT s.id,(SELECT min(j.rowid) FROM ik_d1_stream_pages p JOIN ik_jobs j ON j.id=p.job_id WHERE p.stream_id=s.id) AS position FROM ik_d1_streams s WHERE s.destination='mango' AND NOT EXISTS(SELECT 1 FROM move_in_archives a WHERE a.audience_stream=s.id) UNION ALL SELECT id,rowid FROM ik_jobs WHERE destination='mango' AND NOT EXISTS(SELECT 1 FROM ik_d1_stream_origins o WHERE o.job_id=ik_jobs.id) AND NOT EXISTS(SELECT 1 FROM ik_d1_stream_pages p WHERE p.job_id=ik_jobs.id)) ORDER BY position DESC LIMIT 100").all<{id:string}>()).results;
    },
    async exportCsv() {
      const targets=await createAudienceImportTarget(platform.config.contactHashSalt).list(db,'mango');
      // Every opt-out and suppression leaves: with its contact, or on a line of its own.
      const carried=new Set(targets.flatMap(target=>(['surviving_opt_outs','contact_suppressions'] as const).flatMap(table=>(target.value as unknown as AudienceSnapshot).tables[table].map(row=>`${table}:${row.id}`))));
      const header=['email','phone','display_name','email_status','sms_status','consent_source','consent_timestamp','consent_method','consent_ip','confirmation_timestamp','confirmation_ip','ledger_json'];
      return encodeCsv([header,...await Promise.all(targets.map(async target=>{
        const snapshot=await portableAudienceSnapshot(target.value as unknown as AudienceSnapshot); const contact=snapshot.tables.contacts[0];
        const evidence=snapshot.tables.consent_evidence.filter(row=>row.channel==='email').sort((a,b)=>Number(b.occurred_at)-Number(a.occurred_at))[0];
        const metadata=snapshot.tables.consent_capture_metadata.find(row=>row.id===evidence?.id);
        return [contact.email,snapshot.tables.contact_phones[0]?.phone_e164,contact.display_name,contact.email_status,contact.sms_status,evidence?.capture_source,evidence?.occurred_at == null ? null : new Date(Number(evidence.occurred_at)).toISOString(),evidence?.capture_method,metadata?.capture_ip,evidence?.confirmed_at == null ? null : new Date(Number(evidence.confirmed_at)).toISOString(),metadata?.confirmation_ip,canonicalJson(snapshot)];
      })),...(await optOutLines(db,carried)).map(optOutCsvRow)]);
    },
  };
}
