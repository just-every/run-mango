import {incumbentReliance} from '../move-in/incumbent-review';
import { digestJson } from './digest';
import { messageRendererVersion } from '@/core/features/campaigns/message-content';
import { smsPolicyAuthority } from '@/core/features/sms/content';
import { createTestSender } from './test-send';
import { createProposalRepository } from '@/core/features/proposals/repository';
import { loadSenderSettings } from '@/core/features/settings/sender-persistence';
import { evaluateApproval } from './evaluate-approval';
import { campaignClaimProjection } from '@/core/features/campaigns/campaign-claim-projection';
import type { LifecycleRepository } from './repository';
import type { Channel, FrozenCandidate, LifecycleRuntime } from './types';
import { openTrackingSettings } from '@/core/features/insights/open-tracking';

export function createApprovalService(runtime: LifecycleRuntime, repository: LifecycleRepository) {
  return {
    async preview(input: {campaignId: string; revisionId: string; now?: Date}) {
      const now = input.now ?? new Date();
      const snapshot = await repository.readRevisionSnapshot(input.campaignId, input.revisionId);
      if (!snapshot) return {kind: 'not_found' as const};
      if (snapshot.revision.state !== 'draft') return {kind: 'conflict' as const};
      const {candidates, checkResult, audience, exclusionCounts, personalisationUsage} = await evaluateApproval(runtime, repository, snapshot, now);
      const incumbentHeldCount=await incumbentReliance(runtime.platform.database.$client,candidates,now);
      const channelCounts = personalisationUsage.map(usage => ({...usage, recipientStepCount: snapshot.steps.filter(step => step.channel === usage.channel).length * candidates.filter(candidate => candidate.channels[usage.channel]).length}));
      const exclusions = [...exclusionCounts].map(([reason, count]) => ({reason, count}));
      const candidateCount = audience.status === 'ok' ? (audience.candidateCount ?? audience.candidates.length) : null;
      const saved = await repository.saveDraftReview({snapshot, checks: checkResult.checks, now, audience: candidateCount === null ? undefined : {incumbentHeldCount,candidateCount, eligibleCount: candidates.length, exclusions, channelCounts, dormancyIncludedCount:audience.status==='ok'?candidates.filter(c=>audience.dormancyIncludedContactIds?.includes(c.contactId)).length:0,noHistoryCount:audience.status==='ok'?candidates.filter(c=>audience.noHistoryContactIds?.includes(c.contactId)).length:0, openOnlyCount:audience.status==='ok'?audience.openOnlyCount??0:0}});
      if (!saved) return {kind: 'conflict' as const};
      const projection=await campaignClaimProjection(runtime.platform.database,input.revisionId);
      return {kind: 'preview' as const, incumbentHeldCount, asOf: now, sourceStatus: audience.status,
        candidateCount, eligibleCount: candidateCount === null ? null : candidates.length,
        exclusions: candidateCount === null ? null : projection?exclusions.map(item=>({...item,reason:projection.reason(item.reason)})):exclusions,
        dormancyIncludedCount:audience.status==='ok'?candidates.filter(c=>audience.dormancyIncludedContactIds?.includes(c.contactId)).length:0,noHistoryCount:audience.status==='ok'?candidates.filter(c=>audience.noHistoryContactIds?.includes(c.contactId)).length:0,openOnlyCount:audience.status==='ok'?audience.openOnlyCount??0:0,
        channelCounts: candidateCount === null ? null : channelCounts,
        checks: projection?checkResult.checks.map(projection.check):checkResult.checks, blockers: checkResult.checks.filter(check => check.blocking)};
    },

    async approve(input: {
      campaignId: string;
      revisionId: string;
      operatorId: string;
      idempotencyKey: string;
      now?: Date;
    }) {
      const now = input.now ?? new Date();
      await createProposalRepository(runtime.platform.database).expireDue(now);
      const snapshot = await repository.readRevisionSnapshot(input.campaignId, input.revisionId);
      if (!snapshot) return { kind: 'not_found' as const };
      if (snapshot.revision.state === 'approved' && snapshot.campaign.activeRevisionId === input.revisionId) {
        const digest = await repository.approvedRevision(input.campaignId, input.revisionId);
        if (!digest) return { kind: 'conflict' as const, detail: 'Approved revision is missing its immutable approval record.' };
        if (snapshot.steps.some(step => step.channel === 'email')
          && !await repository.hasSenderApprovalAuthority(input.campaignId, input.revisionId)) {
          return { kind: 'conflict' as const, detail: 'This historical approval has no sender evidence. An operator must explicitly reapprove the saved revision before pending email can send.' };
        }
        if(snapshot.steps.some(step=>step.channel==='sms')){
          const current=await smsPolicyAuthority(runtime.platform.config);
          const frozen=await runtime.platform.database.$client.prepare('SELECT policy_digest FROM sms_approval_policies WHERE revision_id=?').bind(input.revisionId).first<{policy_digest:string}>();
          if(frozen?.policy_digest!==current.digest)return {kind:'conflict' as const,detail:'SMS programme or sender changed. Create and review a new revision before sending.'};
        }
        return { kind: 'approved' as const, revisionDigest: digest, idempotent: true };
      }
      if (snapshot.revision.state !== 'draft') return { kind: 'conflict' as const, detail: 'Revision is immutable after approval.' };
      const linkedProposal=await runtime.platform.database.$client.prepare('SELECT c.proposal_id,p.state,p.send_by_at FROM campaigns c LEFT JOIN proposals p ON p.id=c.proposal_id WHERE c.id=?').bind(snapshot.campaign.id).first<{proposal_id:string|null;state:string|null;send_by_at:number|null}>();
      if (linkedProposal?.proposal_id && (linkedProposal.state !== 'proposed' || !linkedProposal.send_by_at || linkedProposal.send_by_at <= now.getTime())) return {kind:'conflict' as const,detail:'Only an unexpired proposed suggestion can be approved.'};

      const authority=await runtime.platform.database.$client.prepare('SELECT generation FROM audience_source_authority WHERE id=1').first<{generation:number}>();
      if(!authority)return {kind:'conflict' as const,detail:'Audience source authority is unavailable.'};
      const {candidates, checkResult, audience, exclusionCounts, personalisationUsage} = await evaluateApproval(runtime, repository, snapshot, now);
      const evaluatedAuthority=await runtime.platform.database.$client.prepare('SELECT generation FROM audience_source_authority WHERE id=1').first<{generation:number}>();
      if(evaluatedAuthority?.generation!==authority.generation)return {kind:'conflict' as const,detail:'Audience facts changed during review. Review the current audience and try again.'};
      await repository.saveChecks(snapshot.revision.id, checkResult.checks, now);
      const blockers = checkResult.checks.filter((item) => item.blocking);
      if (blockers.length) return { kind: 'blocked' as const, blockers };

      const smsPolicy=snapshot.steps.some(step=>step.channel==='sms')?await smsPolicyAuthority(runtime.platform.config):undefined;
      const openTracking = await openTrackingSettings(runtime.platform.database.$client);
      const revisionDigest = await digestJson({
        smsPolicy: smsPolicy?.digest,
        openTracking,
        rendererVersion: messageRendererVersion,
        revision: snapshot.revision,
        steps: snapshot.steps,
        links: snapshot.links,
        personalisationUsage,
        frozenCandidates: candidates.map((candidate) => ({
          contactId: candidate.contactId,
          contactIdentityKey: candidate.contactIdentityKey,
          channels: candidate.channels,
        })),
      });
      const result = await repository.approve({
        snapshot,
        revisionDigest,
        sourceGeneration:authority.generation,
        senderLease: checkResult.senderLease,
        smsPolicy,
        openTracking,
        operatorId: input.operatorId,
        idempotencyKey: input.idempotencyKey,
        candidates,
        audienceSummary: audience.status === 'ok' ? {
          incumbentHeldCount:await incumbentReliance(runtime.platform.database.$client,candidates,now),
          dormancyIncludedCount:candidates.filter(c=>audience.dormancyIncludedContactIds?.includes(c.contactId)).length,noHistoryCount:candidates.filter(c=>audience.noHistoryContactIds?.includes(c.contactId)).length,openOnlyCount:audience.openOnlyCount??0,
          candidateCount: audience.candidateCount ?? audience.candidates.length,
          exclusions: Object.fromEntries(exclusionCounts),
          personalisationUsage,
        } : undefined,
        now,
        mailProvider:runtime.platform.config.mailProvider,
        reputationSince:now.getTime()-runtime.platform.config.deliverabilityReportingWindowDays*86400000,
      reconciliationWindowMs: {
          email: checkResult.mailCapabilities.reconciliationWindowMs,
          sms: checkResult.smsCapabilities?.reconciliationWindowMs ?? 0,
        },
      });
      if (result.kind !== 'approved') {
        return { kind: 'conflict' as const, detail: 'The revision or campaign changed while approval checks were running.' };
      }
      // Due steps dispatch now. A step due within the Queue's 12-hour delay limit also gets
      // a command delayed to its instant, so it leaves on time even before Cloudflare starts a
      // new Worker's Cron Trigger; Cron remains the durable path and a duplicate is fenced.
      for (const step of snapshot.steps) {
        const delaySeconds = Math.ceil((step.scheduledAt.getTime() - Date.now()) / 1000);
        if (delaySeconds > 43_200) continue;
        const command = {kind:'campaign.dispatch' as const,idempotencyKey:`dispatch:${step.id}:${step.scheduledAt.toISOString()}`,
          payload:{campaignId:snapshot.campaign.id,revisionId:snapshot.revision.id,stepId:step.id,channel:step.channel}};
        if (delaySeconds > 0) await runtime.platform.jobs.retry(command, delaySeconds);
        else await runtime.platform.jobs.enqueue(command);
      }
      return { kind: 'approved' as const, revisionDigest, idempotent: false };
    },

    async reapprove(input: { campaignId: string; revisionId: string; operatorId: string; idempotencyKey: string }) {
      const snapshot = await repository.readRevisionSnapshot(input.campaignId, input.revisionId);
      if (!snapshot) return { kind: 'not_found' as const };
      if (snapshot.revision.state !== 'approved' || snapshot.campaign.activeRevisionId !== input.revisionId
        || !['scheduled', 'dispatching', 'paused'].includes(snapshot.campaign.state)) {
        return { kind: 'conflict' as const, detail: 'Only the active approved revision can be explicitly reapproved.' };
      }
      const approval = await repository.readApprovalIdentity(input.campaignId, input.revisionId);
      if (!approval || !snapshot.steps.some(step => step.channel === 'email')) {
        return { kind: 'conflict' as const, detail: 'Sender reapproval requires an immutable email approval record.' };
      }
      if (!await repository.hasPendingEmail(input.campaignId, input.revisionId)) {
        return { kind: 'conflict' as const, detail: 'No pending email remains to reapprove; existing provider outcomes are preserved.' };
      }
      // Re-run normal safety checks, without replacing the frozen audience,
      // changing the revision digest, or touching any recipient/provider state.
      const { checkResult } = await evaluateApproval(runtime, repository, snapshot, new Date());
      const blockers = checkResult.checks.filter(check => check.blocking);
      if (blockers.length) return { kind: 'blocked' as const, blockers };
      if (!checkResult.senderLease) return { kind: 'conflict' as const, detail: 'Current sender evidence is required.' };
      const result = await repository.reapproveSender({ snapshot, approval, senderLease: checkResult.senderLease,
        operatorId: input.operatorId, idempotencyKey: input.idempotencyKey });
      if (result.kind !== 'approved') return { kind: 'conflict' as const, detail: 'The revision, pending work, reapproval key or sender authority changed during reapproval.' };
      return result;
    },

    ...createTestSender(runtime, repository),
  };
}

export type ApprovalService = ReturnType<typeof createApprovalService>;
