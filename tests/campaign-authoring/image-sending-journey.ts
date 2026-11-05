import { expect } from '@playwright/test';
import { png } from '../support/images';
import { providerEdge } from '../go-live/edge';
import { eventSigner } from '../go-live/sendgrid-events';
import { installation, json, sender, confirmedContact, draftCampaign, approve, dispatch, availableTransport } from '../go-live/harness';

/** Exercise the native sending doors, with fakes only at the mail and DNS edges. */
export async function imageSendingJourney() {
  const edge = await providerEdge(), site = await installation(edge, eventSigner());
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', { method: 'PUT', cookie, body: sender }), 200);
    await site.control('/_golive/sender-evidence');
    const file = new FormData();
    file.set('file', new File([png(20, 10, 49)], 'synthetic-mango-49.png', { type: ['image', 'png'].join('/') }));
    const { asset } = await json(await site.call('/api/campaign-assets', { method: 'POST', cookie, raw: file }), 201);
    const httpsBody = `<p>Orchard news.</p><img src="${asset.url}" width="20" height="10" alt="Orchard rows">`;
    const httpBody = httpsBody.replace(asset.url, `http://127.0.0.1:8787/media/${asset.sha256}`);
    const reader = ['synthetic-mango-490', 'example.test'].join('@');
    await confirmedContact(site, edge, cookie, reader, 'Orchard reader');
    const clock = await site.control('/_golive/clock');
    const refused = await draftCampaign(site, cookie, 'Local image draft', [reader], new Date(clock.now + 60000));
    // Authoring retains unsupported markup for correction; neither sending door grants authority.
    await json(await site.call(`/api/campaign-revisions/${refused.revisionId}`, { method: 'PATCH', cookie, body: { emailBody: httpBody } }), 200);
    const readDraft = async () => (await json(await site.call(`/api/campaigns/${refused.campaignId}`, { cookie }), 200)).revision;
    const before = await readDraft(), sends = edge.sends.length;
    const approval = await json(await site.call(`/api/campaigns/${refused.campaignId}/approve`, { method: 'POST', cookie,
      body: { revisionId: refused.revisionId, idempotencyKey: 'synthetic-mango-490' } }), 409);
    expect(approval.blockers).toContainEqual(expect.objectContaining({ kind: 'message.content', detail: expect.stringContaining('images at an HTTPS address') }));
    expect(approval.blockers.map((item: any) => item.kind).sort()).toEqual(['message.content', 'message.links.resolved']);
    const testSend = await json(await site.call(`/api/campaigns/${refused.campaignId}/test-send`, { method: 'POST', cookie,
      body: { revisionId: refused.revisionId, channel: 'email', to: ['tester', 'example.test'].join('@') } }), 409);
    expect(testSend.blockers).toContainEqual(expect.objectContaining({ kind: 'test-send', detail: expect.stringContaining('images at an HTTPS address') }));
    expect(await readDraft()).toEqual(before);
    expect(await site.count('campaign_approval_requests')).toBe(0);
    expect(await site.count('recipient_steps')).toBe(0);
    expect((await json(await site.call(`/api/campaigns/${refused.campaignId}/test-sends`, { cookie }), 200)).tests).toEqual([]);
    expect(edge.sends).toHaveLength(sends);
    expect((await site.control('/_golive/emissions')).filter((row: any) => row.command.kind === 'campaign.dispatch')).toEqual([]);

    // The same uploaded bytes at HTTPS pass the test door and ordinary approval and delivery.
    await json(await site.call(`/api/campaign-revisions/${refused.revisionId}`, { method: 'PATCH', cookie, body: { emailBody: httpsBody } }), 200);
    await availableTransport(site);
    await json(await site.call(`/api/campaigns/${refused.campaignId}/test-send`, { method: 'POST', cookie,
      body: { revisionId: refused.revisionId, channel: 'email', to: ['tester', 'example.test'].join('@') } }), 200);
    const testMessage = edge.sends.at(-1)!;
    expect(testMessage.body.content.find((part: any) => part.type === 'text/html').value).toContain(`src="${asset.url}"`);

    const campaigns: Array<{ campaignId: string; revisionId: string; address: string }> = [];
    for (const n of [491, 492, 493]) {
      const address = [`synthetic-mango-${n}`, 'example.test'].join('@');
      await confirmedContact(site, edge, cookie, address, `Orchard reader ${n}`);
      const campaign = await draftCampaign(site, cookie, `Orchard image ${n}`, [address], new Date(clock.now + 60000));
      await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`, { method: 'PATCH', cookie, body: { emailBody: httpsBody } }), 200);
      await approve(site, cookie, campaign);
      campaigns.push({ ...campaign, address });
    }
    const [control, historical, prepared] = campaigns;
    // Arrange historical persisted content that today's approval door refuses.
    // All sessions, consent, schedules and approval authority came through native routes.
    const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
    await site.runtime.sql(`UPDATE campaign_revisions SET email_body=${quote(before.emailBody)} WHERE id=${quote(historical.revisionId)}`);
    const [recipient] = await site.rows(`SELECT id,idempotency_key FROM recipient_steps WHERE revision_id=${quote(prepared.revisionId)}`);
    const cached = { recipientStepId: recipient.id, idempotencyKey: recipient.idempotency_key, to: prepared.address,
      sender: `${sender.displayName} <${sender.fromEmail}>`, handoffStartedAt: new Date(clock.now).toISOString(),
      content: { subject: 'Orchard image', text: 'Orchard rows', html: httpBody }, callbackUrl: `${site.origin}/webhooks/mail/status` };
    await site.runtime.sql(`UPDATE recipient_steps SET outbound_request_json=${quote(JSON.stringify(cached))} WHERE id=${quote(recipient.id)}`);
    await site.control('/_golive/clock', { advanceMs: 60001 });
    await dispatch(site, control.campaignId, new Date(clock.now + 60000));
    for (const campaign of [historical, prepared]) {
      await expect.poll(async () => (await site.rows(`SELECT transport_disposition FROM recipient_steps WHERE revision_id=${quote(campaign.revisionId)}`))[0].transport_disposition,
        { timeout: 60000 }).toBe('failed');
      expect(await site.rows(`SELECT attempt_count,handoff_started_at,last_error_code,last_error_detail FROM recipient_steps WHERE revision_id=${quote(campaign.revisionId)}`))
        .toEqual([expect.objectContaining({ attempt_count: 0, handoff_started_at: null, last_error_code: 'image-https-required',
          last_error_detail: expect.stringContaining('images at an HTTPS address') })]);
      const report = await json(await site.call(`/api/campaigns/${campaign.campaignId}/recipients`, { cookie }), 200);
      expect(report.rows).toContainEqual(expect.objectContaining({ disposition: 'failed', reason: 'image-https-required' }));
      expect(edge.sends.filter(item => item.to === campaign.address && item.body.headers?.['List-Unsubscribe'])).toEqual([]);
    }
    expect(edge.sends.filter(item => item.to === control.address && item.body.headers?.['List-Unsubscribe'])).toHaveLength(1);
    const delivered = edge.sends.find(item => item.to === control.address && item.body.headers?.['List-Unsubscribe'])!;
    expect(delivered.body.content.find((part: any) => part.type === 'text/html').value).toContain(`src="${asset.url}"`);
    const handoffs = edge.sends.length;
    await site.control('/_golive/cron');
    expect(edge.sends).toHaveLength(handoffs);
    expect(edge.unexpected).toEqual([]);
  } finally { await site.runtime.close(); await edge.close(); }
}
