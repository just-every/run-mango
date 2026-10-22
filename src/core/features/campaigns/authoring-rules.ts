import { z } from 'zod';
import { audiencePredicateSchema, inclusionRuleSchema, exclusionRuleSchema, type InclusionGroup } from '@/core/features/lifecycle/rules';
export { incompleteCondition } from '@/core/features/lifecycle/rules';
// Editing keeps incomplete inputs; complete schemas alone grant selection authority.
const editableValue=z.union([z.string(),z.number(),z.boolean(),z.array(z.string())]);
const editablePredicate=z.object({...audiencePredicateSchema.shape,value:editableValue,
  property:z.string().optional(),topicId:z.string().optional(),originZip:z.string().optional(),currency:z.string().optional(),
  filters:z.array(z.object({field:z.string(),comparator:audiencePredicateSchema.shape.comparator,value:editableValue})).optional(),
});
const editableGroup:z.ZodType<InclusionGroup>=z.lazy(()=>z.object({operator:z.enum(['all','any']),predicates:z.array(editablePredicate).max(50),groups:z.array(editableGroup).max(50).optional()}));
const editableInclusion=inclusionRuleSchema.extend({predicates:z.array(editablePredicate).max(50),groups:z.array(editableGroup).max(50).optional()});
const editableExclusion=exclusionRuleSchema.extend({predicate:editablePredicate});
export function parseEditableRules(inclusion:string,exclusions:string) {
  try{return {ok:true as const,inclusion:editableInclusion.parse(JSON.parse(inclusion)),exclusions:z.array(editableExclusion).max(50).parse(JSON.parse(exclusions))};}
  catch{return {ok:false as const};}
}
