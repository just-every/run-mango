import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { proposalRenderer } from './proposal-render';
import { ruleJson, subscribed, exclusionJson } from './rule-fixtures';
import type { ProposalEntry } from '../../src/core/app/client/lib/types';

contract('AUD-001][CAMP-002', 'Decision Desk renders actual proposal conditions and snapshot as text, apart from its reason', async () => {
  const render = await proposalRenderer();
  const value = '<img src="bad" onerror="bad()">';
  const entry: ProposalEntry = {
    proposal: {
      id: 'legacy-proposal', state: 'proposed', title: 'Suggestion title',
      summary: 'Suggestion reason', evidence: 'Recorded evidence', audienceRule: 'Earlier prose claiming everyone',
      inclusionRuleJson: ruleJson(subscribed),
      exclusionRulesJson: exclusionJson({sourceType:'contact',field:'email',comparator:'contains',value}),
      sourceDataAsOf: '2031-01-01T00:00:00.000Z', sendByAt: '2031-01-02T00:00:00.000Z', campaignId: null,
    },
    exclusions: [], steps: [], audienceChannelCounts: [],
  };
  const html = await render(entry);
  expect(html).toContain('Email subscription status is &quot;subscribed&quot;');
  expect(html).toContain('Exclude contacts matching any of these conditions: Email address contains');
  expect(html).toContain('&lt;img src=&quot;bad&quot; onerror=&quot;bad()&quot;&gt;');
  expect(html).not.toContain('<img');
  expect(html).not.toContain(entry.proposal.audienceRule);
  expect(html).toContain('Proposal reason');
  expect(html).toContain('Suggestion reason');
  expect(html).toContain('Recorded evidence');
  expect(html).toContain('aria-label="Saved audience rule"');
  expect(html.match(/Email subscription status is/g)).toHaveLength(2);
  const saved = await render({...entry,
    audience: {id:'saved-audience',revisionId:'',asOfAt:'2031-01-01T00:00:00.000Z',candidateCount:3,excludedCount:1,eligibleCount:2},
    audienceChannelCounts: [{id:'saved-count',audienceId:'saved-audience',channel:'email',recipientStepCount:2}],
    exclusions: [{id:'saved-exclusion',reason:'unsubscribed',count:1}],
  });
  expect(saved.match(/Email subscription status is/g)).toHaveLength(2);
  expect(saved).toContain('aria-label="Saved audience rule"');
  expect(saved).toContain('<dt>Candidates</dt><dd>3</dd>');
  expect(saved).toContain('<dt>Excluded</dt><dd>1</dd>');
  expect(saved).toContain('<dt>Eligible contacts</dt><dd>2</dd>');
  expect(saved).toContain('<span>Email</span><strong>2</strong>');
  expect(saved).toContain('<span>Unsubscribed</span><strong>1</strong>');
  expect(saved).not.toContain(entry.proposal.audienceRule);
  const invalid = await render({...entry, proposal:{...entry.proposal,inclusionRuleJson:'',exclusionRulesJson:'[]'}});
  expect(invalid).toContain('Audience rules are invalid. Review the conditions before approval.');
  expect(invalid).not.toContain(entry.proposal.audienceRule);
  expect(entry.proposal.audienceRule).toBe('Earlier prose claiming everyone');
});
