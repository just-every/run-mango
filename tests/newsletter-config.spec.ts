import { sqlStatements } from '../operations/sql-statements.mjs';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import productionWorker from '../src/core/app/worker';
import { createAppServices } from '../src/core/app/app';
import { consumeLifecycleQueue } from '../src/core/features/lifecycle';
import { readProductionConfig, optionalModuleInputs } from '../src/core/platform/config';
import { createProductionPlatform } from '../src/core/platform/runtime';
import type { AppBindings } from '../src/core/shared/platform';

const root = process.cwd();
const workspaceRequire = createRequire(join(root, 'package.json'));
const { Miniflare } = createRequire(workspaceRequire.resolve('wrangler/package.json'))('miniflare');

function newsletterBindings(database: D1Database): AppBindings {
  return {
    ASSETS: { fetch: () => Promise.resolve(new Response('asset fallback must not run')) },
    DB: database,
    ASSETS_BUCKET: { async head() { return null; } } as unknown as R2Bucket,
    MANGO_JOBS: { async send() {} } as unknown as Queue<any>,
    SESSION_SIGNING_KEY: randomBytes(32).toString('hex'),
    INITIAL_OPERATOR_EMAILS: 'operator@example.test',
    CONTACT_HASH_SALT: randomBytes(32).toString('hex'),
    MAIL_PROVIDER: 'resend', MAIL_PROVIDER_API_KEY: 'newsletter-test-mail-key',
    MAIL_AUTH_FROM: 'Mango <offers@example.test>',
    MAIL_WEBHOOK_SECRET: 'newsletter-test-mail-webhook-secret',
    MAIL_WEBHOOK_ID: 'newsletter-test-hook',
    MANGO_PUBLIC_BASE_URL: 'https://operator.example.test',
    MANGO_APP_VERSION: 'newsletter-test',
    MANGO_ALLOWED_LINK_HOSTS: 'shop.example.test',
    MANGO_TEST_EMAIL_ALLOWLIST: 'operator@example.test',
    MANGO_RECONCILIATION_INTERVAL_MINUTES: '15',
    MANGO_UNRESOLVED_OUTCOME_HOURS: '48',
    MANGO_EMAIL_HANDOFFS_PER_MINUTE: '10',
    MANGO_DELIVERABILITY_WINDOW_DAYS: '30',
    MAIL_SENDER_NAME: 'Mango',
    MAIL_REPLY_TO: 'help@example.test',
    MAIL_PHYSICAL_ADDRESS: '1 Example Street, Brisbane QLD 4000',
  };
}

async function localDatabase(name: string) {
  const worker = new Miniflare({
    host: '127.0.0.1',
    cf: false,
    telemetry: { enabled: false },
    workers: [{
      config: {
        name,
        type: 'worker',
        compatibilityDate: '2026-08-31',
        manifest: {
          mainModule: 'worker.js',
          modules: { 'worker.js': { type: 'esm', contents: 'export default { fetch() { return new Response("test database") } }' } },
        },
        env: { DB: { type: 'd1', id: `${name}-${crypto.randomUUID()}` } },
      },
    }],
  });
  const database = await worker.getD1Database('DB');
  for (const migration of (await readdir(join(root, 'migrations/core'))).filter((name) => name.endsWith('.sql')).sort()) {
    const sql = await readFile(join(root, 'migrations/core', migration), 'utf8');
    for (const statement of sqlStatements(sql)) {
      await database.prepare(statement).run();
    }
  }
  return { worker, database };
}

test('newsletter-only production entry boots on isolated D1 without constructing optional providers or contacting them', async () => {
  const local = await localDatabase('newsletter-production-entry');
  const environment = newsletterBindings(local.database as D1Database);
  const config = readProductionConfig(environment);
  expect(config.modules.commerce).toMatchObject({ enabled: false, requiredInputs: [...optionalModuleInputs.commerce] });
  expect(config.modules.sms).toMatchObject({ enabled: false, requiredInputs: [...optionalModuleInputs.sms] });
  expect(config.modules.ai).toMatchObject({ enabled: false, requiredInputs: [...optionalModuleInputs.ai] });
  expect(config.modules.design).toMatchObject({ enabled: false, requiredInputs: [...optionalModuleInputs.design] });

  const platform = createProductionPlatform(environment);
  expect(platform.commerce).toBeUndefined();
  expect(platform.sms).toBeUndefined();
  expect(platform.ai).toBeUndefined();
  expect(platform.design).toBeUndefined();
  const services = createAppServices(platform);
  const commerceRule = await services.lifecycleRuntime.audience.resolveFrozenCandidates({
    inclusionRule: {
      version: 1,
      operator: 'all',
      predicates: [{ sourceType: 'order', field: 'productId', comparator: 'eq', value: 'product-1' }],
    },
    exclusionRules: [],
    sourceTypes: ['order'],
    channels: ['email'],
    now: new Date(),
  });
  expect(commerceRule).toMatchObject({ status: 'unavailable', sourceTypes: ['order', 'refund'] });
  expect(await services.storeService.freshness(['order'], new Date())).toMatchObject([
    { sourceType: 'order', reason: 'source-unavailable' },
  ]);

  const originalFetch = globalThis.fetch;
  const externalRequests: string[] = [];
  globalThis.fetch = async (input) => {
    externalRequests.push(String(input));
    throw new Error(`Unexpected external provider request: ${String(input)}`);
  };
  try {
    const response = await productionWorker.fetch(
      new Request('https://operator.example.test/health'),
      environment,
      { waitUntil() {}, passThroughOnException() {} } as ExecutionContext,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok', ok: true, deployment: { sourceSha: null, fingerprint: null, versionId: null } });
    expect(externalRequests).toEqual([]);
  } finally {
    globalThis.fetch = originalFetch;
    await local.worker.dispose();
  }
});

test('a previously approved SMS step becomes a durable unconfigured failure without retrying or contacting a provider', async () => {
  const local = await localDatabase('newsletter-disabled-sms-delivery');
  const environment = newsletterBindings(local.database as D1Database);
  const now = Date.now();
  const revisionId = 'newsletter-sms-revision';
  const campaignId = 'newsletter-sms-campaign';
  const stepId = 'newsletter-sms-step';
  const recipientId = 'newsletter-sms-recipient-step';
  const destination = '+61400000000';

  await local.database.prepare(
    `INSERT INTO campaigns (id, state, active_revision_id, created_at, updated_at)
     VALUES (?, 'scheduled', ?, ?, ?)`,
  ).bind(campaignId, revisionId, now, now).run();
  await local.database.prepare(
    `INSERT INTO campaign_revisions
     (id, campaign_id, version, state, name, email_subject, email_body, email_text, sms_body,
      sender_name, from_email, sms_sender, created_at, updated_at)
     VALUES (?, ?, 1, 'approved', 'Previously approved SMS', '', '', '', 'Approved content',
             'Mango', 'offers@example.test', '+61400000000', ?, ?)`,
  ).bind(revisionId, campaignId, now, now).run();
  await local.database.prepare(
    `INSERT INTO campaign_steps
     (id, revision_id, sequence, channel, timezone, scheduled_at, send_by_at, created_at, updated_at)
     VALUES (?, ?, 1, 'sms', 'Australia/Brisbane', ?, ?, ?, ?)`,
  ).bind(stepId, revisionId, now - 60_000, now + 86_400_000, now, now).run();
  await local.database.prepare(
    `INSERT INTO contacts (id, email, display_name, email_status, sms_status, last_activity_at, created_at, updated_at)
     VALUES ('newsletter-sms-contact', 'sms-contact@example.test', 'SMS Contact', 'non-subscribed', 'subscribed', ?, ?, ?)`,
  ).bind(now, now, now).run();
  await local.database.prepare(
    `INSERT INTO contact_phones
     (id, contact_id, phone_e164, identity_status, time_zone, location_source, location_recorded_at,
      channel_status, channel_status_at, created_at, updated_at)
     VALUES ('newsletter-sms-phone', 'newsletter-sms-contact', ?, 'active', 'Australia/Brisbane',
             'confirmed-test-evidence', ?, 'subscribed', ?, ?, ?)`,
  ).bind(destination, now, now, now, now).run();
  await local.database.prepare(
    `INSERT INTO consent_evidence
     (id, contact_id, channel, brand_or_legal_sender, sms_program, message_category,
      frequency_disclosure, destination_jurisdiction, capture_method, capture_source,
      consent_text, consent_version, occurred_at, confirmation_required, confirmed_at, created_at, updated_at)
     VALUES ('newsletter-sms-consent', 'newsletter-sms-contact', 'sms', 'Mango', 'Mango offers',
             'marketing', 'up to one message per week', 'AU', 'operator-confirmed', 'newsletter-config-test',
             'I agree to receive Mango offers by SMS.', '1', ?, 0, ?, ?, ?)`,
  ).bind(now, now, now, now).run();
  await local.database.prepare(
    `INSERT INTO recipient_steps
     (id, campaign_id, revision_id, step_id, contact_id, contact_identity_key, channel, destination,
      idempotency_key, transport_disposition, attempt_count, send_by_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'newsletter-sms-contact', 'newsletter-sms-contact', 'sms', ?, ?, 'queued', 0, ?, ?, ?)`,
  ).bind(recipientId, campaignId, revisionId, stepId, destination, 'newsletter-sms-delivery', now + 86_400_000, now, now).run();

  const services = createAppServices(createProductionPlatform(environment));
  let acknowledged = false;
  const retries: Array<{ delaySeconds?: number }> = [];
  const originalFetch = globalThis.fetch;
  const externalRequests: string[] = [];
  globalThis.fetch = async (input) => {
    externalRequests.push(String(input));
    throw new Error(`Unexpected external provider request: ${String(input)}`);
  };
  try {
    await consumeLifecycleQueue({
      messages: [{
        body: { kind: 'campaign.dispatch', idempotencyKey: 'newsletter-disabled-sms-dispatch', payload: { campaignId, revisionId, stepId, channel: 'sms' } },
        ack() { acknowledged = true; },
        retry(options) { retries.push(options ?? {}); },
      }],
    }, services.lifecycleRuntime);
    expect(acknowledged).toBe(true);
    expect(retries).toEqual([]);
    expect(externalRequests).toEqual([]);
    await expect(local.database.prepare(
      'SELECT transport_disposition, last_error_code, last_error_detail FROM recipient_steps WHERE id = ?',
    ).bind(recipientId).first()).resolves.toMatchObject({
      transport_disposition: 'failed',
      last_error_code: 'sms_module_unconfigured',
      last_error_detail: expect.stringMatching(/SMS.*unavailable.*configur/i),
    });
    await expect(local.database.prepare('SELECT state FROM step_dispatches WHERE step_id = ?').bind(stepId).first()).resolves.toEqual({ state: 'completed' });
    await expect(local.database.prepare('SELECT state FROM campaigns WHERE id = ?').bind(campaignId).first()).resolves.toEqual({ state: 'completed' });
  } finally {
    globalThis.fetch = originalFetch;
    await local.worker.dispose();
  }
});

test('any supplied optional-module input enables validation and reports every exact missing binding', () => {
  const base = newsletterBindings({} as D1Database);
  const firstValues: Record<string, string> = {
    COMMERCE_STORE_URL: 'https://shop.example.test',
    SMS_PROVIDER_API_KEY: 'newsletter-test-sms-key',
    AI_PROVIDER_API_KEY: 'newsletter-test-ai-key',
    DESIGN_PROVIDER_API_KEY: 'newsletter-test-design-key',
  };
  const labels: Record<keyof typeof optionalModuleInputs, string> = {
    commerce: 'Commerce',
    sms: 'SMS',
    ai: 'AI',
    design: 'Design',
  };

  for (const [moduleName, inputs] of Object.entries(optionalModuleInputs) as Array<[
    keyof typeof optionalModuleInputs,
    readonly string[],
  ]>) {
    const [first, ...missing] = inputs;
    const environment = { ...base, [first]: firstValues[first] } as AppBindings;
    expect(() => readProductionConfig(environment)).toThrow(
      `${labels[moduleName]} configuration is incomplete; missing: ${missing.join(', ')}.`,
    );
  }
});

test('blank optional-module inputs remain disabled while complete groups become configured', () => {
  const base = newsletterBindings({} as D1Database);
  const blank = readProductionConfig({
    ...base,
    COMMERCE_STORE_URL: '  ',
    SMS_PROVIDER_API_KEY: '',
    AI_PROVIDER_MODEL: '\t',
    DESIGN_PROVIDER_ORIGIN: ' ',
  });
  expect(blank.modules.commerce.enabled).toBe(false);
  expect(blank.modules.sms.enabled).toBe(false);
  expect(blank.modules.ai.enabled).toBe(false);
  expect(blank.modules.design.enabled).toBe(false);

  const windows = [{ days: [0, 1, 2, 3, 4, 5, 6], startMinute: 9 * 60, endMinute: 20 * 60 }];
  const programme = {
    brand: 'Mango', programme: 'Newsletter', category: 'newsletter', frequency: 'Weekly',
    jurisdiction: 'AU', support: 'help@example.test', providerAlreadyReplies: false,
    // Synthetic installation evidence for this configuration-only fixture.
    policySource: 'https://policy.example.test/newsletter-sms',
    policyVerifiedAt: new Date(Date.now() - 60_000).toISOString(),
    policyExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    providerWindows: windows, jurisdictionWindows: windows, recipientWindows: windows,
  };
  const configured = readProductionConfig({
    ...base,
    COMMERCE_STORE_URL: 'https://newsletter-test.myshopify.com',
    COMMERCE_API_TOKEN: 'newsletter-test-commerce-key',
    COMMERCE_WEBHOOK_SECRET: 'newsletter-test-commerce-webhook',
    COMMERCE_EXCLUSIVE_SHOP: 'newsletter-test.myshopify.com',
    SMS_PROVIDER_API_KEY: 'newsletter-test-sms-key',
    SMS_WEBHOOK_SECRET: 'newsletter-test-sms-webhook',
    SMS_CONFIRMATION_SENDER: '+61400000000',
    SMS_PROGRAMME_POLICY: JSON.stringify(programme),
    MANGO_TEST_SMS_ALLOWLIST: '+61400000000',
    MANGO_SMS_HANDOFFS_PER_MINUTE: '5',
    AI_PROVIDER_API_KEY: 'newsletter-test-ai-key',
    AI_PROVIDER_MODEL: 'newsletter-test-model',
    DESIGN_PROVIDER_API_KEY: 'newsletter-test-design-key',
    DESIGN_PROVIDER_ORIGIN: 'https://design.example.test',
  });
  expect(configured.modules.commerce).toMatchObject({ enabled: true, config: { storeUrl: new URL('https://newsletter-test.myshopify.com') } });
  expect(configured.modules.sms).toMatchObject({ enabled: true, config: { confirmationSender: '61400000000', testAllowlist: ['+61400000000'], handoffsPerMinute: 5 } });
  expect(configured.modules.ai).toMatchObject({ enabled: true, config: { providerApiKey: 'newsletter-test-ai-key', model: 'newsletter-test-model' } });
  expect(configured.modules.design).toMatchObject({ enabled: true, config: { providerApiKey: 'newsletter-test-design-key', origin: new URL('https://design.example.test') } });
  // A deployment reaches the design service only over HTTPS at a bare origin; loopback http is for copies on a computer.
  for (const origin of ['http://127.0.0.1:8787', 'https://design.example.test/api/v1', 'design.example.test']) {
    expect(() => readProductionConfig({ ...base, DESIGN_PROVIDER_API_KEY: 'newsletter-test-design-key', DESIGN_PROVIDER_ORIGIN: origin })).toThrow('DESIGN_PROVIDER_ORIGIN must be an HTTPS origin');
  }
});
