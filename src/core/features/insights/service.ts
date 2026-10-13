import type { createInsightsRepository } from './repository';

export function createInsightsService(repository: ReturnType<typeof createInsightsRepository>) {
  return {
    async list() {
      return {
        results: await repository.listResults(),
        note: 'Each count comes from the provider: its acceptance of a hand-off or a signed event about a recipient. Acceptance is not delivery, outcomes are never added together, and opens are not tracked.',
      };
    },

    campaignResult(campaignId: string) {
      return repository.campaignResult(campaignId);
    },

    deliverability(reportingWindowDays: number, now = new Date()) {
      return repository.deliverability(new Date(now.getTime() - reportingWindowDays * 86_400_000));
    },

    attributeOrder: repository.attributeOrder,
    recordRefund: repository.recordRefund,
    recordExternalCost: repository.recordExternalCost,
  };
}
