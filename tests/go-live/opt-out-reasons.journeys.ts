import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import seed from '../../seed.json' with { type: 'json' };
import { providerEdge } from './edge';
import { event, eventSigner } from './sendgrid-events';
import { localSessionCookieName } from '../support/local-session';
import { openPage } from '../support/navigation';
import type { ContactTimelineEntry } from '../../src/core/features/audience/contact-timeline';
import { approve, confirmedContact, dispatch, draftCampaign, installation, json, sender, signedPost } from './harness';

// A person's opt-out outlives provider reconciliation: soft-bounce suppression and a later
// delivery fact add and lift their own record, never the opt-out (CONT-005, CONT-006).
test('[MSG-010][CONT-005][CONT-006] fast, token-isolated one-click opt-outs survive three signed soft bounces and a signed delivery', async ({ page }, info) => {
  const edge = await providerEdge(), signer = eventSigner();
  const site = await installation(edge, signer);
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', { method: 'PUT', cookie, body: sender }), 200);
    await site.control('/_golive/sender-evidence');
    const carol = 'carol@example.test', dave = 'dave@example.test';
    await confirmedContact(site, edge, cookie, carol, 'carol');
    await confirmedContact(site, edge, cookie, dave, 'dave');
    const due = new Date(Date.now() + 20_000);
    const letter = await draftCampaign(site, cookie, 'Spring letter', [carol, dave], due);
    expect((await approve(site, cookie, letter)).status).toBe('scheduled');
    const nextDue = new Date(due.getTime() + 3600_000);
    const next = await draftCampaign(site, cookie, 'Summer letter', [carol, dave], nextDue);
    expect((await approve(site, cookie, next)).status).toBe('scheduled');
    expect((await dispatch(site, letter.campaignId, due)).map(row => row.transport_disposition)).toEqual(['accepted', 'accepted']);
    // Freeze only the Worker's wall clock so the allowance cannot roll over mid-journey.
    // HTTP latency below uses the runner's real monotonic clock, including response bodies.
    const clock = await site.control('/_golive/clock', { hold: true });
    expect(await site.count('recipient_steps')).toBe(4);
    const sent = edge.sends.findLast(send => send.to === carol && send.body.headers?.['List-Unsubscribe'])!;
    const { mango_recipient_step, mango_handoff_key } = sent.body.custom_args;
    const post = (...events: unknown[]) => { const body = Buffer.from(JSON.stringify(events)); return signedPost(site, '/webhooks/mail/sendgrid', body, signer.headers(body)); };
    const steps: unknown[] = [];
    const step = async (name: string, status: number) => steps.push({ name, status,
      address: (await site.rows(`SELECT channel_status FROM contact_email_addresses WHERE email='${carol}'`))[0].channel_status,
      records: (await site.rows('SELECT reason FROM surviving_opt_outs ORDER BY reason')).map(row => row.reason) });

    const oneClick = /^<(https:\/\/[^>]+)>$/.exec(sent.body.headers['List-Unsubscribe'])![1];
    const confirmation = oneClick.replace('/unsubscribe/one-click/', '/unsubscribe/');
    const timings: Array<{ name: string; method: string; status: number; elapsedMs: number }> = [];
    let tokenRequests = 0;
    const request = async (name: string, link: string, method = 'GET') => {
      const start = performance.now();
      const response = await fetch(site.local(link), { method, redirect: 'manual', headers: {
        'CF-Connecting-IP': '203.0.113.24',
        ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      }, body: method === 'POST' ? 'List-Unsubscribe=One-Click' : undefined });
      const body = await response.text();
      const elapsedMs = performance.now() - start;
      if (link === oneClick || link === confirmation) tokenRequests++;
      timings.push({ name, method, status: response.status, elapsedMs });
      expect(elapsedMs, `${name}: full HTTP response in milliseconds`).toBeLessThan(2000);
      return { status: response.status, body, location: response.headers.get('Location') };
    };
    expect((await request('confirmation GET', confirmation)).status).toBe(200);
    await page.setExtraHTTPHeaders({ 'CF-Connecting-IP': '203.0.113.24' });
    expect((await page.goto(site.local(confirmation)))?.status()).toBe(200);
    tokenRequests++;
    await expect(page.locator('form')).toHaveCount(1);
    for (const width of [1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: info.outputPath(`unsubscribe-confirmation-${width}.png`), fullPage: true });
    }
    expect((await site.rows(`SELECT channel_status FROM contact_email_addresses WHERE email='${carol}'`))[0].channel_status).toBe('subscribed');
    expect(await site.count('surviving_opt_outs')).toBe(0);
    const clicked = await request('one-click POST', oneClick, 'POST');
    expect(clicked).toMatchObject({ status: 200, location: null });
    await step('one-click', clicked.status);
    // The visible confirmation remains safe to complete after the mail client opted out.
    const [confirmed] = await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.locator('form').getByRole('button').click(),
    ]);
    expect(confirmed?.status()).toBe(200);
    tokenRequests++;
    await expect(page.locator('form')).toHaveCount(0);
    for (const width of [1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: info.outputPath(`unsubscribe-success-${width}.png`), fullPage: true });
    }
    const start = Math.floor(clock.now / 1000) * 1000;
    const bounces = [
      { id: 'synthetic-mango-701', at: start + 3000, messageId: 'synthetic-mango-711', count: 1 },
      { id: 'synthetic-mango-702', at: start + 6000, messageId: 'synthetic-mango-712', count: 2 },
      { id: 'synthetic-mango-703', at: start + 10000, messageId: 'synthetic-mango-713', count: 3 },
    ];
    const softFact = (fact: typeof bounces[number]) => event('bounce', carol, fact.at, fact.messageId, {}, {
      sg_event_id: fact.id, type: 'blocked', reason: '452 mailbox full',
    });
    const [{ contact_id: contactId }] = await site.rows(`SELECT contact_id FROM contact_email_addresses WHERE email='${carol}'`);
    const count = async () => {
      const rows = await site.rows(`SELECT consecutive_soft_bounces FROM contact_bounce_states WHERE contact_id='${contactId}'`);
      expect(rows).toHaveLength(1);
      return rows[0].consecutive_soft_bounces;
    };
    const detail = () => site.call(`/api/contacts/${contactId}`, { cookie }).then(response => json(response, 200));
    const bounceRows = () => site.rows(`SELECT provider_event_id, kind, occurred_at FROM contact_bounce_facts WHERE contact_id='${contactId}' ORDER BY occurred_at, provider_event_id`);
    const expectedHistory = bounces.map(fact => ({ kind: 'soft-bounce', detail: `Consecutive soft bounce count: ${fact.count}.`, occurredAt: new Date(fact.at).toISOString() }));
    for (const [index, fact] of bounces.entries()) {
      await step(`soft bounce ${index + 1}`, await post(softFact(fact)));
      expect(await count()).toBe(fact.count);
    }
    const beforeDelivery = await detail();
    expect(beforeDelivery.history.filter((row: any) => row.kind === 'soft-bounce').map(({ kind, detail, occurredAt }: any) => ({ kind, detail, occurredAt }))
      .sort((a: any, b: any) => a.occurredAt.localeCompare(b.occurredAt))).toEqual(expectedHistory);
    const earlierFacts = await bounceRows();
    expect(earlierFacts.map(({ kind, occurred_at }) => ({ kind, occurred_at }))).toEqual(bounces.map(fact => ({ kind: 'soft-bounce', occurred_at: fact.at })));
    const recipientOptOut = () => site.rows("SELECT * FROM surviving_opt_outs WHERE reason='recipient-unsubscribe'");
    const originalOptOut = await recipientOptOut();
    expect(originalOptOut).toHaveLength(1);
    // Duplicates must preserve the active restriction as well as the later reset.
    expect(await post(softFact(bounces[2]), softFact(bounces[0]), softFact(bounces[1]))).toBe(204);
    expect(await bounceRows()).toEqual(earlierFacts);
    const suppressedReplay = await detail();
    expect(suppressedReplay.history).toEqual(beforeDelivery.history);
    expect(suppressedReplay.suppressions).toEqual(beforeDelivery.suppressions);
    expect(suppressedReplay.contact.emailStatus).toBe('suppressed');
    const nonzeroCount = await count();
    expect(nonzeroCount).toBeGreaterThan(0);
    const deliveredAt = start + 14000;
    const delivered = event('delivered', carol, deliveredAt, sent.messageId, { mango_recipient_step, mango_handoff_key }, { sg_event_id: 'synthetic-mango-704' });
    await step('delivered', await post(delivered));
    const resetCount = await count();
    expect(resetCount).toBe(0);
    const afterDelivery = await detail();
    expect(afterDelivery.contact.emailStatus).toBe('unsubscribed');
    expect(afterDelivery.history.filter((row: any) => row.kind === 'soft-bounce')).toEqual(beforeDelivery.history.filter((row: any) => row.kind === 'soft-bounce'));
    expect(afterDelivery.history.filter((row: any) => row.kind === 'provider-delivery')).toEqual([
      expect.objectContaining({ occurredAt: new Date(deliveredAt).toISOString() }),
    ]);
    const resetFacts = await bounceRows();
    expect(resetFacts.filter(row => row.kind === 'soft-bounce')).toEqual(earlierFacts);
    expect(resetFacts.filter(row => row.kind === 'delivery')).toEqual([
      { provider_event_id: expect.any(String), kind: 'delivery', occurred_at: deliveredAt },
    ]);
    expect(await recipientOptOut()).toEqual(originalOptOut);

    const fresh = { id: 'synthetic-mango-705', at: start + 21000, messageId: 'synthetic-mango-715', count: 1 };
    expect(await post(softFact(fresh))).toBe(204);
    const freshCount = await count();
    expect(freshCount).toBe(1);
    const afterFresh = await detail();
    expect(afterFresh.contact.emailStatus).toBe('unsubscribed');
    expect(afterFresh.suppressions).toEqual([]);
    expect(afterFresh.history.filter((row: any) => row.kind === 'opt-out')).toEqual(beforeDelivery.history.filter((row: any) => row.kind === 'opt-out'));
    expect((await bounceRows()).filter(row => row.kind === 'soft-bounce' && row.occurred_at < deliveredAt)).toEqual(earlierFacts);
    const allExpectedHistory = [...expectedHistory, { kind: 'soft-bounce', detail: 'Consecutive soft bounce count: 1.', occurredAt: new Date(fresh.at).toISOString() }];
    const historyFacts = afterFresh.history.filter((row: any) => row.kind === 'soft-bounce');
    expect(historyFacts.map(({ kind, detail, occurredAt }: any) => ({ kind, detail, occurredAt })).sort((a: any, b: any) => a.occurredAt.localeCompare(b.occurredAt))).toEqual(allExpectedHistory);
    const timeline: ContactTimelineEntry[] = afterFresh.timeline;
    expect(timeline.filter(row => row.kind === 'soft-bounce').map(({ kind, detail, occurredAt }) => ({ kind, detail, occurredAt })).reverse()).toEqual(allExpectedHistory);
    expect(timeline.filter(row => row.kind === 'soft-bounce').map(({ kind, detail, occurredAt, source }) => ({ kind, detail, occurredAt, source })).reverse())
      .toEqual(allExpectedHistory.map(fact => ({ ...fact, source: 'Contact ledger' })));
    expect(timeline.filter(row => row.kind === 'provider-delivery')).toEqual([
      expect.objectContaining({ kind: 'provider-delivery', detail: 'email delivery confirmed by the provider.',
        source: 'Contact ledger', occurredAt: new Date(deliveredAt).toISOString() }),
    ]);
    expect(timeline.filter(row => row.kind === 'soft-bounce').map(row => row.id).sort()).toEqual(historyFacts.map((row: any) => `history:${row.id}`).sort());

    const settledFacts = await bounceRows();
    expect(await post(softFact(bounces[1]), delivered, softFact(fresh), softFact(bounces[0]), softFact(bounces[2]))).toBe(204);
    const replayCount = await count();
    expect(replayCount).toBe(1);
    expect(await bounceRows()).toEqual(settledFacts);
    const afterReplay = await detail();
    expect(afterReplay.history).toEqual(afterFresh.history);
    expect(afterReplay.timeline).toEqual(afterFresh.timeline);
    expect(afterReplay.contact.emailStatus).toBe('unsubscribed');
    expect(await recipientOptOut()).toEqual(originalOptOut);
    expect((await site.rows('SELECT reason FROM surviving_opt_outs ORDER BY reason')).map(row => row.reason)).toEqual(['recipient-unsubscribe']);

    const [cookieName, cookieValue] = cookie.split('=');
    expect(cookieName).toBe(localSessionCookieName(site.runtime.url));
    await page.context().addCookies([{ name: cookieName, value: cookieValue, url: site.runtime.url }]);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openPage(page, `${site.runtime.url}/app/audience/${contactId}`);
    const activity = page.getByRole('region', { name: 'Recorded contact activity' });
    while (await activity.getByRole('button', { name: /Show more activity/ }).count()) await activity.getByRole('button', { name: /Show more activity/ }).click();
    await expect(activity.locator('[data-timeline-kind="soft-bounce"]')).toHaveCount(allExpectedHistory.length);
    for (const fact of timeline.filter(row => row.kind === 'soft-bounce' || row.kind === 'provider-delivery' || row.kind === 'opt-out')) {
      const entry = activity.locator(`[data-timeline-id="${fact.id}"]`);
      await expect(entry).toBeVisible();
      await expect(entry.locator('p').first()).toHaveText(fact.detail);
      await expect(entry.locator('small')).toHaveText('Source: Contact ledger');
      await expect(entry.locator('time')).toHaveAttribute('datetime', fact.occurredAt);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const screenshot = info.outputPath(`soft-bounce-history-${width}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      await info.attach(`soft-bounce-history-${width}`, { path: screenshot, contentType: 'image/png' });
    }
    const reconciliation = JSON.stringify({ nonzeroCount, resetCount, freshCount, replayCount, expectedHistory: allExpectedHistory,
      replayWhileSuppressed: { status: suppressedReplay.contact.emailStatus, historyUnchanged: true, suppressionsUnchanged: true },
      recipientOptOutUnchanged: true,
      recordedHistory: historyFacts, bounceFacts: settledFacts,
      timeline: timeline.filter(row => row.kind === 'soft-bounce' || row.kind === 'provider-delivery' || row.kind === 'opt-out') }, null, 2) + '\n';
    await info.attach('soft-bounce-reconciliation', { body: reconciliation, contentType: 'application/json' });
    if (process.env.GO_LIVE_EVIDENCE) {
      await mkdir(process.env.GO_LIVE_EVIDENCE, { recursive: true });
      await writeFile(join(process.env.GO_LIVE_EVIDENCE, 'soft-bounce-reconciliation.json'), reconciliation);
    }
    if (process.env.GO_LIVE_EVIDENCE) {
      await mkdir(process.env.GO_LIVE_EVIDENCE, { recursive: true });
      await writeFile(join(process.env.GO_LIVE_EVIDENCE, 'opt-out-reasons.json'), JSON.stringify(steps, null, 2) + '\n');
    }

    expect(steps).toEqual([
      { name: 'one-click', status: 200, address: 'unsubscribed', records: ['recipient-unsubscribe'] },
      { name: 'soft bounce 1', status: 204, address: 'unsubscribed', records: ['recipient-unsubscribe'] },
      { name: 'soft bounce 2', status: 204, address: 'unsubscribed', records: ['recipient-unsubscribe'] },
      { name: 'soft bounce 3', status: 204, address: 'suppressed', records: ['recipient-unsubscribe', 'three-consecutive-soft-bounces'] },
      { name: 'delivered', status: 204, address: 'unsubscribed', records: ['recipient-unsubscribe'] },
    ]);

    // GET and POST share the token's manifest allowance, across both public URLs.
    const allowance = seed.limits.unsubscribeRequestsPerMinutePerToken;
    while (tokenRequests < allowance) {
      expect((await request(`allowed token request ${tokenRequests + 1}`, confirmation)).status).toBe(200);
    }
    expect((await request('exhausted token GET', confirmation)).status).toBe(429);
    expect((await request('exhausted token POST', oneClick, 'POST')).status).toBe(429);

    // The same mailbox-provider IP can still unsubscribe another real recipient.
    const other = edge.sends.findLast(send => send.to === dave && send.body.headers?.['List-Unsubscribe'])!;
    const otherOneClick = /^<(https:\/\/[^>]+)>$/.exec(other.body.headers['List-Unsubscribe'])![1];
    expect(otherOneClick).not.toBe(oneClick);
    expect((await request('distinct token GET from same IP', otherOneClick.replace('/unsubscribe/one-click/', '/unsubscribe/'))).status).toBe(200);
    expect((await site.rows(`SELECT channel_status FROM contact_email_addresses WHERE email='${dave}'`))[0].channel_status).toBe('subscribed');
    expect(await site.count('surviving_opt_outs')).toBe(1);
    expect(await request('distinct token POST from same IP', otherOneClick, 'POST')).toMatchObject({ status: 200, location: null });
    expect(await site.rows('SELECT email, channel_status FROM contact_email_addresses ORDER BY email')).toEqual([
      { email: carol, channel_status: 'unsubscribed' }, { email: dave, channel_status: 'unsubscribed' },
    ]);

    // Opt-outs stop hand-off even for recipients frozen by approval before either POST.
    const sendsBefore = edge.sends.length;
    await site.control('/_golive/clock', { advanceMs: nextDue.getTime() - clock.now + 1 });
    const outcomes = (await dispatch(site, next.campaignId, nextDue)).map(row => ({
      email: row.email, disposition: row.transport_disposition, reason: row.skip_reason,
    }));
    expect(outcomes).toEqual([
      { email: carol, disposition: 'skipped', reason: 'channel-not-subscribed' },
      { email: dave, disposition: 'skipped', reason: 'channel-not-subscribed' },
    ]);
    expect(edge.sends).toHaveLength(sendsBefore);
    const evidence = JSON.stringify({ allowance, timings, outcomes }, null, 2) + '\n';
    await test.info().attach('unsubscribe-availability', { body: evidence, contentType: 'application/json' });
    if (process.env.GO_LIVE_EVIDENCE) {
      await writeFile(join(process.env.GO_LIVE_EVIDENCE, 'unsubscribe-availability.json'), evidence);
    }
  } finally { await page.close(); await site.runtime.close(); await edge.close(); }
});
