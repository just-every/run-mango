import { unavailableInspection, type SenderVerification } from '@/core/features/sender-verification/service';
import {
  ProviderTransportError,
  type DeliveryRequest,
  type ProviderFact,
  type SenderAdapter,
  type SenderCapabilities,
  type VerifiedWebhook,
} from '@/core/shared/platform';
import { parseVerifiedWebhook } from '@/core/features/lifecycle/webhook-facts';
import { encodeProviderReference } from '@/core/shared/provider-reference';

import { hmacSha256Base64Key, sha256, timingSafeEqual } from '@/core/platform/crypto';

import { asRecord, responseJson, stringValue } from './http';

const resendBaseUrl = 'https://api.resend.com';
const idempotencyWindowMs = 24 * 60 * 60 * 1000;

type ResendEmail = {
  id: string;
  created_at?: string;
  last_event?: string;
};

function emailEventToFact(event: string): ProviderFact['kind'] | undefined {
  if (event === 'sent' || event === 'queued') return 'accepted';
  if (event === 'delivered') return 'delivered';
  if (event === 'bounced') return 'bounced';
  if (event === 'complained') return 'complained';
  if (event === 'failed') return 'failed';
  if (event === 'suppressed') return 'suppressed';
  return undefined;
}

function resendHeaders(apiKey: string, extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  headers.set('Authorization', `Bearer ${apiKey}`);
  return headers;
}

async function sendEmail(apiKey: string, request: DeliveryRequest): Promise<ResendEmail> {
  const response = await fetch(`${resendBaseUrl}/emails`, {
    method: 'POST',
    headers: resendHeaders(apiKey, {
      'Content-Type': 'application/json',
      'Idempotency-Key': request.idempotencyKey,
    }),
    body: JSON.stringify({
      from: request.content.from ? `${request.content.from.name} <${request.content.from.email}>` : request.sender,
      to: [request.to],
      subject: request.content.subject,
      html: request.content.html,
      text: request.content.text,
      reply_to: request.content.replyTo,
      headers: request.content.headers,
      tags: [
        { name: 'mango_recipient_step', value: encodeProviderReference(request.recipientStepId) },
        { name: 'mango_handoff_key', value: encodeProviderReference(request.idempotencyKey) },
      ],
    }),
  });
  if (!response.ok) {
    await response.text();
    throw new ProviderTransportError({
      outcome: 'known-not-accepted',
      permanent: response.status >= 400 && response.status < 500 && ![408, 409, 425, 429].includes(response.status),
      code: `resend_http_${response.status}`,
      detail: `Resend rejected the delivery request with HTTP ${response.status}.`,
    });
  }
  const data = asRecord(await responseJson(response), 'Resend returned an invalid send response.');
  return { id: stringValue(data.id, 'Resend did not return an email identifier.') };
}

function tagsContainRecipientStep(email: Record<string, unknown>, recipientStepId: string): boolean {
  if (email.tags && typeof email.tags === 'object' && !Array.isArray(email.tags)) {
    return (email.tags as Record<string, unknown>).mango_recipient_step === encodeProviderReference(recipientStepId);
  }
  const tags = Array.isArray(email.tags) ? email.tags : [];
  return tags.some((tag) => {
    if (!tag || typeof tag !== 'object' || Array.isArray(tag)) return false;
    const value = tag as Record<string, unknown>;
    return value.name === 'mango_recipient_step' && value.value === encodeProviderReference(recipientStepId);
  });
}

async function retrieveEmail(apiKey: string, id: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${resendBaseUrl}/emails/${encodeURIComponent(id)}`, {
    headers: resendHeaders(apiKey),
  });
  return asRecord(await responseJson(response), 'Resend returned an invalid sent-email record.');
}

async function acceptedFactFromEmail(email: Record<string, unknown>): Promise<ProviderFact> {
  const id = stringValue(email.id, 'Resend sent-email record has no identifier.');
  const timestamp = stringValue(email.created_at, 'Resend sent-email record has no created_at timestamp.');
  const occurredAt = new Date(timestamp);
  if (Number.isNaN(occurredAt.valueOf())) throw new Error('Resend sent-email record has an invalid created_at timestamp.');
  const payloadDigest = await sha256(JSON.stringify(email));
  return {
    identity: `resend:${id}:accepted:${payloadDigest}`,
    providerMessageId: id,
    kind: 'accepted',
    occurredAt,
    payloadDigest,
    detail: { event: 'accepted' },
  };
}

async function retrieveWebhookEvent(apiKey: string, webhookId: string, eventId: string): Promise<Record<string, unknown>> {
  const response = await fetch(
    `${resendBaseUrl}/webhooks/${encodeURIComponent(webhookId)}/events/${encodeURIComponent(eventId)}`,
    { headers: resendHeaders(apiKey) },
  );
  return asRecord(await responseJson(response), 'Resend returned an invalid webhook event.');
}

async function reconcileWebhookEvents(apiKey: string, webhookId: string, providerMessageId: string, cursor?: string) {
  const query = new URLSearchParams({ limit: '100' });
  if (cursor) query.set('after', cursor);
  const response = await fetch(
    `${resendBaseUrl}/webhooks/${encodeURIComponent(webhookId)}/events?${query}`,
    { headers: resendHeaders(apiKey) },
  );
  const page = asRecord(await responseJson(response), 'Resend returned an invalid webhook-event page.');
  const rows = Array.isArray(page.data)
    ? page.data.map((row) => asRecord(row, 'Resend webhook-event page contains an invalid event.'))
    : [];
  const facts: ProviderFact[] = [];
  for (const row of rows) {
    const eventId = stringValue(row.id, 'Resend webhook-event page event has no identifier.');
    const event = await retrieveWebhookEvent(apiKey, webhookId, eventId);
    const data = asRecord(event.data, 'Resend webhook event has no data object.');
    const emailId = typeof data.email_id === 'string' ? data.email_id : data.id;
    if (emailId !== providerMessageId) continue;
    const type = stringValue(event.type, 'Resend webhook event has no type.');
    const kind = emailEventToFact(type.replace(/^email\./, ''));
    if (!kind) continue;
    const occurredAt = new Date(stringValue(event.created_at, 'Resend webhook event has no created_at timestamp.'));
    if (Number.isNaN(occurredAt.valueOf())) throw new Error('Resend webhook event has an invalid created_at timestamp.');
    facts.push(...await parseVerifiedWebhook('email', {
      providerEventId: `resend-webhook:${webhookId}:${eventId}`,
      rawBody: JSON.stringify(event),
      receivedAt: occurredAt,
    }));
  }
  if (page.has_more === true) {
    const finalRow = rows.at(-1);
    if (!finalRow) throw new Error('Resend reported another webhook-event page without a cursor event.');
    return { facts, cursor: stringValue(finalRow.id, 'Resend webhook-event cursor is missing.'), exhausted: false };
  }
  return { facts, exhausted: true };
}

async function reconcileUnknownEmail(apiKey: string, request: DeliveryRequest, cursor?: string) {
  const query = new URLSearchParams({ limit: '100' });
  if (cursor) query.set('after', cursor);
  const response = await fetch(`${resendBaseUrl}/emails?${query}`, { headers: resendHeaders(apiKey) });
  const page = asRecord(await responseJson(response), 'Resend returned an invalid sent-email page.');
  const rows = Array.isArray(page.data)
    ? page.data.map((row) => asRecord(row, 'Resend sent-email page contains an invalid record.'))
    : [];
  for (const row of rows) {
    const id = stringValue(row.id, 'Resend sent-email page record has no identifier.');
    const email = await retrieveEmail(apiKey, id);
    if (tagsContainRecipientStep(email, request.recipientStepId)) {
      return { facts: [await acceptedFactFromEmail(email)], exhausted: true };
    }
  }
  if (page.has_more === true) {
    const finalRow = rows.at(-1);
    if (!finalRow) throw new Error('Resend reported another sent-email page without a cursor record.');
    return { facts: [], cursor: stringValue(finalRow.id, 'Resend sent-email page cursor is missing.'), exhausted: false };
  }
  return { facts: [], exhausted: true };
}

export function createResendAdapter(options: {
  apiKey: string;
  webhookSecret: string;
  webhookId: string;
  verification?: SenderVerification;
}): SenderAdapter {
  return {
    channel: 'email',

    async capabilities(): Promise<SenderCapabilities> {
      return {
        configured: true,
        provider: 'resend',
        canSendMarketing: true,
        effectiveDeduplication: true,
        effectiveReconciliation: true,
        deduplicationWindowMs: idempotencyWindowMs,
        reconciliationWindowMs: idempotencyWindowMs,
        detail: 'Resend retains POST /emails idempotency keys for 24 hours. Mango recovers a lost response by paging sent-email identifiers and retrieving each candidate to match the persisted opaque recipient-step tag; this scan is resumable and never re-sends.',
      };
    },

    async inspectSender(sender) {
      return options.verification ? options.verification.inspect(sender) : unavailableInspection('verification-not-configured');
    },

    async validateSender(sender, jurisdiction) {
      if (jurisdiction !== 'email') return { ready: false, detail: 'Resend only validates email senders.' };
      const inspection = options.verification ? await options.verification.inspect(sender) : unavailableInspection('verification-not-configured');
      return { ready: inspection.ready, detail: inspection.reason };
    },

    async send(request) {
      const sent = await sendEmail(options.apiKey, request);
      return { providerMessageId: sent.id, disposition: 'accepted', providerAcceptedAt: new Date() };
    },

    async reconcile(request, { providerMessageId, cursor }) {
      if (!providerMessageId) return reconcileUnknownEmail(options.apiKey, request, cursor);
      return reconcileWebhookEvents(options.apiKey, options.webhookId, providerMessageId, cursor);
    },

    async verifyWebhook(request): Promise<VerifiedWebhook> {
      const id = request.headers.get('svix-id');
      const timestamp = request.headers.get('svix-timestamp');
      const signature = request.headers.get('svix-signature');
      if (!id || !timestamp || !signature) throw new Error('Resend webhook signature headers are missing.');
      const timestampMs = Number(timestamp) * 1000;
      if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
        throw new Error('Resend webhook timestamp is outside the five-minute acceptance window.');
      }
      const rawBody = await request.text();
      const secret = options.webhookSecret.startsWith('whsec_') ? options.webhookSecret.slice('whsec_'.length) : options.webhookSecret;
      const expected = await hmacSha256Base64Key(secret, `${id}.${timestamp}.${rawBody}`);
      const signatures = signature.split(' ').filter((part) => part.startsWith('v1,')).map((part) => part.slice(3));
      if (!signatures.some((candidate) => timingSafeEqual(candidate, expected))) throw new Error('Resend webhook signature is invalid.');
      return { providerEventId: id, rawBody, receivedAt: new Date(timestampMs) };
    },
  };
}
