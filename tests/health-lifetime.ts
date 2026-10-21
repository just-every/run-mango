import { expect, test } from '@playwright/test';
import type { AppBindings } from '../src/core/shared/platform';

/** Exercise the production /health door with instrumentation only at binding edges and the clock. */
export async function healthLifetime(
  bindings: (queue: Partial<Queue<any>>, database: () => Promise<unknown>, storage: () => Promise<unknown>) => AppBindings,
  read: (env: AppBindings) => Promise<Response>,
) {
  const realNow = Date.now, realTimeout = globalThis.setTimeout, realClear = globalThis.clearTimeout;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);
  let offset = 0;
  Date.now = () => realNow() + offset;
  globalThis.setTimeout = ((callback: (...args: any[]) => void, ms?: number, ...args: any[]) => {
    const timer = realTimeout(() => { timers.delete(timer); callback(...args); }, ms);
    timers.add(timer);
    return timer;
  }) as typeof setTimeout;
  globalThis.clearTimeout = ((timer: ReturnType<typeof setTimeout>) => {
    timers.delete(timer);
    realClear(timer);
  }) as typeof clearTimeout;
  process.on('unhandledRejection', onUnhandled);
  const flush = () => new Promise<void>(resolve => setImmediate(resolve));
  try {
    for (const settlement of ['never', 'success-before-expiry', 'success-after-expiry', 'rejection-before-expiry', 'rejection-after-expiry'] as const) await test.step(`Queue ownership: ${settlement}`, async () => {
      let sends = 0, outstanding = 0, peak = 0, databaseReads = 0, storageReads = 0, requests = 0;
      let recoveryEnabled = false;
      const pending: {resolve: () => void; reject: (reason: Error) => void}[] = [];
      const queue = { send: async (command: {kind: string}) => {
        expect(command.kind).toBe('health.probe');
        sends++; outstanding++; peak = Math.max(peak, outstanding);
        try {
          if (!recoveryEnabled) await new Promise<void>((resolve, reject) => { pending.push({resolve, reject}); });
        } finally { outstanding--; }
      } };
      const env = bindings(queue, async () => { databaseReads++; return {success: true}; }, async () => { storageReads++; return null; });
      Object.assign(env, {RER_DEPLOY_SOURCE: 'health-lifetime-source', RER_DEPLOY_FINGERPRINT: 'health-lifetime-fingerprint', RER_VERSION: {id: 'health-lifetime-version'}});
      const request = async () => {
        requests++;
        const response = await read(env);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        const body = await response.json() as any;
        expect(body.deployment).toEqual({sourceSha: 'health-lifetime-source', fingerprint: 'health-lifetime-fingerprint', versionId: 'health-lifetime-version'});
        return {status: response.status, body};
      };
      const unavailable = (result: Awaited<ReturnType<typeof request>>, cached: boolean) => {
        expect(result.status).toBe(503);
        expect(result.body).toMatchObject({ok: false, status: 'unavailable', failures: [{dependency: 'queue', code: 'timeout'}], queue: {slow: true, cached}});
      };
      const first = await request();
      unavailable(first, false);
      expect({sends, outstanding, peak, timers: timers.size}).toEqual({sends: 1, outstanding: 1, peak: 1, timers: 0});
      if (settlement.endsWith('before-expiry')) {
        // Settlement before cache expiry releases ownership, but cannot rewrite
        // the timed-out observation that existing callers already received.
        recoveryEnabled = true;
        if (settlement.startsWith('success')) pending[0].resolve();
        else pending[0].reject(new Error('private late Queue rejection'));
        await flush();
        expect(outstanding).toBe(0);
        const cached = await request(); unavailable(cached, true);
        expect(cached.body.queue.ms).toBe(first.body.queue.ms);
        expect(sends).toBe(1);
        offset += 60_001;
      } else {
        // The second real window gets its own check despite the older send.
        offset += 60_001;
        const second = await Promise.all(Array.from({length: 12}, request));
        second.forEach((result, index) => unavailable(result, index > 0));
        expect({sends, outstanding, peak, timers: timers.size}).toEqual({sends: 2, outstanding: 2, peak: 2, timers: 0});
        // Once both slots are occupied, further windows reuse the failure and
        // do not move its expiry or accumulate sends, timers or retry tasks.
        for (let expiry = 0; expiry < 3; expiry++) {
          offset += 60_001;
          const started = performance.now();
          const burst = await Promise.all(Array.from({length: 12}, request));
          expect({sends, outstanding, peak, timers: timers.size}).toEqual({sends: 2, outstanding: 2, peak: 2, timers: 0});
          for (const result of burst) {
            unavailable(result, true);
            expect(result.body.queue.ms).toBe(second[0].body.queue.ms);
          }
          expect(performance.now() - started).toBeLessThan(500);
        }
        // A distinct real Queue binding in the same isolate has its own result.
        let otherSends = 0;
        const other = bindings({send: async () => { otherSends++; }}, async () => ({success: true}), async () => null);
        const independent = await Promise.all([read(other), read({...other}), request()]);
        expect(independent.slice(0, 2).map(result => (result as Response).status)).toEqual([200, 200]);
        unavailable(independent[2] as Awaited<ReturnType<typeof request>>, true);
        expect(otherSends).toBe(1);
        if (settlement !== 'never') {
          recoveryEnabled = true;
          if (settlement.startsWith('success')) pending[0].resolve();
          else pending[1].reject(new Error('private late Queue rejection'));
          await flush();
          expect(outstanding).toBe(1);
        }
      }
      if (settlement !== 'never') {
        // A single freed slot is sufficient, without another 60-second wait.
        // Either an old or the latest send may free it; neither rewrites results.
        const recovered = await Promise.all(Array.from({length: 12}, request));
        for (const result of recovered) {
          expect(result.status).toBe(200);
          expect(result.body).toMatchObject({ok: true, status: 'ok'});
          expect(result.body).not.toHaveProperty('failures');
        }
        const afterExpiry = settlement.endsWith('after-expiry');
        expect({sends, outstanding, peak}).toEqual({sends: afterExpiry ? 3 : 2, outstanding: afterExpiry ? 1 : 0, peak: afterExpiry ? 2 : 1});
        expect(recovered.filter(result => !result.body.queue.cached)).toHaveLength(1);
        for (const send of pending) { send.resolve(); send.reject(new Error('already settled')); }
        await flush();
        expect((await request()).status).toBe(200);
        expect(sends).toBe(afterExpiry ? 3 : 2);
      }
      for (const send of pending) send.resolve();
      await flush();
      expect({databaseReads, storageReads}).toEqual({databaseReads: requests, storageReads: requests});
      expect(timers.size).toBe(0);
      expect(unhandled).toEqual([]);
    });
    await test.step('Expired failure retries while the older send remains unresolved', async () => {
      let sends = 0, release!: () => void;
      const env = bindings({send: async () => {
        if (++sends === 1) await new Promise<void>(resolve => { release = resolve; });
      }}, async () => ({success: true}), async () => null);
      expect((await read(env)).status).toBe(503);
      expect((await read(env)).status).toBe(503);
      expect(sends).toBe(1);
      offset += 60_001;
      const recovered = await read(env);
      expect(recovered.status).toBe(200);
      expect(await recovered.json()).toMatchObject({queue: {cached: false}});
      expect(sends).toBe(2);
      release(); await flush();
      expect((await read(env)).status).toBe(200);
      expect(sends).toBe(2);
      expect(timers.size).toBe(0);
    });
    await test.step('D1 and R2 are fresh beside a cached Queue success', async () => {
      let sends = 0, fault = '';
      const check = async (dependency: string) => {
        if (fault === dependency) throw new Error('private dependency error');
      };
      const env = bindings({send: async () => { sends++; }}, () => check('database'), () => check('storage'));
      expect((await read(env)).status).toBe(200);
      for (const dependency of ['database', 'storage']) {
        fault = dependency;
        const failed = await read(env);
        expect(failed.status).toBe(503);
        expect(await failed.json()).toMatchObject({failures: [{dependency, code: 'unreachable'}], queue: {cached: true}});
        fault = '';
        expect((await read(env)).status).toBe(200);
      }
      expect(sends).toBe(1);
      expect(timers.size).toBe(0);
    });
    await test.step('Queue rejection is cached, then recovery is probed', async () => {
      let sends = 0;
      const env = bindings({send: async () => { if (++sends === 1) throw new Error('private immediate rejection'); }}, async () => ({success: true}), async () => null);
      for (let request = 0; request < 2; request++) {
        const response = await read(env);
        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({failures: [{dependency: 'queue', code: 'unreachable'}], queue: {cached: request > 0}});
      }
      expect(sends).toBe(1);
      offset += 60_001;
      expect((await read(env)).status).toBe(200);
      expect(sends).toBe(2);
      expect(timers.size).toBe(0);
    });
  } finally {
    Date.now = realNow; globalThis.setTimeout = realTimeout; globalThis.clearTimeout = realClear;
    for (const timer of timers) realClear(timer);
    process.off('unhandledRejection', onUnhandled);
  }
}
