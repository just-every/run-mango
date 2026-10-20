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
import type { LinkCheckInput, blockedLinkHosts } from '@/core/features/lifecycle/link-checks';

export function createCampaignService(
  repository: ReturnType<typeof createCampaignRepository>,
  compositionRepository: ReturnType<typeof createCampaignCompositionRepository>,
  store: ReturnType<typeof createStoreService>,
  options: { smsEnabled: boolean; commerceEnabled?: boolean; aiEnabled?: boolean; marketingConnectionRequired?: boolean; now?: () => Date; blockedHosts?:(input:LinkCheckInput)=>Promise<ReturnType<typeof blockedLinkHosts>>; smsPreview?:(campaignId:string,revisionId:string)=>Promise<import('@/core/features/sms/review-preview').SmsReviewPreview|undefined> } = { smsEnabled: false },
) {
  async function campaignDetail(id: string, preferEditable = false) {
    const [campaignRead, editableRead] = await Promise.allSettled([
      repository.getCampaign(id), preferEditable ? compositionRepository.editable(id) : undefined,
    ]);
    if (campaignRead.status === 'rejected') throw campaignRead.reason;
    const campaign = campaignRead.value;
    if (!campaign) return undefined;
    if (editableRead.status === 'rejected') throw editableRead.reason;
    const editable = editableRead.value;
    const composition = editable ?? (campaign.activeRevisionId
      ? await compositionRepository.read(campaign.activeRevisionId)
      : undefined);
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
    const [savedChecks, scheduler, results, uncertainDeliveries, attribution] = await Promise.all([
      repository.listChecks(composition.revision.id),
      repository.scheduler(options.now?.() ?? new Date()),
      !editable && composition.revision.state === 'approved'
        ? repository.results(id, composition.revision.id, campaign.state, options.now?.() ?? new Date()) : undefined,
      repository.uncertainDeliveries(id),
      repository.attribution(id,composition.revision.id),
    ]);
    const checks=savedChecks.map(check=>authoringSourceCheck(check,rules.ok?rules.sourceTypes:[]));
    return { campaign, ...composition,
      scheduler,
      revision: {...composition.revision, audienceRule:summarizeAudienceRules(composition.revision.inclusionRuleJson,composition.revision.exclusionRulesJson)},
      results, uncertainDeliveries, checks, attribution };
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
      return { ...collection, smsEnabled:options.smsEnabled, commerceEnabled:options.commerceEnabled === true, aiEnabled:options.aiEnabled === true,
        marketingConnectionRequired:options.marketingConnectionRequired === true, timezone:productConfig.storeTimezone,
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
      const [detailRead, blockersRead] = await Promise.allSettled([campaignDetail(id, true), store.providerBlockers()]);
      if (detailRead.status === 'rejected') throw detailRead.reason;
      const detail = detailRead.value;
      if (!detail) return undefined;
      if (blockersRead.status === 'rejected') throw blockersRead.reason;
      const blockers = blockersRead.value;
      const required=new Set<string>(detail.steps.map(step=>step.channel==='email'?'mail.sender.v1':'sms.sender.v1'));
      const rules=detail.revision&&parseStructuredRules(detail.revision.inclusionRuleJson,detail.revision.exclusionRulesJson);
      if(rules?.ok&&rules.sourceTypes.length)required.add('commerce.store.v1');
      const checks=detail.checks.map(check=>authoringSourceCheck(check,rules?.ok?rules.sourceTypes:[]));
      const [smsPreview, blockedHosts] = await Promise.all([
        detail.revision && detail.steps.some(step=>step.channel==='sms') ? options.smsPreview?.(id,detail.revision.id) : undefined,
        detail.revision ? options.blockedHosts?.({revision:detail.revision,links:detail.links}) : undefined,
      ]);
      return { ...detail, checks, smsPreview, blockedHosts: blockedHosts ?? [], blockers: blockers.filter(blocker=>required.has(blocker.kind)) };
    },

    updateDraft(id: string, composition: DraftComposition, deferRead = false) {
      return compositionRepository.saveDraft(id, composition, new Date(), deferRead);
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
