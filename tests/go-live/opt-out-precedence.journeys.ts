import {expect, test} from '@playwright/test';
import {createHmac} from 'node:crypto';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {approve, confirmedContact, consent, dispatch, draftCampaign, installation, json, sender} from './harness';
import {multistepCommerceEdge} from './multistep-commerce-edge';
import {syncSource} from './source-edge';
import {mailchimpEdge, mailchimpKey, mailchimpList} from './mailchimp-edge';
import {retryDelaysMs} from '../../src/core/features/parallel-run/writeback';

const [carol, dave, erin, frank, gina, hana, ivan] = ['carol', 'dave', 'erin', 'frank', 'gina', 'hana', 'ivan'].map(name => `${name}@example.test`);

// An opt-out wins over every later marketing input and reaches pending work before it is acknowledged;
// during a parallel run the incumbent's opt-outs take the same precedence and Mango's go back (CONT-004).
test('[CONT-004] opt-out precedence: complete acceptance across one-click, queued steps, sync, store events, merge, operator edits and the parallel run', async () => {
  const mailchimp = mailchimpEdge([carol, dave, erin, frank, gina, hana, ivan]), shop = multistepCommerceEdge();
  const commerce = (request: Record<string, unknown>) => {
    const result = shop.commerce(request) as any, customer = result?.data?.node?.customer;
    // The store reports a fresh marketing subscription for the opted-out person.
    if (customer?.email === carol) customer.emailMarketingConsent = {marketingState: 'SUBSCRIBED', marketingOptInLevel: 'CONFIRMED_OPT_IN', consentUpdatedAt: new Date().toISOString()};
    return result;
  };
  const edge = await providerEdge({incumbent: mailchimp.handle, commerce}), site = await installation(edge, eventSigner(), {commerce: true, networkHosts: ['us21.api.mailchimp.com']});
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', {method: 'PUT', cookie, body: sender}), 200);
    await site.control('/_golive/sender-evidence');
    for (const email of [carol, dave, erin, frank, gina, hana, ivan]) await confirmedContact(site, edge, cookie, email, email.split('@')[0]);
    const statusOf = async (email: string) => (await site.rows(`SELECT email_status FROM contacts WHERE email='${email}'`))[0]?.email_status;
    const connection = async () => json(await site.call('/api/settings/parallel-run', {cookie}), 200);
    const post = (path: string, fields: Record<string, string>) => site.call(path, {method: 'POST', raw: new URLSearchParams(fields).toString(), headers: {'Content-Type': 'application/x-www-form-urlencoded'}});
    const incumbentEvent = (type: string, email: string, extra: Record<string, string> = {}) => ({type, fired_at: new Date(Date.now() - 5000).toISOString().slice(0, 19).replace('T', ' '),
      'data[email]': email, 'data[list_id]': mailchimpList, ...extra});

    // Mailchimp validates the callback address before it registers the webhook, so it must already answer.
    mailchimp.state.validate = async url => (await fetch(site.local(url))).status;
    // The link needs the owner: a manager is refused before Mailchimp is called.
    const manager = await site.open('synthetic-mango-300-manager@example.test', 'synthetic-mango-300-manager');
    await json(await site.call('/api/operators/synthetic-mango-300-manager/role', {method: 'PUT', cookie, body: {role: 'manager'}}), 200);
    expect((await site.call('/api/settings/parallel-run', {method: 'PUT', cookie: manager, body: {apiKey: mailchimpKey, listId: mailchimpList}})).status).toBe(403);
    expect(mailchimp.webhooks.size).toBe(0);
    await json(await site.call('/api/settings/parallel-run', {method: 'PUT', cookie, body: {apiKey: mailchimpKey, listId: mailchimpList}}), 200);
    expect(await connection()).toMatchObject({connected: true, listId: mailchimpList, lastFour: mailchimpKey.slice(-4)});
    expect(JSON.stringify(await site.rows('SELECT secret_cipher,webhook_secret_digest FROM parallel_run_links'))).not.toContain(mailchimpKey);
    expect(mailchimp.unauthorized).toEqual([]);
    const hook = new URL([...mailchimp.webhooks.values()][0]).pathname;

    // A first letter reaches carol and dave; their one-click links come from it.
    const clock = await site.control('/_golive/clock');
    const due = new Date(clock.now + 12_000), nextDue = new Date(due.getTime() + 25_000);
    const letter = await draftCampaign(site, cookie, 'Spring letter', [carol, dave, ivan], due), next = await draftCampaign(site, cookie, 'Summer letter', [carol, erin, frank, gina], nextDue);
    await approve(site, cookie, letter);
    await approve(site, cookie, next);
    expect((await dispatch(site, letter.campaignId, due)).map(row => row.transport_disposition)).toEqual(['accepted', 'accepted', 'accepted']);
    const oneClick = (email: string) => /^<(https:\/\/[^>]+)>$/.exec(edge.sends.findLast(send => send.to === email && send.body.headers?.['List-Unsubscribe'])!.body.headers['List-Unsubscribe'])![1];
    expect(mailchimp.writes).toEqual([]);

    // CONT-004 point 1: carol's one-click is recorded before it is acknowledged and her queued step is skipped.
    const oneClickPost = (email: string) => fetch(site.local(oneClick(email)), {method: 'POST', redirect: 'manual', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: 'List-Unsubscribe=One-Click'});
    const acknowledged = await oneClickPost(carol);
    expect(acknowledged.status).toBe(200);
    expect(await statusOf(carol)).toBe('unsubscribed');
    expect(await site.rows(`SELECT reason FROM surviving_opt_outs WHERE channel='email'`)).toHaveLength(1);
    expect((await dispatch(site, next.campaignId, nextDue)).map(row => [row.email, row.transport_disposition])).toEqual([[carol, 'skipped'], [erin, 'accepted'], [frank, 'accepted'], [gina, 'accepted']]);

    // Point 3, Mango to the incumbent: carol's restriction reached the audience; nobody else's did.
    expect(mailchimp.writes).toEqual([{email: carol, status: 'unsubscribed', ok: true}]);
    expect(mailchimp.status.get(carol)).toBe('unsubscribed');
    expect(mailchimp.status.get(dave)).toBe('subscribed');
    expect((await connection()).writebacks).toMatchObject({done: 1, failed: 0});

    // Point 3, incumbent to Mango: only the secret address is heard; an unsubscribe, a clean and an abuse report restrict at once.
    expect((await post(hook + 'x', incumbentEvent('unsubscribe', erin, {'data[action]': 'unsub'}))).status).toBe(404);
    expect(await statusOf(erin)).toBe('subscribed');
    expect(await json(await post(hook, incumbentEvent('unsubscribe', erin, {'data[action]': 'unsub'})), 200)).toEqual({applied: true});
    expect(await statusOf(erin)).toBe('unsubscribed');
    expect(await json(await post(hook, incumbentEvent('cleaned', frank, {'data[reason]': 'hard'})), 200)).toEqual({applied: true});
    expect(await statusOf(frank)).toBe('suppressed');
    expect(await json(await post(hook, incumbentEvent('unsubscribe', hana, {'data[action]': 'abuse'})), 200)).toEqual({applied: true});
    expect(await statusOf(hana)).toBe('suppressed');
    // The incumbent can never lift a Mango restriction: its subscribe and profile events apply nothing.
    for (const type of ['subscribe', 'profile', 'upemail']) expect(await json(await post(hook, incumbentEvent(type, carol)), 200)).toEqual({applied: false});
    expect(await statusOf(carol)).toBe('unsubscribed');
    // The echo of Mango's own writeback is recognized once.
    expect(await json(await post(hook, incumbentEvent('unsubscribe', carol, {'data[action]': 'unsub'})), 200)).toEqual({applied: false, echo: true});
    expect(await json(await post(hook, incumbentEvent('unsubscribe', carol, {'data[action]': 'unsub'})), 200)).toEqual({applied: true});
    await site.control('/_golive/cron');
    expect(mailchimp.writes.map(write => write.email)).toEqual([carol]);

    // A provider outage retries over an hour, then stays visible as failed until the owner retries it.
    expect((await oneClickPost(dave)).status).toBe(200);
    mailchimp.state.down = true;
    let at = (await site.control('/_golive/clock')).now;
    await site.control('/_golive/cron', {scheduledTime: at});
    await site.control('/_golive/cron', {scheduledTime: at + 1000});
    expect(mailchimp.writes.filter(write => write.email === dave)).toHaveLength(1);
    for (const delay of retryDelaysMs) { at += delay + 1000; await site.control('/_golive/cron', {scheduledTime: at}); }
    expect(mailchimp.writes.filter(write => write.email === dave)).toHaveLength(1 + retryDelaysMs.length);
    expect((await connection()).writebacks).toMatchObject({pending: 0, failed: 1, lastError: 'Mailchimp request failed (503).'});
    await site.control('/_golive/cron', {scheduledTime: at + 7_200_000});
    expect(mailchimp.writes.filter(write => write.email === dave)).toHaveLength(1 + retryDelaysMs.length);
    mailchimp.state.down = false;
    expect(await json(await site.call('/api/settings/parallel-run/retry', {method: 'POST', cookie}), 200)).toEqual({retried: 1});
    await site.control('/_golive/cron', {scheduledTime: at + 7_300_000});
    expect(mailchimp.status.get(dave)).toBe('unsubscribed');
    expect((await connection()).writebacks).toMatchObject({failed: 0, lastError: null});

    // An abuse complaint after Mango's unsubscribe writeback is a suppression, not the writeback's echo.
    expect((await oneClickPost(ivan)).status).toBe(200);
    await site.control('/_golive/cron', {scheduledTime: at + 7_400_000});
    expect(mailchimp.status.get(ivan)).toBe('unsubscribed');
    expect(await json(await post(hook, incumbentEvent('unsubscribe', ivan, {'data[action]': 'abuse'})), 200)).toEqual({applied: true});
    expect(await statusOf(ivan)).toBe('suppressed');
    expect(await site.rows(`SELECT cause FROM contact_suppressions WHERE channel='email' AND contact_id=(SELECT id FROM contacts WHERE email='${ivan}')`)).toEqual([{cause: 'complaint'}]);

    // Point 2: nothing that arrives later reverses carol's opt-out.
    const token = (await json(await site.call('/api/settings/integrations', {method: 'POST', cookie, body: {name: 'Garden sync', scopes: ['contacts:read', 'contacts:write']}}), 201)).token;
    const headers = {Authorization: `Bearer ${token}`};
    const fresh = {source: 'Garden sync', evidence: 'Please send the monthly Mango Garden newsletter.', brandOrLegalSender: 'Mango Garden', messageCategory: 'newsletter',
      frequencyDisclosure: 'Monthly', destinationJurisdiction: 'AU', consentVersion: 'v1', occurredAt: new Date(Date.now() - 1000).toISOString()};
    const synced = await json(await site.call('/api/integrations/v1/contacts', {method: 'PUT', headers, body: {email: carol, displayName: 'Carol', segmentName: 'Garden sync', subscribe: true, consent: fresh}}), 200);
    expect(synced.contact.emailStatus).toBe('unsubscribed');
    await site.call('/api/contacts/consent', {method: 'POST', cookie, body: {...consent, contact: {email: carol, displayName: 'Carol'}, occurredAt: fresh.occurredAt}});
    expect(await statusOf(carol)).toBe('unsubscribed');
    const orderAt = new Date().toISOString();
    shop.seed([carol], orderAt);
    for (const source of ['product', 'order', 'refund']) await syncSource(site, cookie, source);
    const orderId = shop.purchase(carol, orderAt), raw = JSON.stringify({admin_graphql_api_id: orderId}), delivery = 'synthetic-mango-301';
    expect((await site.call('/webhooks/commerce/shopify', {method: 'POST', raw, headers: {'X-Shopify-Hmac-Sha256': createHmac('sha256', 'synthetic-store-webhook-key').update(raw).digest('base64'),
      'X-Shopify-Shop-Domain': 'mango-test.myshopify.com', 'X-Shopify-Topic': 'orders/paid', 'X-Shopify-Webhook-Id': delivery, 'X-Shopify-Event-Id': delivery}})).status).toBe(204);
    expect(shop.nodeReads).toContain(orderId);
    expect(await statusOf(carol)).toBe('unsubscribed');
    // A merge keeps the stricter state on the survivor.
    const id = async (email: string) => (await site.rows(`SELECT id FROM contacts WHERE email='${email}'`))[0].id;
    await json(await site.call('/api/contacts/merge', {method: 'POST', cookie, body: {survivorContactId: await id(gina), mergedContactId: await id(dave)}}), 200);
    expect(await statusOf(gina)).toBe('unsubscribed');
    // The survivor's own address was subscribed in Mailchimp: the restriction now covers every address it holds.
    expect(mailchimp.status.get(gina)).toBe('subscribed');
    await site.control('/_golive/cron', {scheduledTime: at + 7_500_000});
    expect(mailchimp.status.get(gina)).toBe('unsubscribed');
    expect(edge.sends.filter(send => send.to === carol && send.body.headers?.['List-Unsubscribe'])).toHaveLength(1);

    // Ending the parallel run removes the webhook and the key; the old address then hears nothing.
    await json(await site.call('/api/settings/parallel-run', {method: 'DELETE', cookie}), 200);
    expect(mailchimp.webhooks.size).toBe(0);
    expect(await site.rows('SELECT id FROM parallel_run_links')).toEqual([]);
    expect((await post(hook, incumbentEvent('unsubscribe', gina, {'data[action]': 'unsub'}))).status).toBe(404);
    expect(await statusOf(gina)).toBe('unsubscribed');
    expect(edge.unexpected).toEqual([]);
  } finally { await site.runtime.close(); await edge.close(); }
});
