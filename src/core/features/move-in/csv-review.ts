import {extrasOf} from './source-extras';
import {heldRows} from '../audience/import-held';
import {optOutRows} from '../audience/import-opt-out-lines';
import {restrictiveRank} from '../audience/import-normalize';
import type {AudienceSnapshot} from '../audience/import-types';
import type {ImportPlan} from '@/vendor/base/import-kit/src/types';
import type {NormalizedImportRow} from '../audience/import-normalize';
import {attestationStatements,type PlannedAttestation} from './incumbent-attestation';
export function csvCounts(plan:ImportPlan) {
  const effects=plan.entries.flatMap(entry=>entry.effects), held=heldRows(plan);
  // An opt-out-only line counts toward the restrictions it restores, never as a contact.
  const statuses=[...effects.map(effect=>{const c=(effect.value as unknown as AudienceSnapshot).tables.contacts[0];return restrictiveRank[String(c.sms_status)]>restrictiveRank[String(c.email_status)]?c.sms_status:c.email_status;}),...held.map(row=>restrictiveRank[row.smsStatus]>restrictiveRank[row.status]?row.smsStatus:row.status),...optOutRows(plan).map(row=>row.status)];
  return {...plan.counts,created:effects.filter(effect=>!effect.expectedRevision).length,updated:effects.filter(effect=>effect.expectedRevision).length+held.length,
    unsubscribed:statuses.filter(status=>status==='unsubscribed').length,suppressed:statuses.filter(status=>status==='suppressed').length};
}

export function csvReview(plan:ImportPlan){
  const rows=plan.entries.map(e=>e.source.payload as unknown as NormalizedImportRow),records=rows.flatMap(r=>r.sourceAttestation?[r.sourceAttestation]:[]);
  const evidenceKinds:Record<string,number>={};
  for(const entry of plan.entries){const row=entry.source.payload as unknown as NormalizedImportRow;const kind=entry.rejection?'rejected':row.incumbent&&row.status==='subscribed'?'incumbent-held':row.status==='subscribed'?'confirmed':'none';evidenceKinds[kind]=(evidenceKinds[kind]??0)+1;}
  return {attestationSources:records.map(({sourceKey,sourceName,accepted,reason})=>({sourceKey,sourceName,accepted,reason})),evidenceKinds};
}
export async function recordCsvAttestations(db:D1Database,plan:ImportPlan,operator:{id:string;role:string},request:Request,local:boolean){
  const records:PlannedAttestation[]=[],covered:Record<string,number>={};
  for(const entry of plan.entries){const row=entry.source.payload as unknown as NormalizedImportRow;if(row.sourceAttestation)records.push(row.sourceAttestation);if(row.incumbent&&entry.effects.length&&!entry.rejection)covered[row.incumbent.id]=(covered[row.incumbent.id]??0)+1;}
  const statements=attestationStatements(db,records,'csv:'+plan.fingerprint,operator,request,local,covered,Date.now());
  if(statements.length)await db.batch(statements);
}
export function csvReconciliation(plan:ImportPlan){
  const summary=csvReview(plan),counts=csvCounts(plan),cell=(value:unknown)=>String(value??'').replaceAll('|','\\|').replace(/[\r\n]+/g,' ');
  const extras=extrasOf(plan);
  return ['# Import reconciliation','','No campaign or flow was scheduled or activated.','', '## Reviewed totals','','| Input | Created | Updated | Rejected | Other |','| ---: | ---: | ---: | ---: | ---: |',`| ${counts.input} | ${counts.created} | ${counts.updated} | ${counts.rejected} | ${counts.input-counts.created-counts.updated-counts.rejected} |`,'','## Consent evidence','','| Kind | Rows |','| --- | ---: |',...Object.entries(summary.evidenceKinds).map(([kind,total])=>`| ${cell(kind)} | ${total} |`),'','## Source attestations','',...summary.attestationSources.map(s=>`${s.sourceName}: ${s.accepted?'affirmed':s.reason??'not affirmed'}`),'','## Source outlines and review snapshots','',...(extras?.notes??[]),...(extras?.segments.map(s=>`${s.name}: ${s.conditions}`)??[]),'','## Templates','',...(extras?.templates.map(t=>`${t.name}: imported through the restricted template-library conversion; unsafe markup is removed and unsupported merge tags remain held for review.`)??[]),'','## Row outcomes','','| File | Row | Status | Reason |','| --- | ---: | --- | --- |',...plan.entries.map(entry=>{const row=entry.source.payload as unknown as NormalizedImportRow;return `| ${cell(row.file)} | ${row.row} | ${cell(row.status)} | ${cell(entry.rejection??row.reason??row.warnings.join('; '))} |`;})].join('\n')+'\n';
}
