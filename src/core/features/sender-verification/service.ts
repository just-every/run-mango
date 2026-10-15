import type { Database } from '@/core/platform/db/client';
import type { AppConfig } from '@/core/shared/platform';
import { inspectConfiguration } from './configuration';
import { configuredFrom, digest, senderBinding } from './identity';
import { createVerificationRepository } from './repository';
import { createChallengeService } from './challenges';
import { VerificationError, authorityReasons, type ReceiverConnector, type SenderInspection } from './types';
import { createOwnerConfirmation } from './owner-confirmation';
import type { ObservationResult } from './receiver';

export type VerificationOptions = { database: Database; config: AppConfig; receiver?: ReceiverConnector;
  clock?: () => number; transport?: typeof fetch };
const noAuthentication = () => ({ spf: false, dkim: false, dmarc: false, aligned: false });
export function unavailableInspection(reason = 'observation-missing', now = Date.now()): SenderInspection {
  return { ready: false, reason, checkedAt: now, expiresAt: now, authentication: noAuthentication(),
    provider: { state: 'unknown', reason }, dns: { state: 'unknown', reason }, observation: { state: 'missing', reason: 'observation-missing' } };
}
export function createSenderVerification(options: VerificationOptions) {
  const clock = options.clock ?? Date.now;
  const repository = createVerificationRepository(options.database);
  async function currentConfiguration() {
    const now = clock();
    const binding = await senderBinding(options.config, options.receiver?.id);
    const bindingDigest = await digest(binding), stateId = await digest(['marketing-sender', binding.deployment]);
    const initial = await repository.bind(stateId, bindingDigest, now);
    try {
      const configuration = await inspectConfiguration(binding, options.config.mailProviderApiKey, now, options.transport);
      const state = await repository.configuration(initial, configuration.configurationDigest, clock());
      if (!state) throw new VerificationError('inspection-superseded', 'unknown');
      return { binding, bindingDigest, state, configuration, now };
    } catch (error) {
      const reason = error instanceof VerificationError ? error.reason : 'verification-unavailable';
      await repository.invalidate(initial, reason, clock(), error instanceof VerificationError && error.state === 'failed');
      throw error;
    }
  }
  const challenges = createChallengeService({ options, repository, currentConfiguration, clock });
  return {
    ...challenges,
    ...createOwnerConfirmation({ options, repository, currentConfiguration, clock, sendChallenge: challenges.sendChallenge }),
    async inspect(sender: string): Promise<SenderInspection> {
      const start = clock();
      try {
        if (sender !== configuredFrom(options.config)) return unavailableInspection('configured-from-mismatch', start);
        const { binding, state, configuration, now } = await currentConfiguration();
        const observed = state.observation_id ? await repository.observation(state.observation_id) : null;
        const valid = observed && observed.binding_digest === state.binding_digest && observed.configuration_digest === state.configuration_digest;
        const result = valid ? JSON.parse(observed.result_json) as ObservationResult : null;
        const expiresAt = Math.min(configuration.expiresAt, valid ? observed.expires_at : now);
        const reason = state.revoked_at ? 'observation-revoked' : !valid ? 'observation-missing'
          : observed.observed_at > now ? 'observation-time-invalid' : observed.expires_at <= clock() ? 'observation-stale'
            : configuration.expiresAt <= clock() ? 'configuration-stale' : result!.reason;
        const ready = (authorityReasons as readonly string[]).includes(reason) && Boolean(result?.authentication?.spf === true && result.authentication.dkim === true && result.authentication.dmarc === true && result.authentication.aligned === true);
        const inspection: SenderInspection = { ready, reason, checkedAt: now, expiresAt,
          provider: { state: 'passed', reason: 'provider-domain-verified', observedAt: now, expiresAt: configuration.expiresAt },
          dns: { state: 'passed', reason: 'dns-configured', observedAt: now, expiresAt: configuration.expiresAt },
          observation: { state: state.revoked_at ? 'revoked' : !valid ? 'missing' : observed.expires_at <= clock() ? 'stale' : (authorityReasons as readonly string[]).includes(result?.reason ?? '') ? 'passed' : 'failed',
            reason, ...(valid ? { observedAt: observed.observed_at, expiresAt: observed.expires_at } : {}) },
          authentication: ready ? result!.authentication : noAuthentication(),
        };
        inspection.lease = await repository.inspection(state, inspection, clock(), { binding, configuration });
        if (ready && !inspection.lease) return unavailableInspection('inspection-superseded', clock());
        return inspection;
      } catch (error) {
        const reason = error instanceof VerificationError ? error.reason : 'verification-unavailable';
        const inspection = unavailableInspection(reason, start);
        inspection.provider.state = error instanceof VerificationError ? error.state : 'unknown';
        if (error instanceof VerificationError && error.providerVerified) {
          inspection.provider = { state: 'passed', reason: 'provider-domain-verified', observedAt: start, expiresAt: start + 300_000 };
          inspection.dns = { state: error.state, reason };
        }
        const state = await repository.state(await digest(['marketing-sender', options.config.publicBaseUrl.origin]));
        const previous = state?.observation_id ? await repository.observation(state.observation_id) : null;
        if (previous) inspection.observation = { state: state?.revoked_at ? 'revoked' : previous.expires_at <= clock() ? 'stale' : 'unknown',
          reason: state?.revoked_at ? 'observation-revoked' : 'current-configuration-unavailable', observedAt: previous.observed_at, expiresAt: previous.expires_at };
        return inspection;
      }
    },
    async revoke() {
      const binding = await senderBinding(options.config, options.receiver?.id);
      const id = await digest(['marketing-sender', binding.deployment]);
      const state = await repository.state(id);
      if (state) await repository.invalidate(state, 'observation-revoked', clock(), true);
    },
  };
}
export type SenderVerification = ReturnType<typeof createSenderVerification>;
