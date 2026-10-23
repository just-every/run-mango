import {mobileMessageTime} from '@/core/features/lifecycle/mobile-message-status';
import {boundedSubmission} from './bounded-submission';
import {smsSegments} from '@/core/features/sms/segments';
import {boundPolicy} from '@/core/features/lifecycle/transport-policy';
import type {DeliveryPolicy} from '@/core/shared/platform';
import {boundedJson} from './bounded-read';
import {readWebhookBytes} from './webhook-body';
import { probeProvider } from './provider-health';
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
  retentionPolicy?:DeliveryPolicy;
}): SenderAdapter {
  return {
    channel: 'sms',

    probeHealth: signal => probeProvider('mobile-message', options.credentials, signal),
    async capabilities(): Promise<SenderCapabilities> {
      const policy=await boundPolicy(options.retentionPolicy,options.credentials);
      const lookup=policy?.lookupWindowMs??0;
      return {
        provider:'mobile-message',
        configured: true,
        canSendMarketing: true,
        effectiveDeduplication: true,
        effectiveReconciliation: lookup > 0,
        deduplicationWindowMs: idempotencyWindowMs,
        reconciliationWindowMs: lookup,
        detail: 'Mobile Message idempotency is 24 hours. Public documentation provides no numeric minimum lookup retention; account-bound provider retention evidence is required before approval.',
      };
    },

    async validateSender(sender, jurisdiction) {
      if (jurisdiction !== 'AU') return { ready: false, detail: 'Mobile Message reference support is limited to Australian recipients.' };
      const data = asRecord(await boundedJson(`${baseUrl}/senders`,headers(options.credentials)), 'Mobile Message returned an invalid sender list.');
      const matching = resultRows(data).find((item) => item.sender === sender);
      if (!matching) return { ready: false, detail: `Mobile Message does not list ${sender} as an active sender.` };
      if (matching.type !== 'dedicated') {
        return { ready: false, detail: `${sender} is not a dedicated two-way Mobile Message sender; Mango requires inbound STOP/HELP handling.` };
      }
      return { ready: true, detail: `${sender} is an active dedicated two-way Mobile Message sender for Australia.` };
    },

    async send(request) {
      noProviderPlaceholders(request.content.text);
      const encoding=smsSegments(request.content.text);
      if(encoding.segments>10)throw new ProviderTransportError({outcome:'known-not-accepted',permanent:true,code:'sms_segment_limit',detail:'SMS exceeds the supported provider segment limit.'});
      const service=request.purpose==='consent-confirmation'||request.purpose==='sms-compliance';
      const response = await boundedSubmission(`${baseUrl}/messages`, {
        method: 'POST',
        headers: headers(options.credentials, {
          'Content-Type': 'application/json',
          'Idempotency-Key': request.idempotencyKey,
        }),
        body: JSON.stringify({
          enable_unicode: true,
          max_parts: encoding.segments,
          ignore_unsubscribes: service,
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
        await response.body?.cancel();
        if(response.status>=500||[408,409,425].includes(response.status))throw new Error('Mobile Message handoff outcome is unknown.');
        const retryHeader=response.headers.get('retry-after');
        const retryDelay=retryHeader===null?NaN:Number.isFinite(Number(retryHeader))?Number(retryHeader):(Date.parse(retryHeader)-Date.now())/1000;
        throw new ProviderTransportError({
          retryAfterSeconds:Number.isFinite(retryDelay)&&retryDelay>=0?retryDelay:undefined,
          outcome: 'known-not-accepted',
          permanent: response.status >= 400 && response.status < 500 && ![408, 409, 425, 429].includes(response.status),
          code: `mobile_message_http_${response.status}`,
          detail: `Mobile Message rejected the delivery request with HTTP ${response.status}.`,
        });
      }
      const data = asRecord(await responseJson(response), 'Mobile Message returned an invalid send response.');
      if (data.status !== 'complete' || data.ignore_unsubscribes !== service || data.shorten_urls !== false) {
        throw new Error('Mobile Message did not preserve Mango unsubscribe and link controls.');
      }
      const result = resultRows(data)[0];
      if(!result||!['success','error','blocked'].includes(String(result.status)))throw new Error('Mobile Message handoff outcome is unknown.');
      if(result.to!==mobileNumber(request.to)||result.custom_ref!==encodeProviderReference(request.idempotencyKey)||typeof result.sender!=='string')throw new Error('Mobile Message result identity mismatch.');
      if (result.status !== 'success') {
        throw new ProviderTransportError({
          outcome: 'known-not-accepted',
          permanent: true,
          code: result.status==='blocked'?'mobile_message_suppressed':'mobile_message_rejected',
          ...(result.status==='blocked'?{restriction:'suppressed' as const}:{}),
          detail: 'Mobile Message rejected the recipient-step.',
        });
      }
      return {
        actualSender:result.sender,
        ...(result.sender!==request.sender?{complianceHold:{scope:`sender:${request.sender}`,reason:'provider-substituted-sender'}}:{}),
        providerMessageId: stringValue(result.message_id, 'Mobile Message did not return a message identifier.'),
        disposition: 'accepted',
        providerAcceptedAt: new Date(),
      };
    },

    async reconcile(request, { providerMessageId }) {
      const query = providerMessageId
        ? `message_id=${encodeURIComponent(providerMessageId)}`
        : `custom_ref=${encodeURIComponent(encodeProviderReference(request.idempotencyKey))}`;
      const data = asRecord(await boundedJson(`${baseUrl}/messages?${query}`,headers(options.credentials)), 'Mobile Message lookup response invalid.');
      if(data.status!=='complete'||!Array.isArray(data.results))throw new Error('Mobile Message lookup schema invalid.');
      const facts:ProviderFact[]=[];
      for(const row of resultRows(data)) {
        const id=stringValue(row.message_id,'Mobile Message lookup ID missing.');
        if((providerMessageId&&id!==providerMessageId)||row.to!==mobileNumber(request.to)||row.sender!==request.sender
          ||row.custom_ref!==encodeProviderReference(request.idempotencyKey)||row.message!==request.content.text)continue;
        // requested_at proves submission only. A status observation has no provider event time;
        // terminal outcomes wait for the signed status webhook instead of inventing a timestamp.
        const occurredAt=mobileMessageTime(row.requested_at);
        if(!Number.isFinite(occurredAt.getTime()))throw new Error('Mobile Message request time invalid.');
        const payloadDigest=await sha256(JSON.stringify(row));
        facts.push({identity:`mobile-message:${id}:observation:${String(row.status)}:${payloadDigest}`,providerMessageId:id,
          kind:'accepted',occurredAt,payloadDigest,detail:{observedStatus:row.status,evidence:'submission with untimed status observation',destination:request.to,mangoReference:request.idempotencyKey}});
      }
      if(new Set(facts.map(f=>f.providerMessageId)).size>1)throw new Error('Mobile Message lookup correlation is ambiguous.');
      return {facts,exhausted:true};
    },

    async verifyWebhook(request): Promise<VerifiedWebhook> {
      const timestamp = request.headers.get('X-MM-Timestamp');
      const signature = request.headers.get('X-MM-Signature');
      if (!timestamp || !signature || !/^\d+$/.test(timestamp)) throw new Error('Mobile Message webhook signature headers are missing.');
      const timestampMs = Number(timestamp) * 1000;
      if (Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) throw new Error('Mobile Message webhook timestamp is outside the five-minute acceptance window.');
      // The same bound the inbound SMS route applies to its webhook path.
      const rawBody = new TextDecoder().decode(await readWebhookBytes(request, 16384));
      const expected = await hmacSha256Hex(options.webhookSecret, `${timestamp}.${rawBody}`);
      if (!timingSafeEqual(signature.toLowerCase(), expected)) throw new Error('Mobile Message webhook signature is invalid.');
      return { rawBody, receivedAt: new Date(timestampMs) };
    },
  };
}
