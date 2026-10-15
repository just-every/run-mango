import { createD1DevelopmentOutbox } from '@/vendor/base/mail/src/development/index.mjs';
import { ProviderTransportError, type SenderAdapter } from '@/core/shared/platform';

/** A capture is never represented as a provider acceptance or delivery. */
export function createDemoMailer(db: D1Database): SenderAdapter {
  const outbox = createD1DevelopmentOutbox({ db });
  return {
    channel: 'email',
    async capabilities() {
      return { configured: true, provider: 'development', canSendMarketing: true,
        effectiveDeduplication: false, effectiveReconciliation: false, deduplicationWindowMs: 0,
        reconciliationWindowMs: 0, detail: 'Demo mail is captured in the outbox; nothing is sent.' };
    },
    async validateSender() { return { ready: false, detail: 'Demo mail is captured; no sending domain is verified.' }; },
    async send(request) {
      await outbox.put({ deliveryId: request.idempotencyKey, from: request.sender, to: [request.to],
        subject: request.content.subject || 'Mango demo', text: request.content.text,
        ...(request.content.html ? { html: request.content.html } : {}),
        ...(request.content.replyTo ? { replyTo: request.content.replyTo } : {}) });
      throw new ProviderTransportError({ outcome: 'known-not-accepted', permanent: true,
        code: 'demo_mail_captured', detail: 'Demo: this email was captured in the outbox. Nothing was sent.' });
    },
    async reconcile() { return { facts: [], exhausted: true }; },
    async verifyWebhook() { throw new Error('Demo mail has no provider webhooks.'); },
  };
}
