import { parseStructuredRules, type InclusionRule } from '../lifecycle/rules';
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
  return `${audienceRuleFieldLabel(predicate)} ${comparison} ${value}${lookback}`;
}

/** Derived only from the structured rules, with no truncation or display-note fallback. */
export function summarizeAudienceRules(inclusionRuleJson: string, exclusionRulesJson: string): string {
  const rules = parseStructuredRules(inclusionRuleJson, exclusionRulesJson);
  if (!rules.ok) return 'Audience rules are invalid. Review the conditions before approval.';
  const inclusion = rules.inclusion.predicates.map(describeCondition).join('; ');
  const exclusions = rules.exclusions.map(rule => describeCondition(rule.predicate)).join('; ');
  return `Contacts matching ${rules.inclusion.operator === 'all' ? 'all' : 'any'} of these conditions: ${inclusion}.`
    + (exclusions ? ` Exclude contacts matching any of these conditions: ${exclusions}.` : ' No additional exclusions.');
}

/** Read projection also repairs the visible audience of immutable older revisions. */
export function withDerivedAudience<T extends { inclusionRuleJson: string; exclusionRulesJson: string }>(revision: T): T & { audienceRule: string } {
  return { ...revision, audienceRule: summarizeAudienceRules(revision.inclusionRuleJson, revision.exclusionRulesJson) };
}
