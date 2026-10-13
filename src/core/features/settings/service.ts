import type { Platform } from '@/core/shared/platform';
import { configuredFrom } from '@/core/features/sender-verification/identity';
import { unavailableInspection } from '@/core/features/sender-verification/service';
import type { EvidenceStatus } from '@/core/features/sender-verification/types';
import type { SenderStatus } from './types';
import { loadSenderSettings, saveSenderSettings } from './sender-persistence';
import { senderIdentitySchema } from './sender-validation';
import { senderWriteAuthority } from './sender-authority';
import { sendingReadiness } from './readiness';

const reasons = { passed: 'Current evidence meets this check.', missing: 'No trusted receiver observation is available.', unknown: 'This check could not be completed.', failed: 'This check did not pass.', stale: 'The original observation has expired.', revoked: 'The observation has been revoked.' };
const safeStatus = (status: EvidenceStatus) => ({ state: status.state, reason: reasons[status.state],
  observedAt: status.observedAt === undefined ? undefined : new Date(status.observedAt).toISOString(),
  expiresAt: status.expiresAt === undefined ? undefined : new Date(status.expiresAt).toISOString() });
export function createSettingsService(platform: Pick<Platform, 'config' | 'mailer'> & Partial<Pick<Platform, 'database'>>) {
  return {
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
          detail: ready ? 'Fresh receiver evidence reports SPF, DKIM, DMARC and From alignment passing.'
            : !capabilities.configured ? 'The mail provider is unavailable.'
              : inspection.observation.state === 'missing' ? 'Receiver authentication evidence is missing. Marketing approval remains blocked.'
                : 'Current sender evidence does not meet marketing requirements. Check configuration and obtain a fresh receiver observation.',
          checkedAt: new Date(inspection.checkedAt).toISOString(),
        }, evidence: { provider: safeStatus(inspection.provider), dns: safeStatus(inspection.dns), observation: safeStatus(inspection.observation) } };
      } catch {
        return { identity, readiness: sendingReadiness(undefined, identity.physicalAddress), validation: { state: 'error', ready: false,
          detail: 'The sender check failed. Check the mail provider configuration and try again.', checkedAt: new Date().toISOString() } };
      }
    },
  };
}
