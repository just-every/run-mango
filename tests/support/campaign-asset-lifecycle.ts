import { expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { installation, json, sender, confirmedContact, draftCampaign, approve, dispatch, type Installation } from '../go-live/harness';
import { providerEdge } from '../go-live/edge';
import { eventSigner } from '../go-live/sendgrid-events';
import { archiveRecords, stageArchive, transferRequest } from '../portability/flows';
import { png } from './images';

const transferDoor = (site: Installation, cookie: string) => ({ cookie, call: (path: string, options: Parameters<Installation['call']>[1] = {}) => site.call(path, { ...options, headers: { Origin: site.runtime.url } }) });

const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** A campaign's real uploaded originals, delivered mail, transfer and erasure public doors. */
export async function campaignAssetLifecycle() {
  const edge = await providerEdge(), signer = eventSigner();
  const work = await mkdtemp(join(tmpdir(), 'mango-campaign-images-'));
  let source: Installation | undefined, destination: Installation | undefined;
  try {
    source = await installation(edge, signer);
    const site = source, cookie = await site.open();
    await json(await site.call('/api/settings/sender', { method: 'PUT', cookie, body: sender }), 200);
    await site.control('/_golive/sender-evidence');
    const address = ['synthetic-mango-156', 'example.test'].join('@');
    const controlAddress = ['synthetic-mango-157', 'example.test'].join('@');
    for (const email of [address, controlAddress]) await confirmedContact(site, edge, cookie, email, 'Image reader');
    const contact = (await site.rows(`SELECT id FROM contacts WHERE email='${address}'`))[0];
    const original = png(8, 6, 156, contact.id), control = png(5, 3, 157);
    const upload = async (bytes: Uint8Array) => {
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: 'application/octet-stream' }), 'synthetic-mango-image');
      return (await json(await site.call('/api/campaign-assets', { method: 'POST', cookie, raw: form }), 201)).asset;
    };
    const asset = await upload(original), other = await upload(control);
    expect(asset.sha256).toBe(digest(original));
    const body = `<p>Garden pictures.</p><img src="${asset.url}" alt="Garden" width="8" height="6"><img src="${other.url}" alt="Orchard" width="5" height="3">`;
    const draft = async (name: string, emails: string[]) => {
      const campaign = await draftCampaign(site, cookie, name, emails, new Date(Date.now() + 5000));
      await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`, { method: 'PATCH', cookie, body: { emailBody: body } }), 200);
      return campaign;
    };
    await json(await site.call('/api/insights/open-tracking', { method: 'PUT', cookie, body: { enabled: true } }), 200);
    const sent = await draft('Image originals', [address]);
    const review = await json(await site.call(`/api/campaigns/${sent.campaignId}/checks`, { method: 'POST', cookie, body: { revisionId: sent.revisionId } }), 200);
    expect(review.blockers).toEqual([]);
    const approval = await approve(site, cookie, sent);
    expect(approval.status).toBe('scheduled');
    const due = new Date((await site.rows(`SELECT scheduled_at FROM campaign_steps WHERE revision_id='${sent.revisionId}'`))[0].scheduled_at);
    expect((await dispatch(site, sent.campaignId, due)).map(row => row.transport_disposition)).toEqual(['accepted']);
    const send = edge.sends.findLast(item => item.to === address && item.body.headers?.['List-Unsubscribe']);
    expect(send).toBeDefined();
    const html = String(send!.body.content.find((part: any) => part.type === 'text/html').value);
    expect(html).toContain(asset.url);
    expect(html).toContain(other.url);
    const pixel = /src="([^"]+\/o\/[^\"]+)"/.exec(html)![1];
    expect((await fetch(site.local(pixel))).status).toBe(200);
    expect(await site.count('open_estimate_facts')).toBe(1);
    for (const image of [asset, other]) {
      const response = await fetch(site.local(image.url));
      expect(response.status).toBe(200);
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(image === asset ? original : control);
    }
    expect(await site.count('open_estimate_facts')).toBe(1);

    const pending = await draft('Image approval after erasure', [controlAddress]);
    const checks = () => site.call(`/api/campaigns/${pending.campaignId}/checks`, { method: 'POST', cookie, body: { revisionId: pending.revisionId } });
    expect((await json(await checks(), 200)).blockers).toEqual([]);
    const savedBody = (await site.rows(`SELECT email_body FROM campaign_revisions WHERE id='${pending.revisionId}'`))[0].email_body;
    const records = await archiveRecords(transferDoor(site, cookie));
    const items = records.filter(record => record.kind === 'part').flatMap(part => part.items);
    for (const [image, bytes] of [[asset, original], [other, control]] as const) {
      const key = `campaign-assets/${image.sha256}`;
      expect(records[0].objects.find((object: any) => object.key === key)).toMatchObject({ size: bytes.byteLength, sha256: digest(bytes), httpMetadata: { contentType: 'image/png' } });
      const parts = items.filter((item: any) => item.kind === 'object' && item.key === key).sort((a: any, b: any) => a.offset - b.offset);
      expect(new Uint8Array(Buffer.concat(parts.map((part: any) => Buffer.from(part.data, 'base64'))))).toEqual(bytes);
    }
    const stateDirectory = join(work, 'restored-state'), origin = 'https://restored-images.example.test';
    destination = await installation(edge, signer, { token: site.runtime.token, stateDirectory, restore: true, origin });
    const targetCookie = await destination.open(), target = transferDoor(destination, targetCookie);
    const id = await stageArchive(target, records);
    await json(await transferRequest(target, `imports/${id}/finalize`, { contentHash: records.at(-1).contentHash, archiveHash: records.at(-1).archiveHash }), 200);
    // Bytes already exist after apply, but maintenance must still fence their public door.
    const unavailable = await destination.call(new URL(asset.url).pathname);
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({ error: 'restore_in_progress' });
    expect((await destination.rows(`SELECT email_body FROM campaign_revisions WHERE id='${pending.revisionId}'`))[0].email_body).toBe(savedBody);
    await destination.runtime.close();
    destination = await installation(edge, signer, { token: site.runtime.token, stateDirectory, origin });
    const restoredCookie = await destination.open();
    const detail = await json(await destination.call(`/api/campaigns/${pending.campaignId}`, { cookie: restoredCookie }), 200);
    expect(detail).toBeTruthy();
    expect(JSON.stringify(detail)).toContain(asset.url);
    expect(JSON.stringify(detail)).not.toContain(`${origin}/media/`);
    expect((await destination.rows(`SELECT email_body FROM campaign_revisions WHERE id='${pending.revisionId}'`))[0].email_body).toBe(savedBody);
    for (const [image, bytes] of [[asset, original], [other, control]] as const) {
      const restored = await destination.call(new URL(image.url).pathname);
      expect(restored.status).toBe(200);
      expect(new Uint8Array(await restored.arrayBuffer())).toEqual(bytes);
    }

    const erasurePath = `/api/contacts/${contact.id}`;
    expect((await site.call(erasurePath, { method: 'DELETE' })).status).toBe(401);
    expect((await fetch(site.local(asset.url))).status).toBe(200);
    const started = await json(await site.call(erasurePath, { method: 'DELETE', cookie }), 202);
    expect(started.receipt.state).toBe('pending');
    for (const method of ['GET', 'HEAD']) {
      const refused = await site.call(new URL(asset.url).pathname, { method });
      expect(refused.status).toBe(503);
      if (method === 'GET') expect(await refused.json()).toEqual({ error: 'contact_erasure_in_progress' });
    }
    expect(edge.unexpected).toEqual([]);
  } finally {
    await destination?.runtime.close();
    await source?.runtime.close();
    await edge.close();
    await rm(work, { recursive: true, force: true });
  }
}
