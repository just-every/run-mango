import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';

import { createApp, createAppServices } from '../src/core/app/app';
import { consumeLifecycleQueue } from '../src/core/features/lifecycle';
import { createLocalPlatform } from '../src/core/platform/runtime';
import type { AppBindings, QueueCommand } from '../src/core/shared/platform';

const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');

test('BASE-OPS-001: full app probes D1, R2 and Queue concurrently and bounds every failed transport', async () => {
  const native = new Miniflare({ host: '127.0.0.1', port: 0, cf: false, telemetry: { enabled: false },
    workers: [{ config: { name: 'health-transports', type: 'worker', compatibilityDate: '2026-08-31',
      manifest: { mainModule: 'index.js', modules: { 'index.js': { type: 'esm', contents: 'export default {fetch(){return new Response("health transport")}}' } } },
      env: { DB: { type: 'd1', id: crypto.randomUUID() }, ASSETS_BUCKET: { type: 'r2', name: crypto.randomUUID() } },
    } }],
  });
  try {
    const database = await native.getD1Database('DB') as D1Database;
    const bucket = await native.getR2Bucket('ASSETS_BUCKET') as R2Bucket;
    const calls: QueueCommand[] = [];
    const environment = { DB: database, ASSETS_BUCKET: bucket,
      MANGO_JOBS: { async send(command: QueueCommand) { calls.push(command); } },
      MANGO_PUBLIC_BASE_URL: 'http://127.0.0.1', INITIAL_OPERATOR_EMAILS: 'owner@example.test',
      CONTACT_HASH_SALT: 'health-test-only-authority', MANGO_LOCAL_HASH_AUTHORITY: 'contact-salt-v1',
    } as unknown as AppBindings;
    const call = async (bindings: AppBindings) => {
      const platform = createLocalPlatform(bindings, 'health-test-only-signing-key-at-least-thirty-two-bytes');
      return createApp(bindings, platform).fetch(new Request('http://127.0.0.1/health'), bindings);
    };
    // No product tables exist: health must not run settings or retirement queries first.
    const healthy = await call(environment);
    expect(healthy.status).toBe(200);
    expect(await healthy.json()).toMatchObject({ status: 'ok', ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ kind: 'health.probe', payload: {} });
    expect(healthy.headers.get('cache-control')).toBe('no-store');

    for (const behavior of ['reject', 'hang'] as const) {
      const failure = () => behavior === 'reject'
        ? Promise.reject(new Error('private-provider-detail-do-not-expose'))
        : new Promise<never>(() => {});
      const failedDatabase = new Proxy(database, {
        get(target, key) {
          if (key === 'prepare') return (query: string) => {
            const statement = target.prepare(query);
            const wrap = (value: D1PreparedStatement): D1PreparedStatement => new Proxy(value, {
              get(statementTarget, statementKey) {
                if (statementKey === 'run') return failure;
                if (statementKey === 'bind') return (...values: unknown[]) => wrap(statementTarget.bind(...values));
                const member = Reflect.get(statementTarget, statementKey);
                return typeof member === 'function' ? member.bind(statementTarget) : member;
              },
            });
            return wrap(statement);
          };
          const member = Reflect.get(target, key);
          return typeof member === 'function' ? member.bind(target) : member;
        },
      });
      for (const dependency of ['database', 'storage', 'queue'] as const) {
        const bindings = { ...environment,
          ...(dependency === 'database' ? { DB: failedDatabase } : {}),
          ...(dependency === 'storage' ? { ASSETS_BUCKET: { head: failure } as unknown as R2Bucket } : {}),
          ...(dependency === 'queue' ? { MANGO_JOBS: { send: failure } as unknown as Queue<QueueCommand> } : {}),
        };
        const started = performance.now();
        const response = await call(bindings);
        expect(performance.now() - started).toBeLessThan(1_000);
        expect(response.status).toBe(503);
        const body = await response.json();
        expect(body).toMatchObject({ ok: false, status: 'unavailable',
          failures: [{ dependency, code: behavior === 'hang' ? 'timeout' : 'unreachable' }] });
        expect(JSON.stringify(body)).not.toContain('private-provider-detail');
      }
      // All three hanging edges consume one shared wall-clock interval, not three.
      const started = performance.now();
      const allFailed = await call({ ...environment, DB: failedDatabase,
        ASSETS_BUCKET: { head: failure } as unknown as R2Bucket,
        MANGO_JOBS: { send: failure } as unknown as Queue<QueueCommand> });
      expect(performance.now() - started).toBeLessThan(1_000);
      expect((await allFailed.json()).failures).toHaveLength(3);

      // A probe is consumed even by a filtered local worker, without any D1/domain activity.
      let acknowledged = 0;
      const platform = createLocalPlatform({ ...environment, DB: failedDatabase }, 'health-test-only-signing-key-at-least-thirty-two-bytes');
      await consumeLifecycleQueue({ messages: [{ body: calls[0], ack() { acknowledged += 1; },
        retry() { throw new Error('Health probes must not retry domain work.'); } }] },
      createAppServices(platform).lifecycleRuntime, ['design.draft']);
      expect(acknowledged).toBe(1);
    }
  } finally {
    await native.dispose();
  }
});
