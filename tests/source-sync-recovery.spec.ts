import { sqlStatements } from '../operations/sql-statements.mjs';
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
import type { CommerceStore } from '../src/core/shared/platform';

const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const provider = 'synthetic-recovery';
async function fixture() {
  const worker = new Miniflare({workers: [{config: {
    name: 'synthetic-sync-recovery', type: 'worker', compatibilityDate: '2026-09-08',
    manifest: {mainModule: 'worker.js', modules: {'worker.js': {type: 'esm', contents: 'export default {fetch(){return new Response("synthetic")}}'}}},
    env: {DB: {type: 'd1', id: crypto.randomUUID()}},
  }}]});
  const binding = await worker.getD1Database('DB');
  for (const file of (await readdir('migrations/core')).filter(file => file.endsWith('.sql')).sort()) {
    const statements = sqlStatements((await readFile(`migrations/core/${file}`, 'utf8')));
    await binding.batch(statements.map(statement => binding.prepare(statement)));
  }
  const database = createDatabase(binding);
  const storeRepository = createStoreRepository(database);
  const store = createStoreService(storeRepository);
  const audienceRepository = createAudienceRepository(database);
  const audience = createAudienceService(audienceRepository, {store, contactHashSalt: 'synthetic-recovery-salt'} as never);
  return {worker, binding, database, storeRepository, audienceRepository, store, audience};
}
function adapter(synchronize: CommerceStore['synchronize']): CommerceStore {
  return {capabilities: () => ({sourceTypes: ['customer'], detail: 'Task-owned synthetic pages; no provider connection'}), synchronize,
    async verifyWebhook() {throw new Error('No provider webhook in recovery tests')}};
}
function record(index: number) {
  return {sourceType: 'customer', sourceId: `customer-${index}`, occurredAt: new Date(), payload: {email: `customer-${index}@example.test`, state: 'observed'}};
}

test('[STORE-002][STORE-003] chunked sync resumes persisted cursors in fresh synchronizers without rereading prior pages', async () => {
  const {worker, store, audience} = await fixture();
  try {
    const secretCursor = 'synthetic-provider-cursor-secret';
    const cursors = [undefined, `${secretCursor}-1`, `${secretCursor}-2`, `${secretCursor}-3`, `${secretCursor}-4`];
    const calls: Array<string | undefined> = [];
    const commerce = adapter(async (_type, cursor) => {
      calls.push(cursor);
      const index = cursors.indexOf(cursor);
      if (index < 0) throw new Error('Unexpected fixture cursor');
      return {records: [record(index)], nextCursor: cursors[index + 1]};
    });
    const command = {sourceType: 'customer', provider, runId: 'resume-five-pages'};
    const options = {pageLimit: 2};
    const first = await createCommerceSynchronizer(commerce, store, audience, options)(command);
    expect(first).toMatchObject({status: 'pending', runId: command.runId, pages: 2});
    expect((await store.status()).sourceSyncs[0].lastSuccessfulAt).toBeNull();
    expect(await store.freshness(['customer'], new Date())).not.toEqual([]);
    expect(JSON.stringify((await store.status()).syncRuns)).not.toContain(secretCursor);
    const second = await createCommerceSynchronizer(commerce, store, audience, options)(command);
    expect(second).toMatchObject({status: 'pending', pages: 4});
    const completed = await createCommerceSynchronizer(commerce, store, audience, options)(command);
    expect(completed).toMatchObject({status: 'completed', pages: 5, runId: command.runId});
    expect(calls).toEqual(cursors);
    expect(await store.freshness(['customer'], new Date())).toEqual([]);
    expect((await store.status()).syncRuns).toContainEqual(expect.objectContaining({id: command.runId, state: 'completed', pages: 5, records: 5}));
    for (let index = 0; index < 5; index++) expect(await store.sourceRecordCount(provider, 'customer', `customer-${index}`)).toBe(1);
    expect((await audience.list()).map(contact => contact.emailStatus)).toEqual(Array(5).fill('non-subscribed'));
    expect(await createCommerceSynchronizer(commerce, store, audience, options)(command)).toMatchObject({status: 'completed', pages: 5});
    expect(calls).toEqual(cursors);
  } finally {await worker.dispose()}
});

test('[STORE-003][STORE-004][STORE-005] failed partial sync preserves its checkpoint and stays stale until final retry completion', async () => {
  const {worker, store, audience} = await fixture();
  try {
    await audience.ingestCommerceWebhook({provider, completion: 'full', adapterCompleted: true, sourceTypes: ['customer'], records: []});
    let unavailable = true;
    const calls: Array<string | undefined> = [];
    const commerce = adapter(async (_type, cursor) => {
      calls.push(cursor);
      if (!cursor) return {records: [record(1)], nextCursor: 'page-two'};
      if (cursor === 'page-two') {
        if (unavailable) throw new Error('Synthetic page two unavailable');
        return {records: [record(2)], nextCursor: 'page-three'};
      }
      if (cursor === 'page-three') return {records: [record(3)]};
      throw new Error('Unexpected fixture cursor');
    });
    const command = {sourceType: 'customer', provider, runId: 'partial-failure'};
    const options = {pageLimit: 1};
    expect(await createCommerceSynchronizer(commerce, store, audience, options)(command)).toMatchObject({status: 'pending', pages: 1});
    await expect(createCommerceSynchronizer(commerce, store, audience, options)(command)).rejects.toThrow('Synthetic page two unavailable');
    expect((await store.status()).sourceSyncs[0]).toMatchObject({lastError: 'Synthetic page two unavailable'});
    expect((await store.status()).syncRuns).toContainEqual(expect.objectContaining({id: command.runId, state: 'failed', pages: 1}));
    expect(await store.freshness(['customer'], new Date())).not.toEqual([]);
    unavailable = false;
    expect(await createCommerceSynchronizer(commerce, store, audience, options)(command)).toMatchObject({status: 'pending', pages: 2});
    expect(await store.freshness(['customer'], new Date())).not.toEqual([]);
    expect(await createCommerceSynchronizer(commerce, store, audience, options)(command)).toMatchObject({status: 'completed', pages: 3});
    expect(calls).toEqual([undefined, 'page-two', 'page-two', 'page-three']);
    expect(await store.freshness(['customer'], new Date())).toEqual([]);
    for (const index of [1, 2, 3]) expect(await store.sourceRecordCount(provider, 'customer', `customer-${index}`)).toBe(1);
  } finally {await worker.dispose()}
});

test('[STORE-003] a repeated cursor across independent chunks fails without recording full completion', async () => {
  const {worker, store, audience} = await fixture();
  try {
    const calls: Array<string | undefined> = [];
    const commerce = adapter(async (_type, cursor) => {
      calls.push(cursor);
      return {records: [], nextCursor: !cursor ? 'cursor-a' : cursor === 'cursor-a' ? 'cursor-b' : 'cursor-a'};
    });
    const command = {sourceType: 'customer', provider, runId: 'cross-chunk-loop'};
    const options = {pageLimit: 1};
    expect(await createCommerceSynchronizer(commerce, store, audience, options)(command)).toMatchObject({status: 'pending', pages: 1});
    expect(await createCommerceSynchronizer(commerce, store, audience, options)(command)).toMatchObject({status: 'pending', pages: 2});
    await expect(createCommerceSynchronizer(commerce, store, audience, options)(command)).rejects.toThrow(/repeated.*cursor|cursor.*repeated/i);
    expect(calls).toEqual([undefined, 'cursor-a', 'cursor-b']);
    expect((await store.status()).sourceSyncs[0].lastSuccessfulAt).toBeNull();
    expect((await store.status()).syncRuns).toContainEqual(expect.objectContaining({id: command.runId, state: 'failed', pages: 2}));
  } finally {await worker.dispose()}
});

test('[STORE-002][STORE-003] a concurrent identical run respects its durable lease and performs no second fetch', async () => {
  const {worker, store, audience} = await fixture();
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve});
  let entered!: () => void;
  const entering = new Promise<void>(resolve => {entered = resolve});
  let first: Promise<unknown> | undefined;
  try {
    let calls = 0;
    const commerce = adapter(async () => {calls++; entered(); await gate; return {records: [record(1)]}});
    const command = {sourceType: 'customer', provider, runId: 'concurrent-run'};
    const options = {pageLimit: 1, leaseMs: 60000};
    first = createCommerceSynchronizer(commerce, store, audience, options)(command);
    await entering;
    const second = await createCommerceSynchronizer(commerce, store, audience, options)(command);
    expect(second).toMatchObject({status: 'busy', runId: command.runId});
    expect(calls).toBe(1);
    expect((await store.status()).sourceSyncs[0].lastSuccessfulAt).toBeNull();
    release();
    expect(await first).toMatchObject({status: 'completed', pages: 1});
    expect(await store.sourceRecordCount(provider, 'customer', 'customer-1')).toBe(1);
  } finally {release(); await first?.catch(() => undefined); await worker.dispose()}
});

test('[STORE-003] pending queue results transfer only after acceptance; busy retries and terminal results acknowledge', async () => {
  const {worker, database} = await fixture();
  try {
    for (const status of ['pending', 'busy', 'completed', 'superseded'] as const) {
      let ack = 0, retry = 0;
      const accepted: unknown[] = [];
      await consumeLifecycleQueue({messages: [{body: {kind: 'source.sync', idempotencyKey: `queue-${status}`, payload: {sourceType: 'customer', provider, runId: `queue-${status}`}}, ack(){ack++}, retry(){retry++}}]} as never,
        {platform: {database, jobs: {async enqueue(command: unknown) {accepted.push(command)}}}, audience: {}, async synchronizeCommerce() {return {status, runId: `queue-${status}`, pages: 1}}} as never);
      expect({ack, retry}, status).toEqual(status === 'busy' ? {ack: 0, retry: 1} : {ack: 1, retry: 0});
      expect(accepted).toEqual(status === 'pending' ? [{kind: 'source.sync', idempotencyKey: 'source-sync:queue-pending:page:1', payload: {sourceType: 'customer', provider, runId: 'queue-pending'}}] : []);
    }
  } finally {await worker.dispose()}
});

test('[STORE-002][STORE-003] an interruption after page import replays that page without duplicating durable source or contact identity', async () => {
  const {worker, store, audience} = await fixture();
  try {
    const item = record(1);
    let calls = 0;
    const commerce = adapter(async () => {calls++; return {records: [item]}});
    const ingest = audience.ingestCommerceWebhook.bind(audience);
    let interrupted = false;
    audience.ingestCommerceWebhook = async input => {
      const result = await ingest(input);
      if (!interrupted && input.completion === 'delta') {interrupted = true; throw new Error('Synthetic interruption after durable import')}
      return result;
    };
    const command = {sourceType: 'customer', provider, runId: 'after-import-interruption'};
    await expect(createCommerceSynchronizer(commerce, store, audience, {pageLimit: 1})(command)).rejects.toThrow('Synthetic interruption after durable import');
    expect(await store.sourceRecordCount(provider, 'customer', item.sourceId)).toBe(1);
    expect((await store.status()).sourceSyncs[0].lastSuccessfulAt).toBeNull();
    expect(await createCommerceSynchronizer(commerce, store, audience, {pageLimit: 1})(command)).toMatchObject({status: 'completed', pages: 1});
    expect(calls).toBe(2);
    expect(await store.sourceRecordCount(provider, 'customer', item.sourceId)).toBe(1);
    expect(await audience.list()).toHaveLength(1);
    expect((await audience.list())[0].emailStatus).toBe('non-subscribed');
  } finally {await worker.dispose()}
});

test('[STORE-002][STORE-003][STORE-005] an expired lease cannot apply its late page or erase the replacement owner completion', async () => {
  const {worker, store, audience} = await fixture();
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve});
  let entered!: () => void;
  const entering = new Promise<void>(resolve => {entered = resolve});
  let first: Promise<unknown> | undefined;
  try {
    let calls = 0;
    let clockTime = Date.now();
    const commerce = adapter(async (_type,_cursor,progress) => {
      const call = ++calls;
      if (call === 1) {entered(); await gate; await progress?.(); return {records: [record(1)]}}
      return {records: [record(2)]};
    });
    const command = {sourceType: 'customer', provider, runId: 'expired-lease-fence'};
    const options = {pageLimit: 1, leaseMs: 1000, now: () => new Date(clockTime)};
    first = createCommerceSynchronizer(commerce, store, audience, options)(command);
    void first.catch(() => undefined);
    await Promise.race([entering, first.then(() => {throw new Error('First run finished before entering the adapter')})]);
    clockTime += 1001;
    const replacement = await createCommerceSynchronizer(commerce, store, audience, options)(command);
    expect(replacement).toMatchObject({status: 'completed', pages: 1});
    release();
    await expect(first).rejects.toThrow(/lease changed/i);
    expect(calls).toBe(2);
    expect(await store.sourceRecordCount(provider, 'customer', 'customer-1')).toBe(0);
    expect(await store.sourceRecordCount(provider, 'customer', 'customer-2')).toBe(1);
    expect((await store.status()).syncRuns).toContainEqual(expect.objectContaining({id: command.runId, state: 'completed', pages: 1, records: 1, lastError: null}));
    expect((await store.status()).sourceSyncs[0].lastError).toBeNull();
    expect(await store.freshness(['customer'], new Date(clockTime))).toEqual([]);
  } finally {release(); await first?.catch(() => undefined); await worker.dispose()}
});

test('[STORE-003][STORE-005] a newer successful run supersedes a failed checkpoint at the same timestamp without allowing stale replay', async () => {
  const {worker, database, store, audience} = await fixture();
  try {
    const clockTime = Date.now();
    let replacement = false;
    const calls: Array<string | undefined> = [];
    const commerce = adapter(async (_type, cursor) => {
      calls.push(cursor);
      if (replacement) return {records: [record(20)]};
      if (!cursor) return {records: [record(10)], nextCursor: 'failed-run-page-two'};
      throw new Error('Synthetic superseded page unavailable');
    });
    const options = {pageLimit: 1, now: () => new Date(clockTime)};
    // Reverse lexical order proves equal timestamps must use insertion order.
    const oldCommand = {sourceType: 'customer', provider, runId: 'z-older-failed-run'};
    const newCommand = {sourceType: 'customer', provider, runId: 'a-newer-successful-run'};
    expect(await createCommerceSynchronizer(commerce, store, audience, options)(oldCommand)).toMatchObject({status: 'pending', pages: 1});
    await expect(createCommerceSynchronizer(commerce, store, audience, options)(oldCommand)).rejects.toThrow('Synthetic superseded page unavailable');
    expect((await store.status()).syncRuns).toContainEqual(expect.objectContaining({id: oldCommand.runId, state: 'failed', pages: 1}));
    replacement = true;
    expect(await createCommerceSynchronizer(commerce, store, audience, options)(newCommand)).toMatchObject({status: 'completed', pages: 1});
    const beforeReplay = await store.status();
    const oldRun = beforeReplay.syncRuns.find(run => run.id === oldCommand.runId);
    const newRun = beforeReplay.syncRuns.find(run => run.id === newCommand.runId);
    expect(oldRun).toMatchObject({state: 'superseded', pages: 1});
    expect(oldRun?.createdAt).toEqual(newRun?.createdAt);
    expect(await store.freshness(['customer'], new Date(clockTime))).toEqual([]);
    expect(calls).toEqual([undefined, 'failed-run-page-two', undefined]);
    expect(await createCommerceSynchronizer(commerce, store, audience, options)(oldCommand)).toMatchObject({status: 'superseded', runId: oldCommand.runId, pages: 1});
    expect(calls).toEqual([undefined, 'failed-run-page-two', undefined]);
    let ack = 0, retry = 0;
    await consumeLifecycleQueue({messages: [{body: {kind: 'source.sync', idempotencyKey: oldCommand.runId, payload: oldCommand}, ack(){ack++}, retry(){retry++}}]} as never,
      {platform: {database}, audience: {}, synchronizeCommerce: createCommerceSynchronizer(commerce, store, audience, options)} as never);
    expect({ack, retry}).toEqual({ack: 1, retry: 0});
    expect(calls).toEqual([undefined, 'failed-run-page-two', undefined]);
    expect(await store.status()).toEqual(beforeReplay);
    expect(await store.sourceRecordCount(provider, 'customer', 'customer-10')).toBe(1);
    expect(await store.sourceRecordCount(provider, 'customer', 'customer-20')).toBe(1);
    expect(await audience.list()).toHaveLength(2);
    expect(await store.freshness(['customer'], new Date(clockTime))).toEqual([]);
  } finally {await worker.dispose()}
});

test('[STORE-003][STORE-004] an actual queue failure resumes its saved page and returns to queued before final acknowledgement', async () => {
  const {worker, database, store, audience} = await fixture();
  try {
    let unavailable = true;
    const calls: Array<string | undefined> = [];
    const commerce = adapter(async (_type, cursor) => {
      calls.push(cursor);
      if (!cursor) return {records: [record(30)], nextCursor: 'queue-page-two'};
      if (cursor === 'queue-page-two') {
        if (unavailable) throw new Error('Synthetic queue page unavailable');
        return {records: [record(31)], nextCursor: 'queue-page-three'};
      }
      return {records: [record(32)]};
    });
    const command = {sourceType: 'customer', provider, runId: 'queue-failed-resume'};
    const synchronizeCommerce = createCommerceSynchronizer(commerce, store, audience, {pageLimit: 1});
    let ack = 0, retry = 0;
    const accepted: Array<{kind: string; idempotencyKey: string; payload: Record<string, unknown>}> = [];
    let current = {kind: 'source.sync', idempotencyKey: command.runId, payload: {...command} as Record<string, unknown>};
    const runtime = {platform: {database, jobs: {async enqueue(job: typeof current) {accepted.push(job)}}}, audience: {}, synchronizeCommerce} as never;
    const deliver = () => consumeLifecycleQueue({messages: [{body: current, ack(){ack++}, retry(){retry++}}]} as never, runtime);
    await deliver();
    expect({ack, retry}).toEqual({ack: 1, retry: 0});
    expect((await store.status()).syncRuns).toContainEqual(expect.objectContaining({id: command.runId, state: 'queued', pages: 1}));
    expect(accepted).toHaveLength(1);
    current = accepted.shift()!;
    await deliver();
    expect({ack, retry}).toEqual({ack: 1, retry: 1});
    expect((await store.status()).syncRuns).toContainEqual(expect.objectContaining({id: command.runId, state: 'failed', pages: 1}));
    unavailable = false;
    await deliver();
    expect({ack, retry}).toEqual({ack: 2, retry: 1});
    expect((await store.status()).syncRuns).toContainEqual(expect.objectContaining({id: command.runId, state: 'queued', pages: 2}));
    expect(await store.freshness(['customer'], new Date())).not.toEqual([]);
    expect(accepted).toHaveLength(1);
    current = accepted.shift()!;
    await deliver();
    expect({ack, retry}).toEqual({ack: 3, retry: 1});
    expect(accepted).toEqual([]);
    expect((await store.status()).syncRuns).toContainEqual(expect.objectContaining({id: command.runId, state: 'completed', pages: 3}));
    expect(calls).toEqual([undefined, 'queue-page-two', 'queue-page-two', 'queue-page-three']);
    expect(await store.freshness(['customer'], new Date())).toEqual([]);
  } finally {await worker.dispose()}
});

test('[STORE-003] undefined or undocumented source-sync completion never acknowledges queue work', async () => {
  const {worker, database} = await fixture();
  try {
    for (const result of [undefined, null, {}, {status: 'unknown'}, {pages: 1}]) {
      let ack = 0, retry = 0;
      await consumeLifecycleQueue({messages: [{body: {kind: 'source.sync', idempotencyKey: 'undocumented-result', payload: {sourceType: 'customer', provider}}, ack(){ack++}, retry(){retry++}}]} as never,
        {platform: {database}, audience: {}, async synchronizeCommerce() {return result}} as never);
      expect({ack, retry}, JSON.stringify(result)).toEqual({ack: 0, retry: 1});
    }
  } finally {await worker.dispose()}
});


test('[STORE-002][STORE-003] an expired ingestion lease cannot create a stale contact after its replacement completes', async () => {
  const {worker, binding, storeRepository, store, audience} = await fixture();
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve});
  let entered!: () => void;
  const entering = new Promise<void>(resolve => {entered = resolve});
  let first: Promise<unknown> | undefined;
  try {
    let clockTime = Date.now();
    let calls = 0;
    const occurredAt = new Date(clockTime);
    const commerce = adapter(async () => {
      const email = ++calls === 1 ? 'stale-lease@example.test' : 'current-lease@example.test';
      return {records: [{sourceType: 'customer', sourceId: 'same-customer', occurredAt, payload: {email, state: 'observed'}}]};
    });
    const ingest = storeRepository.ingestAtomic.bind(storeRepository);
    storeRepository.ingestAtomic = async (...args: Parameters<typeof ingest>) => {
      // Pause at the native transaction boundary; the production batch must
      // reject this expired owner before creating any identity or source fact.
      if (args[1][0].contact?.email === 'stale-lease@example.test') {entered(); await gate}
      return ingest(...args);
    };
    const command = {sourceType: 'customer', provider, runId: 'contact-creation-fence'};
    const options = {pageLimit: 1, leaseMs: 1000, now: () => new Date(clockTime)};
    first = createCommerceSynchronizer(commerce, store, audience, options)(command);
    void first.catch(() => undefined);
    await Promise.race([entering, first.then(() => {throw new Error('First run finished before reaching contact creation')})]);
    clockTime += 1001;
    expect(await createCommerceSynchronizer(commerce, store, audience, options)(command)).toMatchObject({status: 'completed', pages: 1});
    const before = {status: await store.status(), contacts: await audience.list(), source: await store.sourceRecord(provider, 'customer', 'same-customer')};
    expect(before.contacts).toHaveLength(1);
    expect(before.contacts[0]).toMatchObject({email: 'current-lease@example.test', emailStatus: 'non-subscribed'});
    release();
    await expect(first).rejects.toThrow();
    expect(await store.status()).toEqual(before.status);
    expect(await audience.list()).toEqual(before.contacts);
    expect(await store.sourceRecord(provider, 'customer', 'same-customer')).toEqual(before.source);
    expect(await binding.prepare("SELECT COUNT(*) n FROM contacts WHERE email = 'stale-lease@example.test'").first()).toEqual({n: 0});
    expect(await store.freshness(['customer'], new Date(clockTime))).toEqual([]);
  } finally {release(); await first?.catch(() => undefined); await worker.dispose()}
});

test('[STORE-003] a failed continuation enqueue retains queue ownership and retries without acknowledgement', async () => {
  const {worker, database} = await fixture();
  try {
    let ack = 0, retry = 0, unavailable = true;
    const attempted: unknown[] = [];
    const accepted: unknown[] = [];
    const batch = {messages: [{body: {kind: 'source.sync', idempotencyKey: 'continuation-owner', payload: {sourceType: 'customer', provider, runId: 'continuation-owner'}}, ack(){ack++}, retry(){retry++}}]};
    const runtime = {platform: {database, jobs: {async enqueue(command: unknown) {attempted.push(command); if (unavailable) throw new Error('Synthetic queue unavailable'); accepted.push(command)}}}, audience: {},
      async synchronizeCommerce() {return {status: 'pending', runId: 'continuation-owner', pages: 10}}} as never;
    await consumeLifecycleQueue(batch as never, runtime);
    expect({ack, retry}).toEqual({ack: 0, retry: 1});
    expect(accepted).toEqual([]);
    unavailable = false;
    await consumeLifecycleQueue(batch as never, runtime);
    expect({ack, retry}).toEqual({ack: 1, retry: 1});
    expect(attempted).toHaveLength(2);
    expect(attempted[0]).toEqual(attempted[1]);
    expect(accepted).toEqual([{kind: 'source.sync', idempotencyKey: 'source-sync:continuation-owner:page:10', payload: {sourceType: 'customer', provider, runId: 'continuation-owner'}}]);
  } finally {await worker.dispose()}
});

test('[STORE-003][STORE-005] a 101-page source drains accepted continuations without consuming failure retries', async () => {
  // This spans 11 separate queue messages; the generic 30s harness deadline is not a full-sync product limit.
  test.setTimeout(90000);
  const {worker, database, store, audience} = await fixture();
  const startedAt = Date.now();
  try {
    let pages = 0, ack = 0, retry = 0;
    const commerce = adapter(async (_type, cursor) => {
      const page = cursor === undefined ? 1 : Number(cursor);
      pages++;
      return {records: [], nextCursor: page < 101 ? String(page + 1) : undefined};
    });
    const runId = 'hundred-one-pages';
    const initial = {kind: 'source.sync', idempotencyKey: `initial:${runId}`, payload: {sourceType: 'customer', provider, runId} as Record<string, unknown>};
    const pending: Array<typeof initial> = [initial];
    const accepted: Array<typeof initial> = [];
    const runtime = {platform: {database, jobs: {async enqueue(command: typeof initial) {accepted.push(command); pending.push(command)}}}, audience: {},
      synchronizeCommerce: createCommerceSynchronizer(commerce, store, audience, {pageLimit: 10})} as never;
    let deliveries = 0;
    while (pending.length) {
      if (++deliveries > 11) throw new Error('Continuation chain did not converge at page 101');
      const current = pending.shift()!;
      const chunkStartedAt = Date.now();
      await consumeLifecycleQueue({messages: [{body: current, ack(){ack++}, retry(){retry++}}]} as never, runtime);
      console.info('Synthetic D1 scale checkpoint', JSON.stringify({pages, deliveries, ack, retry, chunkMs: Date.now() - chunkStartedAt, elapsedMs: Date.now() - startedAt}));
      expect(retry).toBe(0);
      if (pages < 101) {
        expect(await store.freshness(['customer'], new Date())).not.toEqual([]);
        expect((await store.status()).sourceSyncs[0].lastSuccessfulAt).toBeNull();
      }
    }
    expect({pages, deliveries, ack, retry}).toEqual({pages: 101, deliveries: 11, ack: 11, retry: 0});
    expect(accepted.map(command => command.idempotencyKey)).toEqual(Array.from({length: 10}, (_, index) => `source-sync:${runId}:page:${(index + 1) * 10}`));
    expect(accepted.every(command => command.payload.runId === runId)).toBe(true);
    expect((await store.status()).syncRuns).toContainEqual(expect.objectContaining({id: runId, state: 'completed', pages: 101}));
    expect(await store.freshness(['customer'], new Date())).toEqual([]);
  } finally {await worker.dispose()}
});

test('[STORE-003][STORE-004] an older active source remains exposed beyond fifty later history rows and can resume its saved cursor', async () => {
  const {worker, binding, store, audience} = await fixture();
  try {
    const calls: Array<string | undefined> = [];
    const commerce = adapter(async (_type, cursor) => {
      calls.push(cursor);
      return cursor === undefined ? {records: [record(40)], nextCursor: 'visible-active-page-two'} : {records: [record(41)]};
    });
    const command = {sourceType: 'customer', provider, runId: 'older-active-customer'};
    expect(await createCommerceSynchronizer(commerce, store, audience, {pageLimit: 1})(command)).toMatchObject({status: 'pending', pages: 1});
    const time = Date.now();
    await binding.batch(Array.from({length: 56}, (_, index) => binding.prepare(`INSERT INTO source_sync_runs
      (id, provider, source_type, state, pages, records, created_at, updated_at, completed_at)
      VALUES (?, ?, ?, 'completed', 1, 0, ?, ?, ?)`)
      .bind(`later-history-${index}`, provider, index % 2 ? 'product' : 'inventory', time + index, time + index, time + index)));
    const before = await store.status();
    expect(before.syncRuns).toContainEqual(expect.objectContaining({id: command.runId, state: 'queued', pages: 1}));
    expect(before.syncRuns.filter(run => run.id.startsWith('later-history-'))).toHaveLength(50);
    expect(JSON.stringify(before.syncRuns)).not.toContain('visible-active-page-two');
    expect(await createCommerceSynchronizer(commerce, store, audience, {pageLimit: 1})(command)).toMatchObject({status: 'completed', pages: 2});
    expect(calls).toEqual([undefined, 'visible-active-page-two']);
    expect((await store.status()).syncRuns).toContainEqual(expect.objectContaining({id: command.runId, state: 'completed', pages: 2}));
    expect(await store.freshness(['customer'], new Date())).toEqual([]);
    expect(await store.sourceRecordCount(provider, 'customer', 'customer-40')).toBe(1);
    expect(await store.sourceRecordCount(provider, 'customer', 'customer-41')).toBe(1);
  } finally {await worker.dispose()}
});

test('[STORE-003][STORE-005] an expired capability publisher cannot undo the replacement adapter configuration', async () => {
  const {worker, storeRepository, store, audience} = await fixture();
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve});
  let entered!: () => void;
  const entering = new Promise<void>(resolve => {entered = resolve});
  let first: Promise<unknown> | undefined;
  try {
    let clockTime = Date.now();
    let oldFetches = 0, replacementFetches = 0;
    const oldAdapter: CommerceStore = {
      capabilities: () => ({sourceTypes: ['product'], detail: 'Old adapter configuration'}),
      async synchronize() {oldFetches++; throw new Error('Unsupported old adapter must not fetch customers')},
      async verifyWebhook() {throw new Error('No provider webhook in capability fence test')},
    };
    const replacementAdapter: CommerceStore = {
      capabilities: () => ({sourceTypes: ['customer'], detail: 'Replacement adapter configuration'}),
      async synchronize() {replacementFetches++; return {records: [record(50)]}},
      async verifyWebhook() {throw new Error('No provider webhook in capability fence test')},
    };
    const publish = storeRepository.recordCommerceSourceCapability.bind(storeRepository);
    storeRepository.recordCommerceSourceCapability = async (...args: Parameters<typeof publish>) => {
      if (args[0].sourceType === 'customer' && !args[0].available) {entered(); await gate}
      return publish(...args);
    };
    const command = {sourceType: 'customer', provider, runId: 'capability-config-fence'};
    const options = {pageLimit: 1, leaseMs: 1000, now: () => new Date(clockTime)};
    first = createCommerceSynchronizer(oldAdapter, store, audience, options)(command);
    void first.catch(() => undefined);
    await Promise.race([entering, first.then(() => {throw new Error('First run finished before reaching capability publication')})]);
    clockTime += 1001;
    expect(await createCommerceSynchronizer(replacementAdapter, store, audience, options)(command)).toMatchObject({status: 'completed', pages: 1});
    const before = await store.status();
    expect(before.sourceCapabilities).toContainEqual(expect.objectContaining({sourceType: 'customer', available: true, detail: 'Replacement adapter configuration'}));
    release();
    await expect(first).rejects.toThrow();
    expect({oldFetches, replacementFetches}).toEqual({oldFetches: 0, replacementFetches: 1});
    expect(await store.status()).toEqual(before);
    expect(await store.freshness(['customer'], new Date(clockTime))).toEqual([]);
  } finally {release(); await first?.catch(() => undefined); await worker.dispose()}
});
