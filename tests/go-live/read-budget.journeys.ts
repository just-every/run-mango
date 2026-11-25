import { expect, test } from '@playwright/test';
import { providerEdge } from './edge';
import { eventSigner } from './sendgrid-events';
import { approve, confirmedContact, draftCampaign, installation, json, sender } from './harness';

// D1 Free allows 5,000,000 rows read a day for the whole Cloudflare account, and the minute Cron
// alone runs 1,440 times. Real Worker, Cron entry and routes on D1; only the provider edge is substituted.
test('[CAMP-010] the minute Cron and the deliverability poll read a bounded number of D1 rows however many sends are stored', async () => {
  const edge = await providerEdge(), signer = eventSigner();
  const site = await installation(edge, signer).catch(async error => { await edge.close(); throw error; });
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', { method: 'PUT', cookie, body: sender }), 200);
    await site.control('/_golive/sender-evidence');
    const email = 'budget@example.test';
    await confirmedContact(site, edge, cookie, email, 'Budget test');
    // A scheduled campaign stays in the Cron's completion check until it is sent.
    const letter = await draftCampaign(site, cookie, 'Budget newsletter', [email], new Date(Date.now() + 3 * 3600_000));
    expect((await approve(site, cookie, letter)).status).toBe('scheduled');
    let costliest: string[] = [];
    const cron = async () => {
      const run = await site.control('/_golive/cron', { meter: true });
      costliest = run.costliest;
      return Number(run.rowsRead);
    };
    await cron();
    const empty = await cron();
    await site.control('/_golive/seed-history', { recipients: 3000 });
    const stored = await cron();
    expect(stored, `Cron read ${stored} rows with 3,000 stored sends, ${empty} with none: ${costliest.join('; ')}`).toBeLessThan(1500);
    expect(stored - empty).toBeLessThan(500);
    // The poll covers the reporting window, never the whole history: one day of the thirty seeded.
    const poll = await site.call('/api/insights/deliverability?windowDays=1', { cookie, headers: { 'X-GoLive-Meter': site.runtime.token } });
    await json(poll.clone(), 200);
    const pollRows = Number(poll.headers.get('X-GoLive-Rows-Read'));
    expect(pollRows).toBeGreaterThan(0);
    expect(pollRows, `deliverability poll read ${pollRows} rows: ${poll.headers.get('X-GoLive-Costliest')}`).toBeLessThan(8000);
    console.log(`READ_BUDGET ${JSON.stringify({cronWithoutHistory:empty,cronWithHistory:stored,pollOneDayWindow:pollRows})}`);
  } finally {
    await site.runtime.close();
    await edge.close();
  }
});
