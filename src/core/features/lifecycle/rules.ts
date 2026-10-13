import { z } from 'zod';

const comparator = z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in']);
const sourceType = z.enum(['contact', 'customer', 'product', 'variant', 'inventory', 'order', 'refund', 'cart', 'browsing']);

const predicate = z.object({
  sourceType,
  field: z.string().min(1).max(160),
  comparator,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string().min(1)).min(1)]),
  lookbackDays: z.number().int().min(0).max(3_650).optional(),
}).superRefine((value, context) => {
  if (value.sourceType === 'contact' && (!['id', 'email', 'displayName', 'emailStatus', 'smsStatus'].includes(value.field) || value.lookbackDays !== undefined)) {
    context.addIssue({ code: 'custom', message: 'Contact rules require a recorded contact field and cannot use a commerce lookback.' });
  }
});

export const audiencePredicateSchema = predicate;

export const inclusionRuleSchema = z.object({
  version: z.literal(1),
  operator: z.enum(['all', 'any']),
  predicates: z.array(predicate).min(1).max(50),
});

export const exclusionRuleSchema = z.object({
  version: z.literal(1),
  reason: z.string().min(1).max(160),
  predicate,
});

export type InclusionRule = z.infer<typeof inclusionRuleSchema>;
export type ExclusionRule = z.infer<typeof exclusionRuleSchema>;

/** Empty editor inputs cannot become recipient-selection authority. Equality may
 * deliberately match an empty string; contains and membership need values. */
export function incompleteCondition(predicate: InclusionRule['predicates'][number]) {
  return predicate.comparator === 'contains'
    ? typeof predicate.value !== 'string' || !predicate.value.trim()
    : predicate.comparator === 'in'
      ? !Array.isArray(predicate.value) || !predicate.value.length || predicate.value.some(value => !value.trim())
      : false;
}

export const completeInclusionRuleSchema = inclusionRuleSchema.refine(
  rule => !rule.predicates.some(incompleteCondition), 'Complete every audience condition.',
);
export const completeExclusionRuleSchema = exclusionRuleSchema.refine(
  rule => !incompleteCondition(rule.predicate), 'Complete every audience exclusion.',
);

export function productIdFromRules(inclusion: InclusionRule, exclusions: ExclusionRule[]) {
  const values = [...inclusion.predicates, ...exclusions.map((item) => item.predicate)]
    .filter((item) => item.comparator === 'eq' && /(^|\.)productId$/i.test(item.field) && typeof item.value === 'string')
    .map((item) => item.value as string);
  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] : undefined;
}

export function parseStructuredRules(inclusionJson: string, exclusionJson: string) {
  if (!inclusionJson.trim()) {
    return { ok: false as const, detail: 'A structured inclusion rule is required; audience prose is display-only.' };
  }
  try {
    const inclusion = completeInclusionRuleSchema.parse(JSON.parse(inclusionJson));
    const rawExclusions: unknown = JSON.parse(exclusionJson);
    const exclusions = z.array(completeExclusionRuleSchema).max(50).parse(rawExclusions);
    return {
      ok: true as const,
      inclusion,
      exclusions,
      sourceTypes: [...new Set([
        ...inclusion.predicates.map((item) => item.sourceType),
        ...exclusions.map((item) => item.predicate.sourceType),
      ].filter(type => type !== 'contact'))],
    };
  } catch (error) {
    return {
      ok: false as const,
      detail: error instanceof Error ? error.message : 'Audience rules are invalid.',
    };
  }
}
