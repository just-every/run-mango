import {advanceClock} from './clock';
import {pacedAdapter} from '../../src/core/features/lifecycle/transport-pacing';
import {controlledDatabase,controlledQueue,arm,release,status,capturedEmissions,replay} from './delivery-controls';
import {createProductionPlatform} from '../../src/core/platform/runtime';
import productionWorker from '../../src/core/app/worker';
import { productionBindings, receiptUrl, receiptRecipient } from './production-bindings';
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
import { createResendAdapter } from '../../src/core/platform/adapters/resend';
import { createSendgridAdapter } from '../../src/core/platform/adapters/sendgrid';
import { createSenderVerification } from '../../src/core/features/sender-verification/service';
import { digest } from '../../src/core/features/sender-verification/identity';
import { receiptConfiguration } from '../../src/core/features/sender-verification/receipt-configuration';
import { tags } from '../../src/core/features/sender-verification/dns';
import type { Challenge } from '../../src/core/features/sender-verification/types';
import { loadSenderSettings } from '../../src/core/features/settings/sender-persistence';

type Bindings = LocalAppBindings & { GO_LIVE_EDGE_ORIGIN: string; GO_LIVE_WEBHOOK_KEY: string; GO_LIVE_PUBLIC_ORIGIN: string;
  GO_LIVE_PROVIDER_KEY: string; GO_LIVE_DKIM_KEY: string; MANGO_RESTORE_MODE?: string; GO_LIVE_COMMERCE?: string; GO_LIVE_SMS?: string; GO_LIVE_SMS_POLICY_AT?: string; GO_LIVE_MAIL_PROVIDER?: string; GO_LIVE_RESEND_COVERAGE?: string; GO_LIVE_PARALLEL_JOBS?: LocalAppBindings['MANGO_JOBS'] };

// Observations only: each count is recorded after the actual production consumer returns.
const completedQueues=new Map<string,string[]>();
const network = globalThis.fetch;
let edge = '';
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = new Request(input, init), url = new URL(request.url);
  if (['127.0.0.1', 'localhost'].includes(url.hostname)) return network(request);
  if (!['api.sendgrid.com', 'api.resend.com', 'cloudflare-dns.com','mango-test.myshopify.com','api.mobilemessage.com.au','shop.example.test'].includes(url.hostname)) throw new Error(`Unexpected network call: ${url.origin}`);
  const headers = new Headers(request.headers); headers.set('X-Edge-Original-Url', url.href);
  return network(new URL(url.pathname + url.search, edge), { method: request.method, headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(), signal: request.signal });
}) as typeof fetch;

function receiver(bindings: Bindings) {
  return { id: receiptConfiguration(receiptUrl,receiptRecipient).id, recipient: receiptRecipient, async acquire(challenge: Challenge) {
    return { receiptId: `receipt-${challenge.id}`, originalDigest: await digest(['original', challenge.id]), receivedAt: Date.now(),
      from: challenge.request.sender, to: challenge.recipient, providerMessageId: challenge.providerMessageId!, requestDigest: challenge.requestDigest,
      nonce: challenge.nonce, signedBody: { digest: await digest(challenge.request.content.text), complete: true, nonce: challenge.nonce },
      authentication: { spf: { result: 'pass', mailFromDomain: bindings.GO_LIVE_MAIL_PROVIDER==='resend'?'send.example.test':'em123.example.test' },
        dkim: { result: 'pass', domain: 'example.test', selector: bindings.GO_LIVE_MAIL_PROVIDER==='resend'?'resend':'s1', keyDigest: await digest(tags(`v=DKIM1; k=rsa; p=${bindings.GO_LIVE_DKIM_KEY}`)) },
        dmarc: { result: 'pass', fromDomain: 'example.test', semantics: 'rfc9989' as const } } };
  } };
}

async function compose(bindings: Bindings) {
  edge = bindings.GO_LIVE_EDGE_ORIGIN;
  const platform = createFixturePlatform(bindings, bindings.LOCAL_BOOTSTRAP_TOKEN);
  Object.assign(platform.config, { mailProvider: 'sendgrid', mailProviderApiKey: bindings.GO_LIVE_PROVIDER_KEY,
    mailWebhookSecret: bindings.GO_LIVE_WEBHOOK_KEY, publicBaseUrl: new URL(bindings.GO_LIVE_PUBLIC_ORIGIN),
    mailboxReceiptUrl: receiptUrl, mailboxReceiptRecipient: receiptRecipient,
    emailHandoffsPerMinute: 50, testEmailAllowlist: ['tester@example.test', 'receiver@example.test'] });
  const smsEnabled=bindings.GO_LIVE_SMS==='1'||bindings.GO_LIVE_SMS==='missing-retention';
  if(bindings.GO_LIVE_COMMERCE==='1'||smsEnabled||bindings.GO_LIVE_MAIL_PROVIDER==='resend') {
    const production=createProductionPlatform(productionBindings(bindings));
    platform.config.allowedLinkHosts=production.config.allowedLinkHosts;
    platform.linkInspector=production.linkInspector;
    platform.config.deliveryPolicies=production.config.deliveryPolicies;
    Object.assign(platform.config,{mailProvider:production.config.mailProvider,mailProviderApiKey:production.config.mailProviderApiKey,mailWebhookSecret:production.config.mailWebhookSecret,mailWebhookId:production.config.mailWebhookId});
    if(bindings.GO_LIVE_COMMERCE==='1') {
      platform.commerce=production.commerce;
      platform.config.modules.commerce=production.config.modules.commerce;
    }
    if(smsEnabled) {
      platform.sms=production.sms;
      platform.config.modules.sms=production.config.modules.sms;
    }
  }
  await loadSenderSettings(platform);
  const verification = createSenderVerification({ database: platform.database, config: platform.config, receiver: receiver(bindings) });
  const mailer=platform.config.mailProvider==='resend'
    ? createResendAdapter({apiKey:platform.config.mailProviderApiKey,webhookSecret:platform.config.mailWebhookSecret,webhookId:platform.config.mailWebhookId,verification,retentionPolicy:platform.config.deliveryPolicies?.resend})
    : createSendgridAdapter({apiKey:platform.config.mailProviderApiKey,webhookPublicKey:platform.config.mailWebhookSecret,verification});
  platform.mailer=pacedAdapter(mailer,platform.database,platform.config);
  platform.senderVerification=verification;
  return { platform, verification };
}

async function control(request: Request, bindings: Bindings) {
  if (request.headers.get('X-Test-Token') !== bindings.LOCAL_BOOTSTRAP_TOKEN) return new Response('Forbidden', { status: 403 });
  const path=new URL(request.url).pathname;
  if(path==='/_golive/clock') {
    const body=await request.json() as {advanceMs?:number;hold?:boolean};
    return Response.json(advanceClock(body.advanceMs,body.hold));
  }
  if(path==='/_golive/barrier') {
    const body=await request.json() as {action:'arm'|'release'|'status';point:'step-start'|'approval'|'handoff'|'click-index'|'outage-pause'|'sms-frequency';identity:string};
    if(body.action==='arm')arm(body.point,body.identity);
    if(body.action==='release')release();
    return Response.json(status());
  }
  if(path==='/_golive/emissions')return Response.json(capturedEmissions().map(item=>({...item,completedQueues:completedQueues.get(JSON.stringify(item.command))??[]})));
  if(path==='/_golive/replay') {
    const {index,parallel}=await request.json() as {index:number;parallel?:boolean};
    const queue=parallel?bindings.GO_LIVE_PARALLEL_JOBS:bindings.MANGO_JOBS;
    if(!queue)throw new Error('Parallel native Queue is not enabled for this installation.');
    await replay(queue,index);return Response.json({ok:true});
  }
  const { platform, verification } = await compose(bindings), db=bindings.DB;
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
  if (path === '/_golive/cron') {
    const body=await request.json() as {scheduledTime?:number; missingMailConfiguration?:boolean};
    const pending:Promise<unknown>[]=[];
    productionWorker.scheduled({scheduledTime:body.scheduledTime??Date.now(),cron:'* * * * *',noRetry(){}},{...productionBindings(bindings),...(body.missingMailConfiguration?{MAIL_PROVIDER_API_KEY:''}:{})},
      {waitUntil:work=>{pending.push(work);}} as ExecutionContext);
    await Promise.all(pending);
    return Response.json({ok:true});
  }
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

const worker = {
  async fetch(request: Request, bindings: Bindings, context: ExecutionContext) {
    bindings={...bindings,DB:controlledDatabase(bindings.DB),MANGO_JOBS:controlledQueue(bindings.MANGO_JOBS)};
    if (new URL(request.url).pathname.startsWith('/_golive/')) return control(request, bindings);
    const { platform } = await compose(bindings);
    // Links carry the HTTPS public origin while this runtime listens on loopback, so the
    // app's origin check is trusted locally; Base's transfer handler still checks its own.
    return dispatchDocuments(request, bindings, context, platform, createApp(bindings, platform, undefined, true));
  },
  scheduled(controller:ScheduledController,bindings:Bindings,context:ExecutionContext) {
    edge=bindings.GO_LIVE_EDGE_ORIGIN;
    bindings={...bindings,DB:controlledDatabase(bindings.DB),MANGO_JOBS:controlledQueue(bindings.MANGO_JOBS)};
    return productionWorker.scheduled(controller,productionBindings(bindings),context);
  },
  async queue(batch: MessageBatch, bindings: Bindings) {
    edge=bindings.GO_LIVE_EDGE_ORIGIN;
    bindings={...bindings,DB:controlledDatabase(bindings.DB),MANGO_JOBS:controlledQueue(bindings.MANGO_JOBS)};
    await productionWorker.queue(batch,productionBindings(bindings));
    for(const message of batch.messages) {
      const key=JSON.stringify(message.body);
      completedQueues.set(key,[...(completedQueues.get(key)??[]),batch.queue]);
    }
  },
} satisfies ExportedHandler<Bindings>;

export default worker;
