import type { LifecycleAudience } from '@/core/features/lifecycle';

import type { createAudienceService } from './service';

export function createLifecycleAudience(service: ReturnType<typeof createAudienceService>): LifecycleAudience {
  return {
    resolveFrozenCandidates: (input) => service.resolveFrozenCandidates(input),
    recheckHandoffEligibility: (input) => service.recheckHandoffEligibility(input),
    async recordProviderSuppression(input) {
      await service.recordProviderSuppression(input);
    },
    issueMarketingUnsubscribe: (input) => service.issueMarketingUnsubscribe(input),
    async recordChannelOptOut(input) {
      await service.recordChannelOptOut(input);
    },
    async recordSoftBounce(input) {
      await service.recordBounce({ ...input, kind: 'soft' });
    },
    async recordProviderDelivery(input) {
      await service.recordProviderDelivery(input.contactId, 'email', input.occurredAt, input.providerEventId);
    },
  };
}
