import { expect, test } from '@playwright/test';
import { parseVerifiedWebhook } from '../src/core/features/lifecycle/webhook-facts';
import { createResendAdapter } from '../src/core/platform/adapters/resend';
import { encodeProviderReference } from '../src/core/shared/provider-reference';
import type { DeliveryRequest } from '../src/core/shared/platform';

const createdAt = '2026-09-08T00:00:00.000Z';
const eventAt = '2026-09-08T02:00:00.000Z';
const receivedAt = new Date('2026-09-08T04:00:00.000Z');
const request: DeliveryRequest = {
  recipientStepId: 'step-one', idempotencyKey: 'handoff:step-one',
  handoffStartedAt: new Date(createdAt), to: 'person@example.test',
  sender: 'offers@example.test', content: { text: 'Approved copy' },
  callbackUrl: 'https://mango.example.test/webhooks/mail/resend',
};
function payload(type: string, data: Record<string, unknown> = {}) {
  return { type: `email.${type}`, created_at: eventAt, data: { email_id: 'mail-one', created_at: createdAt, ...data } };
}
async function normalize(body: unknown, id: string | undefined = 'event-one') {
  return parseVerifiedWebhook('email', { rawBody: JSON.stringify(body), providerEventId: id, receivedAt });
}

test('[SEND-005] Resend facts use envelope event time and retain stable replay identity', async () => {
  const body = payload('delivered');
  const [fact] = await normalize(body, undefined);
  expect(fact.occurredAt.toISOString()).toBe(eventAt);
  expect(fact.kind).toBe('delivered');
  expect(await normalize(body, undefined)).toEqual([fact]);
  const [complaint] = await normalize({ ...payload('complained'), created_at: '2026-09-08T03:00:00.000Z' });
  expect(complaint.occurredAt.getTime()).toBeGreaterThan(fact.occurredAt.getTime());
});

test('[CONT-006] Resend nested Permanent bounces are hard; Transient bounces remain soft', async () => {
  for (const [type, hard] of [['Permanent', true], ['Transient', false], ['Undetermined', false]] as const) {
    const [fact] = await normalize(payload('bounced', { bounce: { type, subType: 'General', message: 'Provider diagnostic' } }));
    expect(fact).toMatchObject({ kind: 'bounced', detail: { hard, bounceType: type.toLowerCase() } });
  }
  expect((await normalize(payload('bounced', { bounce_type: 'hard' })))[0].detail.hard).toBe(true);
});

test('[SEND-005] Resend record and array tags recover the opaque handoff reference', async () => {
  for (const tags of [
    { mango_handoff_key: encodeProviderReference(request.idempotencyKey) },
    [{ name: 'mango_handoff_key', value: encodeProviderReference(request.idempotencyKey) }],
    { mango_recipient_step: encodeProviderReference(request.recipientStepId) },
  ]) {
    const [fact] = await normalize(payload('delivered', { tags }));
    expect(fact.detail.mangoReference).toBe(Array.isArray(tags) || 'mango_handoff_key' in tags ? request.idempotencyKey : request.recipientStepId);
  }
});

test('[CONT-006][SEND-006] Resend suppression is an independent suppression fact, never delivery or bounce', async () => {
  const [fact] = await normalize(payload('suppressed', { suppressed: { type: 'OnAccountSuppressionList' } }));
  expect(fact).toMatchObject({ kind: 'suppressed', providerMessageId: 'mail-one', detail: { hard: false, providerEvent: 'suppressed' } });
  await expect(normalize(payload('opened'))).rejects.toThrow('not a supported delivery fact');
});

test('[SEND-005] Resend reconciliation retains the same hard-bounce and suppression normalization as signed facts', async () => {
  const previousFetch = globalThis.fetch;
  const events = [payload('bounced', { bounce: { type: 'Permanent' }, tags: { mango_handoff_key: encodeProviderReference(request.idempotencyKey) } }), payload('suppressed')];
  globalThis.fetch = (async (input) => {
    const url = String(input);
    const body = url.includes('/events?') ? { data: [{ id: 'bounce-event' }, { id: 'suppression-event' }], has_more: false }
      : events[url.endsWith('/bounce-event') ? 0 : 1];
    return new Response(JSON.stringify(body));
  }) as typeof fetch;
  try {
    const result = await createResendAdapter({ apiKey: 'fixture', webhookSecret: 'fixture', webhookId: 'hook-one' }).reconcile(request, { providerMessageId: 'mail-one' });
    expect(result.exhausted).toBe(true);
    expect(result.facts).toMatchObject([
      { identity: 'resend-webhook:hook-one:bounce-event', kind: 'bounced', detail: { hard: true, mangoReference: request.idempotencyKey } },
      { identity: 'resend-webhook:hook-one:suppression-event', kind: 'suppressed' },
    ]);
    expect(result.facts.map(fact => fact.occurredAt.toISOString())).toEqual([eventAt, eventAt]);
  } finally { globalThis.fetch = previousFetch; }
});

test('[SEND-005] lost-response reconciliation accepts record-shaped recipient-step tags without resending', async () => {
  const previousFetch = globalThis.fetch;
  const methods: string[] = [];
  globalThis.fetch = (async (input, init) => {
    methods.push(init?.method ?? 'GET');
    return new Response(JSON.stringify(String(input).includes('/emails?')
      ? { data: [{ id: 'mail-one' }], has_more: false }
      : { id: 'mail-one', created_at: createdAt, tags: { mango_recipient_step: encodeProviderReference(request.recipientStepId) } }));
  }) as typeof fetch;
  try {
    const result = await createResendAdapter({ apiKey: 'fixture', webhookSecret: 'fixture', webhookId: 'hook-one' }).reconcile(request, {});
    expect(result).toMatchObject({ exhausted: true, facts: [{ providerMessageId: 'mail-one', kind: 'accepted' }] });
    expect(methods).toEqual(['GET', 'GET']);
  } finally { globalThis.fetch = previousFetch; }
});

test('[SEND-005] malformed explicit event timestamps fail instead of fabricating receipt-time ordering', async () => {
  await expect(normalize({ ...payload('delivered'), created_at: 'invalid' })).rejects.toThrow('invalid created_at');
  expect((await normalize(payload('queued')))[0].kind).toBe('accepted');
});
