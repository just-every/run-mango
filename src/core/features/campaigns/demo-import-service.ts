import type { DemoAudienceContact } from './demo-audience-snapshot';
import { deriveDemoAudienceSnapshot } from './demo-audience-snapshot';
import type {
  LocalDemoCampaign,
  LocalDemoProposal,
  createCampaignDemoImportRepository,
} from './demo-import-repository';

export type LocalDemoCampaignPlan = {
  audience: { rule: string; candidateHistoryKind: string };
  campaigns: LocalDemoCampaign[];
  proposals: LocalDemoProposal[];
};

export function createCampaignDemoImportService(
  repository: ReturnType<typeof createCampaignDemoImportRepository>,
) {
  return {
    async importLocalDemo(
      plan: LocalDemoCampaignPlan,
      contacts: DemoAudienceContact[],
      now: Date,
    ) {
      for (const campaign of plan.campaigns) {
        const snapshot = deriveDemoAudienceSnapshot(
          contacts,
          plan.audience.candidateHistoryKind,
          campaign.revision.steps,
        );
        await repository.importLocalDemoCampaign(campaign, plan.audience.rule, snapshot, now);
      }
      for (const proposal of plan.proposals) {
        const snapshot = deriveDemoAudienceSnapshot(
          contacts,
          plan.audience.candidateHistoryKind,
          proposal.steps,
        );
        await repository.importLocalDemoProposal(proposal, plan.audience.rule, snapshot, now);
      }
    },
  };
}
