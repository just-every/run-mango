import { sqlStatements } from '../operations/sql-statements.mjs';
import { createSyncRoutes } from '../src/core/features/store/sync-routes';
import { syntheticReviewPlatform } from './review/platform';
import { prepareSyntheticReview } from './review/scenario';
import { createAppServices } from '../src/core/app/app';
import { createLifecycleServices } from '../src/core/features/lifecycle';
import { expect, test } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import { createDatabase } from '../src/core/platform/db/client';
import { createStoreRepository } from '../src/core/features/store/repository';
import { createStoreService } from '../src/core/features/store/service';
import { createAudienceRepository } from '../src/core/features/audience/repository';
import { createAudienceService } from '../src/core/features/audience/service';
import { createCommerceSynchronizer } from '../src/core/features/store/synchronize';
import { consumeLifecycleQueue } from '../src/core/features/lifecycle';
import { contract } from './contract.js';

const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
async function fixture() {
  const worker = new Miniflare({workers: [{config: {
    name: 'synthetic-commerce-sync', type: 'worker', compatibilityDate: '2026-09-08',
    manifest: {mainModule: 'worker.js', modules: {'worker.js': {type: 'esm', contents: 'export default {fetch(){return new Response("synthetic")}}'}}},
    env: {DB: {type: 'd1', id: crypto.randomUUID()}},
  }}]});
  const binding = await worker.getD1Database('DB');
  for (const file of (await readdir('migrations/core')).filter(file => file.endsWith('.sql')).sort()) {
    const statements = sqlStatements((await readFile(`migrations/core/${file}`, 'utf8')));
    await binding.batch(statements.map(statement => binding.prepare(statement)));
  }
  const database = createDatabase(binding);
  const store = createStoreService(createStoreRepository(database));
  const audience = createAudienceService(createAudienceRepository(database), {store, contactHashSalt: 'synthetic-commerce-test'} as never);
  return {worker, database, binding, store, audience};
}

contract('STORE-003', 'a paginated full sync remains failed until every page persists; retry upserts identities', async () => {
  const {worker, store, audience, database} = await fixture();
  try {
    let failSecond = true;
    let secondPageSawStale = false;
    const calls: Array<string | undefined> = [];
    const commerce = {
      capabilities: () => ({sourceTypes: ['customer'], detail: 'Task-owned synthetic adapter; no store connection.'}),
      async synchronize(type: string, cursor?: string) {
        calls.push(cursor);
        if (cursor) {
          secondPageSawStale = (await store.freshness(['customer'], new Date())).length > 0;
          if (failSecond) throw new Error('Synthetic page two unavailable');
          return {records: [{sourceType: type, sourceId: 'two', occurredAt: new Date(), payload: {email: 'two@example.test'}}]};
        }
        return {records: [{sourceType: type, sourceId: 'one', occurredAt: new Date(), payload: {email: 'one@example.test'}}], nextCursor: 'page-two'};
      },
      async verifyWebhook() {throw new Error('No real webhook');},
    };
    const synchronizeCommerce = createCommerceSynchronizer(commerce, store, audience);
    let ack = 0, retry = 0;
    const batch = {messages: [{body: {kind: 'source.sync', idempotencyKey: 'sync-one', payload: {sourceType: 'customer', provider: 'task-synthetic'}}, ack(){ack++}, retry(){retry++}}]};
    const runtime = {platform: {database}, audience: {}, synchronizeCommerce} as never;
    await consumeLifecycleQueue(batch as never, runtime);
    expect({ack, retry}).toEqual({ack: 0, retry: 1});
    expect((await store.status()).sourceSyncs[0]).toMatchObject({lastSuccessfulAt: null, lastError: 'Synthetic page two unavailable'});
    expect(await store.sourceRecordCount('task-synthetic', 'customer', 'one')).toBe(1);
    failSecond = false;
    await consumeLifecycleQueue(batch as never, runtime);
    expect({ack, retry}).toEqual({ack: 1, retry: 1});
    expect(secondPageSawStale).toBe(true);
    expect(calls).toEqual([undefined, 'page-two', 'page-two']);
    expect(await store.freshness(['customer'], new Date())).toEqual([]);
    expect(await store.sourceRecordCount('task-synthetic', 'customer', 'one')).toBe(1);
    expect(await store.sourceRecordCount('task-synthetic', 'customer', 'two')).toBe(1);
    // Commerce activity never manufactures consent.
    expect((await audience.list()).map(contact => contact.emailStatus)).toEqual(['non-subscribed', 'non-subscribed']);
    expect((await store.sourceRecord('task-synthetic', 'customer', 'one'))?.occurredAt).toBeInstanceOf(Date);
  } finally {await worker.dispose();}
});

test('invalid cursors and unsupported sources remain failed instead of receiving completion', async () => {
  const {worker, store, audience} = await fixture();
  try {
    const sync = createCommerceSynchronizer({
      capabilities: () => ({sourceTypes: ['customer'], detail: 'synthetic'}),
      async synchronize() {return {records: [], nextCursor: 'repeated'};},
      async verifyWebhook() {throw new Error('unused');},
    }, store, audience);
    await expect(sync({sourceType: 'customer', provider: 'synthetic'})).rejects.toThrow('repeated pagination cursor');
    expect((await store.status()).sourceSyncs[0].lastSuccessfulAt).toBeNull();
    await expect(sync({sourceType: 'order', provider: 'synthetic'})).rejects.toThrow('does not supply order');
    expect(await store.freshness(['order'], new Date())).toMatchObject([{reason: 'source-unavailable'}]);
  } finally {await worker.dispose();}
});

test('an uncomposed source.sync command is retried, never acknowledged', async () => {
  const {worker, database} = await fixture();
  try {
    let ack = 0, retry = 0;
    await consumeLifecycleQueue({messages: [{body: {kind: 'source.sync', idempotencyKey: 'missing', payload: {}}, ack(){ack++}, retry(){retry++}}]} as never, {platform: {database}, audience: {}} as never);
    expect({ack, retry}).toEqual({ack: 0, retry: 1});
    await consumeLifecycleQueue({messages: [{body: {kind: 'unknown-work', payload: {}}, ack(){ack++}, retry(){retry++}}]} as never, {platform: {database}} as never);
    expect({ack, retry}).toEqual({ack: 0, retry: 2});
  } finally {await worker.dispose();}
});

contract('CONT-004', 'replayed affirmative evidence cannot reverse a later destination opt-out', async () => {
  const {worker, audience} = await fixture();
  try {
    const occurredAt = new Date();
    const input = {idempotencyKey: 'replayed-consent', contact: {email: 'replay@example.test'}, channel: 'email' as const,
      brandOrLegalSender: 'Synthetic Mango', messageCategory: 'offers', frequencyDisclosure: 'Weekly', destinationJurisdiction: 'AU',
      captureMethod: 'task-fixture', captureSource: 'task-fixture', consentText: 'Synthetic affirmative evidence', consentVersion: 'v1', occurredAt, confirmationRequired: false};
    await audience.captureConsent(input);
    await audience.recordChannelOptOut({destination: 'replay@example.test', channel: 'email', occurredAt: new Date(occurredAt.getTime() + 1), reason: 'test-opt-out'});
    const replay = await audience.captureConsent(input);
    expect(replay.contact.emailStatus).toBe('unsubscribed');
    await expect(audience.captureConsent({...input, occurredAt: new Date(occurredAt.getTime() + 2)})).rejects.toThrow('different affirmative evidence');
    expect((await audience.list())[0].emailStatus).toBe('unsubscribed');
  } finally {await worker.dispose();}
});

contract('CAMP-004', 'source-backed synthetic review excludes opt-out and missing consent, then freezes only the approved eligible recipient', async () => {
  const {worker, binding} = await fixture();
  try {
    const platform = syntheticReviewPlatform({DB: binding, MANGO_JOBS: {}, ASSETS_BUCKET: {}, LOCAL_BOOTSTRAP_TOKEN: 'synthetic-approval-signing-key'} as never);
    const scenario = await prepareSyntheticReview(platform);
    const runtime = createAppServices(platform).lifecycleRuntime;
    const {approval} = createLifecycleServices(runtime);
    const preview = await approval.preview(scenario);
    expect(preview).toMatchObject({kind: 'preview', sourceStatus: 'ok', candidateCount: 3, eligibleCount: 1, blockers: []});
    expect(await binding.prepare('SELECT COUNT(*) n FROM recipient_steps').first()).toEqual({n: 0});
    await binding.prepare('DELETE FROM campaign_audience_channel_counts').run();
    await binding.prepare('DELETE FROM campaign_audiences').run();
    const result = await approval.approve({...scenario, operatorId: 'synthetic-owner', idempotencyKey: 'synthetic-approval-one'});
    expect(result.kind).toBe('approved');
    expect(await binding.prepare('SELECT candidate_count, excluded_count, eligible_count FROM campaign_audiences WHERE revision_id = ?').bind(scenario.revisionId).first()).toEqual({candidate_count: 3, excluded_count: 2, eligible_count: 1});
    expect(await binding.prepare('SELECT recipient_step_count FROM campaign_audience_channel_counts').first()).toEqual({recipient_step_count: 1});
    const recipients = await binding.prepare('SELECT contact_id, transport_disposition AS disposition FROM recipient_steps WHERE revision_id = ?').bind(scenario.revisionId).all();
    expect(recipients.results).toHaveLength(1);
    expect(recipients.results[0].disposition).toBe('queued');
    const contacts = await createAppServices(platform).audienceService.list();
    expect(contacts.find(contact => contact.email === 'opted-out@example.test')?.emailStatus).toBe('unsubscribed');
    expect(contacts.find(contact => contact.email === 'no-consent@example.test')?.emailStatus).toBe('non-subscribed');
    await expect(platform.mailer.send({} as never)).rejects.toThrow('Marketing sends are disabled');
  } finally {await worker.dispose();}
});

contract('STORE-005', 'a source failure during audience rechecks blocks approval even when another recipient is eligible', async () => {
  const {worker, binding} = await fixture();
  try {
    const platform = syntheticReviewPlatform({DB: binding, MANGO_JOBS: {}, ASSETS_BUCKET: {}, LOCAL_BOOTSTRAP_TOKEN: 'synthetic-race-key'} as never);
    const scenario = await prepareSyntheticReview(platform);
    const services = createAppServices(platform);
    await services.audienceService.captureConsent({idempotencyKey: 'second-eligible', contact: {email: 'second@example.test'}, channel: 'email',
      brandOrLegalSender: 'Synthetic Mango', messageCategory: 'offers', frequencyDisclosure: 'Weekly', destinationJurisdiction: 'AU',
      captureMethod: 'task-fixture', captureSource: 'task-fixture', consentText: 'Synthetic consent', consentVersion: 'v1', occurredAt: new Date(), confirmationRequired: false});
    await services.audienceService.ingestCommerceWebhook({provider: 'task-synthetic', completion: 'delta', adapterCompleted: false, sourceTypes: ['customer'],
      records: [{sourceType: 'customer', providerSourceId: 'second-eligible', occurredAt: new Date(), payload: {segment: 'synthetic-review'}, contact: {email: 'second@example.test'}}]});
    const runtime = services.lifecycleRuntime;
    const recheck = runtime.audience.recheckHandoffEligibility.bind(runtime.audience);
    let calls = 0;
    runtime.audience.recheckHandoffEligibility = async input => {
      const result = await recheck(input);
      if (++calls === 1) await services.storeService.recordCommerceSyncFailure(['customer'], 'Synthetic concurrent source failure');
      return result;
    };
    const result = await createLifecycleServices(runtime).approval.approve({...scenario, operatorId: 'operator', idempotencyKey: 'source-race-approval'});
    expect(calls).toBe(2);
    expect(result.kind).toBe('blocked');
    if (result.kind === 'blocked') expect(result.blockers).toContainEqual(expect.objectContaining({kind: 'audience.recheck', blocking: true}));
    expect(await binding.prepare('SELECT COUNT(*) n FROM recipient_steps').first()).toEqual({n: 0});
  } finally {await worker.dispose();}
});


test('operator sync persists queue failure and retries the same run without inventing completion', async () => {
  const {worker, store} = await fixture();
  try {
    let queueFails = true;
    const accepted: unknown[] = [];
    const platform = {
      commerce: {capabilities: () => ({provider: 'task-synthetic', sourceTypes: ['customer'], detail: 'Synthetic only'})},
      jobs: {async enqueue(command: unknown) {if (queueFails) throw new Error('Synthetic queue unavailable'); accepted.push(command)}},
    };
    const app = createSyncRoutes(platform as never, store);
    const post = (body: unknown) => app.request('/store/sync', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
    expect((await post({sourceType: 'customer', runId: 'missing'})).status).toBe(404);
    const failed = await post({sourceType: 'customer'});
    expect(failed.status).toBe(503);
    const {runId} = await failed.json() as {runId: string};
    expect(await store.syncRuns.get(runId)).toMatchObject({state: 'failed', pages: 0, lastError: 'Synthetic queue unavailable'});
    expect((await store.status()).sourceSyncs[0].lastSuccessfulAt).toBeNull();
    queueFails = false;
    const resumed = await post({sourceType: 'customer', runId});
    expect(resumed.status).toBe(202);
    expect(await resumed.json()).toEqual({status: 'queued', runId});
    expect(await store.syncRuns.get(runId)).toMatchObject({state: 'queued', pages: 0, lastError: null});
    expect(accepted).toEqual([{kind: 'source.sync', idempotencyKey: `source-sync:${runId}`, payload: {sourceType: 'customer', provider: 'task-synthetic', runId}}]);
    expect((await post({sourceType: 'customer'})).status).toBe(409);
    expect((await post({sourceType: 'customer', unexpected: true})).status).toBe(400);
    expect((await post({sourceType: 'order'})).status).toBe(409);
    expect((await store.status()).sourceSyncs[0].lastSuccessfulAt).toBeNull();
  } finally {await worker.dispose()}
});
