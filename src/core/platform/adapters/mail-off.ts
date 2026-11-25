import { ProviderTransportError, type SenderAdapter } from '@/core/shared/platform';
import { unavailableInspection } from '@/core/features/sender-verification/service';

const detail = 'Email is off for this installation (MAIL_PROVIDER=none), so nothing is sent. Sign in with `rer signin`. To send email, redeploy with a mail provider.';

/** Mail off: every send is refused at once as mail_off, so each flow records why nothing was delivered. */
export function createMailOffAdapter(): SenderAdapter {
  return {
    channel: 'email',
    async capabilities() {
      return { configured: false, provider: 'none', canSendMarketing: false,
        effectiveDeduplication: false, effectiveReconciliation: false,
        deduplicationWindowMs: 0, reconciliationWindowMs: 0, detail };
    },
    async inspectSender() { return unavailableInspection('mail-off'); },
    async validateSender() { return { ready: false, detail }; },
    async send() { throw new ProviderTransportError({ outcome: 'known-not-accepted', permanent: true, code: 'mail_off', detail }); },
    async reconcile() { return { facts: [], exhausted: true }; },
    async verifyWebhook() { throw new Error('Mail is off: there are no delivery webhooks.'); },
  };
}
