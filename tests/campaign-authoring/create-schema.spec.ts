import { contract } from '../contract.js';
import { test, expect } from '@playwright/test';
import { createDraftSchema } from '../../src/core/features/campaigns/create-draft';
import { draftCompositionSchema } from '../../src/core/features/campaigns/draft-composition';

const complete = () => ({
  name: 'April newsletter', emailSubject: 'From our garden', emailBody: '<p>New seedlings.</p>',
  emailText: 'New seedlings.', senderName: 'Garden', fromEmail: 'garden@example.test',
  replyToEmail: 'reply@example.test', physicalAddress: '1 Garden Road',
  messageCategory: 'newsletter', audienceRule: 'Email subscribers',
  inclusionRuleJson: JSON.stringify({ version: 1, operator: 'all', predicates: [
    { sourceType: 'contact', field: 'emailStatus', comparator: 'eq', value: 'subscribed' },
  ] }), exclusionRulesJson: '[]',
  steps: [{ channel: 'email', timezone: 'Australia/Brisbane', scheduledAt: '2031-04-07T00:00:00.000Z',
    sendByAt: '2031-04-07T13:59:00.000Z', whyThisTime: 'Operator selected this time' }],
});

test('[CAMP-002] create discriminates blank, recorded signal and complete composition requests', () => {
  expect(createDraftSchema.parse({})).toEqual({ mode: 'blank' });
  expect(createDraftSchema.parse({ mode: 'blank' })).toEqual({ mode: 'blank' });
  expect(createDraftSchema.parse({ starterSourceId: 'recorded-source' })).toEqual({
    mode: 'store-signal', starterSourceId: 'recorded-source',
  });
  expect(createDraftSchema.parse({ composition: complete() }).mode).toBe('composition');
  for (const request of [
    { mode: 'unknown' }, { starterSourceId: '' }, { composition: {} },
    { composition: { name: 'An unfinished message' } },
    { mode: 'blank', composition: complete() },
    { mode: 'blank', starterSourceId: 'recorded-source' },
    { starterSourceId: 'recorded-source', composition: complete() },
  ]) expect(createDraftSchema.safeParse(request).success, JSON.stringify(request)).toBe(false);
});

test('[CAMP-002][CAMP-006] explicit composition requires every legacy field and valid rules and steps', () => {
  for (const field of ['name', 'emailSubject', 'emailBody', 'emailText', 'senderName', 'fromEmail',
    'replyToEmail', 'physicalAddress', 'messageCategory', 'inclusionRuleJson'] as const) {
    const omitted: Record<string, unknown> = complete();
    delete omitted[field];
    expect(createDraftSchema.safeParse({ composition: omitted }).success, `Missing ${field}`).toBe(false);
    expect(createDraftSchema.safeParse({ composition: { ...complete(), [field]: ' ' } }).success,
      `Blank ${field}`).toBe(false);
  }
  const noSteps: Record<string, unknown> = complete();
  delete noSteps.steps;
  expect(createDraftSchema.safeParse({ composition: noSteps }).success).toBe(false);
  for (const invalid of [
    { steps: [] }, { steps: [{ ...complete().steps[0], sendByAt: '2031-04-06T00:00:00.000Z' }] },
    { inclusionRuleJson: 'invalid JSON' }, { inclusionRuleJson: '{}' },
    { inclusionRuleJson: JSON.stringify({ version: 1, operator: 'all', predicates: [
      { sourceType: 'contact', field: 'email', comparator: 'contains', value: '' },
    ] }) },
    { exclusionRulesJson: '{}' }, { exclusionRulesJson: '[{}]' },
  ]) expect(createDraftSchema.safeParse({ composition: { ...complete(), ...invalid } }).success, JSON.stringify(invalid)).toBe(false);
  // Equality against an empty recorded field is still a valid legacy rule;
  // only incomplete conditions such as empty `contains` broaden unintentionally.
  expect(createDraftSchema.safeParse({ composition: { ...complete(), inclusionRuleJson: JSON.stringify({
    version: 1, operator: 'all', predicates: [{ sourceType: 'contact', field: 'displayName', comparator: 'eq', value: '' }],
  }) } }).success).toBe(true);
  expect(draftCompositionSchema.safeParse({ name: '', emailSubject: '', emailBody: '', steps: [] }).success).toBe(true);
});

// Audience prose is no longer an authored requirement; the structured rules remain required.
contract('AUD-001][CAMP-002', 'complete create accepts omitted or blank obsolete audience prose', () => {
  const {audienceRule, ...composition} = complete();
  expect(createDraftSchema.safeParse({composition}).success).toBe(true);
  expect(createDraftSchema.safeParse({composition:{...composition,audienceRule:''}}).success).toBe(true);
});
