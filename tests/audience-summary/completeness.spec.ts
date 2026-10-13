import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { generatedProposalSchema } from '../../src/core/features/proposals/generation';
import { parseStructuredRules } from '../../src/core/features/lifecycle/rules';
import { summarizeAudienceRules } from '../../src/core/features/campaigns/audience-summary';
import { campaignReviewSnapshot } from '../../src/core/features/campaigns/review-snapshot';
import { draftCompositionSchema } from '../../src/core/features/campaigns/draft-composition';
import { incompletePredicates, ruleJson, exclusionJson, generatedOutput } from './rule-fixtures';

contract('AUD-001][CAMP-002', 'generated proposals reject every incomplete inclusion and exclusion', () => {
  for (const predicate of incompletePredicates) {
    const output=generatedOutput();
    output.audience.inclusion=JSON.parse(ruleJson(predicate));
    expect(generatedProposalSchema.safeParse(output).success, JSON.stringify(predicate)).toBe(false);
    output.audience.inclusion=generatedOutput().audience.inclusion;
    output.audience.exclusions=JSON.parse(exclusionJson(predicate));
    expect(generatedProposalSchema.safeParse(output).success, JSON.stringify(predicate)).toBe(false);
  }
});

contract('AUD-001][CAMP-002', 'drafts retain incomplete content while rejecting incomplete audience predicates', () => {
  expect(draftCompositionSchema.safeParse({name:'',emailSubject:'',emailBody:'',emailText:'',senderName:'',fromEmail:'',replyToEmail:'',physicalAddress:''}).success).toBe(true);
  for (const predicate of incompletePredicates) {
    expect(draftCompositionSchema.safeParse({inclusionRuleJson:ruleJson(predicate)}).success).toBe(false);
    expect(draftCompositionSchema.safeParse({exclusionRulesJson:exclusionJson(predicate)}).success).toBe(false);
  }
  expect(generatedProposalSchema.safeParse(generatedOutput()).success).toBe(true);
});

contract('AUD-001][CAMP-002', 'all rule consumers reject incomplete conditions and retain exact valid values', () => {
  const complete=ruleJson({sourceType:'contact',field:'emailStatus',comparator:'eq',value:'subscribed'});
  const revision={name:'News',audienceRule:'Convincing prose',inclusionRuleJson:complete,exclusionRulesJson:'[]',emailSubject:'News',emailBody:'News',emailText:'News',smsBody:'',senderName:'Mango',fromEmail:'from@example.test',replyToEmail:'reply@example.test',smsSender:''};
  for (const predicate of incompletePredicates) for (const exclusion of [false,true]) {
    const inclusion=exclusion?complete:ruleJson(predicate), exclusions=exclusion?exclusionJson(predicate):'[]';
    expect(parseStructuredRules(inclusion,exclusions).ok).toBe(false);
    expect(summarizeAudienceRules(inclusion,exclusions)).toBe('Audience rules are invalid. Review the conditions before approval.');
    expect(campaignReviewSnapshot({...revision,inclusionRuleJson:inclusion,exclusionRulesJson:exclusions},[{channel:'email',whyThisTime:'Chosen time'}],{eligibleCount:1},[{channel:'email'}]).audienceState).toBe('needs_recomputation');
  }
  for (const value of ['', '  preserved  ', 'quote " slash \\ newline\n tab\t']) {
    const parsed=parseStructuredRules(ruleJson({sourceType:'contact',field:'displayName',comparator:'eq',value}),'[]');
    expect(parsed.ok).toBe(true);
    if(!parsed.ok)throw new Error(parsed.detail);
    expect(parsed.inclusion.predicates[0].value).toBe(value);
  }
});
