import { productConfig } from '@/ext/config';
import type { CampaignFilters } from './result-model';
import { summarizeAudienceRules, withDerivedAudience } from './audience-summary';
import { parseStructuredRules } from '@/core/features/lifecycle/rules';
import type { createStoreService } from '@/core/features/store/service';

import type { createCampaignCompositionRepository } from './composition-repository';
import type { DraftComposition } from './draft-composition';
import type { createCampaignRepository } from './repository';
import { proposalReviewSnapshot } from './review-snapshot';
import { authoringSourceCheck, authoringSourceStatus } from './authoring-source-status';

export function createCampaignService(
  repository: ReturnType<typeof createCampaignRepository>,
  compositionRepository: ReturnType<typeof createCampaignCompositionRepository>,
  store: ReturnType<typeof createStoreService>,
  options: { smsEnabled: boolean; now?: () => Date } = { smsEnabled: false },
) {
  async function campaignDetail(id: string) {
    const campaign = await repository.getCampaign(id);
    if (!campaign) return undefined;

    const composition = campaign.activeRevisionId
      ? await compositionRepository.read(campaign.activeRevisionId)
      : undefined;
    if (!composition) {
      return {
        campaign,
        revision: undefined,
        steps: [],
        links: [],
        audience: undefined,
        audienceChannelCounts: [],
        audienceState: 'needs_recomputation' as const,
        checks: [],
      };
    }

    const rules=parseStructuredRules(composition.revision.inclusionRuleJson,composition.revision.exclusionRulesJson);
    const checks=(await repository.listChecks(composition.revision.id)).map(check=>authoringSourceCheck(check,rules.ok?rules.sourceTypes:[]));
    return { campaign, ...composition,
      revision: {...composition.revision, audienceRule:summarizeAudienceRules(composition.revision.inclusionRuleJson,composition.revision.exclusionRulesJson)},
      results: composition.revision.state === 'approved' ? await repository.results(id, composition.revision.id, campaign.state, options.now?.() ?? new Date()) : undefined,
      uncertainDeliveries: await repository.uncertainDeliveries(id), checks };
  }

  return {
    async decisionDesk() {
      const [sourceStatus, proposalRows] = await Promise.all([store.status(), repository.listProposals()]);
      const proposals = await Promise.all(
        proposalRows.map(async (proposal) => {
          const [exclusions, steps, audience] = await Promise.all([
            repository.listProposalExclusions(proposal.id),
            repository.listProposalSteps(proposal.id),
            repository.proposalAudience(proposal.id),
          ]);
          return {
            proposal: withDerivedAudience(proposal),
            exclusions,
            steps,
            ...proposalReviewSnapshot(steps, audience.audience, audience.audienceChannelCounts),
          };
        }),
      );
      return { sourceStatus:authoringSourceStatus(sourceStatus), proposals };
    },

    async proposalDetail(id: string) {
      const proposal = await repository.getProposal(id);
      if (!proposal) return undefined;
      const [exclusions, steps, audience] = await Promise.all([
        repository.listProposalExclusions(id),
        repository.listProposalSteps(id),
        repository.proposalAudience(id),
      ]);
      return {
        proposal: withDerivedAudience(proposal),
        exclusions,
        steps,
        ...proposalReviewSnapshot(steps, audience.audience, audience.audienceChannelCounts),
        forecast: {
          status: 'unavailable',
          detail: 'No forecast is shown because provider-confirmed outcome data is unavailable.',
        },
      };
    },

    async listCampaigns(filters: CampaignFilters = {}) {
      const collection = await repository.listCampaigns(filters, options.now?.() ?? new Date());
      return { ...collection, smsEnabled:options.smsEnabled, timezone:productConfig.storeTimezone,
        campaigns:collection.campaigns.map(({inclusionRuleJson, exclusionRulesJson, ...campaign}) => ({...campaign,
          audienceSummary:inclusionRuleJson === null || exclusionRulesJson === null ? '' : summarizeAudienceRules(inclusionRuleJson,exclusionRulesJson),
        })),
      };
    },

    campaignDetail,

    async review(id: string) {
      const detail = await campaignDetail(id);
      if (!detail) return undefined;
      const required=new Set<string>(detail.steps.map(step=>step.channel==='email'?'mail.sender.v1':'sms.sender.v1'));
      const rules=detail.revision&&parseStructuredRules(detail.revision.inclusionRuleJson,detail.revision.exclusionRulesJson);
      if(rules?.ok&&rules.sourceTypes.length)required.add('commerce.store.v1');
      return { ...detail, blockers: (await store.providerBlockers()).filter(blocker=>required.has(blocker.kind)) };
    },

    updateDraft(id: string, composition: DraftComposition) {
      return compositionRepository.saveDraft(id, composition, new Date());
    },

    async approvalBlockers(id: string) {
      const detail = await campaignDetail(id);
      if (!detail) return undefined;
      return { status: 'blocked' as const, blockers: await store.providerBlockers() };
    },

    async testSendBlockers(id: string) {
      const detail = await campaignDetail(id);
      if (!detail) return undefined;
      return { status: 'blocked' as const, blockers: await store.providerBlockers() };
    },

  };
}
