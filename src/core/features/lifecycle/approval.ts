import { smsPolicyAuthority, managedSmsText } from '@/core/features/sms/content';
import {ProviderDeferredError} from '@/core/shared/provider-deferred-error';
import { prepareTestHandoffCost, cancelHandoffCost, settleHandoffCost, settleHandoffFailure, type HandoffCostContext } from '@/core/features/insights/cost-handoff';
import type { DeliveryRequest, ProviderHandoff } from '@/core/shared/platform';
import { createProposalRepository } from '@/core/features/proposals/repository';
import { loadSenderSettings } from '@/core/features/settings/sender-persistence';
import { revisionMatchesSender } from '@/core/features/settings/sender-validation';
import { messageRendererVersion, renderMessageContent, invalidPersonalisation } from '@/core/features/campaigns/message-content';
import { inspectEmailHtml } from '@/core/features/campaigns/email-html-policy';
import { digestJson, sha256 } from './digest';
import { evaluateApproval } from './evaluate-approval';
import { campaignClaimProjection } from '@/core/features/campaigns/campaign-claim-projection';
import type { LifecycleRepository } from './repository';
import type { Channel, FrozenCandidate, LifecycleRuntime } from './types';

export function createApprovalService(runtime: LifecycleRuntime, repository: LifecycleRepository) {
  const publicBaseUrl = runtime.platform.config.publicBaseUrl.toString().replace(/\/$/, '');
  return {
    async preview(input: {campaignId: string; revisionId: string; now?: Date}) {
      const now = input.now ?? new Date();
      const snapshot = await repository.readRevisionSnapshot(input.campaignId, input.revisionId);
      if (!snapshot) return {kind: 'not_found' as const};
      if (snapshot.revision.state !== 'draft') return {kind: 'conflict' as const};
      const {candidates, checkResult, audience, exclusionCounts, personalisationUsage} = await evaluateApproval(runtime, repository, snapshot, now);
      const channelCounts = personalisationUsage.map(usage => ({...usage, recipientStepCount: snapshot.steps.filter(step => step.channel === usage.channel).length * candidates.filter(candidate => candidate.channels[usage.channel]).length}));
      const exclusions = [...exclusionCounts].map(([reason, count]) => ({reason, count}));
      const candidateCount = audience.status === 'ok' ? (audience.candidateCount ?? audience.candidates.length) : null;
      const saved = await repository.saveDraftReview({snapshot, checks: checkResult.checks, now, audience: candidateCount === null ? undefined : {candidateCount, eligibleCount: candidates.length, exclusions, channelCounts}});
      if (!saved) return {kind: 'conflict' as const};
      const projection=await campaignClaimProjection(runtime.platform.database,input.revisionId);
      return {kind: 'preview' as const, asOf: now, sourceStatus: audience.status,
        candidateCount, eligibleCount: candidates.length, exclusions:projection?exclusions.map(item=>({...item,reason:projection.reason(item.reason)})):exclusions, channelCounts,
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
      const revisionDigest = await digestJson({
        smsPolicy: smsPolicy?.digest,
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
        operatorId: input.operatorId,
        idempotencyKey: input.idempotencyKey,
        candidates,
        audienceSummary: audience.status === 'ok' ? {
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
      for (const step of snapshot.steps) {
        await runtime.platform.jobs.enqueue({
          kind: 'campaign.dispatch',
          idempotencyKey: `dispatch:${step.id}:${step.scheduledAt.toISOString()}`,
          payload: { campaignId: snapshot.campaign.id, revisionId: snapshot.revision.id, stepId: step.id, channel: step.channel },
        });
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

    async sendTest(input: {
      campaignId: string;
      revisionId: string;
      operatorId: string;
      channel: Channel;
      to: string;
      now?: Date;
    }) {
      const now = input.now ?? new Date();
      let sender: typeof runtime.platform.mailer;
      let allowlist: string[];
      if (input.channel === 'email') {
        sender = runtime.platform.mailer;
        allowlist = runtime.platform.config.testEmailAllowlist.map((item) => item.toLowerCase());
      } else {
        const smsModule = runtime.platform.config.modules.sms;
        if (!runtime.platform.sms || !smsModule.enabled) {
          const detail = smsModule.enabled
            ? 'The SMS adapter is unavailable despite complete module configuration.'
            : smsModule.detail;
          return { kind: 'blocked' as const, detail };
        }
        sender = runtime.platform.sms;
        allowlist = smsModule.config.testAllowlist;
      }
      const destination = input.channel === 'email' ? input.to.toLowerCase() : input.to;
      if (!allowlist.includes(destination)) return { kind: 'blocked' as const, detail: 'Destination is not on the operator test-send allowlist.' };
      const snapshot = await repository.readRevisionSnapshot(input.campaignId, input.revisionId);
      if (!snapshot) return { kind: 'not_found' as const };
      if (snapshot.revision.state !== 'draft') return { kind: 'blocked' as const, detail: 'Test sends use a saved draft revision.' };
      if (input.channel === 'email' && !revisionMatchesSender(snapshot.revision, await loadSenderSettings(runtime.platform))) {
        return {kind: 'blocked' as const, detail: 'Save sender settings and update this draft to the current business identity and postal address before sending.'};
      }
      const capabilities = await sender.capabilities();
      if (!capabilities.configured || !capabilities.canSendMarketing) return { kind: 'blocked' as const, detail: capabilities.detail };
      const issues = input.channel === 'email' ? inspectEmailHtml(snapshot.revision.emailBody).issues : [];
      issues.push(...invalidPersonalisation(`${snapshot.revision.emailSubject}\n${snapshot.revision.preheader}\n${snapshot.revision.emailBody}\n${snapshot.revision.emailText}\n${snapshot.revision.smsBody}`));
      if (issues.length) return {kind: 'blocked' as const, detail: issues.join(' ')};
      const smsPolicy=input.channel==='sms'?await smsPolicyAuthority(runtime.platform.config):undefined;
      if(smsPolicy&&snapshot.revision.smsSender!==smsPolicy.sender)return {kind:'blocked' as const,detail:'SMS sender changed. Save and review the current programme sender.'};
      const marker = '[MANGO TEST — NOT A CAMPAIGN SEND]';
      const rendered = renderMessageContent(snapshot.revision, {values: {displayName: 'Test recipient'}, unsubscribeUrl: 'https://preview.invalid/unsubscribe/test-example'});
      const content = input.channel === 'email'
        ? {subject: `${marker} ${rendered.subject}`, html: `<p><strong>${marker}</strong></p>${rendered.html}`, text: `${marker}\n\n${rendered.text}`, preheader: `${marker} ${rendered.preheader}`, test: true,
          from: {name: snapshot.revision.senderName, email: snapshot.revision.fromEmail}, replyTo: snapshot.revision.replyToEmail}
        : {text: managedSmsText(`${marker} ${rendered.sms}`,smsPolicy!.policy,smsPolicy!.sender), test: true};
      const revisionDigest = await digestJson({
        rendererVersion: messageRendererVersion,
        revision: snapshot.revision,
        steps: snapshot.steps,
        links: snapshot.links,
      });
      const destinationDigest = await sha256(destination);
      const idempotencyKey = `test:${input.revisionId}:${input.channel}:${destinationDigest}:${revisionDigest}`;
      const request: DeliveryRequest = {
        ...(smsPolicy?{smsAuthority:{policyDigest:smsPolicy.digest,expiresAt:now.getTime()+15*60000}}:{}),
        recipientStepId: `test:${input.revisionId}`, idempotencyKey, to: input.to,
        sender: input.channel === 'email' ? `${snapshot.revision.senderName} <${snapshot.revision.fromEmail}>` : snapshot.revision.smsSender,
        content, callbackUrl: `${publicBaseUrl}/webhooks/${input.channel === 'email' ? 'mail' : 'sms'}/status`, handoffStartedAt: now,
      };
      const costContext: HandoffCostContext = {key:`test-handoff:${idempotencyKey}`,provider:capabilities.provider ?? (input.channel==='email'?'mail.sender.v1':'sms.sender.v1'),operation:'test-handoff',campaignId:input.campaignId};
      const cost=await prepareTestHandoffCost(runtime.platform.database,sender,request,costContext,capabilities.effectiveDeduplication?capabilities.deduplicationWindowMs:0);
      if (input.channel === 'email' && !revisionMatchesSender(snapshot.revision, await loadSenderSettings(runtime.platform))) {
        await cancelHandoffCost(runtime.platform.database,cost.key);
        return {kind: 'blocked' as const, detail: 'Sender settings changed during preparation. Save and review the current sender details before sending.'};
      }
      let handoff: ProviderHandoff;
      try {handoff=await sender.send(request);} catch(error) {
        if(error instanceof ProviderDeferredError) {await cancelHandoffCost(runtime.platform.database,cost.key);return {kind:'blocked' as const,detail:`Send deferred by ${error.code}; available after ${error.retryAt.toISOString()}.`};}
        try { await settleHandoffFailure(runtime.platform.database,sender,request,cost,error); }
        catch { /* The durable prepared fact retains uncertainty; preserve the transport error. */ }
        throw error;
      }
      await repository.recordTestSend(input.revisionId, input.operatorId, input.channel, destinationDigest, revisionDigest, now);
      try { await settleHandoffCost(runtime.platform.database,sender,request,cost,handoff); }
      catch { /* Keep the recorded test send and original receipt; its prepared cost remains unpriced. */ }
      return { kind: 'sent' as const, disposition: handoff.disposition, providerMessageId: handoff.providerMessageId };
    },
  };
}

export type ApprovalService = ReturnType<typeof createApprovalService>;
