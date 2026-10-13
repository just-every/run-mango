import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { audienceRuleFields, audienceRuleFieldLabel } from '../../src/core/features/campaigns/audience-rule-labels';
import { summarizeAudienceRules, withDerivedAudience } from '../../src/core/features/campaigns/audience-summary';
import { campaignReviewSnapshot } from '../../src/core/features/campaigns/review-snapshot';
import type { InclusionRule } from '../../src/core/features/lifecycle/rules';

type Predicate = InclusionRule['predicates'][number];
const inclusion = (predicates: Predicate[], operator: 'all' | 'any' = 'all') => JSON.stringify({version:1, operator, predicates});
const predicate: Predicate = {sourceType:'contact', field:'emailStatus', comparator:'eq', value:'subscribed'};
const exclusions = (predicates: Predicate[]) => JSON.stringify(predicates.map((predicate,index) => ({version:1, reason:`excluded-${index}`, predicate})));

contract('AUD-001][CAMP-002', 'audience summary preserves comparison semantics, every field and literal values', () => {
  const comparisons = [['eq','is'],['neq','is not'],['gt','is greater than'],['gte','is at least'],['lt','is less than'],['lte','is at most'],['contains','contains'],['in','is one of']] as const;
  for (const [comparator, words] of comparisons) {
    const value = comparator === 'in' ? ['first', 'second'] : comparator === 'contains' ? 'part' : 100;
    expect(summarizeAudienceRules(inclusion([{sourceType:'order', field:'total', comparator, value, lookbackDays:90}]), '[]'))
      .toBe(`Contacts matching all of these conditions: Order total ${words} ${JSON.stringify(value).replaceAll('","','", "')} in the last 90 days. No additional exclusions.`);
  }
  for (const sourceType of ['customer','product','variant','inventory','order','refund','cart','browsing'] as const) {
    for (const value of [true,false,0,-10,1.25,'', '"<tag>"']) {
      const condition = {sourceType, field:'custom.field', comparator:'eq' as const, value, lookbackDays:0};
      expect(summarizeAudienceRules(inclusion([condition]), '[]')).toContain(`${sourceType}: custom.field is ${typeof value === 'string' ? `"${value}"` : String(value)} in the last 0 days`);
    }
  }
  expect(summarizeAudienceRules(inclusion([{sourceType:'order',field:'total',comparator:'eq',value:1,lookbackDays:1}]),'[]')).toContain('in the last 1 day.');
  expect(summarizeAudienceRules(inclusion([predicate]),'[]')).not.toContain('in the last');

  const included: Predicate[] = [predicate,{sourceType:'order', field:'total', comparator:'gte', value:100, lookbackDays:90}];
  const excluded: Predicate[] = [{sourceType:'order',field:'productId',comparator:'in',value:['red','blue'],lookbackDays:7},{sourceType:'contact',field:'email',comparator:'contains',value:'@example.test'}];
  for (const operator of ['all','any'] as const) {
    expect(summarizeAudienceRules(inclusion(included,operator),exclusions(excluded))).toBe(`Contacts matching ${operator} of these conditions: Email subscription status is "subscribed"; Order total is at least 100 in the last 90 days. Exclude contacts matching any of these conditions: Purchased product ID is one of ["red", "blue"] in the last 7 days; Email address contains "@example.test".`);
  }

  const editorIncluded = audienceRuleFields.map(([sourceType,field],index):Predicate => ({sourceType,field,comparator:'eq',value:`included-${index}`,...(sourceType==='contact'?{}:{lookbackDays:7})}));
  const editorExcluded = editorIncluded.map((item,index)=>({...item,value:`excluded-${index}`}));
  const summary = summarizeAudienceRules(inclusion(editorIncluded),exclusions(editorExcluded));
  for (const condition of [...editorIncluded,...editorExcluded]) {
    expect(summary).toContain(audienceRuleFieldLabel(condition));
    expect(summary).toContain(JSON.stringify(condition.value));
  }

  const value = '<img src=x onerror="alert(1)">; ' + '長'.repeat(300) + 'say "hello" at C:\\news\nnext\titem';
  expect(summarizeAudienceRules(inclusion([{...predicate,field:'displayName',value}]),'[]'))
    .toBe(`Contacts matching all of these conditions: Contact name is "${value}". No additional exclusions.`);
  expect(summarizeAudienceRules(inclusion([{...predicate,field:'displayName',comparator:'in',value:[value, '<b>"literal"</b>']}]),'[]'))
    .toBe(`Contacts matching all of these conditions: Contact name is one of ["${value}", "<b>"literal"</b>"]. No additional exclusions.`);
});

contract('AUD-001][CAMP-002', 'legacy projection discards conflicting prose without mutating stored approval inputs', () => {
  const original={audienceRule:'Every person regardless of consent',inclusionRuleJson:inclusion([predicate]),exclusionRulesJson:'[]',updatedAt:123};
  const projected=withDerivedAudience(original);
  expect(projected.audienceRule).toBe(summarizeAudienceRules(original.inclusionRuleJson,original.exclusionRulesJson));
  expect(projected).toEqual({...original,audienceRule:projected.audienceRule});
  expect(original.audienceRule).toBe('Every person regardless of consent');
  expect(withDerivedAudience({...original,inclusionRuleJson:'broken'}).audienceRule).toBe('Audience rules are invalid. Review the conditions before approval.');
});

contract('AUD-001][CAMP-002', 'review readiness uses valid complete rules regardless of obsolete display prose', () => {
  const revision={name:'Newsletter',audienceRule:'',inclusionRuleJson:inclusion([predicate]),exclusionRulesJson:'[]',emailSubject:'News',emailBody:'Body',emailText:'Body',smsBody:'',senderName:'Mango',fromEmail:'from@example.test',replyToEmail:'reply@example.test',smsSender:''};
  const snapshot=(value:typeof revision)=>campaignReviewSnapshot(value,[{channel:'email',whyThisTime:'Selected time'}],{eligibleCount:1},[{channel:'email'}]);
  expect(snapshot(revision).audienceState).toBe('saved');
  for (const invalid of ['{}','not-json',inclusion([{...predicate,field:'email',comparator:'contains',value:''}])]) {
    expect(snapshot({...revision,audienceRule:'Valid-sounding prose',inclusionRuleJson:invalid}).audienceState).toBe('needs_recomputation');
  }
  expect(snapshot({...revision,exclusionRulesJson:exclusions([{...predicate,field:'email',comparator:'in',value:[]}])}).audienceState).toBe('needs_recomputation');
});
