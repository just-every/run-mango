import { expect, test } from '@playwright/test';

import { createMobileMessageAdapter } from '../src/core/platform/adapters/mobile-message';
import { createResendAdapter } from '../src/core/platform/adapters/resend';
import { decodeProviderReference,encodeProviderReference } from '../src/core/shared/provider-reference';
import { ProviderTransportError, type DeliveryRequest } from '../src/core/shared/platform';

const request: DeliveryRequest = {
  recipientStepId: 'recipient-step-01',
  idempotencyKey: 'handoff:recipient-step-01',
  handoffStartedAt: new Date('2026-09-08T00:00:00.000Z'),
  to: 'recipient@example.test',
  sender: 'Mango <offers@example.test>',
  content: {
    subject: 'Approved subject',
    html: '<p>Approved HTML</p>',
    text: 'Approved text',
    from: { name: 'Mango', email: 'offers@example.test' },
    replyTo: 'help@example.test',
    headers: {
      'List-Unsubscribe': '<https://mango.example.test/unsubscribe/token>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  },
  callbackUrl: 'https://mango.example.test/webhooks/mail/resend',
};

test('Resend forwards the exact approved mail metadata and opaque tag-safe references', async () => {
  const previousFetch = globalThis.fetch;
  let sentBody: Record<string, unknown> | undefined;
  globalThis.fetch = (async (_input, init) => {
    sentBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ id: 'email_123' }), { status: 200 });
  }) as typeof fetch;
  try {
    const handoff = await createResendAdapter({ apiKey: 'key', webhookSecret: 'secret', webhookId: 'wh_123' }).send(request);
    expect(handoff).toMatchObject({ providerMessageId: 'email_123', disposition: 'accepted' });
    expect(sentBody).toMatchObject({
      from: 'Mango <offers@example.test>',
      reply_to: 'help@example.test',
      headers: request.content.headers,
    });
    const tags = sentBody?.tags as Array<{ name: string; value: string }>;
    expect(tags.every((tag) => /^[a-zA-Z0-9_-]+$/.test(tag.value))).toBe(true);
    expect(decodeProviderReference(tags.find((tag) => tag.name === 'mango_recipient_step')!.value)).toBe(request.recipientStepId);
    expect(decodeProviderReference(tags.find((tag) => tag.name === 'mango_handoff_key')!.value)).toBe(request.idempotencyKey);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('Resend reconciliation preserves documented immutable delivery facts and refuses a definitive rejection as unknown', async () => {
  const previousFetch = globalThis.fetch;
  const encodedRecipient = 'm1_cmVjaXBpZW50LXN0ZXAtMDE';
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (init?.method === 'POST') return new Response('invalid sender', { status: 422 });
    if (url.includes('/emails?')) {
      return new Response(JSON.stringify({ data: [{ id: 'email_123' }], has_more: false }), { status: 200 });
    }
    if (url.includes('/webhooks/wh_123/events?')) {
      return new Response(JSON.stringify({ data: [{ id: 'event_123' }], has_more: false }), { status: 200 });
    }
    if (url.includes('/webhooks/wh_123/events/event_123')) {
      return new Response(JSON.stringify({
        id: 'event_123',
        status:'failed',
        payload:{type: 'email.delivered',
        created_at: '2026-09-08T01:00:00.000Z',
        data: { email_id: 'email_123' }},
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      id: 'email_123',
      from:'Mango <offers@example.test>',to:[request.to],subject:request.content.subject,text:request.content.text,html:request.content.html,
      tags: [{ name: 'mango_recipient_step', value: encodedRecipient },{name:'mango_handoff_key',value:encodeProviderReference(request.idempotencyKey)}],
      created_at: '2026-09-08T00:00:00.000Z',
      last_event: 'delivered',
    }), { status: 200 });
  }) as typeof fetch;
  try {
    const adapter = createResendAdapter({ apiKey: 'key', webhookSecret: 'secret', webhookId: 'wh_123' });
    await expect(adapter.send(request)).rejects.toMatchObject({
      name: 'ProviderTransportError',
      failure: { outcome: 'known-not-accepted', permanent: true, code: 'resend_http_422' },
    } satisfies Partial<ProviderTransportError>);
    const accepted = await adapter.reconcile(request, {});
    expect(accepted).toMatchObject({
      exhausted: true,
      facts: [expect.objectContaining({ providerMessageId: 'email_123', kind: 'accepted' })],
    });
    const reconciliation = await adapter.reconcile(request, { providerMessageId: 'email_123' });
    expect(reconciliation).toMatchObject({
      exhausted: true,
      facts: [expect.objectContaining({ providerMessageId: 'email_123', kind: 'delivered' })],
    });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('Mobile Message preserves Mango controls and uses an encoded exact reconciliation key', async () => {
  const previousFetch = globalThis.fetch;
  let sendBody: Record<string, unknown> | undefined;
  globalThis.fetch = (async (_input, init) => {
    sendBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      status:'complete',
      ignore_unsubscribes: false,
      shorten_urls: false,
      results: [{ status: 'success', message_id: 'sms_123',to:'61400000000',sender:'+61400000000',custom_ref:encodeProviderReference(request.idempotencyKey) }],
    }), { status: 200 });
  }) as typeof fetch;
  try {
    const adapter = createMobileMessageAdapter({ credentials: 'user:pass', webhookSecret: 'secret' });
    await adapter.send({ ...request, to: '+61400000000', sender: '+61400000000', content: { text: 'Reply STOP to unsubscribe.' } });
    const message = (sendBody?.messages as Array<Record<string, unknown>>)[0];
    expect(sendBody).toMatchObject({ enable_unicode: true, ignore_unsubscribes: false, shorten_urls: false });
    expect(decodeProviderReference(String(message.custom_ref))).toBe(request.idempotencyKey);
    const delivery={...request,to:'+61400000000',sender:'+61400000000',content:{text:'Reply STOP to unsubscribe.'}};
    globalThis.fetch=async()=>Response.json({status:'complete',ignore_unsubscribes:false,shorten_urls:false,
      results:[{status:'blocked',to:'61499999999',sender:delivery.sender,custom_ref:encodeProviderReference(delivery.idempotencyKey)}]});
    await expect(adapter.send(delivery)).rejects.not.toBeInstanceOf(ProviderTransportError);
    globalThis.fetch=async()=>Response.json({status:'complete',ignore_unsubscribes:false,shorten_urls:false,
      results:[{status:'blocked',to:'61400000000',sender:delivery.sender,custom_ref:encodeProviderReference(delivery.idempotencyKey)}]});
    await expect(adapter.send(delivery)).rejects.toMatchObject({failure:{outcome:'known-not-accepted',restriction:'suppressed'}});
    const retryAt=new Date(Date.now()+120000);
    globalThis.fetch=async()=>new Response('{}',{status:429,headers:{'Retry-After':retryAt.toUTCString()}});
    try {await adapter.send(delivery);throw new Error('Expected a definite refusal');}
    catch(error) {expect(error).toBeInstanceOf(ProviderTransportError);expect((error as ProviderTransportError).failure.retryAfterSeconds).toBeGreaterThan(110);}
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('SEND-009 authenticated probes bound headers and body, reject invalid evidence, and never send a recipient canary',async()=>{
  const {boundedJson}=await import('../src/core/platform/adapters/bounded-read');
  const saved=globalThis.fetch;const calls:string[]=[];
  try {
    globalThis.fetch=async(input,init)=>{calls.push(String(input));expect(init?.method??'GET').toBe('GET');return Response.json({object:'usage',emails:{daily:{used:1,limit:null,sent:1,received:0,resets_at:new Date().toISOString()},monthly:{used:1,limit:3000,sent:1,received:0,resets_at:new Date().toISOString()}}});};
    const adapter=createResendAdapter({apiKey:'test',webhookSecret:'test',webhookId:'test'});
    expect(await adapter.probeHealth!()).toMatchObject({reachable:true});
    expect(calls).toEqual(['https://api.resend.com/usage']);
    globalThis.fetch=async()=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));}}));
    await expect(boundedJson('https://api.resend.com/usage',{}, {deadlineMs:10})).rejects.toThrow('provider-read-deadline');
    globalThis.fetch=async()=>new Promise(()=>{});
    await expect(boundedJson('https://api.resend.com/usage',{}, {signal:AbortSignal.abort(),deadlineMs:10})).rejects.toThrow('provider-read-deadline');
    globalThis.fetch=async()=>Response.json({object:'usage',emails:{}});
    expect(await adapter.probeHealth!()).toMatchObject({reachable:false});
  }finally{globalThis.fetch=saved;}
});

test('SEND-001/008 ambiguous non-SendGrid responses remain unknown and lookup retention requires separate account evidence',async()=>{
  const saved=globalThis.fetch;
  try {
    for(const adapter of [createResendAdapter({apiKey:'test',webhookSecret:'test',webhookId:'test'}),createMobileMessageAdapter({credentials:'user:pass',webhookSecret:'test'})]) {
      expect(await adapter.capabilities()).toMatchObject({effectiveDeduplication:true,effectiveReconciliation:false,reconciliationWindowMs:0});
      const payload=adapter.channel==='sms'?{...request,to:'+61400000000',sender:'61400000000'}:request;
      for(const status of [408,500,502]) {
        globalThis.fetch=async()=>new Response('{}',{status});
        await expect(adapter.send(payload)).rejects.not.toBeInstanceOf(ProviderTransportError);
      }
      globalThis.fetch=async()=>Response.json({});
      await expect(adapter.send(payload)).rejects.not.toBeInstanceOf(ProviderTransportError);
    }
  }finally{globalThis.fetch=saved;}
});
