import { expect, test, type Page } from '@playwright/test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { providerEdge } from './edge';
import { event, eventSigner } from './sendgrid-events';
import { decodeProviderReference } from '../../src/core/shared/provider-reference';
import { archiveRows, importContacts, transfer } from './restore';
import { approve, availableTransport, confirmedContact, dispatch, draftCampaign, installation, json, sender, signedPost, type Installation } from './harness';

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
  for (const width of [1440, 390]) {
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

test('[SEND-005][SEND-006][SEND-007][SEND-008][CONT-006] signed SendGrid facts replayed through the public webhook keep delivery truth separate', async ({ page }, info) => {
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
  // No open, click-through or revenue figure is shown for a campaign that has none.
  for (const text of [campaignText, reportText]) expect(text).not.toMatch(/revenue|open rate|\bopens?\s*\n?\s*\d|\d\s*\n?\s*opens?\b/i);
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
});

test('[MSG-003][CONT-004][CONT-009][CAMP-008] the List-Unsubscribe one-click works as a mail client sends it and nothing else unsubscribes', async () => {
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
});

test('[DATA-001][CONT-004][SEND-005] an installation with real history restores into an empty one without its sending authority', async () => {
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
    const wrong = await installation(edge, signer, { token: 'a-different-private-authority-key-value', restore: true, origin: 'https://wrong.example.test' });
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
    const destinationCookie = await restoring.open('owner@example.test', 'destination-owner');
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
    state.signIn = { sourceCookie: (await restored.call('/api/operator', { cookie })).status, destinationCookie: (await restored.call('/api/operator', { cookie: destinationCookie })).status };
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
});
