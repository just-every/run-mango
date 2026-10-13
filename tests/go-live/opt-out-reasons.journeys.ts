import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { providerEdge } from './edge';
import { event, eventSigner } from './sendgrid-events';
import { approve, confirmedContact, dispatch, draftCampaign, installation, json, sender, signedPost } from './harness';

// A person's opt-out outlives provider reconciliation: soft-bounce suppression and a later
// delivery fact add and lift their own record, never the opt-out (CONT-005, CONT-006).
test('[CONT-005][CONT-006] a one-click opt-out survives three signed soft bounces and a signed delivery', async () => {
  const edge = await providerEdge(), signer = eventSigner();
  const site = await installation(edge, signer);
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', { method: 'PUT', cookie, body: sender }), 200);
    await site.control('/_golive/sender-evidence');
    const carol = 'carol@example.test';
    await confirmedContact(site, edge, cookie, carol, 'carol');
    const due = new Date(Date.now() + 20_000);
    const letter = await draftCampaign(site, cookie, 'Spring letter', [carol], due);
    expect((await approve(site, cookie, letter)).status).toBe('scheduled');
    expect((await dispatch(site, letter.campaignId, due)).map(row => row.transport_disposition)).toEqual(['accepted']);
    const sent = edge.sends.findLast(send => send.to === carol && send.body.headers?.['List-Unsubscribe'])!;
    const { mango_recipient_step, mango_handoff_key } = sent.body.custom_args;
    const post = (...events: unknown[]) => { const body = Buffer.from(JSON.stringify(events)); return signedPost(site, '/webhooks/mail/sendgrid', body, signer.headers(body)); };
    const steps: unknown[] = [];
    const step = async (name: string, status: number) => steps.push({ name, status,
      address: (await site.rows(`SELECT channel_status FROM contact_email_addresses WHERE email='${carol}'`))[0].channel_status,
      records: (await site.rows('SELECT reason FROM surviving_opt_outs ORDER BY reason')).map(row => row.reason) });

    const oneClick = /^<(https:\/\/[^>]+)>$/.exec(sent.body.headers['List-Unsubscribe'])![1];
    await step('one-click', (await fetch(site.local(oneClick), { method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' })).status);
    const start = Date.now() + 1000;
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
  } finally { await site.runtime.close(); await edge.close(); }
});
