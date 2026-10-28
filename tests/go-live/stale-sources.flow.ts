const width = 1440;
import {expect} from '@playwright/test';
import {contract} from '../contract.js';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation, json, sender, confirmedContact, draftCampaign, approve} from './harness';
import {sourceEdge, syncSource} from './source-edge';
import {openPage, reloadPage} from '../support/navigation';
import {declaredCapability} from './declared-capability';
import {id, line, order, page as shopifyPage} from '../shopify/fixtures';

/** Shopify response fixtures only: canonical records and exclusions are produced by the real adapter. */
function commerceOrder(n: number, email: string, purchasedAt: string, updatedAt: string, state: 'purchase' | 'refund' | 'return' | 'resolved' = 'purchase') {
  const fixture = structuredClone(order);
  const returned = fixture.returns.nodes[0] as Record<string, unknown>;
  const refunded = fixture.refunds[0];
  return {...fixture, id: id('Order', n), createdAt: purchasedAt, processedAt: purchasedAt, updatedAt,
    customer: {...fixture.customer, id: id('Customer', n), email, phone: null, firstName: email.split('@')[0], lastName: 'Garden'},
    lineItems: shopifyPage([line()]),
    returns: shopifyPage(state === 'return' || state === 'resolved'
      ? [{...returned, id: id('Return', n), createdAt: purchasedAt, status: state === 'resolved' ? 'CLOSED' : 'OPEN', closedAt: state === 'resolved' ? updatedAt : null}]
      : []),
    refunds: state === 'refund' || state === 'resolved' ? [{...refunded, id: id('Refund', n), createdAt: purchasedAt, updatedAt,
      transactions: shopifyPage(refunded.transactions.nodes.map(transaction => ({...(transaction as Record<string, unknown>), id: id('OrderTransaction', n), createdAt: purchasedAt,
        status: state === 'refund' ? 'PENDING' : 'SUCCESS', processedAt: state === 'refund' ? null : updatedAt}))),
    }] : [],
  };
}



export const walk0 = async ({page, browser}, info) => {
  const commerce = sourceEdge();
  let orders: ReturnType<typeof commerceOrder>[] = [];
  const edge = await providerEdge({commerce: request => String(request.query).includes('orders(first:')
    ? {data: {orders: shopifyPage(structuredClone(orders))}} : commerce.commerce(request)});
  const site = await installation(edge, eventSigner(), {commerce: true});
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
       {
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
     {
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
     {
      await page.setViewportSize({width, height: 1000});
      await reloadPage(page);
      await expect(page.getByRole('link', {name: 'View schedule and results'})).toBeVisible();
      await page.locator('.review-heading').screenshot({path: info.outputPath(`source-approved-${width}.png`)});
    }

    // Let genuine confirmed consent age, rather than editing stored history.
    const nextTransport = async () => {
      const [rows, clock] = await Promise.all([site.rows('SELECT MAX(next_at) AS due FROM provider_pacing'), site.control('/_golive/clock')]);
      await site.control('/_golive/clock', {advanceMs: Math.max(0, Math.ceil(Number(rows[0]?.due ?? 0) - clock.now))});
    };
    await nextTransport();
    await confirmedContact(site, edge, cookie, 'dormant@example.test', 'Dormant Garden');
    await nextTransport();
    await confirmedContact(site, edge, cookie, 'active-year@example.test', 'Active Garden');
    const oldAt = (await site.control('/_golive/clock')).now;
    const thirteenMonthsLater = new Date(oldAt);
    thirteenMonthsLater.setUTCMonth(thirteenMonthsLater.getUTCMonth() + 13);
    await site.control('/_golive/clock', {advanceMs: thirteenMonthsLater.getTime() - oldAt});
    // Operator sessions expire normally during the thirteen-month interval.
    const reviewCookie = await site.open();
    for (const name of ['buyer', 'refund', 'return', 'resolved']) {
      await nextTransport();
      await confirmedContact(site, edge, reviewCookie, `${name}@example.test`, `${name} Garden`);
    }
    const current = await site.control('/_golive/clock');
    const now = new Date(current.now), iso = now.toISOString();
    const daysAgo = (days: number) => new Date(current.now - days * 86400000).toISOString();
    const elevenMonthsAgo = new Date(current.now);
    elevenMonthsAgo.setUTCMonth(elevenMonthsAgo.getUTCMonth() - 11);
    orders = [
      commerceOrder(101, 'buyer@example.test', daysAgo(6), iso),
      commerceOrder(102, 'refund@example.test', daysAgo(30), iso, 'refund'),
      commerceOrder(103, 'return@example.test', daysAgo(30), iso, 'return'),
      commerceOrder(104, 'dormant@example.test', new Date(oldAt).toISOString(), iso),
      // These remain eligible: an eight-day purchase with resolved money/return,
      // and an eleven-month-old order with no newer consent or click.
      commerceOrder(105, 'resolved@example.test', daysAgo(8), iso, 'resolved'),
      commerceOrder(106, 'active-year@example.test', elevenMonthsAgo.toISOString(), iso),
    ];
    for (const source of ['product', 'order', 'refund']) await syncSource(site, reviewCookie, source);
    await nextTransport();
    await site.control('/_golive/sender-evidence');
    const productCampaign = await draftCampaign(site, reviewCookie, 'Garden product exclusions', ['buyer@example.test'], new Date(current.now + 3600000));
    const productRule = {version: 1, operator: 'all', predicates: [{sourceType: 'order', field: 'activity.productId', comparator: 'eq', value: id('Product', 21)}]};
    await json(await site.call(`/api/campaign-revisions/${productCampaign.revisionId}`, {method: 'PATCH', cookie: reviewCookie,
      body: {inclusionRuleJson: JSON.stringify(productRule)}}), 200);
    const reasons = [
      {reason: 'recent-product-purchase', count: 1}, {reason: 'unresolved-refund', count: 1},
      {reason: 'unresolved-return', count: 1}, {reason: 'dormant', count: 1},
    ];
    const productChecks = await json(await site.call(`/api/campaigns/${productCampaign.campaignId}/checks`, {method: 'POST', cookie: reviewCookie,
      body: {revisionId: productCampaign.revisionId}}), 200);
    expect(productChecks).toMatchObject({sourceStatus: 'ok', candidateCount: 6, eligibleCount: 2, blockers: []});
    expect(productChecks.exclusions).toHaveLength(reasons.length);
    expect(productChecks.exclusions).toEqual(expect.arrayContaining(reasons));
    expect(productChecks.channelCounts).toContainEqual(expect.objectContaining({channel: 'email', recipientStepCount: 2}));
    const saved = await json(await site.call(`/api/campaigns/${productCampaign.campaignId}/review`, {cookie: reviewCookie}), 200);
    expect(saved.audience).toMatchObject({candidateCount: 6, excludedCount: 4, eligibleCount: 2});
    expect(JSON.parse(saved.audience.exclusions)).toHaveLength(reasons.length);
    expect(JSON.parse(saved.audience.exclusions)).toEqual(expect.arrayContaining(reasons));
    await page.context().addCookies([{name: reviewCookie.split('=')[0], value: reviewCookie.split('=')[1], url: site.runtime.url}]);
     {
      await page.setViewportSize({width, height: 1000});
      await openPage(page, `${site.runtime.url}/app/campaigns/${productCampaign.campaignId}/review`);
      const snapshot = page.locator('.audience-snapshot');
      await expect(snapshot.locator('.metric-row > div').filter({has: page.locator('dt', {hasText: /^Candidates$/})}).locator('dd')).toHaveText('6');
      await expect(snapshot.locator('.metric-row > div').filter({has: page.locator('dt', {hasText: /^Eligible contacts$/})}).locator('dd')).toHaveText('2');
      for (const {reason, count} of reasons) {
        const label = new RegExp(`^${reason.replaceAll('-', ' ')}$`, 'i');
        const row = snapshot.locator('.exclusion-list p').filter({has: page.locator('span', {hasText: label})});
        await expect(row).toBeVisible();
        await expect(row.locator('strong')).toHaveText(String(count));
      }
      await expect(page.getByRole('button', {name: 'Approve & schedule', exact: true})).toBeEnabled();
      await snapshot.screenshot({path: info.outputPath(`aud-003-review-${width}.png`)});
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    expect(edge.unexpected).toEqual([]);
  } finally {await page.close(); await site.runtime.close(); await edge.close();}
  await declaredCapability(await browser.newPage(), info);
};
