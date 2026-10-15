// @ts-expect-error Base mail ships runtime-validated portable ESM.
import { createMailSender } from '@/vendor/base/mail/index.mjs';
import { ProviderTransportError, type AppConfig, type SenderAdapter } from '@/core/shared/platform';
import { unavailableInspection } from '@/core/features/sender-verification/service';

/** RER owns the transactional sender. Newsletter authority still needs the seed's normal evidence. */
export function createRerAdapter(config: Pick<AppConfig, 'mailProviderApiKey' | 'mailRelayUrl' | 'mailAuthFrom'>): SenderAdapter {
  const detail = 'Managed mail sends sign-in and subscription confirmations. Newsletter sending needs a provider with verified business sender, unsubscribe headers and delivery evidence.';
  return {
    channel: 'email',
    async capabilities() {
      return { configured: true, provider: 'rer', canSendMarketing: false,
        effectiveDeduplication: false, effectiveReconciliation: false,
        deduplicationWindowMs: 0, reconciliationWindowMs: 0, detail };
    },
    async inspectSender() { return unavailableInspection('managed-newsletter-verification-unavailable'); },
    async validateSender() { return { ready: false, detail }; },
    async send(request) {
      if (request.purpose !== 'consent-confirmation') throw new ProviderTransportError({
        outcome: 'known-not-accepted', permanent: true, code: 'managed_newsletter_unavailable', detail,
      });
      let retryAfterSeconds: number | undefined;
      const mail = createMailSender({ provider: 'rer', mode: 'production', apiKey: config.mailProviderApiKey, relayUrl: config.mailRelayUrl }, {
        fetch: async (url: string, init: RequestInit) => {
          const response = await fetch(url, init);
          const seconds = Number(response.headers.get('retry-after'));
          if (response.status === 429 && Number.isFinite(seconds) && seconds > 0) retryAfterSeconds = seconds;
          return response;
        },
      });
      const result = await mail.send({ deliveryId: request.idempotencyKey, from: config.mailAuthFrom,
        to: [request.to], subject: request.content.subject ?? '', text: request.content.text,
        ...(request.content.html ? { html: request.content.html } : {}),
      });
      if (result.status === 'rejected' || result.status === 'rate_limited') throw new ProviderTransportError({
        outcome: 'known-not-accepted', permanent: result.status === 'rejected', code: result.code,
        detail: 'RER mail could not send this email. Check the Managed mail connection in RER.', retryAfterSeconds,
      });
      return { providerMessageId: result.providerMessageId ?? '',
        disposition: result.status === 'accepted' ? 'accepted' : 'handoff-unknown',
        ...(result.status === 'accepted' ? { providerAcceptedAt: new Date() } : {}),
      };
    },
    async reconcile() { return { facts: [], exhausted: true }; },
    async verifyWebhook() { throw new Error('RER mail does not provide delivery webhooks.'); },
  };
}
