import { parseStructuredRules, type InclusionGroup, type InclusionRule } from '../lifecycle/rules';
import { audienceRuleComparisons, audienceRuleFieldLabel } from './audience-rule-labels';

type Predicate = InclusionRule['predicates'][number];

function describeCondition(predicate: Predicate): string {
  if(predicate.sourceType==='campaign')return 'Non-engaged recipients from the linked campaign at its saved cutoff';
  const comparison = audienceRuleComparisons.find(([value]) => value === predicate.comparator)![1];
  // Presentation quotes preserve the exact string contents, including whitespace.
  // Return text, not HTML; consumers must render this as a text node.
  const value = Array.isArray(predicate.value)
    ? `[${predicate.value.map(item => `"${item}"`).join(', ')}]`
    : typeof predicate.value === 'string' ? `"${predicate.value}"` : String(predicate.value);
  const lookback = predicate.lookbackDays === undefined ? ''
    : ` in the last ${predicate.lookbackDays} ${predicate.lookbackDays === 1 ? 'day' : 'days'}`;
  const scope=[predicate.property?`property "${predicate.property}"`:undefined,predicate.channel?`${predicate.channel.toUpperCase()} channel`:undefined,
    predicate.topicId?`topic "${predicate.topicId}"`:undefined,predicate.originZip?`origin ZIP ${predicate.originZip}`:undefined,
    predicate.field.startsWith('rfmMonetary')?`currency ${predicate.currency??'USD'}`:undefined].filter(Boolean);
  const filterLabels:Record<string,string>={'value':'Order value','total':'Order value','total.shop.amount':'Order value','total.shop.currency':'Order currency','total.presentment.amount':'Presented order value','total.presentment.currency':'Presented order currency','financialStatus':'Order financial status','customer.location.provinceCode':'Order customer state'};
  const filters=predicate.filters?.map(filter=>`${filterLabels[filter.field]??filter.field} ${audienceRuleComparisons.find(([key])=>key===filter.comparator)![1]} ${JSON.stringify(filter.value)}`).join(' and ');
  return `${audienceRuleFieldLabel(predicate)}${scope.length?` (${scope.join(', ')})`:''} ${comparison} ${value}${lookback}${filters?` where ${filters} on the same event`:''}`;
}

function describeGroup(group:InclusionGroup):string {
  return [...group.predicates.map(describeCondition),...(group.groups??[]).map(child=>`(${child.operator==='all'?'all':'any'} of: ${describeGroup(child)})`)].join('; ');
}

/** Derived only from the structured rules, with no truncation or display-note fallback. */
export function summarizeAudienceRules(inclusionRuleJson: string, exclusionRulesJson: string): string {
  const rules = parseStructuredRules(inclusionRuleJson, exclusionRulesJson);
  if (!rules.ok) return 'Audience rules are invalid. Review the conditions before approval.';
  const inclusion = describeGroup(rules.inclusion);
  const exclusions = rules.exclusions.map(rule => describeCondition(rule.predicate)).join('; ');
  return `Contacts matching ${rules.inclusion.operator === 'all' ? 'all' : 'any'} of these conditions: ${inclusion}.`
    + (exclusions ? ` Exclude contacts matching any of these conditions: ${exclusions}.` : ' No additional exclusions.');
}

/** Read projection also repairs the visible audience of immutable older revisions. */
export function withDerivedAudience<T extends { inclusionRuleJson: string; exclusionRulesJson: string }>(revision: T): T & { audienceRule: string } {
  return { ...revision, audienceRule: summarizeAudienceRules(revision.inclusionRuleJson, revision.exclusionRulesJson) };
}
