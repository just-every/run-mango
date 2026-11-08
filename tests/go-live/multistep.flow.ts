const width = 1440;
import {chosenCatalogJourney} from './chosen-catalog-journey';
import {expect} from '@playwright/test';
import {createHmac} from 'node:crypto';
import {providerEdge} from './edge';
import {multistepCommerceEdge} from './multistep-commerce-edge';
import {syncSource} from './source-edge';
import {eventSigner} from './sendgrid-events';
import {installation, json, sender, confirmedContact, draftCampaign, approve} from './harness';
import {openPage} from '../support/navigation';





export const walk0 = async ({page}, info) => {
  const commerce = multistepCommerceEdge(), edge = await providerEdge(commerce);
  const site = await installation(edge, eventSigner(), {commerce: true});
  const marketing = () => edge.sends.filter(send => send.body.headers?.['List-Unsubscribe']);
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', {method: 'PUT', cookie, body: sender}), 200);
    await site.control('/_golive/sender-evidence');
    const emails = ['inclusion', 'exclusion', 'optout', 'control', 'buyer'].map(name => [name, 'example.test'].join('@'));
    const newcomer = ['new-match', 'example.test'].join('@');
    for (const email of emails) await confirmedContact(site, edge, cookie, email, `Ready ${email.split('@')[0]}`);
    await confirmedContact(site, edge, cookie, newcomer, 'Outside audience');
    const credential = await json(await site.call('/api/settings/integrations', {method: 'POST', cookie,
      body: {name: 'Audience profile updates', scopes: ['contacts:write']}}), 201);
    const rename = async (email: string, displayName: string) => {
      const result = await json(await site.call('/api/integrations/v1/contacts', {method: 'PUT',
        headers: {Authorization: `Bearer ${credential.token}`}, body: {email, displayName, segmentName: 'Profile updates'}}), 200);
      expect(result.contact).toMatchObject({email, displayName, emailStatus: 'subscribed'});
    };
    const clock = await site.control('/_golive/clock', {hold: true});
    const firstAt = new Date(clock.now + 3600000), secondAt = new Date(firstAt.getTime() + 25 * 3600000);
    const thirdAt = new Date(secondAt.getTime() + 25 * 3600000);
    commerce.seed([...emails, newcomer], new Date(clock.now - 30 * 86400000).toISOString());
    const refresh = async () => {
      for (const source of ['product', 'order', 'refund']) await syncSource(site, cookie, source);
    };
    await refresh();
    const campaign = await draftCampaign(site, cookie, 'Three garden updates', emails, firstAt);
    await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`, {method: 'PATCH', cookie, body: {
      inclusionRuleJson: JSON.stringify({version: 1, operator: 'all', predicates: [
        {sourceType: 'contact', field: 'displayName', comparator: 'contains', value: 'Ready'},
        {sourceType: 'order', field: 'activity.productId', comparator: 'eq', value: commerce.productId},
      ]}),
      exclusionRulesJson: JSON.stringify([{version: 1, reason: 'operator-exclusion-1', predicate:
        {sourceType: 'contact', field: 'displayName', comparator: 'eq', value: 'Ready excluded'}}]),
      steps: [firstAt, secondAt, thirdAt].map((scheduledAt, index) => ({channel: 'email', timezone: 'Australia/Brisbane',
        scheduledAt: scheduledAt.toISOString(), sendByAt: new Date(scheduledAt.getTime() + 2 * 3600000).toISOString(),
        whyThisTime: index ? 'Following day reminder' : 'Initial announcement'})),
    }}), 200);
    await approve(site, cookie, campaign);
    const steps = await site.rows(`SELECT id,sequence FROM campaign_steps WHERE revision_id='${campaign.revisionId}' ORDER BY sequence`);
    expect(steps).toHaveLength(3);
    expect(await site.rows(`SELECT destination,COUNT(*) n FROM recipient_steps WHERE revision_id='${campaign.revisionId}' GROUP BY destination ORDER BY destination`))
      .toEqual([...emails].sort().map(destination => ({destination, n: 3})));
    const settle = async (stepId: string) => {
      await expect.poll(async () => {
        await site.control('/_golive/cron');
        const [pending] = await site.rows(`SELECT COUNT(*) n FROM recipient_steps WHERE step_id='${stepId}' AND transport_disposition IN ('queued','handoff-unknown')`);
        if (pending.n) await site.control('/_golive/clock', {advanceMs: 60000});
        return pending.n;
      }, {timeout: 60000}).toBe(0);
    };
    await site.control('/_golive/clock', {advanceMs: firstAt.getTime() - clock.now + 1});
    await refresh();
    await settle(steps[0].id);
    expect(marketing().map(send => send.to).sort()).toEqual([...emails].sort());

    const purchaseAt = new Date((await site.control('/_golive/clock')).now).toISOString();
    const orderId = commerce.purchase(emails[4], purchaseAt);
    const raw = JSON.stringify({admin_graphql_api_id: orderId});
    const delivery = 'synthetic-mango-270';
    const purchase = await site.call('/webhooks/commerce/shopify', {method: 'POST', raw, headers: {
      'X-Shopify-Hmac-Sha256': createHmac('sha256', 'synthetic-store-webhook-key').update(raw).digest('base64'),
      'X-Shopify-Shop-Domain': 'mango-test.myshopify.com', 'X-Shopify-Topic': 'orders/paid',
      'X-Shopify-Webhook-Id': delivery, 'X-Shopify-Event-Id': delivery,
    }});
    expect(purchase.status).toBe(204);
    expect(commerce.nodeReads).toEqual([orderId]);
    const [record] = await site.rows(`SELECT c.email,s.payload FROM source_records s JOIN contacts c ON c.id=s.contact_id WHERE s.source_type='order' AND s.provider_source_id='${orderId}'`);
    expect(record.email).toBe(emails[4]);
    expect(JSON.parse(record.payload)).toMatchObject({financialStatus: 'PAID', test: false, processedAt: purchaseAt,
      received: {shop: {amount: '48.00', currency: 'AUD'}}, lines: [{productId: commerce.productId}]});

    // All changes enter through production HTTP doors after the first step.
    await rename(emails[0], 'No longer selected');
    await rename(emails[1], 'Ready excluded');
    await rename(newcomer, 'Ready newly matching');
    const letter = marketing().find(send => send.to === emails[2])!;
    const unsubscribe = letter.body.headers['List-Unsubscribe'].slice(1, -1);
    expect((await fetch(site.local(unsubscribe), {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: 'List-Unsubscribe=One-Click'})).status).toBe(200);
    for (const [index, due] of [[1, secondAt], [2, thirdAt]] as const) {
      const current = await site.control('/_golive/clock');
      await site.control('/_golive/clock', {advanceMs: due.getTime() - current.now + 1});
      await refresh();
      // Renew the receiving mailbox's daily sender observation before dispatch.
      await site.control('/_golive/sender-evidence');
      await site.control('/_golive/clock', {advanceMs: 60000});
      const before = marketing().length;
      await settle(steps[index].id);
      const outcomes = await site.rows(`SELECT destination,transport_disposition,skip_reason,attempt_count FROM recipient_steps WHERE step_id='${steps[index].id}' ORDER BY destination`);
      expect(outcomes).toEqual([
        {destination: emails[4], transport_disposition: 'skipped', skip_reason: 'recent-product-purchase', attempt_count: 0},
        {destination: emails[3], transport_disposition: 'accepted', skip_reason: null, attempt_count: 1},
        {destination: emails[1], transport_disposition: 'skipped', skip_reason: 'operator-exclusion-1', attempt_count: 0},
        {destination: emails[0], transport_disposition: 'skipped', skip_reason: 'audience-no-longer-matches', attempt_count: 0},
        {destination: emails[2], transport_disposition: 'skipped', skip_reason: 'channel-not-subscribed', attempt_count: 0},
      ]);
      expect(marketing().slice(before).map(send => send.to)).toEqual([emails[3]]);
    }
    await expect.poll(async () => (await json(await site.call(`/api/campaigns/${campaign.campaignId}`, {cookie}), 200)).campaign.state).toBe('completed');
    await site.control('/_golive/cron');
    expect(marketing().map(send => send.to).sort()).toEqual([...emails, emails[3], emails[3]].sort());
    expect(await site.rows(`SELECT count(*) n FROM recipient_steps WHERE revision_id='${campaign.revisionId}'`)).toEqual([{n: 15}]);
    console.log('PROBE AUD-006 conversion: signed paid order after first marketing handoff -> buyer skipped at steps 2 and 3 with recent-product-purchase and zero attempts; control accepted once at each step');
    console.log('PROBE AUD-006 current eligibility and frozen audience: changed inclusion, custom exclusion and opt-out -> named skips at both later steps; newly matching contact has no recipient-step or handoff');

    await page.context().addCookies([{name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url}]);
     {
      await page.setViewportSize({width, height: 1000});
      await openPage(page, `${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
      await expect(page.getByRole('heading', {name: 'Three garden updates', exact: true})).toBeVisible();
      await expect(page.locator('[data-step-id] [data-disposition=accepted] dd')).toHaveText(['5', '1', '1']);
      for (const reason of ['recent-product-purchase', 'operator-exclusion-1', 'audience-no-longer-matches', 'channel-not-subscribed']) {
        await expect(page.locator(`[data-step-id="${steps[1].id}"] [data-skip-reason="${reason}"] dd`)).toHaveText('1');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({path: info.outputPath(`multistep-completed-${width}.png`), fullPage: true});
      await page.setViewportSize({width: 390, height: 1000});
      await page.screenshot({path: info.outputPath('multistep-completed-390.png'), fullPage: true});
    }
    expect(edge.unexpected).toEqual([]);
    await chosenCatalogJourney(page,info);
  } finally {
    await page.close();
    await site.runtime.close();
    await edge.close();
  }
};
