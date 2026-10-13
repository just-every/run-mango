import { expect, test } from '@playwright/test';

import { createSettingsService } from '../../src/core/features/settings/service';
import { createSettingsRoutes } from '../../src/core/features/settings/routes';
import { fixture } from '../sender-verification/fixture';
import { createResendAdapter } from '../../src/core/platform/adapters/resend';
import type { Platform, SenderAdapter } from '../../src/core/shared/platform';

const identity = { displayName: 'Test newsletter', fromEmail: 'news@example.test', replyToEmail: 'reply@example.test', physicalAddress: '1 Test Street' };
const privateValue = 'private-test-sentinel-never-return';
function platform(mailer: SenderAdapter): Pick<Platform, 'config' | 'mailer'> {
  return {
    config: {
      mailSender: { ...identity, extraCredential: privateValue },
      mail: { apiKey: privateValue }, sessionSigningKey: privateValue,
      modules: { ai: { config: { apiKey: privateValue } } },
    } as unknown as Platform['config'],
    mailer,
  };
}
function adapter(ready: boolean, configured = true): SenderAdapter {
  return {
    async inspectSender(sender) {
      expect(sender).toBe(`${identity.displayName} <${identity.fromEmail}>`);
      const now=Date.now(), evidence={state:ready?'passed':'failed',reason:'fixture-observation',observedAt:now,expiresAt:now+300000};
      return {ready,checkedAt:now,expiresAt:now+300000,reason:'fixture-observation',provider:evidence,dns:evidence,observation:evidence,
        lease:ready?{id:'test-lease'}:undefined,credential:privateValue};
    },
    async capabilities() { return { configured, canSendMarketing: true, extraCredential: privateValue }; },
  } as unknown as SenderAdapter;
}

test('sender status returns only allowlisted identity and observed fields with no credentials', async () => {
  const response = await createSettingsRoutes(createSettingsService(platform(adapter(true)))).request('/settings/sender');
  expect(response.headers.get('cache-control')).toBe('no-store');
  const body = await response.json();
  expect(body).toEqual({identity,validation:{state:'ready',ready:true,detail:'Fresh receiver evidence reports SPF, DKIM, DMARC and From alignment passing.',checkedAt:expect.any(String)},
    evidence:Object.fromEntries(['provider','dns','observation'].map(name=>[name,{state:'passed',reason:'Current evidence meets this check.',observedAt:expect.any(String),expiresAt:expect.any(String)}])),
    readiness:expect.arrayContaining([expect.objectContaining({key:'receipt',state:'observed'}),expect.objectContaining({key:'jurisdiction',state:'owner'})])});
  expect(Number.isNaN(Date.parse(body.validation.checkedAt))).toBe(false);
  expect(JSON.stringify(body)).not.toContain(privateValue);
});

test('sender capability never turns negative live evidence into readiness', async () => {
  const body = await createSettingsService(platform(adapter(false))).senderStatus();
  expect(body.validation).toMatchObject({ state: 'blocked', ready: false });
});

test('unconfigured sender remains unavailable after the actual capability call', async () => {
  let called = false;
  const sender = adapter(false, false);
  sender.capabilities = async () => { called = true; return { configured:false } as any; };
  const body = await createSettingsService(platform(sender)).senderStatus();
  expect(called).toBe(true);
  expect(body.validation).toMatchObject({ state: 'unavailable', ready: false, detail: 'The mail provider is unavailable.' });
});

test('a failed provider response cannot leak raw error details or credentials', async () => {
  const sender = adapter(false);
  sender.inspectSender = async () => { throw new Error(`Provider response with ${privateValue}`); };
  const body = await createSettingsService(platform(sender)).senderStatus();
  expect(body.validation).toMatchObject({ state: 'error', ready: false });
  expect(body.validation.detail).toContain('Check the mail provider configuration');
  expect(JSON.stringify(body)).not.toContain(privateValue);
});

for (const scenario of [
  {name:'missing domain',domain:undefined,reason:'domain-missing'},
  {name:'unverified domain',domain:{status:'pending'},reason:'domain-unverified'},
  {name:'disabled sending',domain:{status:'verified',capabilities:{sending:'disabled'}},reason:'domain-sending-disabled'},
  {name:'verified domain without DMARC evidence',domain:{status:'verified',capabilities:{sending:'enabled'}},reason:'domain-records-missing'},
]) {
  test(`real Resend adapter preserves ${scenario.name} blocking evidence`,async()=>{
    const f=await fixture(false);const original=globalThis.fetch;const calls:string[]=[];
    globalThis.fetch=async input=>{calls.push(String(input));const domain=scenario.domain?{id:'domain-1',name:'example.test',region:'global',...scenario.domain}:undefined;
      return Response.json(new URL(String(input)).pathname==='/domains'?{data:domain?[domain]:[],has_more:false}:{...domain,records:[]});};
    try {
      const sender=f.originalProduction().mailer;
      const inspection=await sender.inspectSender!('Mango <offers@example.test>');
      expect(inspection.ready).toBe(false);expect(inspection.reason).toBe(scenario.reason);
      expect(calls[0]).toBe('https://api.resend.com/domains?limit=100');
      const body=await createSettingsService({...f.platform,mailer:sender}).senderStatus();
      expect(body.validation.state).toBe('blocked');expect(body.validation.ready).toBe(false);
      expect(body.evidence?.provider.state).not.toBe('passed');
      expect(JSON.stringify(body)).not.toContain(privateValue);
    } finally {globalThis.fetch=original;await f.dispose();}
  });
}
test('real Resend adapter HTTP failure is redacted at the settings boundary',async()=>{
  const f=await fixture(false);const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(privateValue,{status:503});
  try {const sender=f.originalProduction().mailer;
    expect(await sender.inspectSender!('Mango <offers@example.test>')).toMatchObject({ready:false,provider:{state:'unknown'}});
    const body=await createSettingsService({...f.platform,mailer:sender}).senderStatus();
    expect(body.validation.state).toBe('error');expect(body.validation.ready).toBe(false);
    expect(body.evidence?.provider.state).toBe('unknown');expect(JSON.stringify(body)).not.toContain(privateValue);
  } finally {globalThis.fetch=original;await f.dispose();}
});
