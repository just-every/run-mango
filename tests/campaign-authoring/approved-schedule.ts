import { expect, type Page } from '@playwright/test';
import type { Step } from '../../src/core/app/client/lib/types';
import { authoringRuntime } from './browser-runtime.mjs';

/** Make a real approved schedule: the legacy demo's scheduled label is not approval authority. */
export async function withApprovedSchedule(page: Page, steps: Step[], inspect: (url: string) => Promise<void>) {
  const runtime = await authoringRuntime({suite: 'ui-approved-schedule'});
  try {
    const opened = await fetch(runtime.url + '/_authoring/open', {method: 'POST', headers: {'X-Test-Token': runtime.token}});
    expect(opened.status).toBe(200);
    const {token} = await opened.json();
    const headers = {Cookie: `operator_session_local=${token}`, Origin: runtime.url, 'Content-Type': 'application/json'};
    const api = async (path: string, method = 'GET', body?: unknown) => {
      const response = await fetch(runtime.url + path, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)});
      expect(response.ok, `${method} ${path}: ${response.status}`).toBe(true);
      return response.json();
    };
    const {campaignId, revisionId} = await api('/api/campaigns', 'POST', {});
    const scheduledSteps = steps.map(({channel, timezone, scheduledAt, sendByAt, whyThisTime}) => ({channel, timezone, scheduledAt, sendByAt, whyThisTime}));
    await api(`/api/campaign-revisions/${revisionId}`, 'PATCH', {
      name: 'Approved schedule browser fixture', emailSubject: 'A saved schedule', preheader: 'Review the saved schedule',
      emailBody: 'The operator approved this schedule.', steps: scheduledSteps,
    });
    // This helper's caller supplies the sample's future schedule; Cron owns due dispatch.
    expect(scheduledSteps.every(step => Date.parse(step.scheduledAt) > Date.now())).toBe(true);
    const approved = await api(`/api/campaigns/${campaignId}/approve`, 'POST', {revisionId, idempotencyKey: crypto.randomUUID()});
    expect(approved.status).toBe('scheduled');
    const persisted = await api(`/api/campaigns/${campaignId}`);
    expect(persisted.campaign.state).toBe('scheduled'); expect(persisted.revision.state).toBe('approved');
    expect(persisted.steps.map(({channel, timezone, scheduledAt, sendByAt, whyThisTime}: Step) => ({channel, timezone, scheduledAt, sendByAt, whyThisTime}))).toEqual(scheduledSteps);
    expect(persisted.results.steps).toHaveLength(steps.length);
    const state = await (await fetch(runtime.url + '/_authoring/state', {headers: {'X-Test-Token': runtime.token}})).json();
    expect(state.approvals).toEqual([expect.objectContaining({revision_id: revisionId, revision_digest: approved.revisionDigest})]);
    expect(state.jobs).toEqual([]); expect(state.recipients.length).toBeGreaterThan(0);
    for (const recipient of state.recipients) expect(recipient.transport_disposition).toBe('queued');
    await page.context().addCookies([{name: 'operator_session_local', value: token, url: runtime.url}]);
    await inspect(`${runtime.url}/app/campaigns/${campaignId}/scheduled`);
  } finally {await runtime.close();}
}
