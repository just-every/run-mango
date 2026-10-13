import { summarizeAudienceRules } from '../../src/core/features/campaigns/audience-summary';
import { test, expect } from '@playwright/test';
import { authoringRuntime } from './browser-runtime.mjs';

test('[CAMP-002][CAMP-003][CAMP-004] native API persists blank and complete drafts while rejecting incomplete explicit creates', async ({ request }) => {
  test.setTimeout(120000);
  const runtime = await authoringRuntime();
  try {
    const open = await request.post(runtime.url + '/_authoring/open', { headers: { 'X-Test-Token': runtime.token } });
    expect(open.status()).toBe(200);
    const { token } = await open.json();
    const headers = { Cookie: `operator_session_local=${token}`, Origin: runtime.url };
    const create = (data: unknown) => request.post(runtime.url + '/api/campaigns', { headers, data });
    const detail = async (id: string) => {
      const response = await request.get(`${runtime.url}/api/campaigns/${id}`, { headers });
      expect(response.status()).toBe(200);
      return response.json();
    };
    expect((await request.post(runtime.url + '/api/campaigns', { data: { mode: 'blank' } })).status()).toBe(401);
    const defaults = await (await request.get(runtime.url + '/api/campaign-authoring', { headers })).json();
    const draftIds: string[] = [];
    for (const body of [{}, { mode: 'blank' }]) {
      const response = await create(body);
      expect(response.status(), await response.text()).toBe(201);
      const ids = await response.json();
      draftIds.push(ids.campaignId);
      const saved = await detail(ids.campaignId);
      expect(saved.campaign.state).toBe('draft');
      expect(saved.revision).toMatchObject({
        id: ids.revisionId, name: 'Untitled campaign', emailSubject: '', preheader: '',
        approvedAt: null, ...defaults.sender,
      });
      expect(saved.steps).toEqual([]);
      expect(saved.revision.emailBody.match(/Unsubscribe/g)).toHaveLength(1);
      expect(saved.revision.emailText).toContain('{{physical_address}}');
      expect(saved.revision.emailText).toContain('{{unsubscribe_url}}');
      const patch = await request.patch(`${runtime.url}/api/campaign-revisions/${ids.revisionId}`, {
        headers, data: { name: '', emailBody: '<p>An unfinished update.</p>', emailSubject: '', steps: [] },
      });
      expect(patch.status(), await patch.text()).toBe(200);
      const reread = await detail(ids.campaignId);
      expect(reread.revision.name).toBe('');
      expect(reread.revision.emailSubject).toBe('');
      expect(reread.revision.emailBody).toContain('<p>An unfinished update.</p>');
      expect(reread.revision.emailBody.match(/Unsubscribe/g)).toHaveLength(1);
      expect(reread.revision.emailText).toContain('An unfinished update.');
      expect(reread.steps).toEqual([]);
    }
    const complete = {
      name: 'Written composition', emailSubject: 'Garden news', emailBody: '<p>News <a href="https://example.test/garden">Read more</a></p>',
      emailText: 'Client supplied text', ...defaults.sender, messageCategory: 'newsletter', audienceRule: 'Subscribed contacts',
      inclusionRuleJson: JSON.stringify({ version: 1, operator: 'all', predicates: [
        { sourceType: 'contact', field: 'emailStatus', comparator: 'eq', value: 'subscribed' },
      ] }), exclusionRulesJson: '[]', steps: [{ channel: 'email', timezone: 'Australia/Brisbane',
        scheduledAt: '2031-04-07T00:00:00.000Z', sendByAt: '2031-04-07T13:59:00.000Z', whyThisTime: 'Operator selected time' }],
    };
    for (const body of [
      { composition: { name: 'Incomplete message' } }, { composition: { ...complete, emailText: '' } },
      { composition: { ...complete, steps: [] } }, { composition: { ...complete, inclusionRuleJson: '{}' } },
      { mode: 'blank', composition: complete }, { starterSourceId: 'missing', composition: complete },
    ]) expect((await create(body)).status()).toBe(400);
    const completeResponse = await create({ composition: complete });
    expect(completeResponse.status(), await completeResponse.text()).toBe(201);
    const completeIds = await completeResponse.json();
    draftIds.push(completeIds.campaignId);
    const savedComplete = await detail(completeIds.campaignId);
    expect(savedComplete.campaign.state).toBe('draft');
    expect(savedComplete.revision.name).toBe(complete.name);
    expect(savedComplete.revision.emailText).toContain('Read more (https://example.test/garden)');
    expect(savedComplete.revision.emailText).not.toContain('Client supplied text');
    expect(savedComplete.links).toHaveLength(1);
    expect(savedComplete.steps).toHaveLength(1);
    expect((await create({ starterSourceId: 'missing' })).status()).toBe(409);
    expect((await request.post(runtime.url + '/_authoring/source', { headers: { 'X-Test-Token': runtime.token } })).status()).toBe(200);
    const { starters } = await (await request.get(runtime.url + '/api/campaign-starters', { headers })).json();
    expect(starters).toHaveLength(1);
    const fromSignal = await create({ starterSourceId: starters[0].id });
    expect(fromSignal.status(), await fromSignal.text()).toBe(201);
    const signalIds = await fromSignal.json();
    draftIds.push(signalIds.campaignId);
    const savedSignal = await detail(signalIds.campaignId);
    expect(savedSignal.campaign.state).toBe('draft');
    expect(savedSignal.revision.name).toBe(starters[0].title);
    expect(savedSignal.revision.emailBody).toContain('<h2>Garden linen</h2>');
    expect(savedSignal.revision.audienceRule).toBe(summarizeAudienceRules(savedSignal.revision.inclusionRuleJson,savedSignal.revision.exclusionRulesJson));
    expect(savedSignal.revision.audienceRule).not.toContain(starters[0].title);
    const { campaigns } = await (await request.get(runtime.url + '/api/campaigns', { headers })).json();
    expect(campaigns.map((campaign: { id: string }) => campaign.id).sort()).toEqual(draftIds.sort());
    const state = await (await request.get(runtime.url + '/_authoring/state', { headers: { 'X-Test-Token': runtime.token } })).json();
    expect(state).toEqual({ jobs: [], recipients: [], approvals: [] });
  } finally { await runtime.close(); }
});
