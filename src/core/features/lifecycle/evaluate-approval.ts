import { evaluateAudience } from './evaluate-audience';
import { messageFallbackKeys } from '@/core/features/campaigns/message-content';
import { authoringSourceIssues } from '@/core/features/campaigns/authoring-source-status';
import { runApprovalChecks } from './checks';
import { prepareApprovalChecks } from './checks-preparation';
import type { LifecycleRepository } from './repository';
import type { LifecycleRuntime, CampaignRevisionSnapshot } from './types';

export async function evaluateApproval(runtime: LifecycleRuntime, repository: LifecycleRepository, snapshot: CampaignRevisionSnapshot, now: Date) {
      const [audienceResult, preparation] = await Promise.allSettled([
        evaluateAudience(runtime,repository,{...snapshot.revision,channels:snapshot.steps.map(step=>step.channel)},now),
        prepareApprovalChecks(snapshot, runtime.platform),
      ]);
      if (audienceResult.status === 'rejected') throw audienceResult.reason;
      const {parsedRules,selectedChannels,audience,candidates,exclusionCounts,blockingEligibility,personalisations}=audienceResult.value;
      if (preparation.status === 'rejected') throw preparation.reason;
      snapshot.revision.sourceTypesJson = JSON.stringify(parsedRules.ok ? parsedRules.sourceTypes : []);
      const checkResult = await runApprovalChecks({ snapshot, candidates, platform: runtime.platform, repository, now, prepared: preparation.value });
      const sourceIssues = audience.status !== 'ok' && 'sourceIssues' in audience ? audience.sourceIssues : undefined;
      checkResult.checks.push({
        // This finding contains only source names and our closed reason
        // vocabulary. Legacy resolution findings still get scrubbed on read.
        kind: sourceIssues?.length ? 'audience.source-freshness' : 'audience.resolution',
        status: audience.status === 'ok' ? 'passed' : 'blocked',
        blocking: audience.status !== 'ok',
        detail: audience.status === 'ok'
          ? `Resolved ${audience.candidates.length} eligible candidate identities from source data as of ${audience.asOf.toISOString()}.`
          : sourceIssues?.length ? authoringSourceIssues(sourceIssues)
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
      if (audience.status === 'ok') checkResult.checks.push({
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
