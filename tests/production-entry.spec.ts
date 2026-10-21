import { contract } from './contract';
import { healthLifetime } from './health-lifetime';
import { randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';

import productionWorker from '../src/core/app/worker';
import type { AppBindings } from '../src/core/shared/platform';

function productionBindings(overrides: Partial<AppBindings> = {}): AppBindings {
  const windows = [{days: [0, 1, 2, 3, 4, 5, 6], startMinute: 9 * 60, endMinute: 20 * 60}];
  return {
    ASSETS: { fetch: () => Promise.resolve(new Response('asset fallback must not run')) },
    DB: {} as D1Database,
    ASSETS_BUCKET: {} as R2Bucket,
    MANGO_JOBS: {} as Queue<any>,
    SESSION_SIGNING_KEY: randomBytes(32).toString('hex'),
    INITIAL_OPERATOR_EMAILS: 'operator@example.test',
    CONTACT_HASH_SALT: randomBytes(32).toString('hex'),
    COMMERCE_STORE_URL: 'https://mango-entry.myshopify.com',
    COMMERCE_EXCLUSIVE_SHOP: 'mango-entry.myshopify.com',
    COMMERCE_API_TOKEN: 'commerce-token',
    COMMERCE_WEBHOOK_SECRET: 'commerce-secret',
    AI_PROVIDER_API_KEY: 'ai-key',
    AI_PROVIDER_MODEL: 'gpt-5.4-mini',
    MAIL_PROVIDER: 'resend', MAIL_PROVIDER_API_KEY: 'mail-key',
    MAIL_AUTH_FROM: 'Mango <offers@example.test>',
    MAIL_WEBHOOK_SECRET: 'synthetic-mail-webhook-secret',
    MAIL_WEBHOOK_ID: 'wh_123',
    SMS_PROVIDER_API_KEY: 'username:password',
    SMS_WEBHOOK_SECRET: 'sms-webhook-secret',
    SMS_CONFIRMATION_SENDER: '+61400000000',
    SMS_PROGRAMME_POLICY: JSON.stringify({
      brand: 'Mango', programme: 'Newsletter', category: 'newsletter', frequency: 'Weekly',
      jurisdiction: 'AU', support: 'help@example.test', providerAlreadyReplies: false,
      policySource: 'https://policy.example.test/production-entry-fixture',
      policyVerifiedAt: new Date(Date.now() - 1000).toISOString(),
      policyExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      providerWindows: windows, jurisdictionWindows: windows, recipientWindows: windows,
    }),
    MANGO_PUBLIC_BASE_URL: 'https://operator.example.test',
    MANGO_APP_VERSION: 'test',
    MANGO_ALLOWED_LINK_HOSTS: 'shop.example.test',
    MANGO_TEST_EMAIL_ALLOWLIST: 'operator@example.test',
    MANGO_TEST_SMS_ALLOWLIST: '+61400000000',
    MANGO_RECONCILIATION_INTERVAL_MINUTES: '15',
    MANGO_UNRESOLVED_OUTCOME_HOURS: '48',
    MANGO_EMAIL_HANDOFFS_PER_MINUTE: '10',
    MANGO_SMS_HANDOFFS_PER_MINUTE: '5',
    MANGO_DELIVERABILITY_WINDOW_DAYS: '30',
    MAIL_SENDER_NAME: 'Mango',
    MAIL_REPLY_TO: 'help@example.test',
    MAIL_PHYSICAL_ADDRESS: '1 Example Street, Brisbane QLD 4000',
    ...overrides,
  };
}

test('production Worker entry rejects local bootstrap despite a spoofed Host and binding', async () => {
  const response = await productionWorker.fetch(
    new Request('https://operator.example.test/api/_local/bootstrap', {
      method: 'POST',
      headers: {
        Host: 'localhost',
        'X-Mango-Local-Bootstrap-Token': randomBytes(32).toString('hex'),
      },
    }),
    productionBindings(),
    {} as ExecutionContext,
  );

  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toEqual({ error: 'not_found' });
});

test('production Worker names a missing required configuration binding', async () => {
  await expect(productionWorker.fetch(
    new Request('https://operator.example.test/health'),
    productionBindings({ MAIL_AUTH_FROM: '' }),
    {} as ExecutionContext,
  )).rejects.toThrow('MAIL_AUTH_FROM is required.');
});

// The production entry never routes outbox requests, including spoofed loopback hosts.
for (const host of ['operator.example.test', 'localhost']) contract('OPER-001', `production outbox stays unavailable for ${host}`, async () => {
  const response = await productionWorker.fetch(new Request('https://operator.example.test/__dev/outbox', {headers:{Host:host}}), productionBindings({ MANGO_APP_VERSION: 'local' }), {} as ExecutionContext);
  expect(response.status).toBe(404);
  expect(await response.text()).not.toContain('Development outbox');
});

contract('BASE-OPS-001', 'health distinguishes slow Queue acceptance from failed dependencies and bounds probe traffic', async () => {
  test.setTimeout(60_000); // Several sequential real deadlines live inside this one contract case.
  const delay = (ms:number) => new Promise(resolve => setTimeout(resolve,ms));
  const rejected = () => Promise.reject(new Error('private provider error must not escape'));
  const healthy = (queue:Partial<Queue<any>>, database:()=>Promise<unknown> = async()=>({success:true}), storage:()=>Promise<unknown> = async()=>null) =>
    productionBindings({DB:{prepare:()=>({bind(){return this;},run:database})} as unknown as D1Database,
      ASSETS_BUCKET:{head:storage} as unknown as R2Bucket,MANGO_JOBS:queue as Queue<any>});
  const read = (env:AppBindings) => productionWorker.fetch(new Request('https://operator.example.test/health'),env,{waitUntil: () => {}} as unknown as ExecutionContext);
  await healthLifetime(healthy, read);
  for (const ms of [850,1100,1400]) {
    let sends=0;
    const env=healthy({send:async()=>{sends++;await delay(ms);}});
    for(let i=0;i<(ms===1100?12:1);i++) {
      const response=await read(env);
      expect(response.status).toBe(200);
      const body=await response.json() as any;
      expect(body).toMatchObject({ok:true,status:'ok',queue:{slow:true,cached:i>0}});
      expect(body.queue.ms).toBeGreaterThanOrEqual(ms-50);
      expect(body).not.toHaveProperty('failures');
    }
    expect(sends).toBe(1);
  }
  let sends=0;
  const shared=healthy({send:async()=>{sends++;await delay(1100);}});
  const concurrent=await Promise.all(Array.from({length:12},()=>read(shared)));
  expect(concurrent.map(response=>response.status)).toEqual(Array(12).fill(200));
  expect(sends).toBe(1);
  for(const [dependency,env] of [
    ['queue',healthy({send:rejected})],
    ['database',healthy({send:async()=>{}},rejected)],
    ['storage',healthy({send:async()=>{}},undefined,rejected)],
    ['queue',healthy({send:()=>new Promise(()=>{})})],
    ['database',healthy({send:async()=>{}},()=>new Promise(()=>{}))],
    ['storage',healthy({send:async()=>{}},undefined,()=>new Promise(()=>{}))],
  ] as const) {
    const started=Date.now(),response=await read(env);
    expect(response.status).toBe(503);
    const body=await response.json() as any;
    expect(body).toMatchObject({ok:false,status:'unavailable',failures:[{dependency,code:expect.stringMatching(/^(unreachable|timeout)$/)}]});
    expect(JSON.stringify(body)).not.toContain('private provider');
    expect(Date.now()-started).toBeLessThan(2000);
  }
});
