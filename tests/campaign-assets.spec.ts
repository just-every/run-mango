import { expect, test } from '@playwright/test';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { contract } from './contract';
import { portabilityRuntime } from './portability/runtime.mjs';
import { png, pngHeaderOnly } from './support/images';
import { createDatabase } from '../src/core/platform/db/client';
import { createBlobStore } from '../src/core/platform/blobs';
import { runApprovalChecks } from '../src/core/features/lifecycle/checks';
import type { LifecycleRepository } from '../src/core/features/lifecycle/repository';
import type { CampaignRevisionSnapshot, LifecyclePlatform } from '../src/core/features/lifecycle/types';

const limits = JSON.parse(readFileSync('seed.json', 'utf8')).limits;
type Runtime = Awaited<ReturnType<typeof portabilityRuntime>>;
let runtime: Runtime;
test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => { runtime = await portabilityRuntime(); });
test.afterAll(async () => { await runtime?.close(); });

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
function upload(bytes: Uint8Array, contentType: string, { cookie = runtime.cookie as string | null, origin = runtime.origin } = {}) {
  const body = new FormData();
  body.append('file', new Blob([bytes], { type: contentType }), 'upload');
  return fetch(`${runtime.origin}/api/campaign-assets`, { method: 'POST', body,
    headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}) } });
}
const assetCount = async () => (await runtime.db.prepare('SELECT count(*) AS n FROM campaign_assets').first()).n as number;

contract('CAMP-012', 'an uploaded image is stored once by content hash and served publicly, immutable and cookie-free', async () => {
  const image = png(4, 3), hash = sha(image), before = await assetCount();
  const first = await upload(image, 'image/png');
  expect(first.status).toBe(201);
  const { asset } = await first.json();
  expect(asset).toMatchObject({ sha256: hash, contentType: 'image/png', bytes: image.byteLength, width: 4, height: 3, url: `${runtime.origin}/media/${hash}` });
  const repeat = await upload(image, 'image/png');
  expect(repeat.status).toBe(200);
  expect((await repeat.json()).asset.id).toBe(asset.id);
  expect(await assetCount()).toBe(before + 1);

  const served = await fetch(asset.url);
  expect(served.status).toBe(200);
  expect(new Uint8Array(await served.arrayBuffer())).toEqual(image);
  expect(served.headers.get('content-type')).toBe('image/png');
  expect(served.headers.get('x-content-type-options')).toBe('nosniff');
  expect(served.headers.get('cache-control')).toContain('immutable');
  expect(served.headers.get('set-cookie')).toBeNull();
  const head = await fetch(asset.url, { method: 'HEAD' });
  expect(head.status).toBe(200);
  expect(head.headers.get('content-type')).toBe('image/png');
  expect(head.headers.get('content-length')).toBe(String(image.byteLength));
  expect((await head.arrayBuffer()).byteLength).toBe(0);
  // The same address with its type's extension serves the same bytes; another type's extension names nothing.
  const named = await fetch(`${asset.url}.png`);
  expect(named.status).toBe(200);
  expect(new Uint8Array(await named.arrayBuffer())).toEqual(image);
  expect((await fetch(`${asset.url}.png`, { method: 'HEAD' })).status).toBe(200);
  expect((await fetch(`${asset.url}.jpg`)).status).toBe(404);

  expect((await fetch(`${runtime.origin}/media/${sha(randomBytes(16))}`)).status).toBe(404);
  expect((await fetch(`${runtime.origin}/media/${hash.toUpperCase()}`)).status).toBe(404);
  // Bytes under an approved letter can never change: the record refuses edits and deletion.
  await expect(runtime.db.prepare("UPDATE campaign_assets SET content_type='image/gif' WHERE sha256=?").bind(hash).run()).rejects.toThrow(/CAMPAIGN_ASSET_IMMUTABLE/);
  await expect(runtime.db.prepare('DELETE FROM campaign_assets WHERE sha256=?').bind(hash).run()).rejects.toThrow(/CAMPAIGN_ASSET_IMMUTABLE/);
});

contract('CAMP-012', 'uploads without a session, from another origin, of the wrong type, oversize or out of bounds store nothing', async () => {
  const before = await assetCount(), objects = (await runtime.bucket.list()).objects.length;
  const image = png(2, 2, 7);
  expect((await upload(image, 'image/png', { cookie: null })).status).toBe(401);
  expect((await upload(image, 'image/png', { origin: 'https://other.example.test' })).status).toBe(403);
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  expect((await upload(svg, 'image/svg+xml')).status).toBe(415);
  expect((await upload(svg, 'image/png')).status).toBe(415);
  expect((await upload(new TextEncoder().encode('<html><script>alert(1)</script></html>'), 'text/html')).status).toBe(415);
  const truncated = png(40, 40, 9);
  expect((await upload(truncated.slice(0, truncated.length - 20), 'image/png')).status).toBe(400);
  const oversize = new Uint8Array(limits.maxCampaignAssetBytes + 1);
  oversize.set(image);
  expect((await upload(oversize, 'image/png')).status).toBe(413);
  expect((await upload(pngHeaderOnly(limits.maxCampaignAssetPixelsPerSide + 1, 2), 'image/png')).status).toBe(422);
  expect((await upload(pngHeaderOnly(0, 2), 'image/png')).status).toBe(422);
  expect((await upload(new Uint8Array(), 'image/png')).status).toBe(400);
  expect(await assetCount()).toBe(before);
  expect((await runtime.bucket.list()).objects.length).toBe(objects);
});

contract('CAMP-012', 'an image past its per-minute allowance answers 429 without affecting other images', async () => {
  const spent = png(3, 3, 1), other = png(3, 3, 2);
  const [a, b] = [await (await upload(spent, 'image/png')).json(), await (await upload(other, 'image/png')).json()];
  // Keep the seeded counter and the request inside one database-clock minute.
  if (Date.now() % 60_000 > 55_000) await new Promise(resolve => setTimeout(resolve, 6_000));
  await runtime.db.prepare("INSERT OR REPLACE INTO oa_limits(key,window,count) VALUES(?,CAST(strftime('%s','now') AS INTEGER)/60,?)")
    .bind(`media:${a.asset.sha256}`, limits.mediaRequestsPerMinutePerAsset).run();
  expect((await fetch(a.asset.url)).status).toBe(429);
  expect((await fetch(b.asset.url)).status).toBe(200);
});

contract('CAMP-012', 'approval verifies this deployment\'s own images in storage, never through a network inspection', async () => {
  const image = png(6, 4, 3), { asset } = await (await upload(image, 'image/png')).json();
  const publicBaseUrl = new URL('https://mango.example.test');
  const now = new Date();
  const inspected: string[] = [];
  const capabilities = { configured: true, canSendMarketing: true, effectiveDeduplication: true, effectiveReconciliation: true,
    deduplicationWindowMs: 7 * 86400000, reconciliationWindowMs: 7 * 86400000, authentication: { spf: true, dkim: true, dmarc: true, aligned: true }, detail: 'Provider edge fake' };
  const sender = { async capabilities() { return capabilities; }, async validateSender() { return { ready: true, detail: 'Provider edge fake' }; },
    async inspectSender() { return { ready: true, reason: 'authentication-observed', checkedAt: now.getTime(), expiresAt: now.getTime() + 300000,
      lease: { id: 'lease', stateId: 'state', generation: 1, bindingDigest: 'binding', configurationDigest: 'configuration', observationId: 'observation', expiresAt: now.getTime() + 300000 },
      authentication: { spf: true, dkim: true, dmarc: true, aligned: true } }; } };
  const platform = { database: createDatabase(runtime.db), blobs: createBlobStore(runtime.bucket), mailer: sender,
    config: { publicBaseUrl, allowedLinkHosts: ['shop.example.test'], unresolvedProviderOutcomeHours: 1, providerReconciliationIntervalMinutes: 1, deliverabilityReportingWindowDays: 30,
      mailSender: { displayName: 'Mango', fromEmail: 'offers@example.test', replyToEmail: 'help@example.test', physicalAddress: '5 Main Street' } },
    linkInspector: { async inspect(url: string) { inspected.push(url); return { ok: url.startsWith('https://shop.example.test/'), finalUrl: url, detail: 'Network edge fake' }; } },
  } as unknown as LifecyclePlatform;
  const repository = { async reputation() { return { delivered: 0, complained: 0, hardBounced: 0, attempted: 0, complaintRate: 0, hardBounceRate: 0 }; } } as unknown as LifecycleRepository;
  const offer = 'https://shop.example.test/offer';
  async function approve(imageHash: string) {
    const src = new URL(`/media/${imageHash}`, publicBaseUrl).toString();
    const snapshot: CampaignRevisionSnapshot = {
      campaign: { id: 'campaign', state: 'draft', activeRevisionId: null, updatedAt: now },
      revision: { id: 'revision', campaignId: 'campaign', state: 'draft', version: 1, name: 'Images', audienceRule: 'Subscribed',
        inclusionRuleJson: JSON.stringify({ version: 1, operator: 'all', predicates: [{ sourceType: 'contact', field: 'emailStatus', comparator: 'eq', value: 'subscribed' }] }),
        exclusionRulesJson: '[]', sourceTypesJson: '[]', emailSubject: 'Pictures', preheader: 'A picture',
        emailBody: `<p><img src="${src}" alt="Orchard" width="600" height="400"></p><p><a href="${offer}">Read offer</a></p><p>{{physical_address}}</p><a href="{{unsubscribe_url}}">Unsubscribe</a>`,
        emailText: `Read offer ${offer}\n{{physical_address}}\nUnsubscribe {{unsubscribe_url}}`, smsBody: '', senderName: 'Mango', fromEmail: 'offers@example.test',
        replyToEmail: 'help@example.test', smsSender: '', physicalAddress: '5 Main Street', messageCategory: 'offers', trackingEnabled: false, updatedAt: now },
      steps: [{ id: 'step', channel: 'email', sequence: 0, timezone: 'Etc/UTC', scheduledAt: now, sendByAt: new Date(now.getTime() + 86400000), whyThisTime: 'Fixture' }],
      links: [{ id: 'link', label: 'Offer', destinationUrl: offer, sequence: 0 }],
    };
    const result = await runApprovalChecks({ snapshot, platform, repository, now,
      candidates: [{ contactId: 'contact', contactIdentityKey: 'contact', channels: { email: { destination: 'reader@example.test', consents: [{ destination: 'reader@example.test', brandOrLegalSender: 'Mango', category: 'offers', jurisdiction: 'email' }] } } }] });
    return { src, checks: new Map(result.checks.map(item => [item.kind, item])) };
  }
  const stored = await approve(asset.sha256);
  expect([...stored.checks.values()].filter(item => item.blocking)).toEqual([]);
  expect(inspected).toContain(offer);
  expect(inspected).not.toContain(stored.src);
  const unknown = await approve(sha(randomBytes(16)));
  expect(unknown.checks.get('message.links.resolved')).toMatchObject({ status: 'blocked', blocking: true });
  expect(unknown.checks.get('message.links.resolved')!.detail).toContain(unknown.src);
  expect(inspected).not.toContain(unknown.src);
});
