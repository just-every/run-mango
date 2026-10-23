import {canonicalJson} from '@/vendor/base/import-kit/src/d1/index';
import {sha256} from '@/core/shared/ids';
import {activityStatement} from '@/core/features/auth/activity-record';
import {attestationKeys,attestationVersion,attestationWording,sourceOf,type AttestationInput,type AttestationScope,type IncumbentFile} from './incumbent-policy';

export async function planAttestations(files:{name:string}[],archiveSha:string,scope:AttestationScope,input:AttestationInput[],db:D1Database) {
  const sources=new Map<string,{sourceKey:string;sourceName:string}>();for(const file of files){const source=sourceOf(file.name);sources.set(source.key,{sourceKey:source.key,sourceName:source.name});}
  const records=[];
  for(const source of sources.values()) {
    const choice=input.find(row=>row.sourceKey===source.sourceKey),wording=attestationWording(scope),wordingJson=canonicalJson({version:attestationVersion,statements:wording});
    const id=choice?await sha256(archiveSha+'\n'+source.sourceKey+'\n'+choice.nonce):'';
    const existing=id?await db.prepare('SELECT revoked_at,wording_hash,answers_json,source_created_at FROM consent_attestations WHERE id=?').bind(id).first<{revoked_at:number|null;wording_hash:string;answers_json:string;source_created_at:number|null}>():null;
    const scopeComplete=[scope.brandOrLegalSender,scope.messageCategory,scope.frequencyDisclosure,scope.destinationJurisdiction].every(Boolean);
    const mismatch=Boolean(existing&&choice&&(existing.wording_hash!==await sha256(wordingJson)||existing.answers_json!==canonicalJson(choice.answers)||existing.source_created_at!==(choice.exportCreatedAt?Date.parse(choice.exportCreatedAt):null)));
    const accepted=Boolean(!mismatch&&choice&&scopeComplete&&choice.typedSource===source.sourceName&&attestationKeys.every(key=>choice.answers[key]==='yes')&&!existing?.revoked_at);
    const reason=mismatch?'attestation-record-changed':existing?.revoked_at?'attestation-revoked':choice?.answers&&attestationKeys.some(key=>choice.answers[key]==='not-sure')?'attestation-not-sure':!choice?'attestation-missing':!scopeComplete?'attestation-scope-missing':choice.typedSource!==source.sourceName?'attestation-source-name-mismatch':'attestation-not-affirmed';
    records.push({...source,id,sourceIdentifier:archiveSha,accepted,reason:accepted?undefined:reason,exportCreatedAt:choice?.exportCreatedAt?Date.parse(choice.exportCreatedAt):undefined,
      wordingVersion:attestationVersion,wordingJson,wordingHash:await sha256(wordingJson),answers:choice?.answers??null,scope});
  }
  return records;
}
export type PlannedAttestation=Awaited<ReturnType<typeof planAttestations>>[number];
export function incumbentFiles(files:{name:string}[],records:readonly PlannedAttestation[]):Record<string,IncumbentFile> {
  return Object.fromEntries(files.map(file=>{const source=sourceOf(file.name),record=records.find(row=>row.sourceKey===source.key)!;return [file.name,{id:record.id,sourceIdentifier:record.sourceIdentifier,sourceKey:record.sourceKey,sourceName:record.sourceName,accepted:record.accepted,...(record.reason?{reason:record.reason}:{}),...(record.exportCreatedAt!==undefined?{exportCreatedAt:record.exportCreatedAt}:{})}];}));
}
export function attestationStatements(db:D1Database,records:PlannedAttestation[],archiveId:string,operator:{id:string;role:string},request:Request,local:boolean,covered:Record<string,number>,now:number) {
  return records.filter(record=>record.id).flatMap(record=>[
    db.prepare(`INSERT INTO consent_attestations(id,archive_id,source_identifier,source_key,source_name,source_created_at,operator_id,operator_role,session_ip,user_agent,wording_version,wording_json,wording_hash,answers_json,scope_json,covered_rows,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`).bind(record.id,archiveId,record.sourceIdentifier,record.sourceKey,record.sourceName,record.exportCreatedAt??null,operator.id,operator.role,
        local?new URL(request.url).hostname:request.headers.get('CF-Connecting-IP')??'',(request.headers.get('User-Agent')??'').slice(0,2000),record.wordingVersion,record.wordingJson,record.wordingHash,canonicalJson(record.answers),canonicalJson(record.scope),covered[record.id]??0,now),
    activityStatement(db,{key:'incumbent-attestation:'+record.id,action:'incumbent-consent-attested',entityType:'consent-attestation',entityId:record.id,actorId:operator.id,
      detail:{source:record.sourceName,sourceIdentifier:record.sourceIdentifier,accepted:record.accepted,rowsCovered:covered[record.id]??0,wordingVersion:record.wordingVersion},at:now}),
  ]);
}
export async function revokeAttestation(db:D1Database,id:string,operatorId:string,now=Date.now()) {
  const withoutOther=`NOT EXISTS(SELECT 1 FROM consent_evidence e LEFT JOIN incumbent_consent_links l ON l.id=e.id LEFT JOIN consent_attestations a ON a.id=l.attestation_id
    WHERE e.contact_id=c.id AND e.channel='email' AND e.destination=c.email AND (e.confirmed_at IS NOT NULL OR (l.attestation_id<>? AND a.revoked_at IS NULL)))`;
  const affected=`SELECT c.id FROM contacts c WHERE c.email_status='subscribed' AND EXISTS(SELECT 1 FROM incumbent_consent_links l WHERE l.contact_id=c.id AND l.attestation_id=?) AND ${withoutOther}`;
  const result=await db.batch([
    db.prepare('UPDATE consent_attestations SET revoked_at=?,revoked_by=?,retain_until=? WHERE id=? AND revoked_at IS NULL').bind(now,operatorId,now+5*365.25*86400000,id),
    db.prepare(`UPDATE contact_email_addresses SET channel_status='non-subscribed',channel_status_at=?,updated_at=? WHERE channel_status='subscribed' AND contact_id IN (${affected})`).bind(now,now,id,id),
    db.prepare(`UPDATE contacts SET email_status='non-subscribed',email_status_at=?,updated_at=? WHERE id IN (${affected})`).bind(now,now,id,id),
    activityStatement(db,{key:crypto.randomUUID(),action:'incumbent-consent-revoked',entityType:'consent-attestation',entityId:id,actorId:operatorId,at:now}),
  ]);
  return Boolean(result[0].meta.changes);
}

export async function expireAttestations(db:D1Database,now:number) {
  await db.prepare('DELETE FROM consent_attestations WHERE revoked_at IS NOT NULL AND retain_until<=? AND NOT EXISTS(SELECT 1 FROM incumbent_consent_links l WHERE l.attestation_id=consent_attestations.id)').bind(now).run();
}
