import {senderDomain} from '@/core/features/lifecycle/provider-holds';
import {boundedSubmission} from './bounded-submission';
import {reconcileResend} from './resend-reconciliation';
import {readWebhookBytes} from './webhook-body';
import {boundPolicy} from '@/core/features/lifecycle/transport-policy';
import type {DeliveryPolicy} from '@/core/shared/platform';
import { probeProvider } from './provider-health';
import { unavailableInspection, type SenderVerification } from '@/core/features/sender-verification/service';
import {
  ProviderTransportError,
  type DeliveryRequest,
  type SenderAdapter,
  type SenderCapabilities,
  type VerifiedWebhook,
} from '@/core/shared/platform';
import { encodeProviderReference } from '@/core/shared/provider-reference';

import { hmacSha256Base64Key, timingSafeEqual } from '@/core/platform/crypto';

import { asRecord, responseJson, stringValue } from './http';

const resendBaseUrl = 'https://api.resend.com';
const idempotencyWindowMs = 24 * 60 * 60 * 1000;

type ResendEmail = {
  id: string;
  created_at?: string;
  last_event?: string;
};

function resendHeaders(apiKey: string, extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  headers.set('Authorization', `Bearer ${apiKey}`);
  return headers;
}

async function sendEmail(apiKey: string, request: DeliveryRequest): Promise<ResendEmail> {
  const response = await boundedSubmission(`${resendBaseUrl}/emails`, {
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
    const text=await response.text();
    if(response.status>=500||[408,409,425].includes(response.status)) throw new Error('Resend handoff outcome is unknown.');
    let code='',domainRejected=false;try{const error=JSON.parse(text);domainRejected=response.status===403&&error.name==='validation_error'&&typeof error.message==='string'&&(/domain is not verified\./.test(error.message)||error.message.startsWith('You can only send testing emails to your own email address')); if(['suspended_api_key','restricted_api_key','invalid_permission','validation_error','rate_limit_exceeded','daily_quota_exceeded','monthly_quota_exceeded'].includes(error.name))code=error.name;}catch{}
    const retryHeader=response.headers.get('retry-after');
    const retryAfterSeconds=retryHeader?(Number.isFinite(Number(retryHeader))?Number(retryHeader):Math.max(0,(Date.parse(retryHeader)-Date.now())/1000)):undefined;
    throw new ProviderTransportError({
      retryAfterSeconds,
      ...(domainRejected?{hold:{scope:`domain:${senderDomain(request.content.from?.email??request.sender)}`,reason:'domain-not-verified'}}:{}),
      ...(['suspended_api_key','restricted_api_key','invalid_permission'].includes(code)?{hold:{scope:'account',reason:code}}:{}),
      outcome: 'known-not-accepted',
      permanent: response.status >= 400 && response.status < 500 && ![408, 409, 425, 429].includes(response.status),
      code: `resend_http_${response.status}`,
      detail: `Resend rejected the delivery request with HTTP ${response.status}.`,
    });
  }
  const data = asRecord(await responseJson(response), 'Resend returned an invalid send response.');
  return { id: stringValue(data.id, 'Resend did not return an email identifier.') };
}

export function createResendAdapter(options: {
  apiKey: string;
  webhookSecret: string;
  webhookId: string;
  verification?: SenderVerification;
  retentionPolicy?:DeliveryPolicy;
}): SenderAdapter {
  return {
    channel: 'email',

    probeHealth: signal => probeProvider('resend', options.apiKey, signal),
    async capabilities(): Promise<SenderCapabilities> {
      const policy=await boundPolicy(options.retentionPolicy,options.apiKey);
      const lookup=policy?.scopes?.includes('full_access')&&policy.webhookId===options.webhookId&&policy.lookupHistorySince&&Date.parse(policy.lookupHistorySince)<=Date.now()?policy.lookupWindowMs??0:0;
      return {
        configured: true,
        provider: 'resend',
        canSendMarketing: true,
        effectiveDeduplication: true,
        effectiveReconciliation: lookup > 0,
        deduplicationWindowMs: idempotencyWindowMs,
        reconciliationWindowMs: lookup,
        detail: 'Resend idempotency is 24 hours. Lookup requires separately configured account-bound retention and full_access evidence; standard account retention is 30 days, with Enterprise/custom retention requiring its own evidence.',
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
      return reconcileResend(options.apiKey,options.webhookId,request,{providerMessageId,cursor});
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
      // Resend delivers one event per request.
      const rawBody = new TextDecoder().decode(await readWebhookBytes(request, 1048576));
      const secret = options.webhookSecret.startsWith('whsec_') ? options.webhookSecret.slice('whsec_'.length) : options.webhookSecret;
      const expected = await hmacSha256Base64Key(secret, `${id}.${timestamp}.${rawBody}`);
      const signatures = signature.split(' ').filter((part) => part.startsWith('v1,')).map((part) => part.slice(3));
      if (!signatures.some((candidate) => timingSafeEqual(candidate, expected))) throw new Error('Resend webhook signature is invalid.');
      return { providerEventId: id, rawBody, receivedAt: new Date(timestampMs) };
    },
  };
}
