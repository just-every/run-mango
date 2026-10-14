import { sqlStatements } from '../operations/sql-statements.mjs';
import { expect, test } from '@playwright/test';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

import { contract } from './contract.js';

const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
const root = process.cwd();

let workerSource;

async function buildWorker() {
  const source = `
    import { Hono } from 'hono';
    import { createDatabase } from './src/core/platform/db/client';
    import { createAudienceRepository } from './src/core/features/audience/repository';
    import {createContactErasure} from './src/core/features/audience/erasure/service';
    import { createAudienceService } from './src/core/features/audience/service';
    import { createAudienceImportService } from './src/core/features/audience/import-service';
    import { createAudienceImportTarget } from './src/core/features/audience/import-target';
    import { createAudiencePublicRoutes } from './src/core/features/audience/public-routes';
    import { createPublicTokenSigner } from './src/core/platform/public-tokens';
    import { createStoreRepository } from './src/core/features/store/repository';
    import { createStoreService } from './src/core/features/store/service';
    let confirmationCalls = 0;
    const date = value => new Date(value);
    let currentTime = date('2026-09-08T12:00:00.000Z');
    const now = () => new Date(currentTime);
    export default {
      async fetch(request, env) {
        const database = createDatabase(env.DB);
        const storeRepository = createStoreRepository(database);
        const store = createStoreService(storeRepository);
        const signer = createPublicTokenSigner('ledger-contract-signing-key');
        const service = createAudienceService(createAudienceRepository(database), {
          contactHashSalt: 'ledger-contract-test-salt',
          publicTokens: {
            issuePublicToken(id, purpose, expiresAt) { return signer.issue({ id, purpose, expiresAt }); },
            async verifyPublicToken(token, purpose) { try { return { id: (await signer.verify(token, purpose, now())).id }; } catch { return undefined; } },
          },
          confirmationDispatcher: { async sendConfirmation() { confirmationCalls += 1; } },
          store,
          async moveLifecycleData() {},
        });
        const app = new Hono();
        // Bind only the test clock; public routes and service implementations stay real.
        // Confirmation POST supplies wall time itself, so override that argument here
        // while forwarding the request IP used for persisted confirmation evidence.
        app.route('/', createAudiencePublicRoutes({
          ...service,
          previewConsentConfirmation: token => service.previewConsentConfirmation(token, now()),
          confirmConsent: (token, _requestTime, confirmationIp) => service.confirmConsent(token, now(), confirmationIp),
          previewUnsubscribeToken: token => service.previewUnsubscribeToken(token, now()),
          unsubscribeWithToken: token => service.unsubscribeWithToken(token, now()),
        }));
        app.post('/test-clock', async c => {
          const updated = date((await c.req.json()).now);
          if (Number.isNaN(updated.getTime())) return c.json({ error: 'invalid_clock' }, 400);
          currentTime = updated;
          return c.json({ now: now().toISOString() });
        });
        app.post('/capture', async c => { const body = await c.req.json(); return c.json(await service.captureConsent({ ...body, occurredAt: date(body.occurredAt) }, now())); });
        app.post('/optout', async c => { const body = await c.req.json(); return c.json(await service.recordChannelOptOut({ ...body, occurredAt: date(body.occurredAt) })); });
        app.post('/confirm', async c => { const body = await c.req.json(); return c.json(await service.confirmConsent(body.token, now())); });
        app.post('/import', async c => {
          const importer=createAudienceImportService({database,config:{contactHashSalt:'ledger-contract-test-salt'}});
          const context={destination:'mango',namespace:'mango-audience-v1',mappingVersion:'mango-audience-v1',batchSize:10,maxBatches:1,storage:{database:env.DB,targets:createAudienceImportTarget('ledger-contract-test-salt')},authorization:{principalId:'contract-operator',predicate:()=>({sql:'1'})}};
          const preview=await importer.preview({files:[{name:'contacts.csv',preset:'csv-non-subscribed',csv:(await c.req.json()).csv,mapping:{email:'email'}}]},context);
          let job=await importer.create(preview.fingerprint,context);
          while(['queued','applying'].includes(job.state))job=await importer.resume(job.id,context);
          return c.json({preview,job});
        });
        app.post('/merge', async c => { const body = await c.req.json(); return c.json(await service.mergeContacts(body.survivorContactId, body.mergedContactId)); });
        app.post('/erase', async c => { const body = await c.req.json(); const eraser=createContactErasure(env.DB,'ledger-contract-test-salt');const authority={destination:'mango',authorization:{principalId:'contract-operator',predicate:()=>({sql:'1'})}};let receipt=await eraser.begin(body.contactId,authority);while(receipt?.state==='pending')receipt=await eraser.advance(receipt.reference,authority);return c.json(receipt); });
        app.post('/bounce', async c => { const body = await c.req.json(); return c.json(await service.recordBounce({ ...body, occurredAt: date(body.occurredAt) })); });
        app.post('/delivery', async c => { const body = await c.req.json(); await service.recordProviderDelivery(body.contactId, body.channel, date(body.occurredAt), body.providerEventId); return c.body(null, 204); });
        app.post('/issue-unsubscribe', async c => { const body = await c.req.json(); return c.json(await service.issueMarketingUnsubscribe({ ...body, expiresAt: date(body.expiresAt) }, now())); });
        app.post('/reply', async c => { const body = await c.req.json(); return c.json(await service.receiveSmsComplianceReply({ ...body, occurredAt: date(body.occurredAt) })); });
        app.post('/capabilities', async c => { const body = await c.req.json(); await store.recordSourceCapabilities(body.capabilities, new Date(body.now)); return c.body(null, 204); });
        app.post('/ingest', async c => { const body = await c.req.json(); await service.ingestCommerceWebhook({ ...body, records: body.records.map(record => ({ ...record, occurredAt: date(record.occurredAt) })) }, new Date(body.now)); return c.body(null, 204); });
        app.post('/failure', async c => { const body = await c.req.json(); await service.recordCommerceFailure(body.sourceTypes, body.error, new Date(body.now)); return c.body(null, 204); });
        app.post('/resolve', async c => { const body = await c.req.json(); return c.json(await service.resolveFrozenCandidates({ ...body, now: date(body.now) })); });
        app.post('/recheck', async c => { const body = await c.req.json(); return c.json(await service.recheckHandoffEligibility({ ...body, now: date(body.now), lastMarketingAt: body.lastMarketingAt ? date(body.lastMarketingAt) : undefined })); });
        app.get('/detail/:id', async c => { const value = await service.detail(c.req.param('id')); return value ? c.json(value) : c.notFound(); });
        app.get('/source/:type/:id', async c => { const source = await store.sourceRecord('test-commerce', c.req.param('type'), c.req.param('id')); return source ? c.json(source) : c.notFound(); });
        app.get('/source-count/:type/:id', async c => c.json({ count: await store.sourceRecordCount('test-commerce', c.req.param('type'), c.req.param('id')) }));
        app.get('/contacts', async c => c.json(await service.list()));
        app.get('/test-counters', async c => c.json({ confirmationCalls }));
        app.get('/status', async c => c.json(await store.status()));
        return app.fetch(request, env);
      },
    };
  `;
  const result = await build({
    stdin: { contents: source, resolveDir: root, sourcefile: 'ledger-contract-worker.ts', loader: 'ts' },
    alias: { '@': path.join(root, 'src') },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    external: ['node:*'],
    write: false,
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

async function ledger() {
  const worker = new Miniflare({
    workers: [{
      config: {
        name: 'ledger-contract',
        type: 'worker',
        compatibilityDate: '2026-08-31',
        compatibilityFlags: ['nodejs_compat'],
        manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: workerSource } } },
        env: { DB: { type: 'd1', id: `ledger-${crypto.randomUUID()}` } },
      },
    }],
  });
  const database = await worker.getD1Database('DB');
  const migrations = (await fs.readdir(path.join(root, 'migrations/core'))).filter((file) => file.endsWith('.sql')).sort();
  for (const migration of migrations) {
    const sql = await fs.readFile(path.join(root, 'migrations/core', migration), 'utf8');
    for (const statement of sqlStatements(sql)) await database.prepare(statement).run();
  }
  return worker;
}

async function request(worker, pathname, body, method = 'POST') {
  const response = await worker.dispatchFetch(`http://ledger.test${pathname}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const bodyText = response.status === 204 ? undefined : await response.text();
  let parsed;
  try { parsed = bodyText === undefined ? undefined : JSON.parse(bodyText); } catch { parsed = bodyText; }
  return { response, body: parsed };
}

function consent(contact, channel = 'email', occurredAt = '2026-09-08T00:00:00.000Z', extra = {}) {
  return {
    contact,
    channel,
    brandOrLegalSender: 'Mango Shop',
    smsProgram: channel === 'sms' ? 'MANGO-AU' : undefined,
    messageCategory: 'offers',
    frequencyDisclosure: 'weekly',
    destinationJurisdiction: channel === 'sms' ? 'AU' : 'email',
    captureMethod: 'checkout',
    captureSource: 'store',
    consentText: 'I agree to receive offers.',
    consentVersion: '1',
    occurredAt,
    ...extra,
  };
}

async function captured(worker, contact, channel = 'email', occurredAt) {
  const result = await request(worker, '/capture', consent(contact, channel, occurredAt));
  expect(result.response.ok).toBeTruthy();
  return result.body;
}

async function readySource(worker, sourceType = 'customer', now = '2026-09-08T12:00:00.000Z') {
  await request(worker, '/capabilities', { now, capabilities: [{ sourceType, available: true, detail: 'test adapter supplies this source.' }] });
  await request(worker, '/ingest', {
    provider: 'test-commerce', completion: 'full', adapterCompleted: true, sourceTypes: [sourceType], now,
    records: [],
  });
}

test.describe('ledger contract on Worker D1', () => {
  test.beforeAll(async () => { workerSource = await buildWorker(); });

  contract('STORE-001', 'persists an accepted commerce record with its provider identity and occurrence time', async () => {
    const worker = await ledger();
    try {
      const sourceTypes = ['customer', 'product', 'variant', 'inventory', 'order', 'refund', 'cart', 'browsing-event'];
      await request(worker, '/capabilities', { now: '2026-09-08T12:00:00.000Z', capabilities: sourceTypes.map((sourceType) => ({ sourceType, available: true, detail: `${sourceType} supplied` })) });
      await request(worker, '/ingest', {
        provider: 'test-commerce', completion: 'full', adapterCompleted: true, sourceTypes, now: '2026-09-08T12:01:00.000Z',
        records: sourceTypes.map((sourceType, index) => ({ sourceType, providerSourceId: `${sourceType}-${index}`, occurredAt: '2026-09-08T10:00:00.000Z', payload: { sourceType, sequence: index } })),
      });
      const record = await request(worker, '/source/customer/customer-0', undefined, 'GET');
      expect(record.body).toMatchObject({ provider: 'test-commerce', sourceType: 'customer', providerSourceId: 'customer-0', occurredAt: '2026-09-08T10:00:00.000Z', payload: '{"sequence":0,"sourceType":"customer"}' });
      expect((await request(worker, '/status', undefined, 'GET')).body.sourceCapabilities.map((entry) => entry.sourceType)).toEqual([...sourceTypes].sort());
    } finally { await worker.dispose(); }
  });

  contract('STORE-002', 'upserts a repeated provider source identity instead of treating it as a second fact', async () => {
    const worker = await ledger();
    try {
      await readySource(worker);
      const event = { provider: 'test-commerce', completion: 'delta', adapterCompleted: true, sourceTypes: ['customer'], now: '2026-09-08T12:01:00.000Z', records: [{ sourceType: 'customer', providerSourceId: 'customer-1', occurredAt: '2026-09-08T10:00:00.000Z', payload: { segment: 'vip' }, contact: { email: 'store-two@example.test' } }] };
      await request(worker, '/ingest', event);
      event.records[0].payload = { segment: 'returning' };
      await request(worker, '/ingest', event);
      expect((await request(worker, '/source-count/customer/customer-1', undefined, 'GET')).body.count).toBe(1);
      expect((await request(worker, '/source/customer/customer-1', undefined, 'GET')).body.payload).toBe(JSON.stringify({ segment: 'returning' }));
      const contact = await captured(worker, { email: 'store-two@example.test' });
      await request(worker, '/confirm', { token: contact.confirmation.token });
      const resolved = await request(worker, '/resolve', { inclusionRule: { version: 1, operator: 'all', predicates: [{ sourceType: 'customer', field: 'segment', comparator: 'eq', value: 'returning' }] }, exclusionRules: [], sourceTypes: ['customer'], channels: ['email'], now: '2026-09-08T12:05:00.000Z' });
      expect(resolved.body.status).toBe('ok');
      expect(resolved.body.candidates).toHaveLength(1);
      expect(contact.contact.id).toBeTruthy();
    } finally { await worker.dispose(); }
  });

  contract('STORE-003', 'keeps full-sync completion and the latest adapter failure visible together', async () => {
    const worker = await ledger();
    try {
      await readySource(worker, 'order');
      await request(worker, '/failure', { sourceTypes: ['order'], error: 'upstream 503', now: '2026-09-08T12:05:00.000Z' });
      // A delta has no authority to clear a failed full sync, and neither does
      // a delayed full-sync completion whose completion time precedes failure.
      await request(worker, '/ingest', {
        provider: 'test-commerce', completion: 'delta', adapterCompleted: true, sourceTypes: ['order'], now: '2026-09-08T12:06:00.000Z',
        records: [{ sourceType: 'order', providerSourceId: 'order-delta', occurredAt: '2026-09-08T12:06:00.000Z', payload: { state: 'paid' } }],
      });
      await request(worker, '/ingest', {
        provider: 'test-commerce', completion: 'full', adapterCompleted: true, sourceTypes: ['order'], now: '2026-09-08T12:01:00.000Z', records: [],
      });
      const status = await request(worker, '/status', undefined, 'GET');
      expect(status.body.sourceSyncs.find((entry) => entry.sourceType === 'order')).toMatchObject({ lastError: 'upstream 503', lastSuccessfulAt: expect.any(String) });
    } finally { await worker.dispose(); }
  });

  contract('STORE-004', 'records a commerce failure without mutating the contact ledger', async () => {
    const worker = await ledger();
    try {
      expect(await request(worker, '/contacts', undefined, 'GET')).toMatchObject({ body: [] });
      expect((await request(worker, '/test-counters', undefined, 'GET')).body.confirmationCalls).toBe(0);
      await request(worker, '/failure', { sourceTypes: ['cart'], error: 'adapter unavailable', now: '2026-09-08T12:00:00.000Z' });
      const status = await request(worker, '/status', undefined, 'GET');
      expect(status.body.sourceSyncs.find((entry) => entry.sourceType === 'cart').lastError).toBe('adapter unavailable');
      expect((await request(worker, '/contacts', undefined, 'GET')).body).toEqual([]);
      expect((await request(worker, '/test-counters', undefined, 'GET')).body.confirmationCalls).toBe(0);
    } finally { await worker.dispose(); }
  });

  contract('STORE-005', 'returns stale rather than resolving an audience after a failed full source sync', async () => {
    const worker = await ledger();
    try {
      await request(worker, '/capabilities', { now: '2026-09-08T12:00:00.000Z', capabilities: [{ sourceType: 'customer', available: true, detail: 'available' }] });
      await request(worker, '/failure', { sourceTypes: ['customer'], error: 'full sync failed', now: '2026-09-08T12:00:00.000Z' });
      const result = await request(worker, '/resolve', { inclusionRule: { version: 1, operator: 'all', predicates: [{ sourceType: 'customer', field: 'id', comparator: 'eq', value: 'x' }] }, exclusionRules: [], sourceTypes: ['customer'], channels: ['email'], now: '2026-09-08T12:01:00.000Z' });
      expect(result.body).toMatchObject({ status: 'stale' });
    } finally { await worker.dispose(); }
  });

  contract('STORE-006', 'reports unavailable source capabilities without fabricating an empty audience', async () => {
    const worker = await ledger();
    try {
      const result = await request(worker, '/resolve', { inclusionRule: { version: 1, operator: 'all', predicates: [{ sourceType: 'browsing', field: 'saved', comparator: 'eq', value: true }] }, exclusionRules: [], sourceTypes: ['browsing'], channels: ['email'], now: '2026-09-08T12:00:00.000Z' });
      expect(result.body).toMatchObject({ status: 'unavailable' });
    } finally { await worker.dispose(); }
  });

  contract('STORE-007', 'acknowledges a delta only after the source record is readable by the ledger', async () => {
    const worker = await ledger();
    try {
      await readySource(worker);
      const response = await request(worker, '/ingest', { provider: 'test-commerce', completion: 'delta', adapterCompleted: true, sourceTypes: ['customer'], now: '2026-09-08T12:00:00.000Z', records: [{ sourceType: 'customer', providerSourceId: 'customer-7', occurredAt: '2026-09-08T11:59:00.000Z', payload: { tier: 'gold' }, contact: { email: 'store-seven@example.test' } }] });
      expect(response.response.status).toBe(204);
      expect((await request(worker, '/source/customer/customer-7', undefined, 'GET')).body).toMatchObject({ providerSourceId: 'customer-7', occurredAt: '2026-09-08T11:59:00.000Z', payload: JSON.stringify({ tier: 'gold' }) });
    } finally { await worker.dispose(); }
  });

  contract('CONT-001', 'normalizes email identity and rejects an invalid phone before persistence', async () => {
    const worker = await ledger();
    try {
      const capture = await captured(worker, { email: '  CASE@Test.Example  ' });
      const detail = await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET');
      expect(detail.body.emails[0].email).toBe('case@test.example');
      const bad = await request(worker, '/capture', consent({ phone: '0400 000 000' }));
      expect(bad.response.status).toBe(500);
    } finally { await worker.dispose(); }
  });

  contract('CONT-002', 'keeps email and SMS consent states independent', async () => {
    const worker = await ledger();
    try {
      const capture = await captured(worker, { email: 'channels@example.test', phone: '+61400000001' });
      const detail = await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET');
      expect(detail.body.contact).toMatchObject({ emailStatus: 'pending', smsStatus: 'non-subscribed' });
    } finally { await worker.dispose(); }
  });

  contract('CONT-003', 'records consent against the exact email destination and declared scope', async () => {
    const worker = await ledger();
    try {
      const capture = await captured(worker, { email: 'scope@example.test' });
      const detail = await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET');
      expect(detail.body.consent[0]).toMatchObject({ destination: 'scope@example.test', brandOrLegalSender: 'Mango Shop', messageCategory: 'offers', captureMethod: 'checkout' });
    } finally { await worker.dispose(); }
  });

  contract('CONT-004', 'keeps an opt-out ahead of later pending capture and an old confirmation token', async () => {
    const worker = await ledger();
    try {
      const first = await captured(worker, { email: 'barrier@example.test' }, 'email', '2026-09-08T00:00:00.000Z');
      await request(worker, '/optout', { contactId: first.contact.id, channel: 'email', reason: 'unsubscribe', occurredAt: '2026-09-08T01:00:00.000Z' });
      await captured(worker, { email: 'barrier@example.test' }, 'email', '2026-09-08T02:00:00.000Z');
      const old = await request(worker, '/confirm', { token: first.confirmation.token });
      expect(old.body.kind).toBe('blocked-by-later-opt-out');
      const detail = await request(worker, `/detail/${first.contact.id}`, undefined, 'GET');
      expect(detail.body.emails[0].channelStatus).toBe('pending');
    } finally { await worker.dispose(); }
  });

  contract('CONT-005', 'allows only fresh post-opt-out consent to become subscribed after confirmation', async () => {
    const worker = await ledger();
    try {
      const first = await captured(worker, { email: 'resubscribe@example.test' }, 'email', '2026-09-08T00:00:00.000Z');
      await request(worker, '/optout', { contactId: first.contact.id, channel: 'email', reason: 'unsubscribe', occurredAt: '2026-09-08T01:00:00.000Z' });
      const fresh = await captured(worker, { email: 'resubscribe@example.test' }, 'email', '2026-09-08T02:00:00.000Z');
      expect((await request(worker, '/confirm', { token: fresh.confirmation.token })).body.kind).toBe('confirmed');
    } finally { await worker.dispose(); }
  });

  contract('CONT-006', 'derives soft-bounce suppression from ordered provider facts and resets it after delivery', async () => {
    const worker = await ledger();
    try {
      const capture = await captured(worker, { email: 'bounce@example.test' });
      await request(worker, '/confirm', { token: capture.confirmation.token });
      for (const [index, time] of ['01', '02', '03'].entries()) await request(worker, '/bounce', { destination: 'bounce@example.test', kind: 'soft', providerEventId: `soft-${index}`, occurredAt: `2026-09-08T${time}:00:00.000Z` });
      await request(worker, '/delivery', { contactId: capture.contact.id, channel: 'email', providerEventId: 'delivered-4', occurredAt: '2026-09-08T04:00:00.000Z' });
      const detail = await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET');
      expect(detail.body.emails[0].channelStatus).toBe('subscribed');
    } finally { await worker.dispose(); }
  });

  contract('CONT-007', 'deduplicates SMS compliance replies while applying STOP before acknowledgement', async () => {
    const worker = await ledger();
    try {
      const capture = await captured(worker, { phone: '+61400000002' }, 'sms');
      const reply = { providerEventId: 'stop-1', destination: '+61400000002', keyword: 'STOP', canonicalAction: 'opt-out', sender: 'MANGO-AU', program: 'MANGO-AU', jurisdiction: 'AU', providerAlreadyResponded: false, occurredAt: '2026-09-08T01:00:00.000Z' };
      expect((await request(worker, '/reply', reply)).body).toMatchObject({ duplicate: false, respond: true });
      expect((await request(worker, '/reply', reply)).body.duplicate).toBeTruthy();
      const detail = await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET');
      expect(detail.body.phones[0].channelStatus).toBe('unsubscribed');
    } finally { await worker.dispose(); }
  });

  contract('CONT-008', 'returns consent and opt-out history in contact detail', async () => {
    const worker = await ledger();
    try {
      const capture = await captured(worker, { email: 'history@example.test' });
      await request(worker, '/optout', { contactId: capture.contact.id, channel: 'email', reason: 'unsubscribe', occurredAt: '2026-09-08T01:00:00.000Z' });
      const detail = await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET');
      expect(detail.body.history.map((entry) => entry.kind)).toEqual(expect.arrayContaining(['consent-captured', 'opt-out']));
    } finally { await worker.dispose(); }
  });

  contract('CONT-009', 'keeps a capture pending until its opaque confirmation token is followed', async () => {
    const worker = await ledger();
    try {
      const capture = await captured(worker, { email: 'confirm@example.test' });
      expect((await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET')).body.emails[0].channelStatus).toBe('pending');
      await request(worker, '/confirm', { token: capture.confirmation.token });
      expect((await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET')).body.emails[0].channelStatus).toBe('subscribed');
    } finally { await worker.dispose(); }
  });

  contract('CONT-010', 'rejects malformed CSV rows without contact mutations and resumes an identical completed file idempotently', async () => {
    const worker = await ledger();
    try {
      const csv = 'email,phone\nvalid@example.test,\ninvalid@example.test,0400 000 000\n';
      const first = await request(worker, '/import', { csv });
      expect(first.body.preview.counts).toMatchObject({ created: 1, rejected: 1 });
      expect(first.body.job.state).toBe('completed');
      const repeated=await request(worker, '/import', { csv });
      expect(repeated.body.preview.fingerprint).toBe(first.body.preview.fingerprint);
      expect(repeated.body.job.id).toBe(first.body.job.id);
      const contacts=(await request(worker, '/contacts', undefined, 'GET')).body;
      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toMatchObject({email:'valid@example.test',emailStatus:'non-subscribed'});
      const detail=(await request(worker, '/detail/'+contacts[0].id, undefined, 'GET')).body;
      expect(detail.emails.map(row=>row.email)).toEqual(['valid@example.test']);
      expect(detail.consent).toEqual([]);
    } finally { await worker.dispose(); }
  });

  contract('CONT-011', 'merges contacts under restrictive channel states and preserves the survivor', async () => {
    const worker = await ledger();
    try {
      const survivor = await captured(worker, { email: 'survivor@example.test' });
      const merged = await captured(worker, { email: 'merged@example.test' });
      await request(worker, '/optout', { contactId: merged.contact.id, channel: 'email', reason: 'unsubscribe', occurredAt: '2026-09-08T01:00:00.000Z' });
      const result = await request(worker, '/merge', { survivorContactId: survivor.contact.id, mergedContactId: merged.contact.id });
      expect(result.body.emailStatus).toBe('unsubscribed');
    } finally { await worker.dispose(); }
  });

  contract('CONT-012', 'excludes a dormant subscribed contact without changing its subscription state', async () => {
    const worker = await ledger();
    try {
      // Confirmation is a qualifying consent event. Complete it historically,
      // rather than confirming an old capture at the current test clock.
      await request(worker, '/test-clock', {now:'2024-01-01T00:00:00.000Z'});
      const capture = await captured(worker, { email: 'dormant@example.test' }, 'email', '2024-01-01T00:00:00.000Z');
      expect((await request(worker, '/confirm', { token: capture.confirmation.token })).response.ok).toBeTruthy();
      await request(worker, '/test-clock', {now:'2026-09-08T12:00:00.000Z'});
      await readySource(worker);
      const recheck = await request(worker, '/recheck', { contactId: capture.contact.id, channel: 'email', sourceTypes: ['customer'], frequencyWindowMs: 86400000, now: '2026-09-08T12:00:00.000Z' });
      expect(recheck.body).toMatchObject({eligible:false,reason:'dormant'});
      expect((await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET')).body.emails[0].channelStatus).toBe('subscribed');
    } finally { await worker.dispose(); }
  });

  contract('CONT-013', 'erases contact data while restoring a surviving opt-out for a later capture', async () => {
    const worker = await ledger();
    try {
      const capture = await captured(worker, { email: 'erase@example.test' });
      await request(worker, '/optout', { contactId: capture.contact.id, channel: 'email', reason: 'unsubscribe', occurredAt: '2026-09-08T01:00:00.000Z' });
      await request(worker, '/erase', { contactId: capture.contact.id });
      const recreated = await captured(worker, { email: 'erase@example.test' });
      const detail = await request(worker, `/detail/${recreated.contact.id}`, undefined, 'GET');
      expect(detail.body.emails[0].channelStatus).toBe('unsubscribed');
    } finally { await worker.dispose(); }
  });

  contract('MSG-003', 'renders an unsubscribe confirmation page without GET side effects and accepts one-click POSTs', async () => {
    const worker = await ledger();
    try {
      const capture = await captured(worker, { email: 'public@example.test' });
      await request(worker, '/confirm', { token: capture.confirmation.token });
      const issued = await request(worker, '/issue-unsubscribe', { contactId: capture.contact.id, channel: 'email', recipientStepId: 'step-public', expiresAt: '2026-10-08T00:00:00.000Z' });
      const scanner = await worker.dispatchFetch(`http://ledger.test/unsubscribe/${issued.body.token}`);
      expect(scanner.status).toBe(200);
      expect((await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET')).body.emails[0].channelStatus).toBe('subscribed');
      const oneClickUrl = `http://ledger.test/unsubscribe/one-click/${issued.body.token}`;
      expect((await worker.dispatchFetch(oneClickUrl)).status).toBe(200);
      const urlencoded = { 'Content-Type': 'application/x-www-form-urlencoded' };
      expect((await worker.dispatchFetch(oneClickUrl, { method: 'POST', headers: urlencoded, body: 'List-Unsubscribe=Other' })).status).toBe(400);
      expect((await worker.dispatchFetch(oneClickUrl, { method: 'POST', headers: urlencoded, body: 'confirm=true' })).status).toBe(400);
      expect((await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET')).body.emails[0].channelStatus).toBe('subscribed');
      const oneClick = await worker.dispatchFetch(oneClickUrl, { method: 'POST', body: 'List-Unsubscribe=One-Click', redirect: 'manual' });
      expect(oneClick.status).toBe(200);
      expect((await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET')).body.emails[0].channelStatus).toBe('unsubscribed');
      const repeat = await worker.dispatchFetch(oneClickUrl, { method: 'POST', headers: urlencoded, body: 'List-Unsubscribe=One-Click', redirect: 'manual' });
      expect(repeat.status).toBe(200);
      expect((await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET')).body.emails[0].channelStatus).toBe('unsubscribed');

      // RFC 8058 says the receiver SHOULD send multipart/form-data.
      const multipartContact = await captured(worker, { email: 'public-multipart@example.test' });
      await request(worker, '/confirm', { token: multipartContact.confirmation.token });
      const multipartToken = (await request(worker, '/issue-unsubscribe', { contactId: multipartContact.contact.id, channel: 'email', recipientStepId: 'step-multipart', expiresAt: '2026-10-08T00:00:00.000Z' })).body.token;
      const form = new FormData();
      form.set('List-Unsubscribe', 'One-Click');
      // Encode in Node: Miniflare's dispatchFetch would stringify a FormData body.
      const encoded = new Response(form);
      expect(encoded.headers.get('Content-Type')).toMatch(/^multipart\/form-data; boundary=/);
      const multipart = await worker.dispatchFetch(`http://ledger.test/unsubscribe/one-click/${multipartToken}`, { method: 'POST', headers: { 'Content-Type': encoded.headers.get('Content-Type') }, body: await encoded.text(), redirect: 'manual' });
      expect(multipart.status).toBe(200);
      expect((await request(worker, `/detail/${multipartContact.contact.id}`, undefined, 'GET')).body.emails[0].channelStatus).toBe('unsubscribed');
    } finally { await worker.dispose(); }
  });

  contract('MSG-003', 'unsubscribes on the visible page\'s confirming POST and on one-click POSTs to that page\'s URL', async () => {
    const worker = await ledger();
    try {
      const issue = async (email, recipientStepId) => {
        const capture = await captured(worker, { email });
        await request(worker, '/confirm', { token: capture.confirmation.token });
        const token = (await request(worker, '/issue-unsubscribe', { contactId: capture.contact.id, channel: 'email', recipientStepId, expiresAt: '2026-10-08T00:00:00.000Z' })).body.token;
        const status = async () => (await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET')).body.emails[0].channelStatus;
        return { url: `http://ledger.test/unsubscribe/${token}`, status };
      };
      const urlencoded = { 'Content-Type': 'application/x-www-form-urlencoded' };
      const visible = await issue('visible-form@example.test', 'step-visible');
      expect((await worker.dispatchFetch(visible.url, { method: 'POST', headers: urlencoded, body: '' })).status).toBe(400);
      expect(await visible.status()).toBe('subscribed');
      expect((await worker.dispatchFetch(visible.url, { method: 'POST', headers: urlencoded, body: 'confirm=true', redirect: 'manual' })).status).toBe(200);
      expect(await visible.status()).toBe('unsubscribed');
      // Mail prepared before List-Unsubscribe moved to the one-click URL advertises the page URL.
      const earlier = await issue('earlier-header@example.test', 'step-earlier');
      expect((await worker.dispatchFetch(earlier.url, { method: 'POST', headers: urlencoded, body: 'List-Unsubscribe=One-Click', redirect: 'manual' })).status).toBe(200);
      expect(await earlier.status()).toBe('unsubscribed');
    } finally { await worker.dispose(); }
  });

  contract('MSG-010', 'keys public unsubscribe allowance to each opaque token', async () => {
    const worker = await ledger();
    try {
      const first = await captured(worker, { email: 'rate-one@example.test' });
      const second = await captured(worker, { email: 'rate-two@example.test' });
      const expiresAt = '2026-10-08T00:00:00.000Z';
      const one = (await request(worker, '/issue-unsubscribe', { contactId: first.contact.id, channel: 'email', recipientStepId: 'step-one', expiresAt })).body.token;
      const two = (await request(worker, '/issue-unsubscribe', { contactId: second.contact.id, channel: 'email', recipientStepId: 'step-two', expiresAt })).body.token;
      for (let index = 0; index < 10; index += 1) expect((await worker.dispatchFetch(`http://ledger.test/unsubscribe/${one}`)).status).toBe(200);
      expect((await worker.dispatchFetch(`http://ledger.test/unsubscribe/${one}`)).status).toBe(429);
      expect((await worker.dispatchFetch(`http://ledger.test/unsubscribe/${two}`)).status).toBe(200);
    } finally { await worker.dispose(); }
  });

  contract('MSG-003', 'rejects an unsubscribe token at its exact deadline without consuming it [MSG-010]', async () => {
    const worker = await ledger();
    try {
      const capture = await captured(worker, { email: 'unsubscribe-boundary@example.test' });
      await request(worker, '/confirm', { token: capture.confirmation.token });
      const expiresAt = '2026-10-08T00:00:00.000Z';
      const issued = await request(worker, '/issue-unsubscribe', { contactId: capture.contact.id, channel: 'email', recipientStepId: 'step-boundary', expiresAt });
      expect(issued.response.status).toBe(200);
      const pathname = `/unsubscribe/${issued.body.token}`;
      const database = await worker.getD1Database('DB');
      const storedAction = () => database.prepare('SELECT expires_at, used_at, created_at, updated_at FROM public_action_tokens WHERE recipient_step_id = ?').bind('step-boundary').first();
      const originalAction = await storedAction();
      expect(originalAction).toMatchObject({ expires_at: Date.parse(expiresAt), used_at: null, created_at: Date.parse('2026-09-08T12:00:00.000Z') });
      const before = (await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET')).body;
      expect(before.emails[0].channelStatus).toBe('subscribed');

      expect((await request(worker, '/test-clock', { now: '2026-10-07T23:59:59.999Z' })).body.now).toBe('2026-10-07T23:59:59.999Z');
      expect((await request(worker, pathname, undefined, 'GET')).response.status).toBe(200);
      expect((await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET')).body).toEqual(before);
      expect(await storedAction()).toEqual(originalAction);
      const allowance = await database.prepare('SELECT window_started_at, request_count, updated_at FROM public_token_rate_limits').first();
      expect(allowance).toMatchObject({ request_count: 1, updated_at: Date.parse('2026-10-07T23:59:59.999Z') });

      expect((await request(worker, '/test-clock', { now: expiresAt })).body.now).toBe(expiresAt);
      expect((await request(worker, pathname, undefined, 'GET')).response.status).toBe(404);
      expect((await request(worker, pathname, { confirm: true })).response.status).toBe(404);
      const oneClick = await worker.dispatchFetch(`http://ledger.test/unsubscribe/one-click/${issued.body.token}`, { method: 'POST', body: 'List-Unsubscribe=One-Click' });
      expect(oneClick.status).toBe(404);
      expect((await request(worker, `/detail/${capture.contact.id}`, undefined, 'GET')).body).toEqual(before);
      expect(await storedAction()).toEqual(originalAction);
      // An expired signature must fail before consuming a durable allowance.
      expect(await database.prepare('SELECT window_started_at, request_count, updated_at FROM public_token_rate_limits').first()).toEqual(allowance);
    } finally { await worker.dispose(); }
  });

  contract('CONT-009', 'shares the test clock across public confirmation, private confirmation and signature expiry', async () => {
    const worker = await ledger();
    try {
      const pending = await captured(worker, { email: 'confirmation-boundary@example.test' });
      const affirmative = await captured(worker, { email: 'confirmation-before-boundary@example.test' });
      const expiresAt = pending.confirmation.expiresAt;
      expect(expiresAt).toBe('2026-10-08T12:00:00.000Z');
      const pathname = `/consent/confirm/${pending.confirmation.token}`;
      const before = (await request(worker, `/detail/${pending.contact.id}`, undefined, 'GET')).body;
      expect(before.emails[0].channelStatus).toBe('pending');
      await request(worker, '/test-clock', { now: '2026-10-08T11:59:59.999Z' });
      expect((await request(worker, pathname, undefined, 'GET')).response.status).toBe(200);
      expect((await request(worker, pathname, undefined, 'HEAD')).response.status).toBe(200);
      expect((await request(worker, `/detail/${pending.contact.id}`, undefined, 'GET')).body).toEqual(before);
      expect((await request(worker, `/consent/confirm/${affirmative.confirmation.token}`, { confirm: true })).response.status).toBe(200);
      const confirmed = (await request(worker, `/detail/${affirmative.contact.id}`, undefined, 'GET')).body;
      expect(confirmed.emails[0].channelStatus).toBe('subscribed');
      expect(confirmed.consent[0].confirmedAt).toBe('2026-10-08T11:59:59.999Z');

      await request(worker, '/test-clock', { now: expiresAt });
      expect((await request(worker, pathname, undefined, 'GET')).response.status).toBe(404);
      expect((await request(worker, pathname, { confirm: true })).response.status).toBe(404);
      expect((await request(worker, '/confirm', { token: pending.confirmation.token })).body.kind).toBe('invalid');
      expect((await request(worker, `/detail/${pending.contact.id}`, undefined, 'GET')).body).toEqual(before);
      const database = await worker.getD1Database('DB');
      expect(await database.prepare('SELECT confirmed_at, expires_at FROM consent_confirmations WHERE contact_id = ?').bind(pending.contact.id).first()).toEqual({ confirmed_at: null, expires_at: Date.parse(expiresAt) });
    } finally { await worker.dispose(); }
  });
});
