import {eraseFixture} from './erase';
import {createAppServices} from '../../src/core/app/app';
import {createDatabase} from '../../src/core/platform/db/client';
import {createSignupRoutes, signupDescription} from '../../src/core/features/audience/signup-routes';
import {native} from './native';

export type Native = Awaited<ReturnType<typeof native>>;

/** Pause one real D1 operation immediately before it reaches native D1. */
export function holdDatabase(db: D1Database, matches: (sql: string) => boolean) {
  let release!: () => void, reached!: () => void, held = false;
  const paused = new Promise<void>(resolve => { reached = resolve; });
  const resumed = new Promise<void>(resolve => { release = resolve; });
  const statements = new WeakMap<object, {statement: D1PreparedStatement; sql: string}>();
  async function before(sql: string) {
    if (held || !matches(sql)) return;
    held = true;
    reached();
    await resumed;
  }
  function wrap(statement: D1PreparedStatement, sql: string): D1PreparedStatement {
    const proxy = new Proxy(statement, {get(target, property) {
      if (property === 'bind') return (...values: unknown[]) => wrap(target.bind(...values), sql);
      const value = Reflect.get(target, property);
      if (typeof value !== 'function') return value;
      return async (...args: unknown[]) => { await before(sql); return value.apply(target, args); };
    }});
    statements.set(proxy, {statement, sql});
    return proxy;
  }
  const database = new Proxy(db, {get(target, property) {
    if (property === 'prepare') return (sql: string) => wrap(target.prepare(sql), sql);
    if (property === 'batch') return async (batch: D1PreparedStatement[]) => {
      await before(batch.map(statement => statements.get(statement)?.sql ?? '').join('\n'));
      return target.batch(batch.map(statement => statements.get(statement)?.statement ?? statement));
    };
    const value = Reflect.get(target, property);
    return typeof value === 'function' ? value.bind(target) : value;
  }});
  return {database, paused, release};
}

export function signup(h: Native, db = h.f.db) {
  const platform = {...h.f.platform, database: createDatabase(db)};
  const app = createSignupRoutes(createAppServices(platform).audienceService, platform, db);
  return (email: string) => app.request('https://mango.example.test/subscribe', {
    method: 'POST', headers: {'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.88'},
    body: JSON.stringify({email, displayName: 'Public replacement', consent: true, disclosure: signupDescription(platform).disclosure}),
  });
}

export async function existing(h: Native, email: string) {
  return h.f.services.audienceService.captureConsent({contact: {email, displayName: 'Existing name'}, channel: 'email',
    brandOrLegalSender: 'Mango', messageCategory: 'newsletter', frequencyDisclosure: 'Weekly', destinationJurisdiction: 'AU',
    captureMethod: 'recipient-request', captureSource: 'test-original-request', consentText: 'Please subscribe me.',
    consentVersion: 'v1', occurredAt: new Date(Date.now() - 60_000)});
}

export type Transition = 'hard-bounce' | 'opt-out' | 'confirmation' | 'erasure';
export async function protect(h: Native, prior: Awaited<ReturnType<typeof existing>>, state: Transition) {
  const service = h.f.services.audienceService;
  if (state === 'confirmation') return service.confirmConsent(prior.confirmation!.token);
  if (state === 'hard-bounce') return service.recordBounce({destination: prior.contact.email!, kind: 'hard', occurredAt: new Date(), providerEventId: 'racing-bounce'});
  await service.recordChannelOptOut({contactId: prior.contact.id, channel: 'email', reason: 'recipient-unsubscribe', occurredAt: new Date()});
  if (state === 'erasure') await eraseFixture(h.f,prior.contact.id);
}

export async function audienceSnapshot(db: D1Database) {
  return Promise.all(['contacts', 'contact_email_addresses', 'consent_evidence', 'consent_capture_metadata',
    'contact_history', 'consent_confirmations', 'surviving_opt_outs', 'contact_suppressions']
    .map(table => db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all().then(result => result.results)));
}
