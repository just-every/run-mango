import {expect} from '@playwright/test';
import {contract} from '../contract.js';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation, json, sender, confirmedContact, draftCampaign, approve} from './harness';
import {sourceEdge, syncSource} from './source-edge';
import {openPage, reloadPage} from '../support/navigation';
import {declaredCapability} from './declared-capability';

contract('STORE-005', '[STORE-006] inclusion, exclusion and proposal sources refuse unavailable data and recover stale data only after completed sync', async ({page, browser}, info) => {
  const commerce = sourceEdge(), edge = await providerEdge(commerce), site = await installation(edge, eventSigner(), {commerce: true});
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', {method: 'PUT', cookie, body: sender}), 200);
    await syncSource(site, cookie, 'customer');
    await confirmedContact(site, edge, cookie, 'customer@example.test', 'Test Customer');
    await site.control('/_golive/clock', {hold: true});
    const clock = await site.control('/_golive/clock', {advanceMs: 25 * 3600000});
    await site.control('/_golive/sender-evidence');
    const at = new Date(clock.now + 3600000);
    const inclusion = await draftCampaign(site, cookie, 'Customer spring letter', ['customer@example.test'], at);
    const exclusion = await draftCampaign(site, cookie, 'Customer exclusions letter', ['customer@example.test'], at);
    const rules = {version: 1, operator: 'all', predicates: [{sourceType: 'customer', field: 'email', comparator: 'eq', value: 'customer@example.test'}]};
    const exclusions = [{version: 1, reason: 'operator-exclusion-1', predicate: {sourceType: 'customer', field: 'email', comparator: 'eq', value: 'someone-else@example.test'}}];
    // Both a positive audience and a nonmatching exclusion still depend on the source.
    await json(await site.call(`/api/campaign-revisions/${inclusion.revisionId}`, {method: 'PATCH', cookie, body: {inclusionRuleJson: JSON.stringify(rules)}}), 200);
    await json(await site.call(`/api/campaign-revisions/${exclusion.revisionId}`, {method: 'PATCH', cookie, body: {exclusionRulesJson: JSON.stringify(exclusions)}}), 200);
    const review = (campaign: typeof inclusion) => site.call(`/api/campaigns/${campaign.campaignId}/checks`, {method: 'POST', cookie, body: {revisionId: campaign.revisionId}}).then(response => json(response, 200));
    const refused = async (campaign: typeof inclusion, reason: RegExp) => {
      const checks = await review(campaign);
      expect(checks.sourceStatus).toBe('stale');
      expect(checks.candidateCount).toBeNull();
      expect(checks.blockers).toEqual(expect.arrayContaining([expect.objectContaining({kind: 'audience.source-freshness', detail: expect.stringMatching(reason)})]));
      const response = await json(await site.call(`/api/campaigns/${campaign.campaignId}/approve`, {method: 'POST', cookie,
        body: {revisionId: campaign.revisionId, idempotencyKey: `approve-${campaign.revisionId}`}}), 409);
      expect(response.blockers.some((check: any) => check.kind === 'audience.source-freshness')).toBe(true);
      expect((await json(await site.call(`/api/campaigns/${campaign.campaignId}`, {cookie}), 200)).campaign.state).toBe('draft');
    };
    for (const campaign of [inclusion, exclusion]) await refused(campaign, /out of date/);
    const estimate = await json(await site.call('/api/campaign-authoring/audience', {method: 'POST', cookie,
      body: {inclusionRuleJson: JSON.stringify(rules), exclusionRulesJson: '[]', channels: ['email']}}), 200);
    expect(estimate).toMatchObject({status: 'stale', candidateCount: null, eligibleCount: null});
    expect(estimate.detail).toMatch(/out of date/);
    await page.context().addCookies([{name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url}]);
    const pictures = async (state: string, reason: RegExp) => {
      for (const width of [1440, 390]) {
        await page.setViewportSize({width, height: 1000});
        await openPage(page, `${site.runtime.url}/app/campaigns/${inclusion.campaignId}/review`);
        await expect(page.locator('.approval-checks')).toContainText(reason);
        await expect(page.getByRole('button', {name: 'Approve & schedule', exact: true})).toBeDisabled();
        await expect(page.getByRole('button', {name: 'Recheck sources', exact: true})).toBeEnabled();
        await expect(page.getByRole('link', {name: 'Manage source sync'})).toHaveAttribute('href', '/app/store');
        await page.screenshot({path: info.outputPath(`source-${state}-${width}.png`)});
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      }
    };
    await pictures('stale', /out of date/);
    commerce.fail(true, 'customer');
    await syncSource(site, cookie, 'customer', true);
    for (const campaign of [inclusion, exclusion]) await refused(campaign, /sync failed/);
    await pictures('failed', /sync failed/);
    expect(await site.count('campaign_approval_requests')).toBe(0);
    expect(await site.count('recipient_steps')).toBe(0);
    expect(edge.sends.filter(send => send.body.headers?.['List-Unsubscribe'])).toHaveLength(0);
    commerce.fail(false);
    await syncSource(site, cookie, 'customer');
    // Recovery alone grants no approval. The operator refreshes the exact saved revision.
    await page.getByRole('button', {name: 'Recheck sources', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Approve & schedule', exact: true})).toBeEnabled();
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await reloadPage(page);
      await expect(page.getByRole('button', {name: 'Recheck sources', exact: true})).toHaveCount(0);
      await expect(page.locator('.approval-checks .check-list__item--blocked')).toHaveCount(0);
      await page.screenshot({path: info.outputPath(`source-ready-${width}.png`)});
    }
    await page.getByRole('button', {name: 'Approve & schedule', exact: true}).click();
    await page.getByRole('alertdialog', {name: 'Approve and schedule?'}).getByRole('button', {name: 'Approve & schedule', exact: true}).click();
    await expect(page.getByRole('link', {name: 'View schedule and results'})).toBeVisible();
    await approve(site, cookie, exclusion);
    expect(await site.count('campaign_approval_requests')).toBe(2);
    expect(await site.count('recipient_steps')).toBe(2);
    expect(edge.sends.filter(send => send.body.headers?.['List-Unsubscribe'])).toHaveLength(0);
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await reloadPage(page);
      await expect(page.getByRole('link', {name: 'View schedule and results'})).toBeVisible();
      await page.locator('.review-heading').screenshot({path: info.outputPath(`source-approved-${width}.png`)});
    }
    expect(edge.unexpected).toEqual([]);
  } finally {await page.close(); await site.runtime.close(); await edge.close();}
  await declaredCapability(await browser.newPage(), info);
});
