import {flattenPredicates,type InclusionRule,type ExclusionRule} from '@/core/features/lifecycle/rules';
import type {PropertyDefinition} from './types';
import {validPropertyPredicate} from './comparison';
export function propertyRuleIssue(definitions:PropertyDefinition[],inclusion:InclusionRule,exclusions:ExclusionRule[]) {
  for(const predicate of [...flattenPredicates(inclusion),...exclusions.map(r=>r.predicate)])if(predicate.sourceType==='contact'&&predicate.field==='property'){
    const definition=definitions.find(d=>d.key===predicate.property);
    if(definition&&!validPropertyPredicate(definition,predicate))return {error:'property_rule_invalid',property:definition.key};
    if(!definition&&['on','before','after','within_last','not_within_last'].includes(predicate.comparator))return {error:'property_definition_required',property:predicate.property!};
  }
}
