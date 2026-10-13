import { z } from 'zod';
import { audiencePredicateSchema, inclusionRuleSchema, exclusionRuleSchema } from '@/core/features/lifecycle/rules';

export { incompleteCondition } from '@/core/features/lifecycle/rules';
// An editor must retain the empty input while the API treats it as incomplete.
const editablePredicate=audiencePredicateSchema.safeExtend({value:z.union([z.string(),z.number(),z.boolean(),z.array(z.string())])});
const editableInclusion=inclusionRuleSchema.extend({predicates:z.array(editablePredicate).min(1).max(50)});
const editableExclusion=exclusionRuleSchema.extend({predicate:editablePredicate});
export function parseEditableRules(inclusion:string,exclusions:string) {
  try{return {ok:true as const,inclusion:editableInclusion.parse(JSON.parse(inclusion)),exclusions:z.array(editableExclusion).max(50).parse(JSON.parse(exclusions))};}
  catch{return {ok:false as const};}
}
