import {canonicalJson,sha256,prepareD1ImportSteps,publishD1ImportPreparation,d1RequestContext,type D1ImportContext} from '@/vendor/base/import-kit/src/d1/index';
import {preparationPages} from '@/vendor/base/import-kit/src/d1/preparation-reader';
import {stagePages} from '@/vendor/base/import-kit/src/d1/preparation-step-pages';
import type {SourceBundle,ImportPlan} from '@/vendor/base/import-kit/src/types';
import type {ImportInput} from './import-types';
import {importColumns,restrictiveRank,type NormalizedImportRow} from './import-normalize';
import {applyStartRestrictions} from './import-start';
import {csvCounts} from '../move-in/csv-review';
import type {createAudienceImportService} from './import-service';

import {preparationState} from '@/vendor/base/import-kit/src/d1/preparation-state';
import {STEP_RECORDS as windowSize} from '@/vendor/base/import-kit/src/d1/preparation-steps';
import {selectedRows} from './import-preparation-source';
import {preparedPreview} from './import-preparation-read';
import {preparationFormat,generation,type Manifest} from './import-preparation-types';
export {steppedReviewRequired} from './import-preparation-source';
export {isPreparedManifest} from './import-preparation-types';
export {preparedCsvRows,preparedCsvReport,assertPreparedCsvCurrent} from './import-preparation-read';
type Review=ReturnType<typeof createAudienceImportService>['review'];

async function save(db:D1Database,key:string,principal:string,manifest:Manifest){
  await db.batch([db.prepare('UPDATE audience_import_plans SET plan_json=? WHERE fingerprint=? AND principal_id=?').bind(JSON.stringify(manifest),key,principal)]);
}
/** The submitted CSV remains with the browser while Base retains only bounded,
 * private normalized generations. Every continuation still requires live auth. */
export async function prepareCsv(input:ImportInput,raw:D1ImportContext,review:Review){
  if(input.sourceExtras||input.files.some(file=>!file.preset.startsWith('csv-')))throw new Error('Large reviews currently accept generic CSV exports. Review named-source exports in smaller files.');
  const context=d1RequestContext(raw),db=context.storage.database as unknown as D1Database,principal=context.authorization.principalId;
  const inputHash=sha256(canonicalJson({input,format:preparationFormat}));
  const key=sha256(canonicalJson({inputHash,principal}));
  if(await db.prepare('SELECT 1 FROM ik_d1_erased_sources WHERE destination=? AND identity=?').bind(context.destination,sha256('mango-csv-review:'+inputHash)).first())throw new Error('An erasure retired this reviewed CSV. Choose a fresh export.');
  let stored=await db.prepare('SELECT plan_json FROM audience_import_plans WHERE fingerprint=? AND principal_id=?').bind(key,principal).first<{plan_json:string}>();
  let manifest:Manifest=stored?JSON.parse(stored.plan_json):{format:preparationFormat,inputHash,generation:await generation(db),total:0};
  if(manifest.generation!==await generation(db))throw new Error('An erasure invalidated this CSV review. Choose a fresh export.');
  if(!stored){
    await db.batch([db.prepare('INSERT INTO audience_import_plans(fingerprint,principal_id,plan_json,source_digest,created_at) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING').bind(key,principal,JSON.stringify(manifest),key,Date.now())]);
    stored=await db.prepare('SELECT plan_json FROM audience_import_plans WHERE fingerprint=? AND principal_id=?').bind(key,principal).first<{plan_json:string}>();
    manifest=JSON.parse(stored!.plan_json);
  }
  const control=await db.prepare('SELECT records,phase FROM ik_d1_preparation_steps WHERE destination=? AND principal_id=? AND operation_key=?').bind(context.destination,principal,key).first<{records:number;phase:string}>();
  if(manifest.fingerprint&&manifest.counts)return preparedPreview(key,manifest,input,context);
  const collecting=!control||control.phase==='collecting';
  const selected=collecting||!manifest.originals?selectedRows(input,control?.records??0):{rows:[],total:manifest.total,identities:[]};
  manifest.total=selected.total;
  const artifacts= input.files.map(file=>({name:file.name,sha256:sha256(file.csv),size:new TextEncoder().encode(file.csv).length,original:{status:'unavailable' as const,reason:'not-supplied' as const}}));
  if(!manifest.originals){
    // Register every source identity before retaining any original bytes. Whole
    // file custody withdraws when even a not-yet-mapped identity is erased.
    for(let offset=0;offset<selected.identities.length;offset+=1000)await db.batch([db.prepare("INSERT INTO audience_import_plan_contacts(fingerprint,contact_id,email) SELECT ?,'',value FROM json_each(?) WHERE 1 ON CONFLICT DO NOTHING").bind(key,JSON.stringify(selected.identities.slice(offset,offset+1000)))]);
    const originals:NonNullable<Manifest['originals']>=[];let ordinal=0;
    for(const file of input.files){
      let chunks=0;
      for(let offset=0;offset<file.csv.length;){let end=Math.min(offset+256000,file.csv.length);if(end<file.csv.length&&/[\uD800-\uDBFF]/u.test(file.csv[end-1]))end--;
        await db.batch([db.prepare('INSERT INTO audience_import_plan_chunks(fingerprint,ordinal,content) VALUES(?,?,?) ON CONFLICT DO NOTHING').bind(key,ordinal++,file.csv.slice(offset,end))]);chunks++;offset=end;
      }
      originals.push({name:file.name,sha256:sha256(file.csv),size:new TextEncoder().encode(file.csv).length,chunks});
    }
    manifest.originals=originals;await save(db,key,principal,manifest);
  }
  selected.identities.length=0;
  let records:SourceBundle['records']=[],effects=new Map<string,ImportPlan['entries'][number]>();
  if(collecting){
    const result=await review(input,context,db,{normalized:{rows:selected.rows,columns:importColumns(input)},artifacts});
    effects=new Map(result.plan.entries.map(entry=>[entry.source.sourceId,entry]));
    records=result.source.records.map(record=>{
      const entry=effects.get(record.sourceId)!,row=record.payload as unknown as NormalizedImportRow;
      const outcome=entry.rejection?'rejected':row.held?'updated':entry.effects.length?(entry.effects[0].expectedRevision?'updated':'created'):'other';
      const evidence=entry.rejection?'rejected':row.status==='subscribed'?'confirmed':'none';
      return {...record,kind:[outcome,row.status,row.smsStatus,evidence,row.held?'held':'ordinary'].join(';')};
    });
    // The erasure index is registered before Base can retain this window's values.
    const identities=records.flatMap(record=>{
      const row=record.payload as unknown as NormalizedImportRow,entry=effects.get(record.sourceId)!;
      return [row.email,row.phone].filter(Boolean).map(email=>({email,id:entry.effects[0]?.targetId??''}));
    });
    for(let offset=0;offset<identities.length;offset+=1000)await db.batch([db.prepare("INSERT INTO audience_import_plan_contacts(fingerprint,contact_id,email) SELECT ?,json_extract(value,'$.id'),json_extract(value,'$.email') FROM json_each(?) WHERE 1 ON CONFLICT DO NOTHING").bind(key,JSON.stringify(identities.slice(offset,offset+1000)))]);
  }
  const source:SourceBundle={artifacts,diagnostics:[],records:new Proxy([] as SourceBundle['records'],{get(target,property,receiver){
    if(property==='length')return selected.total;
    if(property==='slice')return (from:number,to:number)=>{
      if(from!==(control?.records??0)||to!==from+windowSize)throw new Error('CSV preparation window changed. Retry the same files.');
      return records;
    };
    return Reflect.get(target,property,receiver);
  }})};
  const step=await prepareD1ImportSteps(source,{version:context.mappingVersion,map:record=>{
    const entry=effects.get(record.sourceId);if(!entry)throw new Error('CSV preparation source changed.');
    return {effects:entry.effects,unmapped:entry.unmapped,...(entry.rejection?{rejection:entry.rejection}:{})};
  }},{...context,operationKey:key});
  manifest.id=step.id;
  if(step.state==='reviewable'){
    manifest.fingerprint=step.fingerprint;
    const counts={...step.counts!,created:0,updated:0,unsubscribed:0,suppressed:0};
    const evidenceKinds:Record<string,number>={};
    for(const [kind,n] of Object.entries(step.counts!.byKind)){
      const [outcome,email,sms,evidence,restriction]=kind.split(';');
      if(restriction==='held')manifest.needsRestrictions=true;
      if(outcome==='created')counts.created+=n;if(outcome==='updated')counts.updated+=n;
      const strongest=restrictiveRank[email]>restrictiveRank[sms]?email:sms;
      if(outcome!=='rejected'&&outcome!=='other'){if(strongest==='suppressed')counts.suppressed+=n;if(strongest==='unsubscribed')counts.unsubscribed+=n;}
      evidenceKinds[evidence]=(evidenceKinds[evidence]??0)+n;
    }
    manifest.counts=counts;manifest.evidenceKinds=evidenceKinds;
    await save(db,key,principal,manifest);
    return preparedPreview(key,manifest,input,context);
  }
  await save(db,key,principal,manifest);
  return {state:step.state,records:step.records,total:step.total,preparationId:step.id};
}

/** Explicit Start claims restrictions in bounded steps before publishing any
 * contact job. Partial preparation alone can never mutate native contacts. */
export async function startPreparedCsv(key:string,json:string,raw:D1ImportContext,salt:string){
  const manifest=JSON.parse(json) as Manifest,context=d1RequestContext(raw),db=context.storage.database as unknown as D1Database;
  if(!manifest.fingerprint||!manifest.id||!manifest.counts)throw new Error('Wait for the full CSV review before starting.');
  if(manifest.generation!==await generation(db))throw new Error('An erasure invalidated this CSV review.');
  const published=await db.prepare('SELECT id FROM ik_d1_streams WHERE operation_key=? AND principal_id=?').bind(key,context.authorization.principalId).first<{id:string}>();
  if(published){const {readD1ImportStream}=await import('@/vendor/base/import-kit/src/d1/index');return {job:await readD1ImportStream(published.id,context)};}
  const state=await preparationState(manifest.id,{...context,reviewedFingerprint:manifest.fingerprint},'create');
  const pages=await preparationPages(state);
  const portable=await db.prepare('SELECT 1 AS present FROM audience_portable_hashes p WHERE p.destination_hash=p.portable_hash AND (EXISTS(SELECT 1 FROM surviving_opt_outs o WHERE o.destination_hash=p.portable_hash) OR EXISTS(SELECT 1 FROM contact_suppressions s WHERE s.destination_hash=p.portable_hash)) LIMIT 1').first();
  const from=manifest.startPage??0,to=!manifest.needsRestrictions&&!portable?pages.length:Math.min(from+5,pages.length);
  if(manifest.needsRestrictions||portable)for(const {plan} of await stagePages(context,manifest.id,from,to))await applyStartRestrictions(db,salt,plan);
  manifest.startPage=to;await save(db,key,context.authorization.principalId,manifest);
  if(to<pages.length)return {preparing:true as const,checkpoint:to,total:pages.length};
  return {job:await publishD1ImportPreparation(manifest.id,{...context,reviewedFingerprint:manifest.fingerprint})};
}

