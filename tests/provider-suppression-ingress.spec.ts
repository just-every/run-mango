import {eraseFixture} from './audience-import/erase';
import { sqlStatements } from '../operations/sql-statements.mjs';
import { createMobileMessageAdapter } from '../src/core/platform/adapters/mobile-message';
import { parseVerifiedWebhook } from '../src/core/features/lifecycle/webhook-facts';
import { expect, test } from '@playwright/test';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createApp, createAppServices } from '../src/core/app/app';
import { syntheticReviewPlatform } from './review/platform';
import { createResendAdapter } from '../src/core/platform/adapters/resend';

const require = createRequire(import.meta.url);
const {Miniflare} = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const secret = Buffer.from('task-owned-synthetic-webhook-secret').toString('base64');
async function fixture() {
  const worker = new Miniflare({workers: [{config: {name: 'suppression-ingress', type: 'worker', compatibilityDate: '2026-09-08',
    manifest: {mainModule: 'worker.js', modules: {'worker.js': {type: 'esm', contents: 'export default {fetch(){return new Response("synthetic")}}'}}},
    env: {DB: {type: 'd1', id: crypto.randomUUID()}},
  }}]});
  const binding = await worker.getD1Database('DB');
  for (const file of (await readdir('migrations/core')).filter(name => name.endsWith('.sql')).sort()) {
    await binding.batch(sqlStatements((await readFile(`migrations/core/${file}`, 'utf8'))).map(sql => binding.prepare(sql)));
  }
  const platform = syntheticReviewPlatform({DB: binding, MANGO_JOBS: {}, ASSETS_BUCKET: {}, LOCAL_BOOTSTRAP_TOKEN: 'suppression-local-test'} as never);
  platform.mailer = createResendAdapter({apiKey: 'unused-synthetic-key', webhookSecret: secret, webhookId: 'synthetic-hook'});
  platform.mailer.send = async () => {throw new Error('Sending forbidden in suppression tests')};
  const app = createApp({DB: binding} as never, platform);
  const services = createAppServices(platform);
  const eventAt = new Date(Date.now() - 1000).toISOString();
  const body = (to: string, type = 'suppressed', extra: Record<string, unknown> = {}) => ({type: `email.${type}`, created_at: eventAt, data: {to: [to], email_id: 'unknown-message', ...extra}});
  async function post(payload: unknown, id: string, signatureValid = true) {
    const raw = JSON.stringify(payload), timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', Buffer.from(secret, 'base64')).update(`${id}.${timestamp}.${raw}`).digest('base64');
    return app.request('/webhooks/mail/resend', {method: 'POST', body: raw, headers: {'Content-Type': 'application/json',
      'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${signatureValid ? signature : 'invalid'}`}});
  }
  async function subscribe(email: string) {
    return services.audienceService.captureConsent({contact: {email}, channel: 'email', brandOrLegalSender: 'Synthetic Mango', messageCategory: 'offers', frequencyDisclosure: 'Weekly',
      destinationJurisdiction: 'AU', captureMethod: 'task-fixture', captureSource: 'task-fixture', consentText: 'Synthetic affirmative consent', consentVersion: 'v1',
      occurredAt: new Date(), confirmationRequired: false});
  }
  const count = async (table: string) => Number((await binding.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{n: number}>())?.n ?? 0);
  return {worker, binding, platform, app, services, body, post, subscribe, count};
}

test('[CONT-006][SEND-006] signed unmatched destination suppression is durable before acknowledgement and replay creates no delivery', async () => {
  const f = await fixture();
  try {
    const {contact} = await f.subscribe('person@example.test');
    const event = f.body(' PERSON@example.test ');
    expect((await f.post(event, 'unmatched-suppression')).status).toBe(204);
    expect((await f.services.audienceService.list())[0].emailStatus).toBe('suppressed');
    expect((await f.services.audienceService.list())[0].smsStatus).toBe('non-subscribed');
    expect(await f.count('contact_suppressions')).toBe(1);
    expect(await f.count('surviving_opt_outs')).toBe(1);
    expect(await f.count('delivery_facts')).toBe(0);
    expect(await f.count('recipient_steps')).toBe(0);
    expect((await f.post(event, 'unmatched-suppression')).status).toBe(204);
    expect(await f.count('contact_suppressions')).toBe(1);
    expect(await f.count('provider_fact_inbox')).toBe(1);
    const history = await f.binding.prepare("SELECT * FROM contact_history WHERE contact_id = ? AND kind = 'suppression'").bind(contact.id).all();
    expect(history.results).toHaveLength(1);
    expect(await f.services.audienceService.recheckHandoffEligibility({contactId: contact.id, channel: 'email', sourceTypes: [], now: new Date()})).toMatchObject({eligible: false});
  } finally {await f.worker.dispose()}
});

test('[CONT-006][CONT-005][CONT-013] suppression preceding contact creation blocks fresh capture and erasure removes raw unmatched ingress', async () => {
  const f = await fixture();
  try {
    expect((await f.post(f.body('future@example.test', 'bounced', {email_id: undefined, bounce: {type: 'Permanent'}}), 'pre-contact-hard-bounce')).status).toBe(204);
    expect(await f.count('contacts')).toBe(0);
    const {contact} = await f.subscribe('future@example.test');
    expect((await f.services.audienceService.list())[0].emailStatus).toBe('suppressed');
    expect(await f.services.audienceService.recheckHandoffEligibility({contactId: contact.id, channel: 'email', sourceTypes: [], now: new Date()})).toMatchObject({eligible: false});
    expect((await f.services.audienceService.detail(contact.id))?.suppressions).toEqual([expect.objectContaining({cause: 'hard-bounce'})]);
    await eraseFixture({db:f.binding,platform:f.platform},contact.id);
    expect(await f.count('provider_fact_inbox')).toBe(0);
    expect(await f.count('contacts')).toBe(0);
    expect(await f.count('contact_suppressions')).toBe(0);
    expect(await f.count('surviving_opt_outs')).toBe(1);
    expect(JSON.stringify((await f.binding.prepare('SELECT * FROM surviving_opt_outs').all()).results)).not.toContain('future@example.test');
  } finally {await f.worker.dispose()}
});

test('[CONT-006] invalid signatures, ambiguous destinations and mutated replay identities cannot suppress extra addresses', async () => {
  const f = await fixture();
  try {
    await f.subscribe('first@example.test'); await f.subscribe('second@example.test');
    expect((await f.post(f.body('first@example.test'), 'bad-signature', false)).status).toBe(500);
    expect(await f.count('provider_fact_inbox')).toBe(0);
    expect((await f.post(f.body('first@example.test', 'suppressed', {to: ['first@example.test', 'second@example.test']}), 'ambiguous')).status).toBe(500);
    expect(await f.count('contact_suppressions')).toBe(0);
    expect((await f.post(f.body('first@example.test'), 'stable-event')).status).toBe(204);
    expect((await f.post(f.body('second@example.test'), 'stable-event')).status).toBe(500);
    expect((await f.services.audienceService.list()).find(contact => contact.email === 'second@example.test')?.emailStatus).toBe('subscribed');
    expect(await f.count('contact_suppressions')).toBe(1);
  } finally {await f.worker.dispose()}
});

test('[CONT-006] interruption rolls back suppression side effects; retained verified inbox evidence can be replayed safely', async () => {
  const f = await fixture();
  try {
    await f.subscribe('atomic@example.test');
    await f.binding.prepare("CREATE TRIGGER task_fail_suppression_history BEFORE INSERT ON contact_history WHEN NEW.kind = 'suppression' BEGIN SELECT RAISE(ABORT, 'synthetic history interruption'); END").run();
    const event = f.body('atomic@example.test', 'complained');
    expect((await f.post(event, 'atomic-replay')).status).toBe(500);
    expect(await f.count('provider_fact_inbox')).toBe(1);
    expect(await f.count('contact_suppressions')).toBe(0);
    expect(await f.count('surviving_opt_outs')).toBe(0);
    expect((await f.services.audienceService.list())[0].emailStatus).toBe('subscribed');
    await f.binding.prepare('DROP TRIGGER task_fail_suppression_history').run();
    expect((await f.post(event, 'atomic-replay')).status).toBe(204);
    expect(await f.count('contact_suppressions')).toBe(1);
    expect(await f.count('surviving_opt_outs')).toBe(1);
    expect((await f.services.audienceService.list())[0].emailStatus).toBe('suppressed');
  } finally {await f.worker.dispose()}
});


test('[CONT-006][SEND-006] an address mismatch cannot attach safety evidence to a different campaign recipient', async () => {
  const f = await fixture();
  try {
    const {contact} = await f.subscribe('campaign@example.test');
    await f.subscribe('actual@example.test');
    const now = Date.now();
    await f.binding.prepare(`INSERT INTO recipient_steps
      (id, campaign_id, revision_id, step_id, contact_id, contact_identity_key, channel, destination, idempotency_key,
       transport_disposition, attempt_count, provider, provider_message_id, send_by_at, created_at, updated_at)
      VALUES ('correlated-step', 'campaign', 'revision', 'step', ?, ?, 'email', 'campaign@example.test', 'correlated-key',
        'accepted', 1, 'resend', 'unknown-message', ?, ?, ?)`)
      .bind(contact.id, contact.id, now + 3600000, now, now).run();
    expect((await f.post(f.body('actual@example.test'), 'mismatched-address')).status).toBe(204);
    const contacts = await f.services.audienceService.list();
    expect(contacts.find(value => value.email === 'actual@example.test')?.emailStatus).toBe('suppressed');
    expect(contacts.find(value => value.email === 'campaign@example.test')?.emailStatus).toBe('subscribed');
    expect(await f.count('delivery_facts')).toBe(0);
    expect(await f.binding.prepare("SELECT transport_disposition, suppressed_at FROM recipient_steps WHERE id = 'correlated-step'").first()).toEqual({transport_disposition: 'accepted', suppressed_at: null});
    expect((await f.post(f.body('campaign@example.test'), 'matching-address')).status).toBe(204);
    expect(await f.count('delivery_facts')).toBe(1);
    expect(await f.binding.prepare("SELECT kind FROM delivery_facts").first()).toEqual({kind: 'suppressed'});
    expect(await f.binding.prepare("SELECT transport_disposition FROM recipient_steps WHERE id = 'correlated-step'").first()).toEqual({transport_disposition: 'accepted'});
  } finally {await f.worker.dispose()}
});

test('[CONT-006] replay enriches older normalized inbox evidence without changing its verified provider bytes', async () => {
  const f = await fixture();
  try {
    await f.subscribe('upgrade@example.test');
    const event = f.body('upgrade@example.test');
    const [fact] = await parseVerifiedWebhook('email', {rawBody: JSON.stringify(event), providerEventId: 'older-inbox-event', receivedAt: new Date()});
    const {destination: omitted, ...legacyDetail} = fact.detail;
    expect(omitted).toBe('upgrade@example.test');
    await f.binding.prepare(`INSERT INTO provider_fact_inbox (identity_key, provider, provider_message_id, mango_reference, kind, provider_occurred_at, payload_digest, detail_json, created_at)
      VALUES (?, 'resend', ?, NULL, ?, ?, ?, ?, ?)`).bind(fact.identity, fact.providerMessageId, fact.kind, fact.occurredAt.getTime(), fact.payloadDigest, JSON.stringify(legacyDetail), Date.now()).run();
    expect((await f.post(event, 'older-inbox-event')).status).toBe(204);
    expect((await f.services.audienceService.list())[0].emailStatus).toBe('suppressed');
    expect(await f.count('provider_fact_inbox')).toBe(1);
    expect(await f.binding.prepare("SELECT payload_digest, json_extract(detail_json, '$.destination') AS destination FROM provider_fact_inbox").first()).toEqual({payload_digest: fact.payloadDigest, destination: 'upgrade@example.test'});
  } finally {await f.worker.dispose()}
});


test('[CONT-004][CONT-013] erasure removes signed unmatched SMS facts with canonical and historical formatted destinations', async () => {
  const f = await fixture();
  try {
    const smsSecret = 'task-owned-synthetic-sms-secret';
    f.platform.sms = createMobileMessageAdapter({credentials: 'unused:fixture', webhookSecret: smsSecret});
    const {contact} = await f.services.audienceService.captureConsent({contact: {phone: '+61400123456'}, channel: 'sms', brandOrLegalSender: 'Synthetic Mango',
      smsProgram: 'Synthetic programme', messageCategory: 'offers', frequencyDisclosure: 'Weekly', destinationJurisdiction: 'AU', captureMethod: 'task-fixture',
      captureSource: 'task-fixture', consentText: 'Synthetic affirmative consent', consentVersion: 'v1', occurredAt: new Date(), confirmationRequired: false});
    const raw = JSON.stringify({type: 'inbound', sender: '+61 400 123 456', message: 'STOP', created_at: new Date().toISOString()});
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', smsSecret).update(`${timestamp}.${raw}`).digest('hex');
    expect((await f.app.request('/webhooks/sms/mobile-message', {method: 'POST', body: raw, headers: {'X-MM-Timestamp': timestamp, 'X-MM-Signature': signature}})).status).toBe(204);
    expect((await f.services.audienceService.list())[0].smsStatus).toBe('unsubscribed');
    expect(await f.binding.prepare("SELECT json_extract(detail_json, '$.destination') AS destination FROM provider_fact_inbox").first()).toEqual({destination: '+61400123456'});
    // Persisted evidence from the earlier parser used the provider's formatting.
    await f.binding.prepare(`INSERT INTO provider_fact_inbox (identity_key, provider, provider_message_id, mango_reference, kind, provider_occurred_at, payload_digest, detail_json, created_at)
      SELECT 'legacy-formatted-sms', provider, provider_message_id, mango_reference, kind, provider_occurred_at, payload_digest,
        json_set(detail_json, '$.destination', '+61 (400) 123-456'), created_at FROM provider_fact_inbox LIMIT 1`).run();
    expect(await f.count('provider_fact_inbox')).toBe(2);
    await eraseFixture({db:f.binding,platform:f.platform},contact.id);
    expect(await f.count('provider_fact_inbox')).toBe(0);
    expect(await f.count('contacts')).toBe(0);
    expect(await f.count('surviving_opt_outs')).toBe(1);
    expect(JSON.stringify((await f.binding.prepare('SELECT * FROM surviving_opt_outs').all()).results)).not.toContain('61400123456');
  } finally {await f.worker.dispose()}
});
