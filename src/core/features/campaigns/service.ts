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
import { persistedProposalClaims, projectExclusionClaims, unavailableProposalClaims } from './persisted-proposal-claims';

export function createCampaignService(
  repository: ReturnType<typeof createCampaignRepository>,
  compositionRepository: ReturnType<typeof createCampaignCompositionRepository>,
  store: ReturnType<typeof createStoreService>,
  options: { smsEnabled: boolean; now?: () => Date; smsPreview?:(campaignId:string,revisionId:string)=>Promise<import('@/core/features/sms/review-preview').SmsReviewPreview|undefined> } = { smsEnabled: false },
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
      scheduler: await repository.scheduler(options.now?.() ?? new Date()),
      revision: {...composition.revision, audienceRule:summarizeAudienceRules(composition.revision.inclusionRuleJson,composition.revision.exclusionRulesJson)},
      results: composition.revision.state === 'approved' ? await repository.results(id, composition.revision.id, campaign.state, options.now?.() ?? new Date()) : undefined,
      uncertainDeliveries: await repository.uncertainDeliveries(id), checks };
  }

  async function proposalEntry(proposal:NonNullable<Awaited<ReturnType<typeof repository.getProposal>>>) {
    const [exclusions, steps, audience, evidence, composition] = await Promise.all([
      repository.listProposalExclusions(proposal.id), repository.listProposalSteps(proposal.id), repository.proposalAudience(proposal.id),repository.proposalEvidence(proposal.id),
      proposal.campaignId ? campaignDetail(proposal.campaignId) : undefined,
    ]);
    const context=persistedProposalClaims(proposal,steps.length,evidence.evidenceItems);
    const rules=parseStructuredRules(proposal.inclusionRuleJson,proposal.exclusionRulesJson);
    const exclusionRulesJson=projectExclusionClaims(proposal.exclusionRulesJson,evidence.evidenceItems);
    const projectedRules=parseStructuredRules(proposal.inclusionRuleJson,exclusionRulesJson);
    const labels=new Map(rules.ok&&projectedRules.ok?rules.exclusions.map((rule,index)=>[rule.reason,projectedRules.exclusions[index].reason]):[]);
    const {decisionContextJson:_,...displayProposal}=proposal;
    return {proposal:withDerivedAudience({...displayProposal,summary:context?proposal.summary:'',evidence:'',exclusionRulesJson}),
      claimsUnavailable:context?undefined:unavailableProposalClaims,
      exclusions:exclusions.map(exclusion=>({...exclusion,reason:labels.get(exclusion.reason)??exclusion.reason})),
      steps:steps.map((step,index)=>({...step,whyThisTime:context?.timing[index]})),
      ...proposalReviewSnapshot(steps,audience.audience,audience.audienceChannelCounts),...evidence,
      explanation:context?.explanation,forecast:context?.forecast??{status:'unavailable',method:'No verified forecast is available for this saved proposal.'},
      composition:composition?{revision:composition.revision,links:composition.links}:undefined};
  }
  return {
    async decisionDesk() {
      const [sourceStatus, proposalRows] = await Promise.all([store.status(), repository.listProposals(options.now?.() ?? new Date())]);
      const proposals = await Promise.all(proposalRows.map(proposalEntry));
      return {sourceStatus:authoringSourceStatus(sourceStatus),proposals,recentDecisions:await repository.recentProposalDecisions(),policy:{id:'proposal.selection.v1',detail:'Expected revenue descending when sufficient own attribution history is available in one comparable currency; then earliest send-by. Insufficient history has no forecast. Mixed currencies rank by send-by.'}};
    },
    async proposalDetail(id: string) {
      const proposal=await repository.getProposal(id,options.now?.() ?? new Date());
      return proposal?proposalEntry(proposal):undefined;
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
    async editSchedule(id:string,operatorId:string) {
      const detail=await campaignDetail(id);if(!detail?.revision)return undefined;
      const {revision,steps,links}=detail;
      const composition:DraftComposition={name:revision.name,emailSubject:revision.emailSubject,emailBody:revision.emailBody,emailText:revision.emailText,
        preheader:revision.preheader,smsBody:revision.smsBody,senderName:revision.senderName,fromEmail:revision.fromEmail,replyToEmail:revision.replyToEmail,
        smsSender:revision.smsSender,physicalAddress:revision.physicalAddress,messageCategory:revision.messageCategory,inclusionRuleJson:revision.inclusionRuleJson,
        exclusionRulesJson:revision.exclusionRulesJson,sourceTypesJson:revision.sourceTypesJson,trackingEnabled:revision.trackingEnabled,
        links:links.map(({label,destinationUrl})=>({label,destinationUrl})),
        steps:steps.map(step=>({channel:step.channel as 'email'|'sms',timezone:step.timezone,scheduledAt:step.scheduledAt.toISOString(),sendByAt:step.sendByAt.toISOString(),whyThisTime:step.whyThisTime}))};
      return compositionRepository.editSchedule(id,composition,operatorId);
    },

    async review(id: string) {
      const saved = await campaignDetail(id);
      if (!saved) return undefined;
      const editable=await compositionRepository.editable(id);
      const detail=editable?{...saved,...editable,checks:await repository.listChecks(editable.revision.id),results:undefined}:saved;
      const required=new Set<string>(detail.steps.map(step=>step.channel==='email'?'mail.sender.v1':'sms.sender.v1'));
      const rules=detail.revision&&parseStructuredRules(detail.revision.inclusionRuleJson,detail.revision.exclusionRulesJson);
      if(rules?.ok&&rules.sourceTypes.length)required.add('commerce.store.v1');
      return { ...detail, smsPreview:detail.revision?await options.smsPreview?.(id,detail.revision.id):undefined, blockers: (await store.providerBlockers()).filter(blocker=>required.has(blocker.kind)) };
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
