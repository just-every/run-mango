// Test-only Worker entry for the go-live journey, served by the same Vite and
// Cloudflare plugin runtime as rer dev. It composes Mango's real SendGrid
// adapter, sender verification, approval, queue dispatch, webhook, unsubscribe
// and portability routes. Only network calls are substituted: requests to
// api.sendgrid.com and cloudflare-dns.com go to the journey's provider edge,
// and the trusted receipt connector reports what a receiving mailbox observed.
import { createFixturePlatform } from '../support/local-platform';
import { testIdentity } from '../support/test-identity';
import type { LocalAppBindings } from '../support/fixture-app';
import { createApp, createAppServices } from '../../src/core/app/app';
import { dispatchDocuments } from '../../src/core/app/document-dispatch';
import { createSendgridAdapter } from '../../src/core/platform/adapters/sendgrid';
import { createSenderVerification } from '../../src/core/features/sender-verification/service';
import { digest } from '../../src/core/features/sender-verification/identity';
import { tags } from '../../src/core/features/sender-verification/dns';
import type { Challenge } from '../../src/core/features/sender-verification/types';
import { loadSenderSettings } from '../../src/core/features/settings/sender-persistence';
import { consumeLifecycleQueue, runLifecycleCron, type LifecycleQueueBatch } from '../../src/core/features/lifecycle';

type Bindings = LocalAppBindings & { GO_LIVE_EDGE_ORIGIN: string; GO_LIVE_WEBHOOK_KEY: string; GO_LIVE_PUBLIC_ORIGIN: string;
  GO_LIVE_PROVIDER_KEY: string; GO_LIVE_DKIM_KEY: string; MANGO_RESTORE_MODE?: string };

const network = globalThis.fetch;
let edge = '';
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = new Request(input, init), url = new URL(request.url);
  if (['127.0.0.1', 'localhost'].includes(url.hostname)) return network(request);
  if (!['api.sendgrid.com', 'cloudflare-dns.com'].includes(url.hostname)) throw new Error(`Unexpected network call: ${url.origin}`);
  const headers = new Headers(request.headers); headers.set('X-Edge-Original-Url', url.href);
  return network(new URL(url.pathname + url.search, edge), { method: request.method, headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(), signal: request.signal });
}) as typeof fetch;

function receiver(bindings: Bindings) {
  return { id: 'go-live-receiving-mailbox', recipient: 'receiver@example.test', async acquire(challenge: Challenge) {
    return { receiptId: `receipt-${challenge.id}`, originalDigest: await digest(['original', challenge.id]), receivedAt: Date.now(),
      from: challenge.request.sender, to: challenge.recipient, providerMessageId: challenge.providerMessageId!, requestDigest: challenge.requestDigest,
      nonce: challenge.nonce, signedBody: { digest: await digest(challenge.request.content.text), complete: true, nonce: challenge.nonce },
      authentication: { spf: { result: 'pass', mailFromDomain: 'em123.example.test' },
        dkim: { result: 'pass', domain: 'example.test', selector: 's1', keyDigest: await digest(tags(`v=DKIM1; k=rsa; p=${bindings.GO_LIVE_DKIM_KEY}`)) },
        dmarc: { result: 'pass', fromDomain: 'example.test', semantics: 'rfc9989' as const } } };
  } };
}

async function compose(bindings: Bindings) {
  edge = bindings.GO_LIVE_EDGE_ORIGIN;
  const platform = createFixturePlatform(bindings, bindings.LOCAL_BOOTSTRAP_TOKEN);
  Object.assign(platform.config, { mailProvider: 'sendgrid', mailProviderApiKey: bindings.GO_LIVE_PROVIDER_KEY,
    mailWebhookSecret: bindings.GO_LIVE_WEBHOOK_KEY, publicBaseUrl: new URL(bindings.GO_LIVE_PUBLIC_ORIGIN),
    emailHandoffsPerMinute: 50, testEmailAllowlist: ['tester@example.test', 'receiver@example.test'] });
  await loadSenderSettings(platform);
  const verification = createSenderVerification({ database: platform.database, config: platform.config, receiver: receiver(bindings) });
  platform.mailer = createSendgridAdapter({ apiKey: bindings.GO_LIVE_PROVIDER_KEY, webhookPublicKey: bindings.GO_LIVE_WEBHOOK_KEY, verification });
  return { platform, verification };
}

async function control(request: Request, bindings: Bindings) {
  if (request.headers.get('X-Test-Token') !== bindings.LOCAL_BOOTSTRAP_TOKEN) return new Response('Forbidden', { status: 403 });
  const { platform, verification } = await compose(bindings), path = new URL(request.url).pathname, db = bindings.DB;
  if (path === '/_golive/open') {
    const { email, id } = await request.json() as { email: string; id: string };
    await testIdentity(platform).importLocalDemoOperator({ id, email, displayName: 'Owner' }, new Date());
    return Response.json({ token: (await testIdentity(platform).createTestSession(id)).token });
  }
  // The protected deployment runner's prepare, send and observe steps.
  if (path === '/_golive/sender-evidence') {
    const challenge = await verification.prepareChallenge({ recipient: 'receiver@example.test', subject: 'Mango sender check', text: 'Sender authentication diagnostic.' });
    await verification.sendChallenge(challenge.id, platform.mailer);
    return Response.json(await verification.acquireObservation(challenge.id));
  }
  // The deployed scheduled handler: due steps are queued for the real consumer.
  if (path === '/_golive/cron') { await runLifecycleCron(null, createAppServices(platform).lifecycleRuntime); return Response.json({ ok: true }); }
  // The unsubscribe link a letter to this contact would carry, without sending one.
  if (path === '/_golive/unsubscribe-link') {
    const { contactId } = await request.json() as { contactId: string };
    const issued = await createAppServices(platform).audienceService.issueUnsubscribeToken(contactId, 'email');
    return Response.json({ url: new URL(`/unsubscribe/${issued.token}`, platform.config.publicBaseUrl).href });
  }
  if (path === '/_golive/rows') {
    const { sql } = await request.json() as { sql: string };
    if (!/^SELECT\s/i.test(sql)) return new Response('Read-only', { status: 400 });
    return Response.json((await db.prepare(sql).all()).results);
  }
  return new Response('Not found', { status: 404 });
}

export default {
  async fetch(request: Request, bindings: Bindings, context: ExecutionContext) {
    if (new URL(request.url).pathname.startsWith('/_golive/')) return control(request, bindings);
    const { platform } = await compose(bindings);
    // Links carry the HTTPS public origin while this runtime listens on loopback, so the
    // app's origin check is trusted locally; Base's transfer handler still checks its own.
    return dispatchDocuments(request, bindings, context, platform, createApp(bindings, platform, undefined, true));
  },
  async queue(batch: unknown, bindings: Bindings) {
    if (bindings.MANGO_RESTORE_MODE === '1') throw new Error('Mango restore maintenance is active; retry the queue later.');
    const { platform } = await compose(bindings);
    await consumeLifecycleQueue(batch as LifecycleQueueBatch, createAppServices(platform).lifecycleRuntime);
  },
} satisfies ExportedHandler<Bindings>;
