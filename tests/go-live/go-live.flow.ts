const width = 1440;
import { expect, test, type Page } from '@playwright/test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { providerEdge } from './edge';
import { event, eventSigner } from './sendgrid-events';
import { decodeProviderReference } from '../../src/core/shared/provider-reference';
import { localSessionCookieName } from '../support/local-session';
import { archiveRows, importContacts, transfer } from './restore';
import { approve, availableTransport, confirmedContact, dispatch, draftCampaign, installation, json, rule, sender, signedPost, type Installation } from './harness';

// One installation runs the whole go-live sequence: confirmed contacts, an
// approved campaign handed to SendGrid, signed delivery facts, one-click
// opt-out, then recovery into a second empty installation (DATA-001).
test.describe.configure({ mode: 'serial' });
const evidence = process.env.GO_LIVE_EVIDENCE;
const record = async (name: string, value: unknown) => {
  if (!evidence) return;
  await mkdir(evidence, { recursive: true });
  await writeFile(join(evidence, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
};
const screens = async (page: Page, url: string, name: string, info: { outputPath(name: string): string }) => {
   {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url); await page.waitForLoadState('networkidle');
    await page.screenshot({ path: evidence ? join(evidence, `${name}-${width}.png`) : info.outputPath(`${name}-${width}.png`), fullPage: true });
  }
  return page.locator('main').innerText();
};

const edgeServer = providerEdge(), signer = eventSigner();
let site: Installation, cookie = '';
const state: Record<string, any> = {};

test.afterAll(async () => { await site?.runtime.close(); await (await edgeServer).close(); });

/** A populated marketing history stays unchanged by an authorized test, while
 * the same subscribed destination remains available for ordinary approval. */
export const walkTestIsolation = async () => {
  const edge = await edgeServer, isolated = await installation(edge, signer);
  try {
    const owner = await isolated.open();
    await json(await isolated.call('/api/settings/sender', { method: 'PUT', cookie: owner, body: sender }), 200);
    await isolated.control('/_golive/sender-evidence');
    const [tested, eligible, recent] = [801, 802, 803].map(id => `synthetic-mango-${id}${sender.fromEmail.slice(sender.fromEmail.indexOf('@'))}`);
    for (const destination of [tested, eligible, recent]) await confirmedContact(isolated, edge, owner, destination, destination.split('@')[0]);
    const now = async () => (await isolated.control('/_golive/clock')).now;
    const previousDue = new Date(await now() + 60_000);
    const previous = await draftCampaign(isolated, owner, 'Earlier garden letter', [recent], previousDue);
    expect((await approve(isolated, owner, previous)).status).toBe('scheduled');
    await isolated.control('/_golive/clock', { advanceMs: 60_001 });
    const priorRecipients = await dispatch(isolated, previous.campaignId, previousDue);
    expect(priorRecipients.map(row => [row.email, row.transport_disposition])).toEqual([[recent, 'accepted']]);
    const prior = (await isolated.rows(`SELECT * FROM recipient_steps WHERE id='${priorRecipients[0].id}'`))[0];
    expect(prior.handed_off_at).toBeGreaterThanOrEqual(previousDue.getTime());
    const priorMessage = edge.sends.findLast(message => message.to === recent
      && decodeProviderReference(message.body.custom_args?.mango_recipient_step ?? '') === prior.id)!;
    const delivered = Buffer.from(JSON.stringify([event('delivered', recent, prior.handed_off_at, priorMessage.messageId, priorMessage.body.custom_args)]));
    expect(await signedPost(isolated, '/webhooks/mail/sendgrid', delivered, signer.headers(delivered))).toBe(204);
    // Independently valued historical attribution, as in the report fixtures:
    // this is retained input, not a substitute for any application result read.
    const attributedAt = prior.handed_off_at + 1, attributionId = 'synthetic-mango-804';
    await isolated.runtime.sql(`INSERT INTO attribution_facts
      (id,order_source_record_id,campaign_id,recipient_step_id,click_fact_id,attribution_window_days,gross_amount_minor,refund_amount_minor,currency,attributed_at,updated_at,created_at)
      VALUES('${attributionId}','synthetic-mango-805','${previous.campaignId}','${prior.id}','synthetic-mango-806',7,4200,200,'USD',${attributedAt},${attributedAt},${attributedAt})`);
    const due = new Date(await now() + 60_000);
    const campaign = await draftCampaign(isolated, owner, 'Test isolation letter', [tested, eligible, recent], due);
    const audience = async (destinations: string[]) => {
      const { asOf, ...counts } = await json(await isolated.call('/api/campaign-authoring/audience', { method: 'POST', cookie: owner,
        body: { inclusionRuleJson: rule(destinations), exclusionRulesJson: '[]', channels: ['email'] } }), 200);
      return counts;
    };
    const memberships = async () => Promise.all([tested, eligible, recent].map(destination => audience([destination])));
    const beforeMembership = await memberships();
    for (const counts of beforeMembership.slice(0, 2)) expect(counts).toEqual({ status: 'ok', candidateCount: 1, excludedCount: 0, eligibleCount: 1,
      channelCounts: [{ channel: 'email', stepCount: 1, eligibleContactCount: 1, recipientStepCount: 1 }], exclusions: [] });
    expect(beforeMembership[2]).toEqual({ status: 'ok', candidateCount: 1, excludedCount: 1, eligibleCount: 0,
      channelCounts: [{ channel: 'email', stepCount: 1, eligibleContactCount: 0, recipientStepCount: 0 }], exclusions: [{ reason: 'frequency-window', count: 1 }] });
    const results = async () => {
      const marketing = await json(await isolated.call('/api/insights', { cookie: owner }), 200);
      const campaigns = await Promise.all([previous, campaign].map(async item => {
        const { costs, ...result } = await json(await isolated.call(`/api/campaigns/${item.campaignId}/results`, { cookie: owner }), 200);
        return result;
      }));
      return { marketing: marketing.results, campaigns };
    };
    const stored = async () => ({
      attribution: await isolated.rows('SELECT * FROM attribution_facts ORDER BY id'),
      recipients: await isolated.rows('SELECT * FROM recipient_steps ORDER BY id'),
      delivery: await isolated.rows('SELECT * FROM delivery_facts ORDER BY id'),
      contacts: await isolated.rows('SELECT * FROM contacts ORDER BY id'),
      addresses: await isolated.rows('SELECT * FROM contact_email_addresses ORDER BY id'),
      activity: await isolated.rows('SELECT * FROM contact_history ORDER BY id'),
    });
    const beforeResults = await results(), beforeStored = await stored();
    expect(beforeStored.attribution).toEqual([expect.objectContaining({ id: attributionId, campaign_id: previous.campaignId,
      recipient_step_id: prior.id, gross_amount_minor: 4200, refund_amount_minor: 200, currency: 'USD' })]);
    expect(beforeStored.delivery).toEqual([expect.objectContaining({ recipient_step_id: prior.id, kind: 'delivered', provider_message_id: priorMessage.messageId })]);
    expect(beforeResults.marketing).toEqual([
      expect.objectContaining({ campaignId: previous.campaignId, metric: 'accepted', value: 1 }),
      expect.objectContaining({ campaignId: previous.campaignId, metric: 'delivered', value: 1 }),
    ]);
    expect(beforeResults.campaigns[0]).toMatchObject({ outcomes: { handedOff: 1, accepted: 1, delivered: 1 }, attribution: {
      orders: 1, revenueByCurrency: [{ currency: 'USD', orders: 1, grossAmountMinor: 4200, reversedAmountMinor: 200, amountMinor: 4000 }],
      events: [expect.objectContaining({ orderSourceRecordId: 'synthetic-mango-805', recipientStepId: prior.id })] } });
    const noAuthority = async () => {
      expect(await isolated.rows(`SELECT id FROM recipient_steps WHERE campaign_id='${campaign.campaignId}'`)).toEqual([]);
      expect(await isolated.rows(`SELECT idempotency_key FROM campaign_approval_requests WHERE campaign_id='${campaign.campaignId}'`)).toEqual([]);
      const detail = await json(await isolated.call(`/api/campaigns/${campaign.campaignId}`, { cookie: owner }), 200);
      expect(detail.campaign).toMatchObject({ state: 'draft', activeRevisionId: campaign.revisionId });
      expect(detail.revision).toMatchObject({ id: campaign.revisionId, state: 'draft' });
      expect((await isolated.control('/_golive/emissions')).filter((item: any) => item.command.campaignId === campaign.campaignId)).toEqual([]);
    };
    await noAuthority();
    const sendCount = edge.sends.length;
    const allowance = async () => (await json(await isolated.call(`/api/campaigns/${campaign.campaignId}/test-sends`, { cookie: owner }), 200)).allowance.remaining;
    const allowanceBefore = await allowance();
    await availableTransport(isolated);
    expect(await json(await isolated.call(`/api/campaigns/${campaign.campaignId}/test-send`, { method: 'POST', cookie: owner,
      body: { revisionId: campaign.revisionId, channel: 'email', to: tested } }), 200)).toMatchObject({ disposition: 'accepted' });
    const testMessages = edge.sends.slice(sendCount);
    expect(testMessages.map(message => message.to)).toEqual([tested]);
    expect(testMessages[0].body.subject).toContain('MANGO TEST');
    expect(decodeProviderReference(testMessages[0].body.custom_args.mango_recipient_step)).toBe(`test:${campaign.revisionId}`);
    expect(await allowance()).toBe(allowanceBefore - 1);
    expect((await json(await isolated.call(`/api/campaigns/${campaign.campaignId}/test-sends`, { cookie: owner }), 200)).tests)
      .toEqual([expect.objectContaining({ destination: tested, test: true, channel: 'email', operatorId: 'go-live-owner' })]);
    // Test audit, allowance and cost accounting are allowed; none is marketing.
    expect(await stored()).toEqual(beforeStored);
    expect(await results()).toEqual(beforeResults);
    // The same signed delivery door accepted the ordinary control above. Test
    // callbacks and their replays must never become marketing delivery facts.
    const testMessage = testMessages[0], testOccurredAt = await now();
    const testEvents = Buffer.from(JSON.stringify(['processed', 'delivered'].map(kind =>
      event(kind, tested, testOccurredAt, testMessage.messageId, testMessage.body.custom_args))));
    const reconcileTest = async () => {
      expect(await signedPost(isolated, '/webhooks/mail/sendgrid', testEvents, signer.headers(testEvents))).toBe(204);
    };
    await reconcileTest();
    await reconcileTest();
    expect(await isolated.rows(`SELECT kind, provider_message_id, mango_reference FROM provider_fact_inbox WHERE provider_message_id='${testMessage.messageId}' ORDER BY kind`))
      .toEqual(['accepted', 'delivered'].map(kind => ({ kind, provider_message_id: testMessage.messageId,
        mango_reference: decodeProviderReference(testMessage.body.custom_args.mango_handoff_key) })));
    expect(await stored()).toEqual(beforeStored);
    const afterTestResults = await results();
    expect(afterTestResults).toEqual(beforeResults);
    const afterMembership = await memberships();
    expect(afterMembership).toEqual(beforeMembership);
    await noAuthority();
    const review = await json(await isolated.call(`/api/campaigns/${campaign.campaignId}/checks`, { method: 'POST', cookie: owner,
      body: { revisionId: campaign.revisionId } }), 200);
    expect(review).toMatchObject({ candidateCount: 3, eligibleCount: 2, exclusions: [{ reason: 'frequency-window', count: 1 }] });
    await noAuthority();
    expect((await approve(isolated, owner, campaign)).status).toBe('scheduled');
    expect((await isolated.rows(`SELECT destination FROM recipient_steps WHERE campaign_id='${campaign.campaignId}' ORDER BY destination`))
      .map(row => row.destination)).toEqual([tested, eligible]);
    await isolated.control('/_golive/clock', { advanceMs: 60_001 });
    const recipients = await dispatch(isolated, campaign.campaignId, due);
    expect(recipients.map(row => [row.email, row.transport_disposition])).toEqual([[tested, 'accepted'], [eligible, 'accepted']]);
    const marketingMessages = edge.sends.slice(sendCount).filter(message => !message.body.subject.includes('MANGO TEST'));
    expect(marketingMessages.map(message => message.to).sort()).toEqual([tested, eligible]);
    expect((await json(await isolated.call(`/api/campaigns/${campaign.campaignId}/results`, { cookie: owner }), 200)).outcomes)
      .toMatchObject({ handedOff: 2, accepted: 2, skipped: 0 });
    expect(await isolated.rows('SELECT * FROM attribution_facts ORDER BY id')).toEqual(beforeStored.attribution);
    expect(await audience([recent])).toEqual(beforeMembership[2]);
    const afterMarketingStored = await stored(), afterMarketingResults = await results(), afterMarketingMembership = await memberships();
    await reconcileTest();
    expect(await stored()).toEqual(afterMarketingStored);
    expect(await results()).toEqual(afterMarketingResults);
    expect(await memberships()).toEqual(afterMarketingMembership);
    expect(await audience([recent])).toEqual(beforeMembership[2]);
    await record('test-isolation.json', { beforeMembership, afterMembership, beforeResults, afterTestResults, afterMarketingResults, recipients });
  } finally { await isolated.runtime.close(); }
};






export const walk0 = async ({ page }, info) => {
  const edge = await edgeServer;
  site = await installation(edge, signer);
  cookie = await site.open();
  await json(await site.call('/api/settings/sender', { method: 'PUT', cookie, body: sender }), 200);
  await page.context().addCookies([{ name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url }]);
  const readiness = async () => Object.fromEntries((await json(await site.call('/api/settings/sender', { cookie }), 200)).readiness.map((item: any) => [item.key, item.state]));
  state.readinessBefore = await readiness();
  expect(state.readinessBefore).toMatchObject({ domain: 'observed', dns: 'observed', receipt: 'not-observed', authentication: 'not-observed', jurisdiction: 'owner' });
  await record('settings-before.txt', await screens(page, `${site.runtime.url}/app/settings`, 'settings-before-evidence', info));
  // Mango's default receiving mailbox is the owner's own inbox: Settings emails a check, the
  // owner opens its link (a GET only shows the page) and presses Confirm.
  await availableTransport(site);
  const sentCheck = await json(await site.call('/api/settings/sender/confirmation', { method: 'POST', cookie, body: {} }), 202);
  expect(sentCheck.sentTo).toBe('owner@example.test');
  const check = edge.sends.findLast(send => send.to === 'owner@example.test')!;
  const checkLink = /https:\/\/\S+\/sender-check\/\S+/.exec(check.body.content.find((part: any) => part.type === 'text/plain').value)![0];
  expect((await fetch(site.local(checkLink))).status).toBe(200);
  expect((await json(await site.call('/api/settings/sender', { cookie }), 200)).validation.ready).toBe(false);
  const forged = new URL(site.local(checkLink)); forged.searchParams.set('key', 'A'.repeat(43));
  expect((await fetch(forged, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'confirm=true' })).status).toBe(404);
  expect((await fetch(site.local(checkLink), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'confirm=true' })).status).toBe(200);
  expect((await json(await site.call('/api/settings/sender', { cookie }), 200)).validation.ready).toBe(true);
  state.readinessAfter = await readiness();
  expect(state.readinessAfter).toMatchObject({ domain: 'observed', dns: 'observed', receipt: 'observed', authentication: 'checked', 'one-click': 'built-in', footer: 'built-in', jurisdiction: 'owner' });
  await record('settings-after.txt', await screens(page, `${site.runtime.url}/app/settings`, 'settings-after-evidence', info));
  const people = ['alice', 'bob', 'carol', 'dave', 'erin'].map(name => `${name}@example.test`);
  state.confirmations = {} as Record<string, string>;
  for (const email of people) state.confirmations[email] = await confirmedContact(site, edge, cookie, email, email.split('@')[0]);
  expect((await site.rows("SELECT email, channel_status FROM contact_email_addresses ORDER BY email")).map(row => row.channel_status)).toEqual(['subscribed', 'subscribed', 'subscribed', 'subscribed', 'subscribed']);

  const due = new Date(Date.now() + 20_000);
  const first = await draftCampaign(site, cookie, 'Spring letter', people.slice(0, 2), due);
  state.first = first;
  const contactsBefore = await site.rows('SELECT * FROM contact_email_addresses ORDER BY email');
  const historyBefore = await site.count('contact_history');
  await availableTransport(site);
  const test = await json(await site.call(`/api/campaigns/${first.campaignId}/test-send`, { method: 'POST', cookie,
    body: { revisionId: first.revisionId, channel: 'email', to: 'tester@example.test' } }), 200);
  const testMessage = edge.sends.findLast(send => send.to === 'tester@example.test')!;
  state.testSend = { response: test, subject: testMessage.body.subject, headers: testMessage.body.headers ?? {}, customArgs: Object.keys(testMessage.body.custom_args ?? {}) };
  expect(testMessage.body.subject).toMatch(/test/i);
  expect(await site.rows('SELECT * FROM contact_email_addresses ORDER BY email')).toEqual(contactsBefore);
  expect(await site.count('contact_history')).toBe(historyBefore);
  expect(await site.count('recipient_steps')).toBe(0);

  const review = await json(await site.call(`/api/campaigns/${first.campaignId}/checks`, { method: 'POST', cookie, body: { revisionId: first.revisionId } }), 200);
  state.firstReview = review;
  expect((await approve(site, cookie, first)).status).toBe('scheduled');
  edge.loseResponseFor('bob@example.test');
  const handedOff = await dispatch(site, first.campaignId, due);
  state.handoff = handedOff;
  expect(handedOff.map(row => [row.email, row.transport_disposition])).toEqual([['alice@example.test', 'accepted'], ['bob@example.test', 'handoff-unknown']]);
  await record('campaign-results-uncertain.txt', await screens(page, `${site.runtime.url}/app/campaigns/${first.campaignId}/scheduled`, 'campaign-results-uncertain', info));

  // Signed Event Webhook batches, posted through the public route as SendGrid would.
  const message = (to: string) => edge.sends.findLast(send => send.to === to && !/MANGO TEST/.test(send.body.subject))!;
  const args = (to: string) => { const { mango_recipient_step, mango_handoff_key } = message(to).body.custom_args; return { mango_recipient_step, mango_handoff_key }; };
  const [alice, bob, carol] = people, minute = 10_000;
  // Provider event times follow the hand-off; an event older than it cannot change the disposition.
  const t = Number((await site.rows(`SELECT max(handoff_started_at) AS at FROM recipient_steps WHERE campaign_id='${first.campaignId}'`))[0].at) + 1000;
  const batch = (...events: unknown[]) => Buffer.from(JSON.stringify(events));
  const snapshot = async () => ({ inbox: await site.count('provider_fact_inbox'), deliveryFacts: await site.count('delivery_facts'),
    suppressions: await site.count('contact_suppressions'), optOuts: await site.count('surviving_opt_outs'), softBounces: await site.count('contact_bounce_facts'),
    recipients: Object.fromEntries((await site.rows(`SELECT destination, transport_disposition, complained_at IS NOT NULL AS complained, suppressed_at IS NOT NULL AS suppressed
      FROM recipient_steps WHERE campaign_id='${first.campaignId}' ORDER BY destination`)).map(row => [row.destination, [row.transport_disposition, row.complained ? 'complained' : '', row.suppressed ? 'suppressed' : ''].filter(Boolean).join('+')])),
    statuses: Object.fromEntries((await site.rows('SELECT email, channel_status FROM contact_email_addresses ORDER BY email')).map(row => [row.email, row.channel_status])) });
  const log: Array<Record<string, unknown>> = [];
  state.batches = [] as string[];
  const post = async (name: string, body: Buffer, headers = signer.headers(body)) => {
    const status = await signedPost(site, '/webhooks/mail/sendgrid', body, headers);
    if (status === 204) state.batches.push(body.toString('base64'));
    log.push({ name, status, ...await snapshot() });
    return status;
  };
  const delivered = batch(event('delivered', alice, t + 2 * minute, message(alice).messageId, args(alice)));
  const deliveredHeaders = signer.headers(delivered);
  expect(await post('delivered (alice)', delivered, deliveredHeaders)).toBe(204);
  expect(await post('deferred (bob, uncertain hand-off)', batch(event('deferred', bob, t + 2 * minute, message(bob).messageId, args(bob), { response: '421 try again later', attempt: '1' })))).toBe(204);
  expect(log.at(-1)!.recipients).toMatchObject({ [bob]: 'handoff-unknown' });
  expect(await post('soft bounce (bob)', batch(event('bounce', bob, t + 3 * minute, message(bob).messageId, args(bob), { type: 'blocked', reason: '452 mailbox full' })))).toBe(204);
  expect(await post('hard bounce (bob)', batch(event('bounce', bob, t + 4 * minute, message(bob).messageId, args(bob), { type: 'bounce', reason: '550 no such user' })))).toBe(204);
  expect(await post('provider unsubscribe (alice)', batch(event('unsubscribe', alice, t + 5 * minute, message(alice).messageId, args(alice))))).toBe(204);
  expect(log.at(-1)!.statuses).toMatchObject({ [alice]: 'unsubscribed' });
  expect(await post('spam complaint (alice)', batch(event('spamreport', alice, t + 6 * minute, message(alice).messageId, args(alice))))).toBe(204);
  const settled = await snapshot();
  expect(await post('duplicate redelivery of the delivered batch', delivered, deliveredHeaders)).toBe(204);
  expect(await post('older processed event after delivered (alice)', batch(event('processed', alice, t + minute, message(alice).messageId, args(alice))))).toBe(204);
  expect(log.at(-1)!.recipients).toEqual(settled.recipients);
  const accepted = await snapshot();
  const hard = batch(event('bounce', carol, t + 7 * minute, 'carol-message', {}, { type: 'bounce' }));
  for (const [name, body, headers] of [
    ['mutated body (bob changed to carol after signing)', Buffer.from(batch(event('bounce', bob, t + 4 * minute, message(bob).messageId, args(bob), { type: 'bounce' })).toString().replace(bob, carol)),
      signer.headers(batch(event('bounce', bob, t + 4 * minute, message(bob).messageId, args(bob), { type: 'bounce' })))],
    ['forged signature (another key)', hard, signer.headers(hard, undefined, signer.forgingKey)],
    ['stale timestamp (10 minutes old)', hard, signer.headers(hard, String(Math.floor(Date.now() / 1000) - 600))],
  ] as const) {
    expect(await post(name, body, headers)).toBeGreaterThanOrEqual(400);
    expect({ ...log.at(-1), name: undefined, status: undefined }).toEqual({ ...accepted, name: undefined, status: undefined });
  }
  expect(await post('delivered for a message id Mango never issued (carol)', batch(event('delivered', carol, t + 8 * minute, 'neverIssuedByMango', {})))).toBe(204);
  const unknown = log.at(-1)!;
  expect({ deliveryFacts: unknown.deliveryFacts, suppressions: unknown.suppressions, recipients: unknown.recipients, statuses: unknown.statuses })
    .toEqual({ deliveryFacts: accepted.deliveryFacts, suppressions: accepted.suppressions, recipients: accepted.recipients, statuses: accepted.statuses });
  expect(settled.recipients).toEqual({ [alice]: 'delivered+complained', [bob]: 'bounced' });
  expect(settled.statuses).toMatchObject({ [alice]: 'suppressed', [bob]: 'suppressed', [carol]: 'subscribed' });
  state.webhooks = log;
  state.facts = await site.rows(`SELECT f.kind, f.provider_event_id, r.destination, f.provider_occurred_at FROM delivery_facts f JOIN recipient_steps r ON r.id = f.recipient_step_id ORDER BY f.provider_occurred_at`);
  state.suppressions = await site.rows('SELECT e.email, s.cause FROM contact_suppressions s LEFT JOIN contact_email_addresses e ON e.contact_id = s.contact_id ORDER BY e.email');
  state.history = await site.rows("SELECT e.email, h.kind, h.detail FROM contact_history h JOIN contact_email_addresses e ON e.contact_id = h.contact_id WHERE h.kind IN ('opt-out','suppression','soft-bounce','provider-delivery') ORDER BY h.occurred_at");
  state.replayBatches = { delivered: delivered.toString('base64'), deliveredHeaders };

  // The campaign page and delivery report keep every outcome separate.
  const detail = await json(await site.call(`/api/campaigns/${first.campaignId}`, { cookie }), 200);
  state.results = detail.results;
  state.deliverability = await json(await site.call('/api/insights/deliverability?windowDays=30', { cookie }), 200);
  const campaignText = await screens(page, `${site.runtime.url}/app/campaigns/${first.campaignId}`, 'campaign-page', info)
    + await screens(page, `${site.runtime.url}/app/campaigns/${first.campaignId}/scheduled`, 'campaign-results', info);
  const reportText = await screens(page, `${site.runtime.url}/app/insights`, 'delivery-report', info);
  // Campaign outcomes cannot imply purchase revenue or opens. Insights also
  // contains independent purchase analytics, which must stay empty here.
  const outcomesText = await page.getByRole('table', { name: 'Recorded campaign outcomes', exact: true }).innerText();
  for (const text of [campaignText, outcomesText]) expect(text).not.toMatch(/revenue|open rate|\bopens?\s*\n?\s*\d|\d\s*\n?\s*opens?\b/i);
  expect(reportText).not.toMatch(/open rate|\bopens?\s*\n?\s*\d|\d\s*\n?\s*opens?\b/i);
  const retention = await json(await site.call('/api/insights/retention', { cookie }), 200);
  expect(retention).toMatchObject({ customers: 0, repeatCustomers: 0, repeatPurchaseRate: null,
    medianDaysBetweenOrders: null, valueByAcquisitionSource: [], valueByForm: [] });
  for (const name of ['Customer value by acquisition source', 'Customer value by signup form']) {
    await expect(page.getByRole('table', { name, exact: true }).locator('tbody tr')).toHaveCount(0);
  }
  state.insights = await json(await site.call('/api/insights', { cookie }), 200);
  expect(Object.fromEntries(state.insights.results.filter((row: any) => row.campaignId === first.campaignId).map((row: any) => [row.metric, row.value])))
    .toEqual({ accepted: 1, delivered: 1, bounced: 1, complained: 1, unsubscribed: 1 });
  await record('campaign-page.txt', campaignText); await record('delivery-report.txt', reportText);

  // The next campaign's review and approval exclude the complained and bounced addresses with their reasons.
  const nextDue = new Date(Date.now() + 20_000);
  const next = await draftCampaign(site, cookie, 'Summer letter', people.slice(0, 4), nextDue);
  state.nextReview = await json(await site.call(`/api/campaigns/${next.campaignId}/checks`, { method: 'POST', cookie, body: { revisionId: next.revisionId } }), 200);
  expect(state.nextReview.eligibleCount).toBe(2);
  state.suppressedDetail = await Promise.all([alice, bob].map(async email => {
    const id = (await site.rows(`SELECT contact_id FROM contact_email_addresses WHERE email='${email}'`))[0].contact_id;
    const contact = await json(await site.call(`/api/contacts/${id}`, { cookie }), 200);
    return { email, emailStatus: contact.contact.emailStatus, suppressions: contact.suppressions.map((row: any) => row.cause) };
  }));
  expect((await approve(site, cookie, next)).status).toBe('scheduled');
  // Approved now for later: carol and erin, frozen before carol receives anything (used by the opt-out journey).
  state.autumnDue = new Date(Date.now() + 75_000);
  state.autumn = await draftCampaign(site, cookie, 'Autumn letter', [carol, people[4]], state.autumnDue);
  expect((await approve(site, cookie, state.autumn)).status).toBe('scheduled');
  state.next = { ...next, recipients: await dispatch(site, next.campaignId, nextDue) };
  expect(state.next.recipients.map((row: any) => [row.email, row.transport_disposition])).toEqual([[carol, 'accepted'], ['dave@example.test', 'accepted']]);
  await record('part1-state.json', state);
};
export const walk1 = async () => {
  const edge = await edgeServer, [, bob, carol, dave] = ['alice', 'bob', 'carol', 'dave'].map(name => `${name}@example.test`);
  const erin = 'erin@example.test', queued = state.autumn, due: Date = state.autumnDue;
  const latest = (to: string) => edge.sends.findLast(send => send.to === to && !/MANGO TEST/.test(send.body.subject) && send.body.headers?.['List-Unsubscribe'])!;
  const oneClick = (to: string) => /^<(https:\/\/[^>]+)>$/.exec(latest(to).body.headers['List-Unsubscribe'])![1];
  const ledger = async () => ({ statuses: Object.fromEntries((await site.rows('SELECT email, channel_status FROM contact_email_addresses ORDER BY email')).map(row => [row.email, row.channel_status])),
    optOuts: await site.count('surviving_opt_outs'), history: await site.count('contact_history') });
  const before = await ledger(), attempts: Array<Record<string, unknown>> = [];
  const attempt = async (name: string, url: string, init: RequestInit = {}) => {
    const response = await fetch(site.local(url), { redirect: 'manual', ...init });
    const after = await ledger();
    attempts.push({ name, status: response.status, location: response.headers.get('Location'), [carol]: after.statuses[carol], [dave]: after.statuses[dave], optOuts: after.optOuts });
    return { response, after };
  };
  const url = oneClick(carol), token = url.split('/').at(-1)!;
  const form = (body = 'List-Unsubscribe=One-Click') => ({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  for (const [name, target, init] of [
    ['mailbox scanner GET', url, {}], ['mailbox scanner HEAD', url, { method: 'HEAD' }],
    ['mutated token', url.replace(token, token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa')), form()],
    ['consent-confirmation token in the one-click path', url.replace(token, state.confirmations[carol].split('/').at(-1)), form()],
    ['one-click path without the One-Click body', url, form('List-Unsubscribe=Other')],
  ] as const) {
    const { after } = await attempt(name, target, init);
    expect(after.statuses).toEqual(before.statuses);
    expect(after.optOuts).toBe(before.optOuts);
  }
  // Another contact's token reaches only that contact (bob is already suppressed and stays so).
  const other = await attempt("another contact's token (bob)", oneClick(bob), form());
  expect(other.response.status).toBe(200);
  expect({ [carol]: other.after.statuses[carol], [dave]: other.after.statuses[dave], [bob]: other.after.statuses[bob] }).toEqual({ [carol]: 'subscribed', [dave]: 'subscribed', [bob]: 'suppressed' });
  const clicked = await attempt('one-click POST, no cookie', url, form());
  expect(clicked.response.status).toBe(200);
  expect(clicked.after.statuses[carol]).toBe('unsubscribed');
  const repeated = await attempt('repeat one-click POST', url, form());
  expect(repeated.response.status).toBe(200);
  expect(repeated.after).toEqual(clicked.after);
  state.oneClick = attempts;

  const review = await draftCampaign(site, cookie, 'Winter letter', [carol, erin], new Date(Date.now() + 3600_000));
  state.reviewAfterOptOut = await json(await site.call(`/api/campaigns/${review.campaignId}/checks`, { method: 'POST', cookie, body: { revisionId: review.revisionId } }), 200);
  expect(state.reviewAfterOptOut.eligibleCount).toBe(1);
  state.dispatchAfterOptOut = await dispatch(site, queued.campaignId, due);
  expect(state.dispatchAfterOptOut.map((row: any) => [row.email, row.transport_disposition])).toEqual([[carol, 'skipped'], [erin, 'accepted']]);
  // After every send in the run: a marketing message is one handed off for a campaign recipient-step.
  const steps = new Set((await site.rows('SELECT id FROM recipient_steps')).map(row => row.id));
  const marketing = edge.sends.filter(send => steps.has(decodeProviderReference(send.body.custom_args?.mango_recipient_step ?? '')));
  // Every marketing message handed to SendGrid carried both headers over HTTPS and a visible link.
  state.headers = marketing.map(send => {
    const text = send.body.content.find((part: any) => part.type === 'text/plain').value, html = send.body.content.find((part: any) => part.type === 'text/html').value;
    const visible = /<a href="(https:\/\/[^"]+\/unsubscribe\/[^"]+)">Unsubscribe<\/a>/.exec(html)?.[1];
    return { to: send.to, listUnsubscribe: /^<https:\/\//.test(send.body.headers['List-Unsubscribe']), post: send.body.headers['List-Unsubscribe-Post'],
      visibleLink: Boolean(visible), textLink: Boolean(visible && text.includes(visible)) };
  });
  for (const row of state.headers) expect(row).toMatchObject({ listUnsubscribe: true, post: 'List-Unsubscribe=One-Click', visibleLink: true, textLink: true });
  expect(state.headers.map((row: any) => row.to)).toEqual(['alice', 'bob', 'carol', 'dave', 'erin'].map(name => `${name}@example.test`));
  await record('part2-state.json', { headers: state.headers, oneClick: state.oneClick, reviewAfterOptOut: state.reviewAfterOptOut, dispatchAfterOptOut: state.dispatchAfterOptOut });
};
export const walk2 = async () => {
  const edge = await edgeServer, work = await mkdtemp(join(tmpdir(), 'mango-go-live-restore-'));
  const extra = Number(process.env.GO_LIVE_RESTORE_CONTACTS ?? 0);
  const installations: Installation[] = [];
  try {
    if (extra) await importContacts(site, cookie, extra);
    const sourceSession = join(work, 'source-session'), archive = join(work, 'source.rer');
    await writeFile(sourceSession, cookie, { mode: 0o600 });
    const timing: Record<string, number> = { contacts: await site.count('contacts') };
    let started = Date.now();
    await transfer(['export', '--origin', site.runtime.url, '--session-file', sourceSession, '--out', archive]);
    timing.exportMs = Date.now() - started;
    const original = await archiveRows(archive);

    // A destination whose private authority does not match is refused before any write.
    const wrong = await installation(edge, signer, { token: 'synthetic-a-different-private-authority-key-value', restore: true, origin: 'https://wrong.example.test' });
    installations.push(wrong);
    const wrongSession = join(work, 'wrong-session');
    await writeFile(wrongSession, await wrong.open(), { mode: 0o600 });
    await expect(transfer(['import', '--origin', wrong.runtime.url, '--session-file', wrongSession, '--from', archive])).rejects.toThrow();
    state.wrongKey = { contacts: await wrong.count('contacts'), deliveryFacts: await wrong.count('delivery_facts'), suppressions: await wrong.count('contact_suppressions') };
    expect(state.wrongKey).toEqual({ contacts: 0, deliveryFacts: 0, suppressions: 0 });
    await wrong.runtime.close();

    // The empty destination, with its own origin and provider key, restores in maintenance mode.
    const stateDirectory = join(work, 'destination-state'), destinationOptions = { token: site.runtime.token, stateDirectory,
      origin: 'https://mango-restored.example.test', providerKey: 'destination-provider-key' };
    const restoring = await installation(edge, signer, { ...destinationOptions, restore: true });
    installations.push(restoring);
    let destinationCookie = await restoring.open('owner@example.test', 'destination-owner');
    const destinationSession = join(work, 'destination-session');
    await writeFile(destinationSession, destinationCookie, { mode: 0o600 });
    started = Date.now();
    await transfer(['import', '--origin', restoring.runtime.url, '--session-file', destinationSession, '--from', archive]);
    timing.importMs = Date.now() - started;
    state.duringRestore = { campaigns: (await restoring.call('/api/campaigns', { cookie: destinationCookie })).status,
      webhook: await signedPost(restoring, '/webhooks/mail/sendgrid', Buffer.from('[]'), signer.headers(Buffer.from('[]'))) };
    await restoring.runtime.close();
    const restored = await installation(edge, signer, destinationOptions);
    installations.push(restored);
    // The listener gets a fresh loopback port; keep the same persisted
    // credential, under that port's cookie name, without creating a new session.
    const restoredCookieName = localSessionCookieName(restored.runtime.url);
    destinationCookie = `${restoredCookieName}=${destinationCookie.split('=')[1]}`;
    await writeFile(destinationSession, destinationCookie, { mode: 0o600 });

    // Same records, approvals and digests; only the destination's own operator profile differs.
    const roundTrip = join(work, 'restored.rer');
    await transfer(['export', '--origin', restored.runtime.url, '--session-file', destinationSession, '--out', roundTrip]);
    const after = await archiveRows(roundTrip);
    const tables = (rows: any[]) => Object.fromEntries([...new Set(rows.map(row => row.table))].sort().map(table => [table, rows.filter(row => row.table === table).length]));
    state.restoredTables = tables(after);
    expect(after.filter(row => row.table !== 'operators')).toEqual(original.filter(row => row.table !== 'operators'));
    for (const table of ['contacts', 'consent_evidence', 'contact_suppressions', 'surviving_opt_outs', 'delivery_facts', 'provider_fact_inbox', 'campaign_approval_requests', 'recipient_steps'])
      expect(state.restoredTables[table], table).toBeGreaterThan(0);
    state.approvalDigests = (await restored.rows('SELECT revision_id, revision_digest FROM campaign_approval_requests ORDER BY revision_id'));
    expect(state.approvalDigests).toEqual(await site.rows('SELECT revision_id, revision_digest FROM campaign_approval_requests ORDER BY revision_id'));

    // The destination signs in with its own credentials, never the source's.
    const sourceCredential = `${restoredCookieName}=${cookie.split('=')[1]}`;
    state.signIn = { sourceCookie: (await restored.call('/api/operator', { cookie: sourceCredential })).status, destinationCookie: (await restored.call('/api/operator', { cookie: destinationCookie })).status };
    expect(state.signIn).toEqual({ sourceCookie: 401, destinationCookie: 200 });

    // Opt-outs survive; sending waits for the destination's own sender evidence.
    expect(Object.fromEntries((await restored.rows("SELECT email, channel_status FROM contact_email_addresses WHERE email IN ('alice@example.test','bob@example.test','carol@example.test') ORDER BY email")).map(row => [row.email, row.channel_status])))
      .toEqual({ 'alice@example.test': 'suppressed', 'bob@example.test': 'suppressed', 'carol@example.test': 'unsubscribed' });
    const sender = async () => (await json(await restored.call('/api/settings/sender', { cookie: destinationCookie }), 200)).validation;
    const draft = await draftCampaign(restored, destinationCookie, 'First letter after the move', ['carol@example.test', 'dave@example.test'], new Date(Date.now() + 3600_000));
    const checks = async () => json(await restored.call(`/api/campaigns/${draft.campaignId}/checks`, { method: 'POST', cookie: destinationCookie, body: { revisionId: draft.revisionId } }), 200);
    const before = await checks();
    state.destinationSender = { before: await sender(), authentication: before.checks.find((check: any) => check.kind === 'message.email-authentication'), exclusions: before.exclusions };
    expect(state.destinationSender.before.ready).toBe(false);
    expect(state.destinationSender.authentication.status).toBe('blocked');
    expect(before.exclusions).toEqual(expect.arrayContaining([expect.objectContaining({ reason: 'email-unsubscribed' })]));
    await restored.control('/_golive/sender-evidence');
    state.destinationSender.after = await sender();
    state.destinationSender.authenticationAfter = (await checks()).checks.find((check: any) => check.kind === 'message.email-authentication');
    expect(state.destinationSender.after.ready).toBe(true);

    // Part 1's signed batches, delivered again by the provider after the move, add no fact.
    const facts = async () => ({ inbox: await restored.count('provider_fact_inbox'), delivery: await restored.count('delivery_facts'), suppressions: await restored.count('contact_suppressions') });
    const factsBefore = await facts();
    const statuses = [];
    for (const body of state.batches) statuses.push(await signedPost(restored, '/webhooks/mail/sendgrid', Buffer.from(body, 'base64'), signer.headers(Buffer.from(body, 'base64'))));
    state.replayAfterRestore = { statuses, before: factsBefore, after: await facts() };
    expect(state.replayAfterRestore.after).toEqual(factsBefore);
    state.timing = timing;
    await record('part4-state.json', { wrongKey: state.wrongKey, duringRestore: state.duringRestore, restoredTables: state.restoredTables, approvalDigests: state.approvalDigests,
      signIn: state.signIn, destinationSender: state.destinationSender, replayAfterRestore: state.replayAfterRestore, timing });
  } finally {
    for (const item of installations) await item.runtime.close();
    await rm(work, { recursive: true, force: true });
  }
};
