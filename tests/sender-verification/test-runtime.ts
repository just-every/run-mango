import { createProductionPlatform } from '../../src/core/platform/runtime';
import { createSenderVerification } from '../../src/core/features/sender-verification/service';
import { createResendAdapter } from '../../src/core/platform/adapters/resend';
import { createAppServices } from '../../src/core/app/app';
import { createLifecycleServices } from '../../src/core/features/lifecycle';
import { digest } from '../../src/core/features/sender-verification/identity';
import type { AppBindings } from '../../src/core/shared/platform';
import type { ReceiverMaterial, Challenge } from '../../src/core/features/sender-verification/types';
export function composeFixture(db: D1Database, commerce = true) {
  const jobs: unknown[] = [];
  const bindings = { DB: db, ASSETS: { fetch: async () => new Response('asset') }, ASSETS_BUCKET: {},
    MANGO_JOBS: { send: async (job: unknown) => { jobs.push(job); } },
    SESSION_SIGNING_KEY: 'test-only-session-key-long-enough-to-pass', INITIAL_OPERATOR_EMAILS: 'operator@example.test', CONTACT_HASH_SALT: 'test-only-contact-salt',
    MAIL_PROVIDER: 'resend', MAIL_PROVIDER_API_KEY: 'test-only-credential', MAIL_AUTH_FROM: 'offers@example.test', MAIL_WEBHOOK_SECRET: 'test-only-webhook', MAIL_WEBHOOK_ID: 'test-hook',
    MANGO_PUBLIC_BASE_URL: 'https://mango.example.test', MANGO_APP_VERSION: 'test', MANGO_ALLOWED_LINK_HOSTS: 'shop.example.test',
    MANGO_TEST_EMAIL_ALLOWLIST: 'receiver@example.test', MANGO_RECONCILIATION_INTERVAL_MINUTES: '15', MANGO_UNRESOLVED_OUTCOME_HOURS: '1',
    MANGO_EMAIL_HANDOFFS_PER_MINUTE: '10', MANGO_DELIVERABILITY_WINDOW_DAYS: '30', MAIL_SENDER_NAME: 'Mango',
    MAIL_REPLY_TO: 'reply@example.test', MAIL_PHYSICAL_ADDRESS: '1 Test Street',
  } as unknown as AppBindings;
  if (commerce) Object.assign(bindings, { COMMERCE_STORE_URL: 'https://shop.example.test', COMMERCE_API_TOKEN: 'test-only-commerce', COMMERCE_WEBHOOK_SECRET: 'test-only-commerce-hook' });
  const customers: unknown[] = [];
  let nowOffset = 0, result = 'pass', outage = false, domainStatus = 'verified', reconcilePages = false, mutateReceipt: ((r: ReceiverMaterial) => ReceiverMaterial) | undefined;
  const outbound: Array<Record<string, any>> = [];
  const calls: string[] = [];
  const records = [
    { record: 'SPF', name: 'send', type: 'TXT', value: 'v=spf1 include:amazonses.com ~all', status: 'verified' },
    { record: 'SPF', name: 'send', type: 'MX', value: 'feedback.example.test', priority: 10, status: 'verified' },
    { record: 'DKIM', name: 'selector._domainkey', type: 'TXT', value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC053m3QEgV8UfCdhRky4NbKGcawjzjPDBqVCIkyZbWXL9sQ2ixAXrY2oE9r2SMgJKO0Ufb/QLytki0DLLAYh9MMV0Szk5iUD3+HcXjhc1j4iVC0BxTUdkw1twwjFI3Za+driJ95wFGGBBh0+MnS6npHc+NDCep+g2pnl0GHJ01DwIDAQAB', status: 'verified' },
  ];
  const transport: typeof fetch = async (url, init) => {
    const u = new URL(url instanceof Request ? url.url : String(url));
    if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') return originalFetch(url, init);
    calls.push(u.href);
    if (outage) return new Response('private provider response', { status: 503 });
    if (u.hostname === 'shop.example.test') return Response.json({ data: { customers: { nodes: customers, pageInfo: { hasNextPage: false } } } });
    if (u.hostname === 'api.resend.com') {
      const domain = { id: 'domain-1', name: 'example.test', status: domainStatus, region: 'us-east-1', capabilities: { sending: 'enabled' } };
      if (u.pathname === '/domains') {
        return Response.json(u.searchParams.has('after') ? { data: [domain], has_more: false }
          : { data: [{ ...domain, id: 'other-domain', name: 'other.test' }], has_more: true });
      }
      if (u.pathname === '/domains/domain-1') return Response.json({ ...domain, records });
      if (u.pathname === '/emails' && init?.method === 'POST') {
        outbound.push(JSON.parse(String(init.body)));
        return Response.json({ id: `sent-${outbound.length}` });
      }
      if (u.pathname === '/emails') return Response.json(reconcilePages
        ? u.searchParams.get('after') === 'other-email' ? { data: [{id:'sent-1'}], has_more:false }
          : { data:[{id:'other-email'}], has_more:true }
        : { data: [], has_more: false });
      if (reconcilePages && u.pathname === '/emails/other-email') return Response.json({id:'other-email',tags:[]});
      if (reconcilePages && u.pathname === '/emails/sent-1') return Response.json({id:'sent-1',created_at:new Date().toISOString(),...outbound[0]});
    }
    if (u.hostname === 'cloudflare-dns.com') {
      const name = u.searchParams.get('name')!, type = u.searchParams.get('type');
      let data: string | undefined;
      if (name === 'amazonses.com') data = 'v=spf1 ip4:192.0.2.0/24 -all';
      if (name === 'send.example.test') data = type === 'MX' ? '10 feedback.example.test.' : records[0].value;
      if (name === 'selector._domainkey.example.test') data = records[2].value;
      if (name === '_dmarc.example.test') data = 'v=DMARC1; p=none; psd=n';
      return Response.json(data ? { Status: 0, Answer: [{ name, type: type === 'MX' ? 15 : 16, TTL: 300, data: type === 'MX' ? data : JSON.stringify(data) }] }
        : { Status: 0, Authority: [{ name: 'example.test', type: 6, TTL: 300, data: 'ns.example.test host.example.test 1 300 300 300 300' }] });
    }
    throw new Error(`Unexpected external call in test: ${u.origin}${u.pathname}`);
  };
  const receipts = new Map<string, ReceiverMaterial>();
  const receiver = { id: 'test-only-authenticated-receiver', recipient: 'receiver@example.test', async acquire(challenge: Challenge) {
    let material = receipts.get(challenge.id);
    if (!material) {
      material = { receiptId: `received-${challenge.id}`, originalDigest: await digest(['original', challenge.id]), receivedAt: Date.now(),
        from: challenge.request.sender, to: challenge.recipient, providerMessageId: challenge.providerMessageId!, requestDigest: challenge.requestDigest,
        nonce: challenge.nonce, signedBody: { digest: await digest(challenge.request.content.text), complete: true, nonce: challenge.nonce },
        authentication: { spf: { result, mailFromDomain: 'send.example.test' },
          dkim: { result: 'pass', domain: 'example.test', selector: 'selector', keyDigest: await digest({ v: 'DKIM1', k: 'rsa', p: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC053m3QEgV8UfCdhRky4NbKGcawjzjPDBqVCIkyZbWXL9sQ2ixAXrY2oE9r2SMgJKO0Ufb/QLytki0DLLAYh9MMV0Szk5iUD3+HcXjhc1j4iVC0BxTUdkw1twwjFI3Za+driJ95wFGGBBh0+MnS6npHc+NDCep+g2pnl0GHJ01DwIDAQAB' }) },
          dmarc: { result: 'pass', fromDomain: 'example.test', semantics: 'rfc9989' } } };
      receipts.set(challenge.id, material);
    }
    return mutateReceipt ? mutateReceipt(structuredClone(material)) : material;
  } };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = transport;
  const platform = createProductionPlatform(bindings);
  const createVerifier = () => createSenderVerification({ database: platform.database, config: platform.config, receiver, transport, clock: () => Date.now() + nowOffset });
  let verifier = createVerifier();
  const connect = () => { platform.mailer = createResendAdapter({ apiKey: bindings.MAIL_PROVIDER_API_KEY, webhookSecret: bindings.MAIL_WEBHOOK_SECRET, webhookId: bindings.MAIL_WEBHOOK_ID, verification: verifier }); };
  connect();
  const services = createAppServices(platform), lifecycle = createLifecycleServices(services.lifecycleRuntime);
  return { db, platform, bindings, verifier, services, lifecycle, calls, outbound, records, jobs, customers,
    originalProduction: () => createProductionPlatform(bindings),
    restart: () => { verifier = createVerifier(); connect(); return verifier; },
    offset: (value: number) => { nowOffset = value; },
    outage: (value: boolean) => { outage = value; },
    status: (value: string) => { domainStatus = value; },
    authResult: (value: string) => { result = value; },
    reconciliationPages: () => { reconcilePages = true; },
    changeReceipt: (fn?: typeof mutateReceipt) => { mutateReceipt = fn; },
    async prove() { const challenge = await verifier.prepareChallenge({ recipient: receiver.recipient, subject: 'Approved local test', text: 'Approved diagnostic content.' });
      await verifier.sendChallenge(challenge.id, platform.mailer); await verifier.acquireObservation(challenge.id); return challenge; },
    async dispose() { globalThis.fetch = originalFetch;  },
  };
}
export async function draft(f: ReturnType<typeof composeFixture>, suffix = crypto.randomUUID()) {
  const now = Date.now(), campaignId = `campaign-${suffix}`, revisionId = `revision-${suffix}`, stepId = `step-${suffix}`;
  await f.services.audienceService.captureConsent({ idempotencyKey: `consent-${suffix}`, contact: { email: `recipient-${suffix}@example.test`, displayName: 'Recipient' },
    channel: 'email', brandOrLegalSender: 'Mango', messageCategory: 'offers', destinationJurisdiction: 'AU', frequencyDisclosure: 'Weekly', captureMethod: 'test', captureSource: 'test',
    consentText: 'I consent to weekly offers.', consentVersion: 'v1', occurredAt: new Date(now), confirmationRequired: false });
  f.customers.push({ id: `customer-${suffix}`, email: `recipient-${suffix}@example.test`, firstName: 'Test', updatedAt: new Date().toISOString() });
  await f.services.lifecycleRuntime.synchronizeCommerce!({sourceType: 'customer', provider: 'shopify'});
  await f.db.prepare(`INSERT INTO campaigns (id,state,active_revision_id,created_at,updated_at) VALUES (?,'draft',?,?,?)`).bind(campaignId, revisionId, now, now).run();
  await f.db.prepare(`INSERT INTO campaign_revisions (id,campaign_id,version,state,name,email_subject,email_body,email_text,preheader,sms_body,sender_name,from_email,reply_to_email,physical_address,message_category,audience_rule,inclusion_rule_json,exclusion_rules_json,created_at,updated_at)
    VALUES (?,?,1,'draft','Native sender test','Offers','<p>Offer</p><p>{{physical_address}}</p><a href="{{unsubscribe_url}}">Unsubscribe</a>','Offer {{physical_address}} Unsubscribe: {{unsubscribe_url}}','Offers','','Mango','offers@example.test','reply@example.test','1 Test Street','offers','All subscribed',?,'[]',?,?)`)
    .bind(revisionId, campaignId, JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'customer',field:'email',comparator:'eq',value:`recipient-${suffix}@example.test`}]}), now, now).run();
  await f.db.prepare(`INSERT INTO campaign_steps (id,revision_id,sequence,channel,timezone,scheduled_at,send_by_at,why_this_time,created_at,updated_at)
    VALUES (?,?,1,'email','UTC',?,?,'Approved test time',?,?)`).bind(stepId, revisionId, now - 1000, now + 3600000, now, now).run();
  return { campaignId, revisionId, stepId, operatorId: 'operator', idempotencyKey: `approve-${suffix}` };
}
