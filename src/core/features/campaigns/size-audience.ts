import type {Database} from '@/core/platform/db/client';
import {createAudienceRepository} from '@/core/features/audience/repository';
import {createRuleMatcher} from '@/core/features/audience/rule-matcher';
import {selectedChannel} from '@/core/features/audience/eligibility';
import {createStoreRepository} from '@/core/features/store/repository';
import {flattenPredicates,parseStructuredRules} from '@/core/features/lifecycle/rules';

export type SizeAudience = {inclusionRuleJson?:string;exclusionRulesJson?:string};
/** Bound all selected members, including temporarily ineligible ones. A later
 * consent/frequency change cannot silently enlarge this saved selection bound.
 * Use the same rule evaluator as review, including segment and follow-up facts. */
export async function sizeAudience(database:Database,revision:SizeAudience){
  if(!revision.inclusionRuleJson?.trim())return undefined;
  const rules=parseStructuredRules(revision.inclusionRuleJson,revision.exclusionRulesJson??'[]');
  // An unfinished/unavailable selection must keep the deployment-wide bound.
  if(!rules.ok)return undefined;
  const repository=createAudienceRepository(database),store=createStoreRepository(database),now=new Date();
  // New follow-up cohorts are inserted beside the draft, after its size check.
  // Until that authority exists, an empty match is not a known empty audience.
  for(const predicate of [...flattenPredicates(rules.inclusion),...rules.exclusions.map(rule=>rule.predicate)]){
    if(predicate.sourceType==='campaign'&&!await repository.followupExists(String(predicate.value)))return undefined;
  }
  const matcher=createRuleMatcher(repository,{sourceRecords:store.listSourceRecords,sourceActivities:store.listSourceActivities},now,
    (id,channel)=>selectedChannel(repository,id,channel,now,async()=>false));
  const members:string[]=[];
  for(const contact of await repository.listContacts()){
    if(!await matcher.groupMatches(contact.id,rules.inclusion,contact))continue;
    let excluded=false;
    for(const rule of rules.exclusions)if(await matcher.predicateMatches(contact.id,rule.predicate,contact)){excluded=true;break;}
    if(!excluded)members.push(contact.id);
  }
  return members;
}
