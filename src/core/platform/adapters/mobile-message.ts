import {
  ProviderTransportError,
  type DeliveryRequest,
  type ProviderFact,
  type SenderAdapter,
  type SenderCapabilities,
  type VerifiedWebhook,
} from '@/core/shared/platform';
import { encodeProviderReference } from '@/core/shared/provider-reference';

import { hmacSha256Hex, sha256, timingSafeEqual } from '@/core/platform/crypto';

import { asRecord, responseJson, stringValue } from './http';

const baseUrl = 'https://api.mobilemessage.com.au/v1';
const idempotencyWindowMs = 24 * 60 * 60 * 1000;

type MobileMessage = Record<string, unknown>;

function authorization(credentials: string): string {
  if (!/^[^:\s]+:[^:\s]+$/.test(credentials)) {
    throw new Error('SMS_PROVIDER_API_KEY must be Mobile Message API credentials in username:password form.');
  }
  return `Basic ${btoa(credentials)}`;
}

function headers(credentials: string, extras: HeadersInit = {}): Headers {
  const result = new Headers(extras);
  result.set('Authorization', authorization(credentials));
  return result;
}

function mobileNumber(value: string): string {
  const number = value.replace(/^\+/, '');
  if (!/^61\d{9}$/.test(number)) throw new Error('Mobile Message supports Australian E.164 mobile numbers only.');
  return number;
}

function factKind(status: string): ProviderFact['kind'] {
  if (status === 'delivered') return 'delivered';
  if (status === 'failed' || status === 'error' || status === 'cancelled') return 'failed';
  return 'accepted';
}

function noProviderPlaceholders(content: string) {
  if (/\{(?:first_name|last_name|company|other|field_[1-5]|optout)\}/i.test(content)) {
    throw new Error('Mango must resolve personalisation and opt-out content before Mobile Message receives a message.');
  }
}

function resultRows(data: Record<string, unknown>): MobileMessage[] {
  return Array.isArray(data.results)
    ? data.results.map((value) => asRecord(value, 'Mobile Message returned an invalid message result.'))
    : [];
}

export function createMobileMessageAdapter(options: {
  credentials: string;
  webhookSecret: string;
}): SenderAdapter {
  return {
    channel: 'sms',

    async capabilities(): Promise<SenderCapabilities> {
      return {
        configured: true,
        canSendMarketing: true,
        effectiveDeduplication: true,
        effectiveReconciliation: true,
        deduplicationWindowMs: idempotencyWindowMs,
        reconciliationWindowMs: idempotencyWindowMs,
        detail: 'Mobile Message retains POST /v1/messages Idempotency-Key values for 24 hours and resolves an exact custom_ref through GET /v1/messages. This reference adapter is Australian-mobile-only.',
      };
    },

    async validateSender(sender, jurisdiction) {
      if (jurisdiction !== 'AU') return { ready: false, detail: 'Mobile Message reference support is limited to Australian recipients.' };
      const response = await fetch(`${baseUrl}/senders`, { headers: headers(options.credentials) });
      const data = asRecord(await responseJson(response), 'Mobile Message returned an invalid sender list.');
      const matching = resultRows(data).find((item) => item.sender === sender);
      if (!matching) return { ready: false, detail: `Mobile Message does not list ${sender} as an active sender.` };
      if (matching.type !== 'own') {
        return { ready: false, detail: `${sender} is not a dedicated two-way Mobile Message sender; Mango requires inbound STOP/HELP handling.` };
      }
      return { ready: true, detail: `${sender} is an active dedicated two-way Mobile Message sender for Australia.` };
    },

    async send(request) {
      noProviderPlaceholders(request.content.text);
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: headers(options.credentials, {
          'Content-Type': 'application/json',
          'Idempotency-Key': request.idempotencyKey,
        }),
        body: JSON.stringify({
          enable_unicode: true,
          max_parts: 3,
          ignore_unsubscribes: false,
          shorten_urls: false,
          messages: [{
            to: mobileNumber(request.to),
            sender: request.sender,
            message: request.content.text,
            custom_ref: encodeProviderReference(request.idempotencyKey),
            unicode: true,
            shorten_urls: false,
          }],
        }),
      });
      if (!response.ok) {
        await response.text();
        throw new ProviderTransportError({
          outcome: 'known-not-accepted',
          permanent: response.status >= 400 && response.status < 500 && ![408, 409, 425, 429].includes(response.status),
          code: `mobile_message_http_${response.status}`,
          detail: `Mobile Message rejected the delivery request with HTTP ${response.status}.`,
        });
      }
      const data = asRecord(await responseJson(response), 'Mobile Message returned an invalid send response.');
      if (data.ignore_unsubscribes !== false || data.shorten_urls !== false) {
        throw new Error('Mobile Message did not preserve Mango unsubscribe and link controls.');
      }
      const result = resultRows(data)[0];
      if (!result || result.status !== 'success') {
        throw new ProviderTransportError({
          outcome: 'known-not-accepted',
          permanent: true,
          code: typeof result?.error_code === 'string' ? result.error_code : 'mobile_message_rejected',
          detail: 'Mobile Message rejected the recipient-step.',
        });
      }
      return {
        providerMessageId: stringValue(result.message_id, 'Mobile Message did not return a message identifier.'),
        disposition: 'accepted',
        providerAcceptedAt: new Date(),
      };
    },

    async reconcile(request, { providerMessageId }) {
      const query = providerMessageId
        ? `message_id=${encodeURIComponent(providerMessageId)}`
        : `custom_ref=${encodeURIComponent(encodeProviderReference(request.idempotencyKey))}`;
      const response = await fetch(`${baseUrl}/messages?${query}`, { headers: headers(options.credentials) });
      const data = asRecord(await responseJson(response), 'Mobile Message returned an invalid reconciliation response.');
      const rows = resultRows(data);
      return { facts: await Promise.all(rows.map(async (row) => {
        const id = stringValue(row.message_id, 'Mobile Message reconciliation result has no message identifier.');
        const status = stringValue(row.status, 'Mobile Message reconciliation result has no status.');
        const occurredAt = new Date(typeof row.updated_at === 'string' ? row.updated_at : Date.now());
        return {
          identity: id,
          providerMessageId: id,
          kind: factKind(status),
          occurredAt,
          payloadDigest: await sha256(JSON.stringify(row)),
          detail: { status },
        };
      })), exhausted: true };
    },

    async verifyWebhook(request): Promise<VerifiedWebhook> {
      const timestamp = request.headers.get('X-MM-Timestamp');
      const signature = request.headers.get('X-MM-Signature');
      if (!timestamp || !signature || !/^\d+$/.test(timestamp)) throw new Error('Mobile Message webhook signature headers are missing.');
      const timestampMs = Number(timestamp) * 1000;
      if (Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) throw new Error('Mobile Message webhook timestamp is outside the five-minute acceptance window.');
      const rawBody = await request.text();
      const expected = await hmacSha256Hex(options.webhookSecret, `${timestamp}.${rawBody}`);
      if (!timingSafeEqual(signature.toLowerCase(), expected)) throw new Error('Mobile Message webhook signature is invalid.');
      return { rawBody, receivedAt: new Date(timestampMs) };
    },
  };
}
