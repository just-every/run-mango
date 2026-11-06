import {d1RequestContext,type D1ImportContext} from '@/vendor/base/import-kit/src/d1/index';
import {preparationState} from '@/vendor/base/import-kit/src/d1/preparation-state';
import {preparationPages} from '@/vendor/base/import-kit/src/d1/preparation-reader';
import {stagePages} from '@/vendor/base/import-kit/src/d1/preparation-step-pages';
import {loadPlans} from '@/vendor/base/import-kit/src/d1/plans';
import type {ImportPlan} from '@/vendor/base/import-kit/src/types';
import type {ImportInput} from './import-types';
import {importColumns,type NormalizedImportRow} from './import-normalize';
import {csvReconciliation} from '../move-in/csv-review';
import {isPreparedManifest,generation,publicRow,type Manifest} from './import-preparation-types';

export async function preparedPreview(key:string,manifest:Manifest,input:ImportInput,context:D1ImportContext){
  const db=context.storage.database;
  const published=await db.prepare('SELECT id FROM ik_d1_streams WHERE operation_key=? AND principal_id=?').bind(key,context.authorization.principalId).first<{id:string}>();
  let plan:ImportPlan;
  if(published){
    const {readD1ImportStream}=await import('@/vendor/base/import-kit/src/d1/index');
    await readD1ImportStream(published.id,context);
    const rows=(await db.prepare('SELECT j.id,j.plan_json FROM ik_d1_stream_pages p JOIN ik_jobs j ON j.id=p.job_id WHERE p.stream_id=? ORDER BY p.ordinal LIMIT 1').bind(published.id).all<{id:string;plan_json:string}>()).results;
    plan=(await loadPlans(rows,db,context.storage.targets.planCodec)).get(rows[0].id)!;
  }else{
    await preparationState(manifest.id!,context,'read');
    plan=(await stagePages(context,manifest.id!,0,1))[0].plan;
  }
  return {state:'reviewable' as const,fingerprint:key,counts:manifest.counts!,evidenceKinds:manifest.evidenceKinds,columns:importColumns(input),
    rows:plan.entries.map(entry=>publicRow(entry.source.payload as unknown as NormalizedImportRow)),
    warnings:['Original CSV files and all normalized rows are retained with this review.'],preparationId:key};
}

/** Read one bounded group at a time; a full buyer report need not materialize
 * hundreds of thousands of native snapshots in a request. */
export async function preparedCsvReport(stream:string,json:string,context:D1ImportContext){
  const db=context.storage.database,manifest=JSON.parse(json) as Manifest;
  if(manifest.generation!==await generation(db as unknown as D1Database))throw new Error('An erasure invalidated this CSV report.');
  const counts=manifest.counts!;
  const lines=['# Import reconciliation','','No campaign or flow was scheduled or activated.','',
    '## Reviewed totals','','| Input | Created | Updated | Rejected | Other |','| ---: | ---: | ---: | ---: | ---: |',
    `| ${counts.input} | ${counts.created} | ${counts.updated} | ${counts.rejected} | ${counts.input-counts.created-counts.updated-counts.rejected} |`,'',
    '## Row outcomes','','| File | Row | Status | Reason | Outcome |','| --- | ---: | --- | --- | --- |'];
  let ordinal=-1;
  for(;;){
    const rows=(await db.prepare('SELECT p.ordinal,j.id,j.plan_json FROM ik_d1_stream_pages p JOIN ik_jobs j ON j.id=p.job_id WHERE p.stream_id=? AND p.ordinal>? ORDER BY p.ordinal LIMIT 20').bind(stream,ordinal).all<{ordinal:number;id:string;plan_json:string}>()).results;
    if(!rows.length)break;
    const plans=await loadPlans(rows,db,context.storage.targets.planCodec);
    for(const row of rows){const report=csvReconciliation(plans.get(row.id)!);lines.push(...report.split('## Row outcomes')[1].split('\n').filter(line=>line.startsWith('| ')&&!line.startsWith('| File |')&&!line.startsWith('| --- |')));ordinal=row.ordinal;}
  }
  return lines.join('\n')+'\n';
}

export async function preparedCsvRows(key:string,offset:number,raw:D1ImportContext){
  const context=d1RequestContext(raw),db=context.storage.database;
  const stored=await db.prepare('SELECT plan_json FROM audience_import_plans WHERE fingerprint=? AND principal_id=?').bind(key,context.authorization.principalId).first<{plan_json:string}>();
  if(!stored||!isPreparedManifest(stored.plan_json))throw new Error('CSV review is unavailable.');
  const manifest=JSON.parse(stored.plan_json) as Manifest;
  if(!manifest.fingerprint||manifest.generation!==await generation(db as unknown as D1Database))throw new Error('CSV review is not current.');
  const published=await db.prepare('SELECT id FROM ik_d1_streams WHERE operation_key=? AND principal_id=?').bind(key,context.authorization.principalId).first<{id:string}>();
  let pages:Array<{ordinal:number;total:number}>;
  if(published){
    const {readD1ImportStream}=await import('@/vendor/base/import-kit/src/d1/index');await readD1ImportStream(published.id,context);
    pages=(await db.prepare('SELECT ordinal,total FROM ik_d1_stream_pages WHERE stream_id=? ORDER BY ordinal').bind(published.id).all<{ordinal:number;total:number}>()).results;
  }else pages=await preparationPages(await preparationState(manifest.id!,context,'read')) as Array<{ordinal:number;total:number}>;
  const rows:ReturnType<typeof publicRow>[]=[],end=Math.min(offset+25,manifest.total);let first=0;
  for(const page of pages){
    if(first<end&&first+page.total>offset){
      let plan:ImportPlan;
      if(published){const saved=(await db.prepare('SELECT j.id,j.plan_json FROM ik_d1_stream_pages p JOIN ik_jobs j ON j.id=p.job_id WHERE p.stream_id=? AND p.ordinal=?').bind(published.id,page.ordinal).all<{id:string;plan_json:string}>()).results;plan=(await loadPlans(saved,db,context.storage.targets.planCodec)).get(saved[0].id)!;}
      else plan=(await stagePages(context,manifest.id!,page.ordinal,page.ordinal+1))[0].plan;
      rows.push(...plan.entries.slice(Math.max(0,offset-first),end-first).map(entry=>publicRow(entry.source.payload as unknown as NormalizedImportRow)));
    }
    first+=page.total;if(first>=end)break;
  }
  return {rows,total:manifest.total,offset};
}

export async function assertPreparedCsvCurrent(id:string,context:D1ImportContext){
  const db=context.storage.database;
  const stored=await db.prepare('SELECT p.plan_json FROM audience_import_plans p JOIN ik_d1_streams s ON s.operation_key=p.fingerprint WHERE s.id=?').bind(id).first<{plan_json:string}>();
  if(stored&&isPreparedManifest(stored.plan_json)&&JSON.parse(stored.plan_json).generation!==await generation(db as unknown as D1Database))throw new Error('An erasure invalidated this CSV import.');
}
