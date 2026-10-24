import type {FrozenCandidate} from '@/core/features/lifecycle/types';
/** Count eligible contacts whose covering channel scope needs incumbent evidence.
 * Confirmed native evidence for that same scope does not rely on an attestation. */
export async function incumbentReliance(db:D1Database,candidates:FrozenCandidate[],now:Date) {
  if(!candidates.length)return 0;
  const {results}=await db.prepare(`SELECT e.*,CASE WHEN a.id IS NOT NULL AND a.revoked_at IS NULL AND l.evidence_at<=? THEN 1 ELSE 0 END AS incumbent_active
    FROM consent_evidence e LEFT JOIN incumbent_consent_links l ON l.id=e.id LEFT JOIN consent_attestations a ON a.id=l.attestation_id
    WHERE e.contact_id IN (SELECT value FROM json_each(?)) AND e.occurred_at<=?`).bind(now.getTime(),JSON.stringify(candidates.map(c=>c.contactId)),now.getTime()).all<Record<string,unknown>>();
  const byContact=new Map<string,Record<string,unknown>[]>();
  for(const row of results){const id=String(row.contact_id);if(!byContact.has(id))byContact.set(id,[]);byContact.get(id)!.push(row);}
  return candidates.filter(candidate=>Object.entries(candidate.channels).some(([channel,value])=>value?.consents.some(scope=>{
    const covering=(byContact.get(candidate.contactId)??[]).filter(row=>row.channel===channel&&row.destination===value.destination&&row.brand_or_legal_sender===scope.brandOrLegalSender&&row.message_category===scope.category&&row.destination_jurisdiction===scope.jurisdiction&&(!scope.frequencyDisclosure||row.frequency_disclosure===scope.frequencyDisclosure)&&(!scope.smsProgramme||row.sms_program===scope.smsProgramme));
    return covering.some(row=>row.incumbent_active===1)&&!covering.some(row=>typeof row.confirmed_at==='number'&&row.confirmed_at<=now.getTime());
  }))).length;
}
