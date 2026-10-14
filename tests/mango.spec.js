import { expect, test } from '@playwright/test';

import { contract } from './contract.js';
import { localBootstrapToken } from './local-bootstrap.js';

async function authenticatedHeaders(request) {
  const response = await request.post('/api/_local/bootstrap', {
    headers: { 'X-Mango-Local-Bootstrap-Token': await localBootstrapToken() },
    data: { testSession: true },
  });
  await expect(response).toBeOK();
  const { session } = await response.json();
  return { Cookie: `operator_session_local=${session.token}` };
}

test.describe('Worker product spine', () => {
  test.describe.configure({ mode: 'serial' });

  test('keeps product API routes behind a persisted operator session', async ({ request }) => {
    const response = await request.get('/api/decision-desk');
    expect(response.status()).toBe(401);
  });

  test('refuses local bootstrap requests outside loopback', async ({ request }) => {
    const response = await request.post('/api/_local/bootstrap', {
      headers: {
        Host: 'operator.example.test',
        'X-Mango-Local-Bootstrap-Token': await localBootstrapToken(),
      },
      data: { testSession: true },
    });
    expect(response.status()).toBe(404);
  });

  test('does not turn undeclared or declared-but-unimplemented public routes into the operator SPA', async ({ request }) => {
    const [undeclared, removedAuthPrefix, publicPlaceholder, unauthenticatedApp, staticModule] = await Promise.all([
      request.get('/this-path-is-not-declared'),
      request.get('/auth/no-longer-declared'),
      request.get('/unsubscribe/not-a-real-token'),
      request.get('/app/campaigns', { maxRedirects: 0 }),
      request.get('/main.tsx'),
    ]);

    expect(undeclared.status()).toBe(404);
    expect(undeclared.headers()['content-type']).toContain('text/html');
    await expect(undeclared.text()).resolves.toContain('Page not found');
    expect(removedAuthPrefix.status()).toBe(404);
    await expect(removedAuthPrefix.json()).resolves.toEqual({ error: 'not_found' });
    expect(publicPlaceholder.status()).toBe(404);
    expect(publicPlaceholder.headers()['content-type']).toContain('text/html');
    await expect(publicPlaceholder.text()).resolves.toContain('<h1>This link is not valid</h1>');
    expect(unauthenticatedApp.status()).toBe(303);
    expect(unauthenticatedApp.headers().location).toBe('/signin?reason=session-required');
    expect(staticModule.status()).toBe(404);

    const headers = await authenticatedHeaders(request);
    const authenticatedApp = await request.get('/app/campaigns/campaign_table_runner_draft_v4/review', { headers });
    await expect(authenticatedApp).toBeOK();
    expect(await authenticatedApp.text()).toContain('Store owner');
    expect(await authenticatedApp.text()).toContain('Operator navigation');
  });

  test('rejects an unsupported document host before exposing HTML', async ({request}) => {
    const response = await request.get('/', {headers: {Host: 'untrusted.example.test'}});
    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toEqual({error: 'not_found'});
  });

  test('preserves Hono ownership of magic-link callbacks and tracked links', async ({request}) => {
    const callback = await request.get('/signin/verify/invalid-token', {maxRedirects: 0});
    expect(callback.status()).toBe(303);
    expect(callback.headers().location).toBe('/signin?reason=invalid-or-expired-link');
    const link = await request.get('/l/invalid-token');
    expect(link.status()).toBe(404);
    await expect(link.json()).resolves.toEqual({error: 'not_found'});
  });

  contract('AUD-001][CAMP-002', 'imports the v4 demo and identifies its missing structured proposal audience', async ({ request }) => {
    const headers = await authenticatedHeaders(request);
    const response = await request.get('/api/proposals/proposal_table_runner_v4', { headers });
    await expect(response).toBeOK();
    await expect(response.json()).resolves.toMatchObject({
      proposal: { audienceRule: 'Audience rules are invalid. Review the conditions before approval.' },
      audience: { candidateCount: 3, excludedCount: 1, eligibleCount: 2 },
    });
  });

  contract('AUD-001', 'returns the complete review snapshot and recipient-step counts', async ({ request }) => {
    const headers = await authenticatedHeaders(request);
    const response = await request.get('/api/campaigns/campaign_table_runner_draft_v4/review', { headers });
    await expect(response).toBeOK();
    const review = await response.json();
    expect(review.revision.audienceRule).toBe('Contacts matching all of these conditions: browsing: savedProduct is true in the last 30 days. No additional exclusions.');
    expect(review.audienceState).toBe('saved');
    expect(review.audience).toMatchObject({ candidateCount: 3, excludedCount: 1, eligibleCount: 2 });
    expect(JSON.parse(review.audience.exclusions)).toEqual([{ reason: 'no-eligible-channel', count: 1 }]);
    expect(review.audienceChannelCounts).toEqual([
      expect.objectContaining({ channel: 'email', recipientStepCount: 2 }),
      expect.objectContaining({ channel: 'sms', recipientStepCount: 1 }),
    ]);
  });

  contract('CAMP-002', 'round-trips the complete draft composition and preserves scheduled revisions', async ({ request }) => {
    const headers = await authenticatedHeaders(request);
    const campaignId = 'campaign_composition_fixture_v4';
    const revisionId = 'revision_composition_fixture_v4';
    const before = await request.get(`/api/campaigns/${campaignId}`, { headers });
    await expect(before).toBeOK();
    const savedBefore = await before.json();

    const malformed = await request.patch(`/api/campaign-revisions/${revisionId}`, {
      headers,
      data: {
        name: 'This malformed composition must not persist',
        steps: [{
          channel: 'email',
          timezone: 'Australia/Brisbane',
          scheduledAt: '2027-01-12T02:00:00.000Z',
          sendByAt: '2027-01-12T01:00:00.000Z',
          whyThisTime: 'This deliberately has an invalid deadline.',
        }],
      },
    });
    expect(malformed.status()).toBe(400);
    const afterMalformed = await request.get(`/api/campaigns/${campaignId}`, { headers });
    await expect(afterMalformed).toBeOK();
    expect(await afterMalformed.json()).toEqual(savedBefore);

    const update = await request.patch(`/api/campaign-revisions/${revisionId}`, {
      headers,
      data: {
        name: 'A fully reviewed linen follow-up',
        audienceRule: 'Saved a linen table runner during the August review window.',
        emailSubject: 'A reviewed subject line',
        emailBody: 'Reviewed HTML-safe email content.',
        emailText: 'Reviewed plain-text email content.',
        smsBody: 'Reviewed SMS content. Reply STOP to unsubscribe.',
        senderName: 'Mango sample store',
        fromEmail: 'offers@example.test',
        replyToEmail: 'care@example.test',
        smsSender: 'MangoStore',
        links: [
          { label: 'First reviewed link', destinationUrl: 'https://store.example.test/first' },
          { label: 'Second reviewed link', destinationUrl: 'https://store.example.test/second' },
        ],
        steps: [
          {
            channel: 'email',
            timezone: 'Australia/Brisbane',
            scheduledAt: '2027-01-12T02:00:00.000Z',
            sendByAt: '2027-01-12T12:00:00.000Z',
            whyThisTime: 'The operator selected a resolved morning email instant.',
          },
          {
            channel: 'sms',
            timezone: 'America/New_York',
            scheduledAt: '2027-01-13T15:00:00.000Z',
            sendByAt: '2027-01-14T01:00:00.000Z',
            whyThisTime: 'The operator recorded a resolved SMS instant for review.',
          },
        ],
      },
    });
    await expect(update).toBeOK();
    const saved = await update.json();
    expect(saved.composition).toMatchObject({
      revision: {
        name: 'A fully reviewed linen follow-up',
        audienceRule: 'Contacts matching all of these conditions: browsing: savedProduct is true in the last 30 days. No additional exclusions.',
        emailSubject: 'A reviewed subject line',
        emailBody: 'Reviewed HTML-safe email content.<p><a href="https://store.example.test/first">First reviewed link</a></p><p><a href="https://store.example.test/second">Second reviewed link</a></p><hr><p>{{physical_address}}</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>',
        emailText: 'Reviewed HTML-safe email content.First reviewed link (https://store.example.test/first)\nSecond reviewed link (https://store.example.test/second)\n\n{{physical_address}}\nUnsubscribe ({{unsubscribe_url}})',
        smsBody: 'Reviewed SMS content. Reply STOP to unsubscribe.',
        senderName: 'Mango sample store',
        fromEmail: 'offers@example.test',
        replyToEmail: 'care@example.test',
        smsSender: 'MangoStore',
      },
      audienceState: 'needs_recomputation',
    });
    expect(saved.composition.links.map((link) => [link.sequence, link.label, link.destinationUrl])).toEqual([
      [1, 'First reviewed link', 'https://store.example.test/first'],
      [2, 'Second reviewed link', 'https://store.example.test/second'],
    ]);
    expect(saved.composition.steps.map((step) => [step.sequence, step.channel, step.timezone, step.whyThisTime])).toEqual([
      [1, 'email', 'Australia/Brisbane', 'The operator selected a resolved morning email instant.'],
      [2, 'sms', 'America/New_York', 'The operator recorded a resolved SMS instant for review.'],
    ]);
    expect(saved.composition.audience).toBeUndefined();
    expect(saved.composition.audienceChannelCounts).toEqual([]);

    const detail = await request.get(`/api/campaigns/${campaignId}`, { headers });
    await expect(detail).toBeOK();
    await expect(detail.json()).resolves.toMatchObject({
      revision: {
        name: 'A fully reviewed linen follow-up',
        replyToEmail: 'care@example.test',
        smsSender: 'MangoStore',
      },
      audienceState: 'needs_recomputation',
    });

    const scheduledBefore = await request.get('/api/campaigns/campaign_sample_scheduled_v4', { headers });
    await expect(scheduledBefore).toBeOK();
    const savedScheduledBefore = await scheduledBefore.json();
    const scheduled = await request.patch('/api/campaign-revisions/revision_sample_scheduled_v4', {
      headers,
      data: {
        emailSubject: 'This edit must not persist.',
        links: [{ label: 'This link must not persist', destinationUrl: 'https://store.example.test/nope' }],
      },
    });
    expect(scheduled.status()).toBe(409);
    const scheduledAfter = await request.get('/api/campaigns/campaign_sample_scheduled_v4', { headers });
    await expect(scheduledAfter).toBeOK();
    expect(await scheduledAfter.json()).toEqual(savedScheduledBefore);
  });

  contract('PROP-005', 'persists no schedule or send transition before blocked approval or test', async ({ request }) => {
    const headers = await authenticatedHeaders(request);
    const campaignId = 'campaign_table_runner_draft_v4';
    const before = await request.get(`/api/campaigns/${campaignId}`, { headers });
    await expect(before).toBeOK();
    const savedBefore = await before.json();

    for (const [action, data] of [
      ['approve', { revisionId: 'revision_table_runner_draft_v4', idempotencyKey: 'blocked-approval-revision-table-runner-v4' }],
      ['test-send', { revisionId: 'revision_table_runner_draft_v4', channel: 'email', to: 'not-allowlisted@example.test' }],
    ]) {
      const response = await request.post(`/api/campaigns/${campaignId}/${action}`, { headers, data });
      expect(response.status()).toBe(409);
    }

    const after = await request.get(`/api/campaigns/${campaignId}`, { headers });
    await expect(after).toBeOK();
    const savedAfter = await after.json();
    expect(savedAfter.campaign).toMatchObject({
      state: 'draft',
      activeRevisionId: savedBefore.campaign.activeRevisionId,
      cancelledAt: null,
      updatedAt: savedBefore.campaign.updatedAt,
    });
    expect(savedAfter.revision).toMatchObject({
      state: 'draft',
      updatedAt: savedBefore.revision.updatedAt,
    });
  });

  contract('CAMP-004', 'reports honest provider blockers for approval and test sends', async ({ request }) => {
    const headers = await authenticatedHeaders(request);
    // Match the saved draft identity so provider availability is the check under test.
    const draft = await request.get('/api/campaigns/campaign_table_runner_draft_v4', { headers });
    await expect(draft).toBeOK();
    const { revision } = await draft.json();
    const senderSettings = await request.put('/api/settings/sender', {
      headers,
      data: {
        displayName: revision.senderName,
        fromEmail: revision.fromEmail,
        replyToEmail: revision.replyToEmail,
        physicalAddress: revision.physicalAddress,
      },
    });
    await expect(senderSettings).toBeOK();
    const approval = await request.post('/api/campaigns/campaign_table_runner_draft_v4/approve', {
      headers,
      data: { revisionId: 'revision_table_runner_draft_v4', idempotencyKey: 'provider-blocker-approval-table-runner-v4' },
    });
    expect(approval.status()).toBe(409);
    await expect(approval.json()).resolves.toMatchObject({
      status: 'blocked',
      blockers: expect.arrayContaining([
        expect.objectContaining({ kind: 'mail.sender.v1.configured', detail: expect.stringContaining('unavailable') }),
        expect.objectContaining({ kind: 'sms.sender.v1.configured', detail: expect.stringContaining('unavailable') }),
      ]),
    });

    const testSend = await request.post('/api/campaigns/campaign_table_runner_draft_v4/test-send', {
      headers,
      data: { revisionId: 'revision_table_runner_draft_v4', channel: 'email', to: 'local@example.test' },
    });
    expect(testSend.status()).toBe(409);
    await expect(testSend.json()).resolves.toMatchObject({
      status: 'blocked',
      blockers: [expect.objectContaining({ kind: 'test-send', detail: expect.stringContaining('unavailable') })],
    });
  });

  contract('CAMP-009', 'persists a cancellation', async ({ request }) => {
    const headers = await authenticatedHeaders(request);
    const draft = await request.post('/api/campaigns/campaign_table_runner_draft_v4/cancel', { headers });
    expect(draft.status()).toBe(409);
    const response = await request.post('/api/campaigns/campaign_sample_scheduled_v4/cancel', { headers });
    if (response.status() === 409) {
      await expect(response.json()).resolves.toEqual({ error: 'campaign_not_cancellable' });
    } else {
      await expect(response).toBeOK();
      await expect(response.json()).resolves.toMatchObject({ status: 'cancelled' });
    }
    const saved = await request.get('/api/campaigns/campaign_sample_scheduled_v4', { headers });
    await expect(saved).toBeOK();
    await expect(saved.json()).resolves.toMatchObject({ campaign: { state: 'cancelled' } });
  });

  test('exposes audience, insights, store, and provider state through the same session gate', async ({ request }) => {
    const headers = await authenticatedHeaders(request);
    const [audience, contact, insights, store, providers] = await Promise.all([
      request.get('/api/audience', { headers }),
      request.get('/api/contacts/contact_alex_v4', { headers }),
      request.get('/api/insights', { headers }),
      request.get('/api/store', { headers }),
      request.get('/api/settings/providers', { headers }),
    ]);
    for (const response of [audience, contact, insights, store, providers]) await expect(response).toBeOK();
    await expect(contact.json()).resolves.toMatchObject({ contact: { email: 'alex-v4@example.test' } });
    await expect(insights.json()).resolves.toMatchObject({ results: [] });
    await expect(store.json()).resolves.toMatchObject({ providers: expect.any(Array) });
  });
});
