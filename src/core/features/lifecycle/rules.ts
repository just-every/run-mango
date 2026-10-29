import { z } from 'zod';

const comparator = z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'on', 'before', 'after', 'within_last', 'not_within_last']);
const sourceType = z.enum(['campaign', 'contact', 'customer', 'product', 'variant', 'inventory', 'order', 'refund', 'cart', 'browsing']);
const ruleValue = z.union([z.string(), z.number(), z.boolean(), z.array(z.string().min(1)).min(1)]);
export const eventFilterSchema = z.object({field:z.string().min(1).max(160),comparator,value:ruleValue});
export const contactRuleFields = ['id','email','displayName','emailStatus','smsStatus','property','tags','usState','zip','distanceMiles','consent','topic','clicked','paidMember',
  'rfmStage','rfmRecencyDays','rfmRecencyScore','rfmFrequency','rfmFrequencyScore','rfmMonetaryScore','rfmMonetaryMinor'] as const;
const predicate = z.object({
  sourceType,
  field: z.string().min(1).max(160),
  comparator,
  value: ruleValue,
  lookbackDays: z.number().int().min(0).max(3_650).optional(),
  filters:z.array(eventFilterSchema).max(20).optional(),
  property:z.string().trim().min(1).max(160).optional(),
  channel:z.enum(['email','sms']).optional(),
  topicId:z.string().trim().min(1).max(160).optional(),
  originZip:z.string().regex(/^\d{5}$/).optional(),
  currency:z.string().regex(/^[A-Z]{3}$/).optional(),
}).superRefine((value, context) => {
  const issue=(message:string)=>context.addIssue({code:'custom',message});
  if(['on','before','after','within_last','not_within_last'].includes(value.comparator)&&!(value.sourceType==='contact'&&value.field==='property'))issue('Date comparisons require a defined contact property.');
  if(value.sourceType==='campaign'&&(value.field!=='followup'||value.comparator!=='eq'||typeof value.value!=='string'||!value.value.trim()||value.value.length>160||value.lookbackDays!==undefined))issue('Use a valid saved follow-up audience.');
  if (value.sourceType === 'contact') {
    if (!(contactRuleFields as readonly string[]).includes(value.field) || (value.lookbackDays !== undefined && value.field!=='clicked')) issue('Use a recorded contact field; only clicks have a contact time window.');
    if(value.field==='property'&&!value.property)issue('Choose a property key.');
    if(['consent','topic','clicked','paidMember'].includes(value.field)&&(!value.channel||typeof value.value!=='boolean'||!['eq','neq'].includes(value.comparator)))issue('Choose a channel and a boolean comparison.');
    if(value.field==='topic'&&!value.topicId)issue('Choose a consent topic.');
    if(value.field==='clicked'&&value.lookbackDays===undefined)issue('Choose a click time window.');
    if(value.field==='distanceMiles'&&(!value.originZip||typeof value.value!=='number'||value.value<0||!['gt','gte','lt','lte','eq','neq'].includes(value.comparator)))issue('Choose an origin ZIP and a distance in miles.');
  }
  if(value.filters!==undefined&&value.sourceType!=='order')issue('Event property filters require an order condition.');
  if(value.sourceType==='order'&&value.field==='count'&&(typeof value.value!=='number'||!Number.isInteger(value.value)||value.value<0||['contains','in'].includes(value.comparator)))issue('Order count requires a non-negative whole number.');
});
export const audiencePredicateSchema = predicate;
export type AudiencePredicate = z.infer<typeof predicate>;
export type InclusionGroup = {operator:'all'|'any';predicates:AudiencePredicate[];groups?:InclusionGroup[]};
const groupShape = {operator:z.enum(['all','any']),predicates:z.array(predicate).max(50)};
export const inclusionGroupSchema: z.ZodType<InclusionGroup> = z.lazy(()=>z.object({...groupShape,groups:z.array(inclusionGroupSchema).max(50).optional()}));

export function flattenPredicates(group:InclusionGroup):AudiencePredicate[] {
  return [...group.predicates,...(group.groups??[]).flatMap(flattenPredicates)];
}
function validGroup(group:InclusionGroup,depth=0):boolean {
  return depth<=5 && group.predicates.length+(group.groups?.length??0)>0 && (group.groups??[]).every(child=>validGroup(child,depth+1));
}
export const inclusionRuleSchema = z.object({version:z.literal(1),...groupShape,groups:z.array(inclusionGroupSchema).max(50).optional()});
export const exclusionRuleSchema = z.object({version:z.literal(1),reason:z.string().min(1).max(160),predicate});
export type InclusionRule = z.infer<typeof inclusionRuleSchema>;
export type ExclusionRule = z.infer<typeof exclusionRuleSchema>;

/** Empty editor inputs cannot become recipient-selection authority. */
export function incompleteCondition(predicate: Pick<AudiencePredicate,'comparator'|'value'>) {
  return predicate.comparator === 'contains'
    ? typeof predicate.value !== 'string' || !predicate.value.trim()
    : predicate.comparator === 'in'
      ? !Array.isArray(predicate.value) || !predicate.value.length || predicate.value.some(value => !value.trim())
      : false;
}
export const completeInclusionRuleSchema = inclusionRuleSchema.refine(
  rule => validGroup(rule)&&flattenPredicates(rule).length<=50&&!flattenPredicates(rule).some(p=>incompleteCondition(p)||p.filters?.some(incompleteCondition)), 'Complete every audience group and condition (maximum 50 conditions and five nested levels).',
);
export const completeExclusionRuleSchema = exclusionRuleSchema.refine(
  rule => !incompleteCondition(rule.predicate)&&!rule.predicate.filters?.some(incompleteCondition), 'Complete every audience exclusion.',
);
export function productIdsFromRules(inclusion: InclusionRule, exclusions: ExclusionRule[]) {
  return [...new Set([...flattenPredicates(inclusion), ...exclusions.map(item => item.predicate)]
    .filter(item => /(^|\.)productId$/i.test(item.field))
    .flatMap(item => item.comparator === 'eq' && typeof item.value === 'string' ? [item.value]
      : item.comparator === 'in' && Array.isArray(item.value) ? item.value : []))];
}
/** Kept only for callers that explicitly require a single product. */
export function productIdFromRules(inclusion: InclusionRule, exclusions: ExclusionRule[]) {
  const products = productIdsFromRules(inclusion, exclusions);
  return products.length === 1 ? products[0] : undefined;
}
export function predicateSourceTypes(item:AudiencePredicate):string[] {
  if(item.sourceType==='campaign')return [];
  if(item.sourceType==='contact')return ['usState','zip','distanceMiles'].includes(item.field)?['customer']:item.field.startsWith('rfm')?['order','refund']:[];
  return item.field==='boughtCollectionId'||item.field==='boughtCategory'?['order','product']:[item.sourceType];
}
export function parseStructuredRules(inclusionJson: string, exclusionJson: string) {
  if (!inclusionJson.trim()) return {ok:false as const,detail:'A structured inclusion rule is required; audience prose is display-only.'};
  try {
    const inclusion = completeInclusionRuleSchema.parse(JSON.parse(inclusionJson));
    const exclusions = z.array(completeExclusionRuleSchema).max(50).parse(JSON.parse(exclusionJson));
    return {ok:true as const,inclusion,exclusions,sourceTypes:[...new Set([...flattenPredicates(inclusion),...exclusions.map(item=>item.predicate)].flatMap(predicateSourceTypes))]};
  } catch (error) { return {ok:false as const,detail:error instanceof Error?error.message:'Audience rules are invalid.'}; }
}
