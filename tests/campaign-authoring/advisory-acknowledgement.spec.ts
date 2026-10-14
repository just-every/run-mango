import { test, expect } from '@playwright/test';
import { ensureLocalBootstrapToken } from '../support/bootstrap-token.mjs';
import type { Check } from '../../src/core/app/client/lib/types';

test('[MSG-007] an advisory records native actor/time without overriding approval or following changed findings', async ({page, request, baseURL}, info) => {
    if (!baseURL) throw new Error('Advisory journey requires the shared fixture server.');
    const runtime = { url: baseURL, token: await ensureLocalBootstrapToken() };
    const fixtureHeaders = {'X-Mango-Authoring-Fixture': runtime.token};
    await page.context().setExtraHTTPHeaders(fixtureHeaders);
    const session = await request.post(`${runtime.url}/_authoring/open`, {headers: {...fixtureHeaders, 'X-Test-Token': runtime.token}});
    expect(session.status()).toBe(200);
    await page.context().addCookies([{name: 'operator_session_local', value: (await session.json()).token, url: runtime.url}]);
    const api = page.context().request, headers = {...fixtureHeaders, Origin: runtime.url};
    const created = await api.post(`${runtime.url}/api/campaigns`, {headers, data: {}});
    expect(created.status()).toBe(201);
    const {campaignId, revisionId} = await created.json();
    const subject = 'Orchard news: harvest dates, seasonal produce, garden updates and everything to plan for the coming month';
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const sendByAt = new Date(Date.parse(scheduledAt) + 24 * 60 * 60 * 1000).toISOString();
    const save = async (data: object) => {
      const response = await api.patch(`${runtime.url}/api/campaign-revisions/${revisionId}`, {headers, data});
      expect(response.status(), await response.text()).toBe(200);
    };
    const refresh = async () => {
      const response = await api.post(`${runtime.url}/api/campaigns/${campaignId}/checks`, {headers, data: {revisionId}});
      expect(response.status()).toBe(200);
    };
    const checks = async (): Promise<Check[]> => (await (await api.get(`${runtime.url}/api/campaigns/${campaignId}/review`, {headers})).json()).checks;
    const advisory = async () => (await checks()).find(check => check.status === 'advisory')!;
    const acknowledge = (check: Check, extra = {}, campaign = campaignId) => api.post(`${runtime.url}/api/campaigns/${campaign}/checks/${check.id}/acknowledge`, {
      headers, data: {revisionId, findingIdentity: check.findingIdentity ?? '0'.repeat(64), ...extra},
    });
    await save({name: 'Advisory review', emailSubject: subject, emailBody: '<p>Harvest news.</p>', steps: [{channel: 'email', timezone: 'Australia/Brisbane', scheduledAt, sendByAt, whyThisTime: 'Operator selected this send time.'}]});
    await refresh();
    const original = await advisory();
    expect(original).toMatchObject({blocking: false, status: 'advisory', findingIdentity: expect.any(String)});
    expect(original.acknowledgement).toBeUndefined();

    const anonymous = await request.post(`${runtime.url}/api/campaigns/${campaignId}/checks/${original.id}/acknowledge`, {
      headers, data: {revisionId, findingIdentity: original.findingIdentity},
    });
    expect(anonymous.status()).toBe(401);
    expect((await acknowledge(original, {operatorId: 'forged-operator', acknowledgedAt: '2000-01-01'})).status()).toBe(400);
    expect((await acknowledge(original, {}, 'wrong-campaign')).status()).toBe(404);
    expect((await acknowledge(original, {revisionId: 'wrong-revision'})).status()).toBe(404);
    const allChecks = await checks();
    expect(allChecks.some(check => check.blocking)).toBe(true);
    expect(allChecks.some(check => check.status === 'passed')).toBe(true);
    for (const check of allChecks.filter(check => check.blocking || check.status === 'passed')) {
      expect((await acknowledge(check)).status(), check.kind).toBe(409);
    }

    await page.goto(`${runtime.url}/app/campaigns/${campaignId}/review`);
    const blockingRows = page.locator('.check-list__item').filter({has: page.getByLabel('Status: Blocking', {exact: true})});
    await expect(blockingRows.first()).toBeVisible();
    expect(await blockingRows.count()).toBeGreaterThan(0);
    await expect(blockingRows.getByRole('button', {name: 'Acknowledge advisory', exact: true})).toHaveCount(0);
    await page.getByRole('button', {name: 'Acknowledge advisory', exact: true}).click();
    await expect(page.getByText(/Acknowledged by authoring-operator/)).toBeVisible();
    const saved = (await advisory()).acknowledgement!;
    expect(saved.operatorId).toBe('authoring-operator');
    expect(Number.isFinite(Date.parse(saved.acknowledgedAt))).toBe(true);
    await page.screenshot({path: info.outputPath('advisory-click.png'), fullPage: true});
    await page.reload();
    await expect(page.getByText(/Acknowledged by authoring-operator/)).toBeVisible();

    await page.screenshot({path: info.outputPath('advisory-reload.png'), fullPage: true});

    const second = await request.post(`${runtime.url}/_advisory/second-operator`, {headers: {...fixtureHeaders, 'X-Test-Token': runtime.token}});
    expect(second.status()).toBe(200);
    const repeated = await request.post(`${runtime.url}/api/campaigns/${campaignId}/checks/${original.id}/acknowledge`, {
      headers: {...headers, Cookie: `operator_session_local=${(await second.json()).token}`}, data: {revisionId, findingIdentity: original.findingIdentity},
    });
    expect(repeated.status()).toBe(200);
    expect((await repeated.json()).acknowledgement).toEqual(saved);

    // Check rows are recreated, but unchanged saved content/check facts retain the record.
    await refresh();
    const refreshed = await advisory();
    expect(refreshed.id).not.toBe(original.id);
    expect(refreshed.acknowledgement).toEqual(saved);
    expect((await acknowledge(original)).status()).toBe(409);
    const approve = await api.post(`${runtime.url}/api/campaigns/${campaignId}/approve`, {
      headers, data: {revisionId, idempotencyKey: crypto.randomUUID()},
    });
    expect(approve.status()).toBe(409);
    const blockers = (await approve.json()).blockers;
    expect(blockers.length).toBeGreaterThan(0);
    await info.attach('native-acknowledgement-and-blocking-approval', {body: JSON.stringify({acknowledgement: saved, approvalStatus: approve.status(), blockers}, null, 2), contentType: 'application/json'});

    // Same revision ID with changed saved content cannot reuse the former identity.
    await save({emailBody: '<p>A changed harvest announcement.</p>'});
    expect((await checks()).every(check => !check.acknowledgement)).toBe(true);
    expect((await acknowledge(refreshed)).status()).toBe(409);
    await refresh();
    const changed = await advisory();
    expect(changed.findingIdentity).not.toBe(original.findingIdentity);
    expect(changed.acknowledgement).toBeUndefined();
    expect((await acknowledge(changed, {findingIdentity: original.findingIdentity})).status()).toBe(409);
    expect((await acknowledge(changed)).status()).toBe(200);
    await save({emailSubject: `${subject} with another update`});
    await refresh();
    const different = await advisory();
    expect(different.detail).not.toBe(changed.detail);
    expect(different.acknowledgement).toBeUndefined();
    await save({emailSubject: 'Harvest news'});
    await refresh();
    expect((await checks()).some(check => check.status === 'advisory')).toBe(false);
    expect((await acknowledge(different)).status()).toBe(409);
});
