import {expect, type Page, type TestInfo} from '@playwright/test';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation, json, sender, confirmedContact, draftCampaign, availableTransport} from './harness';
import {sourceEdge, syncSource} from './source-edge';
import {openPage} from '../support/navigation';
import {decisionRuntime} from '../proposals-decision/runtime';

export async function declaredCapability(page: Page, info: TestInfo) {
  const edge = await providerEdge(sourceEdge()), site = await installation(edge, eventSigner(), {commerce: true});
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', {method: 'PUT', cookie, body: sender}), 200);
    await syncSource(site, cookie, 'customer');
    const status = await json(await site.call('/api/store', {cookie}), 200);
    for (const sourceType of ['cart', 'browsing-event']) {
      expect(status.sourceCapabilities).toContainEqual(expect.objectContaining({sourceType, available: false}));
      await json(await site.call('/api/store/sync', {method: 'POST', cookie, body: {sourceType}}), 409);
    }
    await confirmedContact(site, edge, cookie, 'customer@example.test', 'Leila Garden');
    await availableTransport(site);
    await site.control('/_golive/sender-evidence');
    const {now} = await site.control('/_golive/clock', {hold: true});
    await page.context().addCookies([{name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url}]);
    for (const mode of ['inclusion', 'exclusion'] as const) {
      const campaign = await draftCampaign(site, cookie, `Garden ${mode} review`, ['customer@example.test'], new Date(now + 3600000));
      const predicate = {sourceType: mode === 'inclusion' ? 'cart' : 'browsing', field: 'providerSourceId', comparator: 'eq', value: 'unavailable-event'};
      const inclusion = {version: 1, operator: 'any', predicates: [{sourceType: 'contact', field: 'email', comparator: 'eq', value: 'customer@example.test'}, ...(mode === 'inclusion' ? [predicate] : [])]};
      const exclusions = mode === 'exclusion' ? [{version: 1, reason: 'operator-exclusion-1', predicate}] : [];
      await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`, {method: 'PATCH', cookie,
        body: {inclusionRuleJson: JSON.stringify(inclusion), exclusionRulesJson: JSON.stringify(exclusions)}}), 200);
      const missing = mode === 'inclusion' ? /Cart source is unavailable/ : /Browsing source is unavailable/;
      const estimate = await json(await site.call('/api/campaign-authoring/audience', {method: 'POST', cookie,
        body: {inclusionRuleJson: JSON.stringify(inclusion), exclusionRulesJson: JSON.stringify(exclusions), channels: ['email']}}), 200);
      expect(estimate).toMatchObject({status: 'unavailable', candidateCount: null, excludedCount: null, eligibleCount: null, channelCounts: null});
      expect(estimate.detail).toMatch(missing);
      const checks = await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`, {method: 'POST', cookie, body: {revisionId: campaign.revisionId}}), 200);
      expect(checks).toMatchObject({sourceStatus: 'unavailable', candidateCount: null, eligibleCount: null, exclusions: null, channelCounts: null});
      expect(checks.blockers).toContainEqual(expect.objectContaining({kind: 'audience.source-freshness', detail: expect.stringMatching(missing)}));
      for (const width of [1440, 390]) {
        await page.setViewportSize({width, height: 1000});
        await openPage(page, `${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
        await expect(page.locator('.approval-checks')).toContainText(missing);
        await expect(page.getByRole('button', {name: 'Approve & schedule', exact: true})).toBeDisabled();
        await expect(page.getByRole('link', {name: 'Manage source sync'})).toHaveAttribute('href', '/app/store');
        await page.screenshot({path: info.outputPath(`capability-${mode}-${width}.png`)});
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      }
      const refused = await json(await site.call(`/api/campaigns/${campaign.campaignId}/approve`, {method: 'POST', cookie,
        body: {revisionId: campaign.revisionId, idempotencyKey: `approve-${campaign.revisionId}`}}), 409);
      expect(refused.blockers).toContainEqual(expect.objectContaining({kind: 'audience.source-freshness', detail: expect.stringMatching(missing)}));
      expect((await json(await site.call(`/api/campaigns/${campaign.campaignId}`, {cookie}), 200)).campaign.state).toBe('draft');
    }
    expect(await site.count('campaign_approval_requests')).toBe(0);
    expect(await site.count('recipient_steps')).toBe(0);
    expect(await site.count('campaign_audiences')).toBe(0);
    expect(edge.sends.filter(send => send.body.headers?.['List-Unsubscribe'])).toHaveLength(0);
    expect(edge.unexpected).toEqual([]);
  } finally {await page.close(); await site.runtime.close(); await edge.close();}

  // The paid AI edge proposes a valid schema using an unsupplied source. The
  // public generation door must refuse it without saving partial counts.
  const proposals = await decisionRuntime();
  try {
    proposals.controls.alter = output => {
      output.audience.inclusion.predicates.push({sourceType: 'cart', field: 'providerSourceId', comparator: 'eq', value: 'unavailable-event', lookbackDays: null});
    };
    const result = await proposals.call('/api/proposals/generate', {});
    expect(result).toMatchObject({status: 409, body: {kind: 'unavailable', detail: expect.stringMatching(/Cart source is unavailable/)}});
    const detail = (await proposals.call(`/api/proposals/${result.body.proposalId}`)).body;
    expect(detail.proposal).toMatchObject({state: 'failed', campaignId: null, generationError: 'source_unavailable'});
    expect(detail.audience).toBeUndefined();
    for (const table of ['campaigns', 'proposal_audiences', 'campaign_approval_requests', 'recipient_steps']) {
      expect(await proposals.db.prepare(`SELECT count(*) AS n FROM ${table}`).first()).toEqual({n: 0});
    }
    expect(proposals.jobs).toEqual([]);
  } finally {await proposals.close();}
}
