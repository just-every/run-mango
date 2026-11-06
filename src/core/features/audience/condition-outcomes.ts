import type {Platform} from '@/core/shared/platform';
import {sha256} from '@/core/shared/ids';
import {createAudienceRepository} from './repository';
import {createStoreRepository} from '@/core/features/store/repository';
import {persistLinkHostSources} from '@/core/features/settings/link-hosts';
import {createStoreService} from '@/core/features/store/service';
import {createRuleMatcher} from './rule-matcher';
import {selectedChannel} from './eligibility';
import {propertyRuleIssue} from './properties/rule-validation';
import {segmentAvailability} from './segment-availability';
import {parseStructuredRules} from '@/core/features/lifecycle/rules';
import {conditionalBlocks,ConditionUnavailable,type ConditionOutcomes} from '@/core/features/campaigns/conditional-blocks';

/** BUILD-005: whether each condition in a saved body holds for one contact, read from current facts with the audience
 * editor's own matcher. A condition whose facts are unavailable (a deleted segment, an undefined property, a source
 * that is not fresh) is refused, never answered as "no". Membership here chooses content only; it grants no sending authority. */
export async function contentConditionOutcomes(platform:Platform,contactId:string,body:string,now=new Date()):Promise<ConditionOutcomes> {
  const blocks=conditionalBlocks(body),outcomes:ConditionOutcomes={};
  if(!blocks.length)return outcomes;
  const db=platform.database.$client,repository=createAudienceRepository(platform.database);
  const store=createStoreService(createStoreRepository(platform.database),()=>persistLinkHostSources(platform));
  const contact=await repository.getContact(contactId);
  if(!contact)throw new ConditionUnavailable('The contact does not exist.');
  const matcher=createRuleMatcher(repository,store,now,(id,channel)=>selectedChannel(repository,id,channel,now,
    async(c,destination)=>repository.hasDestinationSuppression(await sha256(`${platform.config.contactHashSalt}:${destination}`),c)));
  const definitions=await repository.segmentPropertyDefinitions();
  for(const {key,condition} of blocks) {
    if(condition.kind==='contact') {
      const predicate=condition.predicate;
      if(propertyRuleIssue(definitions,{version:1,operator:'all',predicates:[predicate]},[]))throw new ConditionUnavailable('A conditional block uses a property that is not defined.');
      outcomes[key]=await matcher.predicateMatches(contactId,predicate,contact);
      continue;
    }
    const saved=await db.prepare('SELECT inclusion_rule_json inclusion,exclusion_rules_json exclusions FROM audience_segments WHERE id=?').bind(condition.segmentId).first<{inclusion:string;exclusions:string}>();
    const rules=saved&&parseStructuredRules(saved.inclusion,saved.exclusions);
    if(!rules||!rules.ok||propertyRuleIssue(definitions,rules.inclusion,rules.exclusions)||(await segmentAvailability(repository,rules.inclusion,rules.exclusions)).length)throw new ConditionUnavailable('A conditional block uses a segment that is deleted or unavailable.');
    const freshness=await store.freshness(rules.sourceTypes.filter(type=>type!=='contact'&&type!=='campaign').map(type=>type==='browsing'?'browsing-event':type) as Parameters<typeof store.freshness>[0],now);
    if(freshness.length)throw new ConditionUnavailable('A conditional block uses a segment whose store data is not fresh.');
    outcomes[key]=await matcher.groupMatches(contactId,rules.inclusion,contact)&&!(await Promise.all(rules.exclusions.map(rule=>matcher.predicateMatches(contactId,rule.predicate,contact)))).some(Boolean);
  }
  return outcomes;
}
