const width = 1440;
import {chosenCatalogJourney} from './chosen-catalog-journey';
import {test, expect} from '@playwright/test';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation, json, sender, confirmedContact, draftCampaign, approve} from './harness';
import {openPage} from '../support/navigation';





export const walk0 = async ({page}, info) => {
  const edge = await providerEdge(), site = await installation(edge, eventSigner());
  const marketing = () => edge.sends.filter(send => send.body.headers?.['List-Unsubscribe']);
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', {method: 'PUT', cookie, body: sender}), 200);
    await site.control('/_golive/sender-evidence');
    const emails = ['inclusion@example.test', 'exclusion@example.test', 'optout@example.test', 'control@example.test'];
    for (const email of emails) await confirmedContact(site, edge, cookie, email, `Ready ${email.split('@')[0]}`);
    await confirmedContact(site, edge, cookie, 'new-match@example.test', 'Outside audience');
    const credential = await json(await site.call('/api/settings/integrations', {method: 'POST', cookie,
      body: {name: 'Audience profile updates', scopes: ['contacts:write']}}), 201);
    const rename = async (email: string, displayName: string) => {
      const result = await json(await site.call('/api/integrations/v1/contacts', {method: 'PUT',
        headers: {Authorization: `Bearer ${credential.token}`}, body: {email, displayName, segmentName: 'Profile updates'}}), 200);
      expect(result.contact).toMatchObject({email, displayName, emailStatus: 'subscribed'});
    };
    const clock = await site.control('/_golive/clock', {hold: true});
    const firstAt = new Date(clock.now + 3600000), secondAt = new Date(firstAt.getTime() + 25 * 3600000);
    const campaign = await draftCampaign(site, cookie, 'Two garden updates', emails, firstAt);
    await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`, {method: 'PATCH', cookie, body: {
      inclusionRuleJson: JSON.stringify({version: 1, operator: 'all', predicates: [
        {sourceType: 'contact', field: 'displayName', comparator: 'contains', value: 'Ready'},
      ]}),
      exclusionRulesJson: JSON.stringify([{version: 1, reason: 'operator-exclusion-1', predicate:
        {sourceType: 'contact', field: 'displayName', comparator: 'eq', value: 'Ready excluded'}}]),
      steps: [firstAt, secondAt].map((scheduledAt, index) => ({channel: 'email', timezone: 'Australia/Brisbane',
        scheduledAt: scheduledAt.toISOString(), sendByAt: new Date(scheduledAt.getTime() + 2 * 3600000).toISOString(),
        whyThisTime: index ? 'Following day reminder' : 'Initial announcement'})),
    }}), 200);
    await approve(site, cookie, campaign);
    const steps = await site.rows(`SELECT id,sequence FROM campaign_steps WHERE revision_id='${campaign.revisionId}' ORDER BY sequence`);
    expect(steps).toHaveLength(2);
    const settle = async (stepId: string) => {
      await expect.poll(async () => {
        await site.control('/_golive/cron');
        const [pending] = await site.rows(`SELECT COUNT(*) n FROM recipient_steps WHERE step_id='${stepId}' AND transport_disposition IN ('queued','handoff-unknown')`);
        if (pending.n) await site.control('/_golive/clock', {advanceMs: 60000});
        return pending.n;
      }, {timeout: 60000}).toBe(0);
    };
    await site.control('/_golive/clock', {advanceMs: firstAt.getTime() - clock.now + 1});
    await settle(steps[0].id);
    expect(marketing().map(send => send.to).sort()).toEqual([...emails].sort());

    // All changes enter through production HTTP doors after the first step.
    await rename(emails[0], 'No longer selected');
    await rename(emails[1], 'Ready excluded');
    await rename('new-match@example.test', 'Ready newly matching');
    const letter = marketing().find(send => send.to === emails[2])!;
    const unsubscribe = letter.body.headers['List-Unsubscribe'].slice(1, -1);
    expect((await fetch(site.local(unsubscribe), {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: 'List-Unsubscribe=One-Click'})).status).toBe(200);
    const beforeSecond = await site.control('/_golive/clock');
    await site.control('/_golive/clock', {advanceMs: secondAt.getTime() - beforeSecond.now + 1});
    // The receiving mailbox's sender observation expires after one day.
    await site.control('/_golive/sender-evidence');
    await site.control('/_golive/clock', {advanceMs: 60000});
    await settle(steps[1].id);
    const outcomes = await site.rows(`SELECT destination,transport_disposition,skip_reason,attempt_count FROM recipient_steps WHERE step_id='${steps[1].id}' ORDER BY destination`);
    expect(outcomes).toEqual([
      {destination: emails[3], transport_disposition: 'accepted', skip_reason: null, attempt_count: 1},
      {destination: emails[1], transport_disposition: 'skipped', skip_reason: 'operator-exclusion-1', attempt_count: 0},
      {destination: emails[0], transport_disposition: 'skipped', skip_reason: 'audience-no-longer-matches', attempt_count: 0},
      {destination: emails[2], transport_disposition: 'skipped', skip_reason: 'channel-not-subscribed', attempt_count: 0},
    ]);
    await expect.poll(async () => (await json(await site.call(`/api/campaigns/${campaign.campaignId}`, {cookie}), 200)).campaign.state).toBe('completed');
    await site.control('/_golive/cron');
    expect(marketing().map(send => send.to).sort()).toEqual([...emails, emails[3]].sort());
    expect(await site.rows(`SELECT count(*) n FROM recipient_steps WHERE revision_id='${campaign.revisionId}'`)).toEqual([{n: 8}]);

    await page.context().addCookies([{name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url}]);
     {
      await page.setViewportSize({width, height: 1000});
      await openPage(page, `${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
      await expect(page.getByRole('heading', {name: 'Two garden updates', exact: true})).toBeVisible();
      await expect(page.locator('[data-step-id] [data-disposition=accepted] dd')).toHaveText(['4', '1']);
      for (const reason of ['operator-exclusion-1', 'audience-no-longer-matches', 'channel-not-subscribed']) {
        await expect(page.locator(`[data-step-id="${steps[1].id}"] [data-skip-reason="${reason}"] dd`)).toHaveText('1');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({path: info.outputPath(`multistep-completed-${width}.png`), fullPage: true});
    }
    expect(edge.unexpected).toEqual([]);
    await chosenCatalogJourney(page,info);
  } finally {
    await page.close();
    await site.runtime.close();
    await edge.close();
  }
};
