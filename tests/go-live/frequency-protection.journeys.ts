import {writeFile} from 'node:fs/promises';
import {test, expect} from '@playwright/test';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {installation, json, sender, confirmedContact, draftCampaign, approve} from './harness';
import {openPage} from '../support/navigation';

test('[AUD-004] an email frequency exclusion is terminal even after its window expires', async ({page}, info) => {
  const edge = await providerEdge(), site = await installation(edge, eventSigner());
  const marketing = () => edge.sends.filter(send => send.body.headers?.['List-Unsubscribe']);
  const repeat = ['synthetic-mango-971', 'example.test'].join('@');
  const control = ['synthetic-mango-972', 'example.test'].join('@');
  const hour = 3600000;
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', {method: 'PUT', cookie, body: sender}), 200);
    await site.control('/_golive/sender-evidence');
    await confirmedContact(site, edge, cookie, repeat, 'Repeat reader');
    await confirmedContact(site, edge, cookie, control, 'Fresh reader');
    const clock = await site.control('/_golive/clock', {hold: true});
    const firstAt = clock.now + hour, secondAt = firstAt + 4 * hour, deadline = secondAt + 48 * hour;
    const first = await draftCampaign(site, cookie, 'First garden letter', [repeat], new Date(firstAt));
    const second = await draftCampaign(site, cookie, 'Frequency protected letter', [repeat, control], new Date(secondAt));
    await json(await site.call(`/api/campaign-revisions/${second.revisionId}`, {method: 'PATCH', cookie, body: {
      steps: [{channel: 'email', timezone: 'Australia/Brisbane', scheduledAt: new Date(secondAt).toISOString(),
        sendByAt: new Date(deadline).toISOString(), whyThisTime: 'Owner chose a long send window'}],
    }}), 200);

    // Both freezes precede any marketing history, so dispatch must make the exclusion.
    await approve(site, cookie, first);
    await approve(site, cookie, second);
    expect(marketing()).toEqual([]);
    expect(await site.rows(`SELECT campaign_id,revision_id FROM campaign_approval_requests ORDER BY campaign_id`))
      .toEqual([first, second].map(campaign => ({campaign_id: campaign.campaignId, revision_id: campaign.revisionId}))
        .sort((left, right) => left.campaign_id.localeCompare(right.campaign_id)));
    expect(await site.rows(`SELECT destination,transport_disposition,attempt_count FROM recipient_steps WHERE campaign_id='${second.campaignId}' ORDER BY destination`))
      .toEqual([repeat, control].sort().map(destination => ({destination, transport_disposition: 'queued', attempt_count: 0})));

    const advanceTo = async (now: number) => {
      const current = await site.control('/_golive/clock');
      await site.control('/_golive/clock', {advanceMs: now - current.now});
    };
    const settle = async (campaignId: string) => {
      await site.control('/_golive/cron');
      await expect.poll(async () => {
        const pending = await site.rows(`SELECT id FROM recipient_steps WHERE campaign_id='${campaignId}' AND transport_disposition IN ('queued','handoff-unknown')`);
        if (pending.length) {
          await site.control('/_golive/clock', {advanceMs: 60000});
          await site.control('/_golive/cron');
        }
        return pending.length;
      }, {timeout: 60000}).toBe(0);
    };
    await advanceTo(firstAt + 1);
    await settle(first.campaignId);
    expect(marketing().map(send => send.to)).toEqual([repeat]);
    const [firstReceipt] = await site.rows(`SELECT transport_disposition,attempt_count,provider_accepted_at FROM recipient_steps WHERE campaign_id='${first.campaignId}'`);
    expect(firstReceipt).toMatchObject({transport_disposition: 'accepted', attempt_count: 1});
    expect(firstReceipt.provider_accepted_at).toBeGreaterThanOrEqual(firstAt);

    await advanceTo(secondAt + 1);
    await settle(second.campaignId);
    const outcomes = () => site.rows(`SELECT id,destination,transport_disposition,skip_reason,attempt_count,terminal_at,next_attempt_at,provider_message_id,handoff_started_at,send_by_at
      FROM recipient_steps WHERE campaign_id='${second.campaignId}' ORDER BY destination`);
    const terminal = await outcomes();
    expect(terminal).toHaveLength(2);
    const skipped = terminal.find(row => row.destination === repeat)!;
    expect(skipped).toMatchObject({transport_disposition: 'skipped', skip_reason: 'frequency-window', attempt_count: 0,
      next_attempt_at: secondAt, provider_message_id: null, handoff_started_at: null, send_by_at: deadline});
    expect(skipped.terminal_at).toBeGreaterThanOrEqual(secondAt);
    expect(skipped.terminal_at - firstReceipt.provider_accepted_at).toBeLessThan(24 * hour);
    expect(terminal.find(row => row.destination === control)).toMatchObject({transport_disposition: 'accepted', skip_reason: null, attempt_count: 1});
    expect(marketing().map(send => send.to).sort()).toEqual([repeat, control].sort());
    const handoffs = marketing().map(send => ({to: send.to, messageId: send.messageId}));
    const attempts = [...edge.behavior.attempts];
    expect(terminal.find(row => row.destination === control)!.provider_message_id).toBe(handoffs.find(send => send.to === control)!.messageId);
    const read = async () => json(await site.call(`/api/campaigns/${second.campaignId}`, {cookie}), 200);
    const result = await read();
    expect(result.campaign.state).toBe('completed');
    expect(result.results.steps[0].counts).toEqual(expect.arrayContaining([
      {disposition: 'accepted', reason: null, count: 1},
      {disposition: 'skipped', reason: 'frequency-window', count: 1},
    ]));
    console.log('PROBE AUD-004 acceptance-1: two preapproved email campaigns -> repeat skipped with frequency-window, zero attempts; fresh control accepted');

    // Keep the deadline open: expiration must not hide a postponed marketing send.
    await advanceTo(firstReceipt.provider_accepted_at + 26 * hour);
    const later = await site.control('/_golive/clock');
    expect(later.now).toBeLessThan(deadline);
    await site.control('/_golive/sender-evidence');
    const emissions = await site.control('/_golive/emissions');
    const index = emissions.findIndex((item: any) => item.command.kind === 'campaign.dispatch' && item.command.payload.revisionId === second.revisionId);
    expect(index).toBeGreaterThanOrEqual(0);
    const completions = emissions[index].completedQueues.length;
    await site.control('/_golive/replay', {index});
    await site.control('/_golive/cron');
    await expect.poll(async () => (await site.control('/_golive/emissions'))[index].completedQueues.length, {timeout: 60000}).toBeGreaterThan(completions);
    await site.control('/_golive/clock', {advanceMs: 60000});
    await site.control('/_golive/cron');
    expect(await outcomes()).toEqual(terminal);
    expect((await read()).results.steps[0].counts).toEqual(result.results.steps[0].counts);
    expect(marketing().map(send => ({to: send.to, messageId: send.messageId}))).toEqual(handoffs);
    expect(edge.behavior.attempts.filter(attempt => [repeat, control].includes(attempt.to)))
      .toEqual(attempts.filter(attempt => [repeat, control].includes(attempt.to)));
    console.log('PROBE AUD-004 no-deferral: native dispatch replay and Cron after 26 hours with renewed sender evidence and open deadline -> identical terminal row, no delayed handoff');

    await page.context().addCookies([{name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url}]);
    await openPage(page, `${site.runtime.url}/app/campaigns/${second.campaignId}/scheduled`);
    await expect(page.getByRole('heading', {name: 'Frequency protected letter', exact: true})).toBeVisible();
    await expect(page.locator('[data-skip-reason="frequency-window"] dt')).toHaveText('Skipped — frequency protection');
    await expect(page.locator('[data-skip-reason="frequency-window"] dd')).toHaveText('1');
    await expect(page.locator('[data-disposition="accepted"] dd')).toHaveText('1');
    await expect(page.locator('[data-disposition="queued"]')).toHaveCount(0);
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await page.screenshot({path: info.outputPath(`frequency-protection-${width}.png`), fullPage: true});
    }
    expect(edge.unexpected).toEqual([]);
    await writeFile(info.outputPath('frequency-protection.json'), JSON.stringify({firstReceipt, terminal, replayAt: later.now,
      afterReplay: await outcomes(), results: (await read()).results, marketing: marketing().map(send => ({to: send.to, messageId: send.messageId}))}, null, 2));
  } finally {
    await page.close();
    await site.runtime.close();
    await edge.close();
  }
});
