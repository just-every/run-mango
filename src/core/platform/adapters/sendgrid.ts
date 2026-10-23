import {HTTPException} from 'hono/http-exception';
import { probeProvider } from './provider-health';
import { readWebhookBytes } from './webhook-body';
// @ts-expect-error Base mail ships runtime-validated portable ESM.
import { createMailSender, verifyWebhook } from '@/vendor/base/mail/index.mjs';
import { reconcileSendgrid } from './sendgrid-activity';
import type { SenderVerification } from '@/core/features/sender-verification/service';
import { unavailableInspection } from '@/core/features/sender-verification/service';
import { encodeProviderReference } from '@/core/shared/provider-reference';
import { ProviderTransportError, type SenderAdapter } from '@/core/shared/platform';

/** Base owns transport and ECDSA verification. No provider deduplication is claimed. */
export function createSendgridAdapter(options: { apiKey: string; webhookPublicKey: string; verification?: SenderVerification }): SenderAdapter {
  return {
    channel: 'email',
    probeHealth: signal => probeProvider('sendgrid', options.apiKey, signal),
    async capabilities() {
      return { configured: true, provider: 'sendgrid', canSendMarketing: true, handoffPolicy: 'single-attempt',
        effectiveDeduplication: false, effectiveReconciliation: false,
        deduplicationWindowMs: 0, reconciliationWindowMs: 0,
        detail: 'SendGrid uses at-most-once handoff. Uncertain submissions require operator review and are never automatically retried; signed events and Activity correlate message IDs when available.' };
    },
    async inspectSender(sender) { return options.verification?.inspect(sender) ?? unavailableInspection('sendgrid-sender-observation-unavailable'); },
    async validateSender(sender) { const inspection = await this.inspectSender!(sender); return { ready: inspection.ready, detail: inspection.reason }; },
    async send(request) {
      let retryAfterSeconds:number|undefined;
      const mail=createMailSender({provider:'sendgrid',mode:'production',apiKey:options.apiKey},{fetch:async(url:string,init:RequestInit)=>{
        const response=await fetch(url,init);
        const header=response.headers.get('retry-after');
        if(header) {const seconds=Number(header);const parsed=Number.isFinite(seconds)?seconds:(Date.parse(header)-Date.now())/1000;if(Number.isFinite(parsed)&&parsed>=0)retryAfterSeconds=parsed;}
        return response;
      }});
      const result = await mail.send({ deliveryId: request.idempotencyKey,
        from: request.content.from ? `${request.content.from.name} <${request.content.from.email}>` : request.sender,
        to: [request.to], subject: request.content.subject ?? '', text: request.content.text,
        ...(request.content.html === undefined ? {} : { html: request.content.html }),
        ...(request.content.replyTo === undefined ? {} : { replyTo: request.content.replyTo }),
        ...(request.content.headers === undefined ? {} : { headers: request.content.headers }),
        customArgs: { mango_recipient_step: encodeProviderReference(request.recipientStepId), mango_handoff_key: encodeProviderReference(request.idempotencyKey) },
      });
      if (result.status === 'rejected' || result.status === 'rate_limited') throw new ProviderTransportError({
        retryAfterSeconds,
        outcome: 'known-not-accepted', permanent: result.status === 'rejected', code: result.code,
        detail: 'SendGrid rejected the submission.' });
      return { providerMessageId: result.providerMessageId ?? '',
        disposition: result.status === 'accepted' && result.providerMessageId ? 'accepted' : 'handoff-unknown',
        ...(result.status === 'accepted' ? { providerAcceptedAt: new Date() } : {}),
      };
    },
    async reconcile(request, state) { return reconcileSendgrid(options.apiKey, request, state); },
    async verifyWebhook(request) {
      if (!options.webhookPublicKey) throw new Error('No SendGrid Event Webhook is configured for this installation.');
      const bytes = await readWebhookBytes(request,32*1024*1024);
      const valid = await verifyWebhook({ provider: 'sendgrid', rawBody: bytes,
        headers: request.headers, key: options.webhookPublicKey, now: Date.now() });
      if (!valid) throw new HTTPException(401,{message:'SendGrid webhook signature is invalid.'});
      const rawBody=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      return { provider: 'sendgrid', rawBody, receivedAt: new Date() };
    },
  };
}
