import { evaluateAudience } from '@/core/features/lifecycle/evaluate-audience';
import { signalStarters } from './signal-starters';
import type { Platform } from '@/core/shared/platform';
import type { LifecycleRuntime } from '@/core/features/lifecycle/types';
import { productConfig } from '@/ext/config';
import { createLifecycleRepository } from '@/core/features/lifecycle/repository';
import { createProposalRepository, createProposalService } from '@/core/features/proposals';
import type { CommerceSourceType } from '@/core/features/store/service';
import type { createStoreService } from '@/core/features/store/service';
import { createCampaignCompositionRepository } from './composition-repository';
import { adoptProposal } from './adopt-proposal';
import type { DraftComposition } from './draft-composition';
import { authoringSourceIssues } from './authoring-source-status';

export function createAuthoringService(platform: Platform, runtime: LifecycleRuntime, store: ReturnType<typeof createStoreService>) {
  const composition = createCampaignCompositionRepository(platform.database);
  const timezone = productConfig.storeTimezone;
  try { if (/^[+-]/.test(timezone)) throw new Error('Offset is not a zone'); new Intl.DateTimeFormat('en', {timeZone:timezone}); } catch { throw new Error('productConfig.storeTimezone must be a valid IANA time zone.'); }
  const defaults = () => {
    const sender = platform.config.mailSender;
    return {senderName:sender.displayName, fromEmail:sender.fromEmail, replyToEmail:sender.replyToEmail, physicalAddress:sender.physicalAddress};
  };
  const starters = signalStarters(platform.database,store,Boolean(platform.commerce));
  return {
    starters:starters.list,
    async fromSignal(id:string,operatorId:string) {
      const source=await starters.read(id);
      if (!source) return {kind:'unavailable' as const,detail:'This store signal is unavailable or stale. Sync it before starting a campaign.'};
      return {kind:'draft' as const,...await composition.createDraft({...defaults(),name:source.title,emailBody:source.emailBody,inclusionRuleJson:source.inclusionRuleJson},operatorId)};
    },
    defaults: () => ({timezone, sender:defaults()}),
    create: (draft: DraftComposition, operatorId: string) => composition.createDraft({...defaults(), ...draft}, operatorId),
    adopt: (id: string, operatorId: string) => adoptProposal(platform.database, id, operatorId, defaults()),
    async audience(draft: {inclusionRuleJson:string; exclusionRulesJson:string; channels:('email'|'sms')[]; stepCounts?:{email:number;sms:number}}) {
      const unavailableCounts = {candidateCount:null, excludedCount:null, eligibleCount:null, channelCounts:null};
      const channels = [...new Set(draft.channels)];
      // Existing channel-only API clients request one step for each selected channel.
      const stepCounts = draft.stepCounts ?? {email:Number(channels.includes('email')),sms:Number(channels.includes('sms'))};
      const result=await evaluateAudience(runtime,createLifecycleRepository(platform.database),{...draft,channels},new Date());
      const {audience,candidates,exclusionCounts,blockingEligibility}=result;
      if(audience.status!=='ok') return {status:audience.status,...unavailableCounts,detail:audience.sourceTypes.length?authoringSourceIssues(audience.sourceTypes.map(sourceType=>({sourceType,reason:audience.status==='stale'?'source-not-current':'source-unavailable'}))):audience.detail};
      if(blockingEligibility.size && result.parsedRules.ok) {
        const reason=[...blockingEligibility][0];
        return {status:reason==='source-unavailable'?'unavailable':'stale',...unavailableCounts,detail:authoringSourceIssues(result.parsedRules.sourceTypes.map(sourceType=>({sourceType,reason})))};
      }
      const candidateCount=audience.candidateCount??audience.candidates.length;
      return {status:'ok',asOf:audience.asOf,candidateCount,excludedCount:candidateCount-candidates.length,eligibleCount:candidates.length,
        channelCounts:channels.map(channel=>({channel,stepCount:stepCounts[channel],eligibleContactCount:candidates.filter(candidate=>candidate.channels[channel]).length,recipientStepCount:candidates.filter(candidate=>candidate.channels[channel]).length*stepCounts[channel]})),
        exclusions:[...exclusionCounts].map(([reason,count])=>({reason,count}))};
    },
    async generate() {
      if (!platform.ai) return {kind:'unavailable', detail:'AI suggestions are unavailable. You can create a campaign manually.'};
      if (!platform.commerce) return {kind:'unavailable', detail:'Connect commerce and sync store evidence before generating a suggestion. Manual authoring is available.'};
      const rows = await platform.database.$client.prepare('SELECT id, source_type, payload, occurred_at FROM source_records ORDER BY occurred_at DESC LIMIT 30').all<{id:string;source_type:string;payload:string;occurred_at:number}>();
      if (!rows.results.length) return {kind:'unavailable', detail:'Sync store evidence before generating a suggestion. Manual authoring is available.'};
      const issues = await store.freshness([...new Set(rows.results.map(row => row.source_type))] as CommerceSourceType[], new Date());
      if (issues.length) return {kind:'unavailable', detail:authoringSourceIssues(issues)};
      return createProposalService(createProposalRepository(platform.database), platform.ai).generate({
        evidence:rows.results.map(row => ({key:row.id, sourceRecordId:row.id, sourceType:row.source_type, observedValue:JSON.parse(row.payload), occurredAt:new Date(row.occurred_at)})),
        configuredKnowledge:Object.entries({...defaults(), timezone}).map(([key,value]) => ({key,value})),
        sendByAt:new Date(Date.now() + 7*86400000),
      });
    },
  };
}
