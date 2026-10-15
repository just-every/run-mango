import {test, expect} from '@playwright/test';
import {native} from './native';
import {createSignupRoutes, signupDescription} from '../../src/core/features/audience/signup-routes';
import {sha256} from '../../src/core/shared/ids';
import {setTimeout as delay} from 'node:timers/promises';

test.setTimeout(120000);

async function heldSignup(h: Awaited<ReturnType<typeof native>>, email: string, ip: string) {
  let release!: () => void;
  let reading!: () => void;
  const started = new Promise<void>(resolve => { reading = resolve; });
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      release = () => {
        controller.enqueue(new TextEncoder().encode(JSON.stringify({email, consent: true, disclosure: signupDescription(h.f.platform).disclosure})));
        controller.close();
      };
    },
    pull() { reading(); },
  }, {highWaterMark: 0});
  const app = createSignupRoutes(h.f.services.audienceService, h.f.platform, h.f.db);
  const response = app.request(new Request('https://mango.example.test/subscribe', {
    method: 'POST', headers: {'Content-Type': 'application/json', 'CF-Connecting-IP': ip}, body, duplex: 'half',
  } as RequestInit));
  await started;
  return {release, response};
}

async function databaseWindow(db: D1Database) {
  const read = async () => (await db.prepare("SELECT CAST(strftime('%s','now') AS INTEGER)/3600 AS hour, CAST(strftime('%s','now') AS INTEGER)/86400 AS day, 3600-CAST(strftime('%s','now') AS INTEGER)%3600 AS remaining").first<{hour: number; day: number; remaining: number}>())!;
  let window = await read();
  // These assertions require all admissions to share one real D1 hour. Do not
  // start a streamed-body batch in its last minute and mistake a valid rollover
  // for a stale-clock reservation. The database clock remains unmodified.
  if (window.remaining <= 60) {
    await delay(window.remaining * 1000);
    window = await read();
  }
  return window;
}

test('security: ascending old streamed-body groups spend only the actual D1 reservation hour', async () => {
  const h = await native();
  const realNow = Date.now;
  try {
    const actual = await databaseWindow(h.f.db);
    const groups: Awaited<ReturnType<typeof heldSignup>>[][] = [];
    for (const offset of [48, 24]) {
      Date.now = () => (actual.hour - offset) * 3_600_000 + 1;
      groups.push(await Promise.all(Array.from({length: 26}, (_, i) => heldSignup(h, `held-${offset}-${i}@example.test`, `192.0.${offset}.${i+1}`))));
    }
    Date.now = realNow;
    const statuses: number[] = [];
    // Release the oldest ingress group first: monotonic windows alone cannot stop this attack.
    for (const group of groups) {
      group.forEach(request => request.release());
      statuses.push(...(await Promise.all(group.map(request => request.response))).map(response => response.status));
    }
    expect(statuses.filter(status => status === 202)).toHaveLength(50);
    expect(statuses.filter(status => status === 429)).toHaveLength(2);
    expect(h.f.outbound).toHaveLength(50);
    expect(await h.f.db.prepare("SELECT window,count FROM oa_limits WHERE key='signup-global'").first()).toEqual({window: actual.hour, count: 50});
    const limits = await h.f.db.prepare('SELECT key,window FROM oa_limits').all<{key: string; window: number}>();
    for (const limit of limits.results) expect(limit.window).toBe(limit.key.startsWith('signup-email:') ? actual.day : actual.hour);
    const evidence = await h.f.db.prepare('SELECT r.id,r.destination_hash,r.created_at,e.occurred_at FROM audience_signup_requests r JOIN consent_evidence e ON e.id=r.id').all<{id: string; destination_hash: string; created_at: number; occurred_at: number}>();
    expect(evidence.results).toHaveLength(50);
    for (const row of evidence.results) {
      expect(Math.floor(row.created_at / 3_600_000)).toBe(actual.hour);
      expect(row.occurred_at).toBe(row.created_at);
      expect(row.id).toBe(`signup_${await sha256(`${row.destination_hash}:${actual.hour}`)}`);
    }
    const fresh = await heldSignup(h, 'fresh-after-held@example.test', '198.51.100.1');
    fresh.release();
    expect((await fresh.response).status).toBe(429);
    expect(h.f.outbound).toHaveLength(50);
  } finally { Date.now = realNow; await h.close(); }
});

test('security: delayed bodies share the actual D1 network hour despite older ingress clocks', async () => {
  const h = await native();
  const realNow = Date.now;
  try {
    const actual = await databaseWindow(h.f.db);
    const groups: Awaited<ReturnType<typeof heldSignup>>[][] = [];
    for (const offset of [2, 1]) {
      Date.now = () => (actual.hour-offset)*3_600_000+1;
      groups.push(await Promise.all(Array.from({length: 3}, (_, i) => heldSignup(h, `network-${offset}-${i}@example.test`, '192.0.2.99'))));
    }
    Date.now = realNow;
    const statuses: number[] = [];
    for (const group of groups) {
      group.forEach(request => request.release());
      statuses.push(...(await Promise.all(group.map(request => request.response))).map(response => response.status));
    }
    expect(statuses.filter(status => status === 202)).toHaveLength(5);
    expect(statuses.filter(status => status === 429)).toHaveLength(1);
    expect(h.f.outbound).toHaveLength(5);
  } finally { Date.now = realNow; await h.close(); }
});


test('security: application clock skew cannot move the durable admission clock or reopen its final slot', async () => {
  const h = await native();
  const realNow = Date.now;
  try {
    const actual = await databaseWindow(h.f.db);
    await h.f.db.prepare('INSERT INTO oa_limits(key,window,count) VALUES(?,?,49)').bind('signup-global', actual.hour).run();
    Date.now = () => (actual.hour + 48) * 3_600_000 + 1;
    const held = await Promise.all([0, 1].map(i => heldSignup(h, `skew-${i}@example.test`, `198.51.100.${i+1}`)));
    held.forEach(request => request.release());
    const responses = await Promise.all(held.map(request => request.response));
    Date.now = realNow;
    expect(responses.filter(response => response.status === 202)).toHaveLength(1);
    expect(responses.filter(response => response.status === 429)).toHaveLength(1);
    expect(h.f.outbound).toHaveLength(1);
    expect(await h.f.db.prepare("SELECT window,count FROM oa_limits WHERE key='signup-global'").first()).toEqual({window: actual.hour, count: 50});
  } finally { Date.now = realNow; await h.close(); }
});
