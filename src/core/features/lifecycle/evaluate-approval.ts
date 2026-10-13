import { evaluateAudience } from './evaluate-audience';
import { messageFallbackKeys } from '@/core/features/campaigns/message-content';
import { authoringSourceIssues } from '@/core/features/campaigns/authoring-source-status';
import { runApprovalChecks } from './checks';
import type { LifecycleRepository } from './repository';
import type { LifecycleRuntime, CampaignRevisionSnapshot } from './types';

export async function evaluateApproval(runtime: LifecycleRuntime, repository: LifecycleRepository, snapshot: CampaignRevisionSnapshot, now: Date) {
      const {parsedRules,selectedChannels,audience,candidates,exclusionCounts,blockingEligibility,personalisations}=await evaluateAudience(runtime,repository,{...snapshot.revision,channels:snapshot.steps.map(step=>step.channel)},now);
      snapshot.revision.sourceTypesJson = JSON.stringify(parsedRules.ok ? parsedRules.sourceTypes : []);
      const checkResult = await runApprovalChecks({ snapshot, candidates, platform: runtime.platform, repository, now });
      checkResult.checks.push({
        kind: 'audience.resolution',
        status: audience.status === 'ok' ? 'passed' : 'blocked',
        blocking: audience.status !== 'ok',
        detail: audience.status === 'ok'
          ? `Resolved ${audience.candidates.length} eligible candidate identities from source data as of ${audience.asOf.toISOString()}.`
          : audience.sourceTypes.length
            ? authoringSourceIssues(audience.sourceTypes.map(sourceType=>({sourceType,reason:audience.status==='stale'?'source-not-current':'source-unavailable'})))
            : audience.detail,
      });
      checkResult.checks.push({
        kind: 'audience.exclusions',
        status: 'passed',
        blocking: false,
        detail: JSON.stringify(Object.fromEntries(exclusionCounts)),
      });
      checkResult.checks.push({
        kind: 'audience.recheck',
        status: blockingEligibility.size ? 'blocked' : 'passed',
        blocking: blockingEligibility.size > 0,
        detail: blockingEligibility.size
          ? `Source eligibility changed during approval: ${[...blockingEligibility].join(', ')}.`
          : 'Every frozen candidate was rechecked against commerce, dormancy, consent, and frequency policy.',
      });
      checkResult.checks.push({
        kind: 'audience.eligible',
        status: candidates.length > 0 ? 'passed' : 'blocked',
        blocking: candidates.length === 0,
        detail: candidates.length ? `${candidates.length} eligible candidates have at least one eligible channel.` : 'No eligible candidate can be scheduled.',
      });

 const personalisationUsage = selectedChannels.map(channel => ({channel,
   eligibleContactCount: candidates.filter(candidate=>candidate.channels[channel]).length,
   fallbackContactCount: candidates.filter(candidate=>candidate.channels[channel] && messageFallbackKeys(snapshot.revision,channel,personalisations.get(`${candidate.contactId}:${channel}`)??{}).length).length,
 }));
 return {candidates, checkResult, audience, exclusionCounts, personalisationUsage};
}
