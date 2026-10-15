import { evidenceClaim, type ProposalEvidence } from '@/core/features/proposals/generation';
import type { ProposalForecast } from '@/core/features/proposals/forecast';
import { stableJson } from '@/core/shared/ids';
import { z } from 'zod';
import { exclusionRuleSchema } from '@/core/features/lifecycle/rules';

export const unavailableProposalClaims = 'Generated explanation unavailable: the saved claims cannot be verified against this proposal’s recorded observations. Generate a new proposal or author a draft manually.';
export const unavailableTimingClaim = 'Generated timing explanation unavailable: it cannot be verified against the proposal’s recorded observations. Enter your own timing reason before saving this draft.';
export const unavailableExclusionClaim = 'Generated exclusion explanation unavailable.';

function exclusionRules(json:string) {
  try {
    const value=JSON.parse(json);
    z.array(exclusionRuleSchema).parse(value);
    return value as z.infer<typeof exclusionRuleSchema>[];
  } catch { return undefined; }
}

/** Labels are explanatory prose; predicates remain the exact audience authority. */
export function projectExclusionClaims(json:string,evidence:ProposalEvidence[],authoredReasons:string[] = []) {
  const rules=exclusionRules(json);
  if(!rules)return json;
  if(rules.every(rule=>authoredReasons.includes(rule.reason)||rule.reason==='Matches an exclusion condition'||persistedClaimIsGrounded(rule.reason,evidence)))return json;
  return JSON.stringify(rules.map(rule=>({...rule,reason:authoredReasons.includes(rule.reason)
    || rule.reason==='Matches an exclusion condition' || persistedClaimIsGrounded(rule.reason,evidence)
    ? rule.reason:unavailableExclusionClaim})));
}

/** A full UI save may echo a withheld label. Keep its original record, not the
 * availability message, and never treat that echo as newly authored prose. */
export function restoreExclusionClaims(nextJson:string,storedJson:string) {
  const next=exclusionRules(nextJson),stored=exclusionRules(storedJson);
  if(!next||!stored)return nextJson;
  return JSON.stringify(next.map(rule=>{
    const original=stored.find(previous=>stableJson(previous.predicate)===stableJson(rule.predicate));
    return rule.reason===unavailableExclusionClaim&&original?{...rule,reason:original.reason}:rule;
  }));
}

export function authoredExclusionReasons(nextJson:string,storedJson:string,previous:string[]) {
  const stored=new Set(exclusionRules(storedJson)?.map(rule=>rule.reason));
  return [...new Set(exclusionRules(nextJson)?.map(rule=>rule.reason).filter(reason=>
    reason!==unavailableExclusionClaim&&(previous.includes(reason)||!stored.has(reason))))];
}

/** Older rows stored prose without citations. Accept only exact canonical observations,
 * including their original values; never infer meaning or rewrite unsupported prose. */
export function persistedClaimIsGrounded(text: unknown, evidence: ProposalEvidence[]): text is string {
  if (typeof text !== 'string' || !text || text.length > 4000 || new Set(evidence.map(item=>item.key)).size !== evidence.length) return false;
  const observations = evidence.map(evidenceClaim);
  const reachable = new Set([0]);
  for (const offset of reachable) {
    for (const observation of observations) {
      if (!text.startsWith(observation, offset)) continue;
      const end = offset + observation.length;
      if (end === text.length) return true;
      if (text[end] === ' ') reachable.add(end + 1);
    }
  }
  return false;
}

export function persistedProposalClaims(proposal: {summary:string;decisionContextJson:string;exclusionRulesJson:string}, stepCount:number, evidence:ProposalEvidence[]) {
  try {
    const context = JSON.parse(proposal.decisionContextJson);
    if (!persistedClaimIsGrounded(proposal.summary,evidence)
      || projectExclusionClaims(proposal.exclusionRulesJson,evidence)!==proposal.exclusionRulesJson
      || !persistedClaimIsGrounded(context?.explanation,evidence)
      || !Array.isArray(context?.timing) || context.timing.length !== stepCount || stepCount === 0
      || !context.timing.every((text:unknown)=>persistedClaimIsGrounded(text,evidence))) return undefined;
    return context as {explanation:string;timing:string[];forecast?:ProposalForecast};
  } catch { return undefined; }
}
