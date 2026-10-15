import type { Platform } from '@/core/shared/platform';
import { configuredFrom } from '@/core/features/sender-verification/identity';
import { unavailableInspection } from '@/core/features/sender-verification/service';
import { VerificationError, type EvidenceStatus } from '@/core/features/sender-verification/types';
import { senderReasonText } from '@/core/features/sender-verification/reason-text';
import type { SenderStatus } from './types';
import { loadSenderSettings, saveSenderSettings } from './sender-persistence';
import { senderIdentitySchema } from './sender-validation';
import { senderWriteAuthority } from './sender-authority';
import { sendingReadiness } from './readiness';

const safeStatus = (status: EvidenceStatus) => ({ state: status.state,
  reason: status.state === 'passed' && !['owner-confirmed', 'authentication-observed'].includes(status.reason) ? 'Current evidence meets this check.' : senderReasonText(status.reason),
  observedAt: status.observedAt === undefined ? undefined : new Date(status.observedAt).toISOString(),
  expiresAt: status.expiresAt === undefined ? undefined : new Date(status.expiresAt).toISOString() });
export function createSettingsService(platform: Pick<Platform, 'config' | 'mailer'> & Partial<Pick<Platform, 'database' | 'senderVerification' | 'sms' | 'ai' | 'commerce'>>) {
  return {
    /** The connections this installation actually composed, read live rather than from stored rows. */
    async providers() {
      const mail = await platform.mailer.capabilities(), at = new Date().toISOString();
      const providerName = mail.provider === 'sendgrid' ? 'SendGrid' : mail.provider === 'resend' ? 'Resend' : 'The mail provider';
      const providers = [{ id: 'mail', adapter: 'mail.sender.v1', configured: mail.configured, status: mail.configured ? 'available' : 'unavailable', updatedAt: at,
        detail: mail.configured ? `${providerName} sends sign-in, confirmation and campaign email. Campaigns also need the sender checks above.` : mail.detail }];
      if (platform.sms) providers.push({ id: 'sms', adapter: 'sms.sender.v1', configured: true, status: 'available', updatedAt: at, detail: (await platform.sms.capabilities()).detail });
      if (platform.ai) providers.push({ id: 'ai', adapter: 'ai.provider.v1', configured: true, status: 'available', updatedAt: at, detail: 'AI writing can draft campaign suggestions for your review.' });
      if (platform.commerce) providers.push({ id: 'commerce', adapter: 'commerce.store.v1', configured: true, status: 'available', updatedAt: at, detail: platform.commerce.capabilities().detail });
      const off = [platform.sms ? '' : 'text messages', platform.ai ? '' : 'AI writing', platform.commerce ? '' : 'a store connection'].filter(Boolean);
      return { providers, off };
    },
    /** Emails a one-time check from the configured sender to the operator's own address. */
    async sendOwnerConfirmation(operatorEmail: string) {
      if (!platform.senderVerification || !(await platform.mailer.capabilities()).configured) throw new VerificationError('verification-not-configured');
      if (platform.database) await loadSenderSettings({config: platform.config, database: platform.database});
      return platform.senderVerification.sendOwnerConfirmation(operatorEmail, platform.mailer);
    },
    async saveSender(value: unknown, operatorId: string, request: Request) {
      if (!platform.database) throw new Error('Sender settings database is required.');
      const persistent = {config: platform.config, database: platform.database};
      return saveSenderSettings(persistent, value, await senderWriteAuthority(persistent, request, operatorId));
    },
    async senderStatus(): Promise<SenderStatus> {
      if (platform.database) await loadSenderSettings({config: platform.config, database: platform.database});
      const sender = platform.config.mailSender;
      const identity = { displayName: sender.displayName, fromEmail: sender.fromEmail,
        replyToEmail: sender.replyToEmail, physicalAddress: sender.physicalAddress };
      try {
        const capabilities = await platform.mailer.capabilities();
        if (!senderIdentitySchema.safeParse(identity).success) return {identity, readiness: sendingReadiness(undefined, identity.physicalAddress), validation: {state: capabilities.configured ? 'blocked' : 'unavailable', ready: false,
          detail: 'Save a valid business name, From email, reply-to email and physical postal address before sending.', checkedAt: new Date().toISOString()}};
        const inspection = capabilities.configured && platform.mailer.inspectSender
          ? await platform.mailer.inspectSender(configuredFrom(platform.config))
          : unavailableInspection('verification-not-configured');
        const ready = capabilities.configured && inspection.ready && Boolean(inspection.lease);
        return { identity, readiness: sendingReadiness(capabilities.configured ? inspection : undefined, identity.physicalAddress), validation: {
          state: !capabilities.configured ? 'unavailable' : ready ? 'ready' : inspection.provider.state === 'unknown' || (inspection.provider.state === 'passed' && inspection.dns.state === 'unknown') ? 'error' : 'blocked', ready,
          detail: !capabilities.configured ? 'Sending is off: no mail provider is configured for this copy of Mango.' : senderReasonText(inspection.reason),
          checkedAt: new Date(inspection.checkedAt).toISOString(),
        }, canSendCheck: capabilities.configured && Boolean(platform.senderVerification) && inspection.provider.state === 'passed' && inspection.dns.state === 'passed',
        evidence: { provider: safeStatus(inspection.provider), dns: safeStatus(inspection.dns), observation: safeStatus(inspection.observation) } };
      } catch {
        return { identity, readiness: sendingReadiness(undefined, identity.physicalAddress), validation: { state: 'error', ready: false,
          detail: 'The sender check failed. Check the mail provider configuration and try again.', checkedAt: new Date().toISOString() } };
      }
    },
  };
}
