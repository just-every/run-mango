import type { createInsightsRepository } from './repository';

export function createInsightsService(repository: ReturnType<typeof createInsightsRepository>,reportingWindowDays=30) {
  return {
    reportingWindowDays,
    async list() {
      return {
        results: await repository.listResults(),
        costs: await repository.costReport(),
        usage: await repository.usageReport(),
        note: 'Each count comes from the provider: its acceptance of a hand-off or a signed event about a recipient. Acceptance is not delivery, outcomes are never added together, and optional open estimates are kept separate.',
      };
    },

    campaignResult(campaignId: string) {
      return repository.campaignResult(campaignId);
    },

    deliverability(reportingWindowDays: number, now = new Date()) {
      return repository.deliverability(new Date(now.getTime() - reportingWindowDays * 86_400_000));
    },

    mailboxes(windowDays:number,now=new Date()) {return repository.mailboxes(new Date(now.getTime()-windowDays*86400000),now);},

    recordExternalCost: repository.recordExternalCost,
  };
}
