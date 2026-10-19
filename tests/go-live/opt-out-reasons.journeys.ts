import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import seed from '../../seed.json' with { type: 'json' };
import { providerEdge } from './edge';
import { event, eventSigner } from './sendgrid-events';
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
    for (const width of [1440, 390]) {
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
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: info.outputPath(`unsubscribe-success-${width}.png`), fullPage: true });
    }
    const start = clock.now + 1000;
    for (const n of [1, 2, 3]) await step(`soft bounce ${n}`, await post(event('bounce', carol, start + n * 1000, `other${n}`, {}, { type: 'blocked', reason: '452 mailbox full' })));
    await step('delivered', await post(event('delivered', carol, start + 5000, sent.messageId, { mango_recipient_step, mango_handoff_key })));
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
