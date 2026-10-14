import type { Database } from '@/core/platform/db/client';
import { projectExclusionClaims } from './persisted-proposal-claims';

/** Display projection only. Approval digests and stored audience authority stay raw. */
export async function campaignClaimProjection(database:Database,revisionId:string) {
  const row=await database.$client.prepare(`SELECT c.proposal_id,r.exclusion_rules_json,r.authored_exclusion_reasons_json
    FROM campaign_revisions r JOIN campaigns c ON c.id=r.campaign_id WHERE r.id=?`).bind(revisionId)
    .first<{proposal_id:string|null;exclusion_rules_json:string;authored_exclusion_reasons_json:string}>();
  if(!row?.proposal_id)return undefined;
  const result=await database.$client.prepare(`SELECT claim_key,source_record_id,source_type,observed_value_json,occurred_at
    FROM proposal_evidence_items WHERE proposal_id=?`).bind(row.proposal_id)
    .all<{claim_key:string;source_record_id:string;source_type:string;observed_value_json:string;occurred_at:number}>();
  const evidence=result.results.map(item=>({key:item.claim_key,sourceRecordId:item.source_record_id,sourceType:item.source_type,
    observedValue:JSON.parse(item.observed_value_json),occurredAt:new Date(item.occurred_at)}));
  const exclusionRulesJson=projectExclusionClaims(row.exclusion_rules_json,evidence,JSON.parse(row.authored_exclusion_reasons_json));
  const labels=new Map<string,string>();
  try {
    const original=JSON.parse(row.exclusion_rules_json),projected=JSON.parse(exclusionRulesJson);
    original.forEach((rule:{reason:string},index:number)=>labels.set(rule.reason,projected[index].reason));
  } catch { /* Invalid rules already have an explicit unavailable state. */ }
  const reason=(value:string)=>labels.get(value)??value;
  const exclusionsJson=(json:string)=>{
    try {
      const value=JSON.parse(json);
      if(Array.isArray(value))return JSON.stringify(value.map(item=>({...item,reason:reason(item.reason)})));
      const counts:Record<string,number>={};
      for(const [label,count] of Object.entries(value))counts[reason(label)]=(counts[reason(label)]??0)+Number(count);
      return JSON.stringify(counts);
    } catch {return '"Exclusion explanations unavailable."';}
  };
  const check=<T extends {kind:string;detail:string}>(value:T):T=>value.kind==='audience.exclusions'
    ? {...value,detail:exclusionsJson(value.detail)}:value;
  return {evidence,exclusionRulesJson,reason,exclusionsJson,check};
}
