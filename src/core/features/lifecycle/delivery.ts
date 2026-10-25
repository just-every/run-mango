import {CatalogDeliverySkip} from '@/core/features/campaigns/catalog-outcomes';
import { utf8Bytes, emailByteLimit } from '@/core/features/campaigns/email-size';
import {aggregateMobileMessageParts,matchesMobileMessagePart} from './mobile-message-status';
import {reputationRestricted} from './reputation-guard';
import {trackedRequestAutomation} from './tracked-link-policy';
import {programme,smsWindow,smsLocationFresh,nextPermittedSmsInstant} from '@/core/features/sms/policy';
import {ProviderDeferredError} from '@/core/shared/provider-deferred-error';
import {recordProviderHold,activeProviderHolds,importSendgridAccountEvents} from './provider-holds';
import {notifyProviderOutages} from './provider-notices';
import {refreshDeliveryProgress,nextDispatchDelay} from './delivery-progress';
import { cancelHandoffCost, prepareHandoffCost, settleHandoffCost, settleHandoffFailure } from '@/core/features/insights/cost-handoff';
import {privateInboxFact} from './provider-inbox-privacy';
import { loadSenderSettings } from '@/core/features/settings/sender-persistence';
import { revisionMatchesSender } from '@/core/features/settings/sender-validation';
import { serializedFrom } from '@/core/features/sender-verification/identity';
import { unavailableInspection } from '@/core/features/sender-verification/service';
import { ProviderTransportError } from '@/core/shared/platform';

import { sha256 } from './digest';
import { parseDeliveryRequest, prepareDeliveryRequest, serializeDeliveryRequest } from './message-renderer';
import {recheckDeliveryEligibility} from './delivery-eligibility';

import type { LifecycleRepository } from './repository';
import type {
  Channel,
  LifecycleRuntime,
  ProviderFact,
  QueueMessage,
} from './types';
import { parseVerifiedWebhook } from './webhook-facts';

const retrySeconds = [60, 180, 600, 900, 1_200];
const unavailableRecipientBatchSize = 100;


export function createDeliveryService(runtime: LifecycleRuntime, repository: LifecycleRepository) {
  const sender = (channel: Channel) => channel === 'email' ? runtime.platform.mailer : runtime.platform.sms;
  const adapterName = (channel: Channel) => channel === 'email' ? 'mail.sender.v1' : 'sms.sender.v1';
  const unavailableModuleDetail = (channel: Channel) => {
    if (channel === 'email') return 'The required mail adapter is unavailable despite complete mail configuration.';
    const module = runtime.platform.config.modules.sms;
    return module.enabled
      ? 'The SMS adapter is unavailable despite complete module configuration.'
      : module.detail;
  };

  const recheck=(envelope:NonNullable<Awaited<ReturnType<typeof repository.getDeliveryEnvelope>>>,now:Date)=>recheckDeliveryEligibility(runtime,repository,envelope,now);

  async function dispatchRecipient(recipientId: string, now: Date) {
    const beforeClaim = await repository.getDeliveryEnvelope(recipientId);
    if (!beforeClaim) return;
    const outage=await repository.channelOutage(adapterName(beforeClaim.recipient.channel),beforeClaim.recipient.channel);
    if(outage) {
      await repository.pauseChannel({campaignId:beforeClaim.recipient.campaignId,revisionId:beforeClaim.recipient.revisionId,channel:beforeClaim.recipient.channel,
        reason:'provider-outage',detail:outage.detail,resumeCheckAt:new Date(Date.now()+runtime.platform.config.providerReconciliationIntervalMinutes*60000),now});
      return;
    }
    if (beforeClaim.recipient.channel === 'email'
      && !revisionMatchesSender(beforeClaim.revision, await loadSenderSettings(runtime.platform))) {
      await repository.noteSenderApprovalRequired(recipientId);
      return;
    }
    if (beforeClaim.recipient.channel === 'email'
      && !await repository.hasSenderApprovalAuthority(beforeClaim.recipient.campaignId, beforeClaim.recipient.revisionId)) {
      await repository.noteSenderApprovalRequired(recipientId);
      return;
    }
    const dispatchEligibility = await recheck(beforeClaim, now);
    const claimed = await repository.claimRecipient(recipientId, now);
    if (!claimed?.leaseToken) return;
    const adapter = sender(claimed.channel);
    if (!adapter) {
      await repository.recordTransportFailure({
        id: claimed.id,
        leaseToken: claimed.leaseToken,
        code: `${claimed.channel}_module_unconfigured`,
        detail: unavailableModuleDetail(claimed.channel),
        permanent: true,
        now,
      });
      return;
    }
    const handleIneligible = async (eligibility: Extract<Awaited<ReturnType<typeof recheck>>, { eligible: false }>) => {
      if (eligibility.retryAt) {
        await repository.deferRecipient(claimed.id, claimed.leaseToken!, eligibility.retryAt, eligibility.reason, now);
        if (eligibility.reason.startsWith('source-')) {
          await repository.pauseChannel({
            campaignId: claimed.campaignId,
            revisionId: claimed.revisionId,
            channel: claimed.channel,
            reason: 'source-freshness',
            detail: eligibility.reason,
            resumeCheckAt: eligibility.retryAt,
            now,
          });
        }
      } else {
        await repository.markSkipped(claimed.id, claimed.leaseToken!, eligibility.reason, now);
      }
    };
    if (!dispatchEligibility.eligible) {
      await handleIneligible(dispatchEligibility);
      return;
    }

    const eligibility = await recheck(beforeClaim, new Date());
    if (!eligibility.eligible) {
      await handleIneligible(eligibility);
      return;
    }
    if (claimed.channel === 'sms') {
      if(!smsLocationFresh(now,eligibility.contact.timeZone??null,eligibility.contact.timeZoneEvidenceSource??null,eligibility.contact.timeZoneEvidenceAt?.getTime()??null)) {
        await repository.markSkipped(claimed.id,claimed.leaseToken,'recipient-timezone-unknown-or-stale',now);
        return;
      }
      if (!eligibility.contact.country) {
        await repository.markSkipped(claimed.id, claimed.leaseToken, 'recipient-country-unknown', now);
        return;
      }
      const policy=programme(runtime.platform);
      const gate=smsWindow(policy,now,eligibility.contact.timeZone??null,eligibility.contact.timeZoneEvidenceSource??null,eligibility.contact.timeZoneEvidenceAt?.getTime()??null);
      if(!gate.allowed) {
        const next=nextPermittedSmsInstant(policy,now,eligibility.contact.timeZone??null,eligibility.contact.timeZoneEvidenceSource??null,eligibility.contact.timeZoneEvidenceAt?.getTime()??null,claimed.sendByAt);
        await repository.deferRecipient(claimed.id,claimed.leaseToken,next.at??claimed.sendByAt,next.reason,now);
        return;
      }
    }
    const capabilities = await adapter.capabilities();
    const singleAttempt=claimed.channel==='email'&&capabilities.provider==='sendgrid'&&capabilities.handoffPolicy==='single-attempt';
    const requiredWindow=Math.max(0,claimed.sendByAt.getTime()-Date.now())
      +runtime.platform.config.unresolvedProviderOutcomeHours*3600000
      +runtime.platform.config.providerReconciliationIntervalMinutes*120000;
    const durableAuthority=singleAttempt||(capabilities.handoffPolicy!=='single-attempt'&&capabilities.effectiveDeduplication
      &&capabilities.effectiveReconciliation&&capabilities.deduplicationWindowMs>=requiredWindow&&capabilities.reconciliationWindowMs>=requiredWindow);
    if (!capabilities.configured || !capabilities.canSendMarketing || !durableAuthority) {
      const retryAt=new Date(now.getTime()+runtime.platform.config.providerReconciliationIntervalMinutes*60000);
      await repository.deferRecipient(claimed.id, claimed.leaseToken,
        retryAt, 'provider-authority-unavailable', now);
      await repository.pauseChannel({campaignId:claimed.campaignId,revisionId:claimed.revisionId,channel:claimed.channel,
        reason:'provider-configuration',detail:capabilities.detail,resumeCheckAt:retryAt,now});
      return;
    }
    await repository.resumeChannel(claimed.campaignId,claimed.revisionId,claimed.channel,'provider-configuration',now);
    if (claimed.channel === 'sms') {
      const senderCheck = await adapter.validateSender(beforeClaim.revision.smsSender, eligibility.contact.country!);
      if (!senderCheck.ready) {
        await repository.markSkipped(claimed.id, claimed.leaseToken, 'sender-not-registered', now);
        return;
      }
    }
    let prepared;
    try{prepared=await prepareDeliveryRequest(runtime,{...beforeClaim,recipient:{...beforeClaim.recipient,outboundRequestJson:claimed.outboundRequestJson}},eligibility,now);}
    catch(error){if(error instanceof CatalogDeliverySkip){await repository.markSkipped(claimed.id,claimed.leaseToken,error.reason,now);return;}throw error;}
    // Persisted outbound JSON is authoritative on restart, including content.from.
    const request = prepared.request;
    if(claimed.channel==='email' && 'html' in request.content && (utf8Bytes(request.content.html ?? '')>emailByteLimit||utf8Bytes(request.content.text)>emailByteLimit)) {
      await repository.markSkipped(claimed.id,claimed.leaseToken,'email-too-large',now);
      return;
    }
    const saved = await repository.saveOutboundRequest({
      id: claimed.id,
      leaseToken: claimed.leaseToken,
      requestJson: serializeDeliveryRequest(request),
      trackedLinks: prepared.trackedLinks,
      now,
    });
    if (!saved) return;
    const inspection = claimed.channel === 'email'
      ? await adapter.inspectSender?.(serializedFrom(request)) ?? unavailableInspection('verification-not-configured')
      : undefined;
    if (inspection && (!inspection.ready || !inspection.lease)) {
      const retryAt = new Date(Date.now() + runtime.platform.config.providerReconciliationIntervalMinutes * 60_000);
      await repository.deferRecipient(claimed.id, claimed.leaseToken, retryAt, `sender-verification:${inspection.reason}`, new Date());
      return;
    }
    const finalEligibility = await recheck(beforeClaim, new Date());
    if (!finalEligibility.eligible) {
      await handleIneligible(finalEligibility);
      return;
    }
    if (finalEligibility.contact.destination !== request.to) {
      await repository.markSkipped(claimed.id, claimed.leaseToken, 'destination-changed-after-preparation', new Date());
      return;
    }
    const provider=capabilities.provider??runtime.platform.config.mailProvider??'resend';
    const holds=await activeProviderHolds(runtime.platform.database,provider,claimed.channel,claimed.channel==='email'?beforeClaim.revision.fromEmail:beforeClaim.revision.smsSender);
    const reputation=await repository.reputation(beforeClaim.revision.fromEmail,'email',new Date(Date.now()-runtime.platform.config.deliverabilityReportingWindowDays*86400000));
    if(holds.length||(claimed.channel==='email'&&reputationRestricted(reputation))) {
      const detail=holds.length?holds.map(h=>`${h.provider} ${h.scope}: ${h.detail}`).join('; '):`Local reputation: complaints ${reputation.complained}/${reputation.delivered}; hard bounces ${reputation.hardBounced}/${reputation.attempted}.`;
      await repository.pauseChannel({campaignId:claimed.campaignId,revisionId:claimed.revisionId,channel:claimed.channel,reason:'provider-or-reputation-hold',detail,resumeCheckAt:new Date(Date.now()+60000),now:new Date()});
      await repository.deferRecipient(claimed.id,claimed.leaseToken,new Date(Date.now()+60000),'provider-or-reputation-hold',new Date());return;
    }
    await repository.resumeChannel(claimed.campaignId,claimed.revisionId,claimed.channel,'provider-or-reputation-hold',new Date());
    await repository.resumeChannel(claimed.campaignId, claimed.revisionId, claimed.channel, 'source-freshness', new Date());
    const costContext = {
      key: `handoff:${capabilities.provider ?? (claimed.channel === 'email' ? runtime.platform.config.mailProvider ?? 'unreported' : 'mobile-message')}:${claimed.id}:${claimed.attemptCount+1}`,
      provider: capabilities.provider ?? (claimed.channel === 'email' ? runtime.platform.config.mailProvider ?? 'unreported' : 'mobile-message'), operation: 'provider-handoff' as const,
      campaignId: claimed.campaignId, recipientStepId: claimed.id, occurredAt: new Date(),
    };
    await prepareHandoffCost(runtime.platform.database, adapter, request, costContext);
    if (!await repository.markHandoffUnknown(claimed.id, claimed.leaseToken, new Date(), inspection?.lease, claimed.outboundRequestJson ?? serializeDeliveryRequest(request), capabilities.provider,capabilities.reconciliationWindowMs,Date.now()-runtime.platform.config.deliverabilityReportingWindowDays*86400000,await sha256(`${runtime.platform.config.contactHashSalt}:${request.to}`),finalEligibility.sourceGeneration,await sha256(claimed.channel==='email'?runtime.platform.config.mailProviderApiKey:runtime.platform.config.modules.sms.enabled?runtime.platform.config.modules.sms.config.providerApiKey:''))) {
      await cancelHandoffCost(runtime.platform.database, costContext.key);
      await repository.deferRecipient(claimed.id, claimed.leaseToken,
        new Date(Date.now() + runtime.platform.config.providerReconciliationIntervalMinutes * 60_000),
        'approval-or-sender-authority-changed', new Date());
      return;
    }
    let handoff;
    try {
      handoff = await adapter.send(request);
    } catch (error) {
      const detail = 'Provider hand-off could not be confirmed.';
      if(error instanceof ProviderDeferredError) {
        await repository.deferPacedRecipient(claimed.id,claimed.leaseToken,error.retryAt,new Date(),error.code);
        await cancelHandoffCost(runtime.platform.database,costContext.key);return;
      }
      if (error instanceof ProviderTransportError) {
        const plannedDelay = retrySeconds[claimed.attemptCount];
        const delaySeconds = plannedDelay===undefined?undefined:Math.max(plannedDelay,error.failure.retryAfterSeconds??0);
        const retryAt = delaySeconds === undefined ? undefined : new Date(Date.now() + delaySeconds * 1_000);
        const firstAttempt=claimed.firstAttemptAt??new Date();
        const canRetry = !error.failure.permanent && retryAt !== undefined && retryAt < claimed.sendByAt && retryAt.getTime()<=firstAttempt.getTime()+3600000;
        // The shared production transport persists restrictive refusals before
        // returning them, including service, test and operator-notice sends.
        await repository.recordTransportFailure({
          id: claimed.id,
          leaseToken: claimed.leaseToken,
          code: error.failure.code,
          detail: error.failure.detail,
          permanent: !canRetry,
          retryAt: canRetry ? retryAt : undefined,
          now: new Date(),
        });
        if (canRetry && retryAt) {
          await runtime.platform.jobs.retry({
            kind: 'campaign.dispatch',
            idempotencyKey: `dispatch-retry:${claimed.id}:${claimed.attemptCount+1}`,
            payload: {
              campaignId: claimed.campaignId,
              revisionId: claimed.revisionId,
              stepId: claimed.stepId,
              channel: claimed.channel,
            },
          }, delaySeconds!);
          await repository.recordProviderFailure(adapterName(claimed.channel), claimed.channel, detail, new Date());
        }
        await settleHandoffFailure(runtime.platform.database, adapter, request, costContext, error);
        return;
      }
      await repository.noteUnknownFailure(claimed.id, claimed.leaseToken, detail, new Date());
      await repository.recordProviderFailure(adapterName(claimed.channel), claimed.channel, detail, new Date());
      await settleHandoffFailure(runtime.platform.database, adapter, request, costContext, error);
    }
    if (handoff) {
      await repository.recordHandoff({
        id: claimed.id, leaseToken: claimed.leaseToken, provider: costContext.provider,
        providerMessageId: handoff.providerMessageId, disposition: handoff.disposition,
        acceptedAt: handoff.providerAcceptedAt, actualSender:handoff.actualSender, now: new Date(),
      });
      if(handoff.complianceHold)await recordProviderHold(runtime.platform.database,{provider,...handoff.complianceHold,held:true,effectiveAt:Date.now(),evidenceId:`receipt:${handoff.providerMessageId}`,detail:'Provider substituted the requested sender. Acceptance is retained; further handoffs require sender review.'});
    }
    if(claimed.channel==='sms') {const whole=await aggregateMobileMessageParts(runtime.platform.database,claimed.id);if(whole)await repository.recordProviderFact(claimed.id,'mobile-message',whole,new Date());}
    await runtime.platform.jobs.enqueue({
      kind: 'delivery.reconcile',
      idempotencyKey: `reconcile:${claimed.id}`,
      payload: { recipientStepId: claimed.id },
    });
    // A cost write failure cannot discard the stored receipt or reclassify acceptance.
    if (handoff) await settleHandoffCost(runtime.platform.database, adapter, request, costContext, handoff);
  }

  async function dispatchStep(payload: Record<string, unknown>) {
    const stepId = String(payload.stepId ?? '');
    const revisionId = String(payload.revisionId ?? '');
    if (!stepId || !revisionId) throw new Error('Dispatch command requires stepId and revisionId.');
    const now = new Date();
    const channel = String(payload.channel ?? 'email') as Channel;
    let rate = runtime.platform.config.emailHandoffsPerMinute;
    if (channel === 'sms') {
      const smsModule = runtime.platform.config.modules.sms;
      rate = smsModule.enabled && runtime.platform.sms
        ? smsModule.config.handoffsPerMinute
        : unavailableRecipientBatchSize;
    }
    await repository.expireDueRecipients(now);
    const began = await repository.beginStep(stepId, revisionId, now, now);
    if (!began) {await repository.completeCampaigns(now);return;}
    await refreshDeliveryProgress(runtime,channel);
    const recipientIds = await repository.listDueRecipientIds(stepId, now, Math.min(rate,100));
    for (const recipientId of recipientIds) {
      const work=dispatchRecipient(recipientId,new Date()).then(()=>({ok:true as const}),error=>({ok:false as const,error}));
      for(;;) {
        let timer:ReturnType<typeof setTimeout>|undefined;
        const result=await Promise.race([work,new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),15000);})]);
        clearTimeout(timer);
        if(result) {if(!result.ok)throw result.error;break;}
        await refreshDeliveryProgress(runtime,channel);
      }
      await refreshDeliveryProgress(runtime,channel);
    }
    const nextDelay=await nextDispatchDelay(runtime.platform,stepId);
    if(nextDelay!==undefined&&!await repository.channelOutage(adapterName(channel),channel))await runtime.platform.jobs.retry({kind:'campaign.dispatch',idempotencyKey:`dispatch:${stepId}`,payload},nextDelay);
    await refreshDeliveryProgress(runtime,channel);
    await repository.completeStep(stepId, new Date());
    await repository.completeCampaigns(new Date());
  }

  async function importFacts(provider: string, facts: ProviderFact[], knownRecipientStepId?: string, sourceChannel?: Channel) {
    // Provider names are publisher identities, not channel identifiers. Verified
    // ingress and reconciliation know their channel; direct adapter imports must
    // resolve one unambiguous configured channel rather than defaulting to SMS.
    let channel = sourceChannel;
    if (!channel) {
      const matches: Channel[] = [];
      for (const candidate of ['email', 'sms'] as const) {
        const adapter = sender(candidate);
        if (!adapter) continue;
        if (adapter.channel !== candidate) continue;
        const capabilities = await adapter.capabilities();
        if ((capabilities.provider ?? adapterName(candidate)) === provider) matches.push(candidate);
      }
      if (matches.length !== 1) throw new Error('Provider fact import requires one explicit source channel.');
      channel = matches[0];
    }
    for (const fact of facts) {
      const persisted=await privateInboxFact(runtime.platform.database.$client,runtime.platform.config.contactHashSalt,provider,channel,fact);
      await repository.recordProviderInboxFact(provider,persisted,new Date(),channel);

      if (fact.kind === 'sms-reply') {
        const action = String(fact.detail.action ?? '').toLowerCase();
        const destination = String(fact.detail.destination ?? '');
        if (['stop', 'stopall', 'end', 'quit', 'cancel', 'unsubscribe', 'optout', 'revoke'].includes(action)) {
          await runtime.audience.recordChannelOptOut({ destination, channel: 'sms', reason: `sms-reply:${action}`, occurredAt: fact.occurredAt });
        }
      }
      const suppliedDestination = typeof fact.detail.destination === 'string' ? fact.detail.destination : undefined;
      const safetyFact = fact.kind === 'complained' || fact.kind === 'suppressed' || (fact.kind === 'bounced' && fact.detail.hard === true);
      const suppress = async (destination: string) => runtime.audience.recordProviderSuppression({
        destination, channel, cause: fact.kind === 'bounced' ? 'hard-bounce' : fact.kind, occurredAt: fact.occurredAt,
        providerEventId: `provider-suppression:${await sha256(JSON.stringify([provider, fact.identity, channel, destination]))}`,
      });
      // A verified address-level safety fact is authoritative even if no Mango
      // hand-off can be correlated. It must not fabricate a delivery outcome.
      // Uncorrelated facts may only restrict an address, never relax it.
      if (safetyFact && suppliedDestination) await suppress(suppliedDestination);
      const factKey = async (kind: string) => `${kind}:${await sha256(JSON.stringify([provider, fact.identity, channel]))}`;
      if (fact.kind === 'unsubscribed' && suppliedDestination) {
        await runtime.audience.recordChannelOptOut({ destination: suppliedDestination, channel, reason: 'provider-unsubscribe',
          occurredAt: fact.occurredAt, stableId: await factKey('provider-unsubscribe') });
      }
      if (channel === 'email' && fact.kind === 'bounced' && fact.detail.hard !== true && suppliedDestination) {
        await runtime.audience.recordSoftBounce({ destination: suppliedDestination, occurredAt: fact.occurredAt, providerEventId: await factKey('provider-soft-bounce') });
      }
      const reference = typeof fact.detail.mangoReference === 'string' ? fact.detail.mangoReference : undefined;
      const row: Record<string, unknown> | null | undefined = knownRecipientStepId
        ? await repository.getDeliveryEnvelope(knownRecipientStepId).then((value) => value ? ({
            id: value.recipient.id, destination: value.recipient.destination, channel: value.recipient.channel,
            provider: value.recipient.provider, provider_message_id: value.recipient.providerMessageId, contact_id: value.recipient.contactId,
          }) : undefined)
        : fact.providerMessageId
          ? await repository.findRecipientByProviderMessage(fact.providerMessageId, provider, channel)
            ?? (reference ? await repository.findRecipientByMangoReference(reference) : undefined)
          : reference ? await repository.findRecipientByMangoReference(reference) : undefined;
      if (!row || !row.destination || row.channel !== channel || (row.provider && row.provider !== provider)
        || (row.provider_message_id && fact.providerMessageId && row.provider_message_id !== fact.providerMessageId)
        || (suppliedDestination && suppliedDestination !== row.destination)) continue;
      const recipientStepId = String(row.id);
      if(provider==='mobile-message'&&fact.detail.providerEvent==='part-status'&&!await matchesMobileMessagePart(runtime.platform.database,recipientStepId,fact))continue;
      if (fact.providerMessageId) await repository.bindProviderMessage(recipientStepId, fact.providerMessageId, provider, new Date());
      if (safetyFact && !suppliedDestination) await suppress(String(row.destination));
      await repository.recordProviderFact(recipientStepId, provider, persisted, new Date());
      if(provider==='mobile-message') {const whole=await aggregateMobileMessageParts(runtime.platform.database,recipientStepId);if(whole)await repository.recordProviderFact(recipientStepId,provider,whole,new Date());}
      if (channel === 'email' && fact.kind === 'delivered' && row.contact_id) {
        await runtime.audience.recordProviderDelivery({ contactId: String(row.contact_id), occurredAt: fact.occurredAt, providerEventId: await factKey('provider-delivery') });
      }
    }
    await repository.completeCampaigns(new Date());
  }

  async function reconcileRecipient(recipientStepId: string) {
    const envelope = await repository.getDeliveryEnvelope(recipientStepId);
    if (!envelope?.recipient.outboundRequestJson) return;
    const recipient = envelope.recipient;
    const outboundRequestJson = recipient.outboundRequestJson;
    if (!outboundRequestJson) return;
    const adapter = sender(recipient.channel);
    const credential=recipient.channel==='email'?runtime.platform.config.mailProviderApiKey:runtime.platform.config.modules.sms.enabled?runtime.platform.config.modules.sms.config.providerApiKey:'';
    const capabilities=await adapter?.capabilities();
    const sameAuthority=adapter&&recipient.provider&&capabilities?.provider===recipient.provider
      &&recipient.providerCredentialDigest===await sha256(credential);
    if(!sameAuthority) {
      await repository.pauseChannel({campaignId:recipient.campaignId,revisionId:recipient.revisionId,channel:recipient.channel,
        reason:'reconciliation-authority',detail:'The original provider credential is unavailable. Existing uncertainty requires that provider authority or operator review; no replacement provider will resend or classify it.',
        resumeCheckAt:new Date(Date.now()+60000),now:new Date()});
      return;
    }
    await repository.resumeChannel(recipient.campaignId,recipient.revisionId,recipient.channel,'reconciliation-authority',new Date());
    const sendgridException=recipient.channel==='email'&&recipient.provider==='sendgrid';
    if(!sendgridException&&recipient.reconcileUntil&&recipient.reconcileUntil<=new Date()){
      await repository.failUnconfirmed(recipient.id,new Date());await repository.completeCampaigns(new Date());return;
    }
    const result = await adapter.reconcile(parseDeliveryRequest(outboundRequestJson), {
      providerMessageId: recipient.providerMessageId,
      cursor: recipient.reconcileCursor,
    });
    await importFacts(recipient.provider ?? adapterName(recipient.channel), result.facts, recipient.id, recipient.channel);
    await repository.saveReconciliationCursor(recipient.id, result.exhausted?undefined:result.cursor, new Date());
    if (!result.exhausted) {
      await runtime.platform.jobs.retry({
        kind: 'delivery.reconcile', idempotencyKey: `reconcile:${recipient.id}:${result.cursor ?? 'next'}`,
        payload: { recipientStepId: recipient.id },
      }, 1);
      return;
    }
    if (!sendgridException && recipient.reconcileUntil && recipient.reconcileUntil <= new Date()) {
      await repository.failUnconfirmed(recipient.id,new Date());await repository.completeCampaigns(new Date());
    }
  }

  return {
    dispatchStep,
    reconcileRecipient,
    importFacts,

    async reconcileUnresolved() {
      const unresolved = await repository.listUnresolved(new Date());
      for (const recipient of unresolved)await runtime.platform.jobs.enqueue({kind:'delivery.reconcile',idempotencyKey:`reconcile:${recipient.id}`,payload:{recipientStepId:recipient.id}});
    },

    async probeOutage(channel: Channel) {
      const adapter = sender(channel);
      // An installation without a provider (a copy on a computer) has nothing to probe.
      if (!adapter || !(await adapter.capabilities()).configured) return;
      const now=new Date();
      const due=await repository.claimOutageProbe(adapterName(channel),channel,now,runtime.platform.config.providerReconciliationIntervalMinutes*60000);
      if(due) {
        const health=await adapter.probeHealth?.();
        await repository.recordProviderHealth(adapterName(channel),channel,health?.reachable??false,health?.code??'provider-health-unavailable',new Date());
        if(health?.reachable)await repository.recoverProvider(adapterName(channel),channel,new Date());
        else await repository.recordProviderFailure(adapterName(channel),channel,health?.code??'Authenticated provider probe unavailable.',new Date(),true);
      }
      if(channel==='email')await notifyProviderOutages(runtime.platform);
    },

    async handleWebhook(channel: Channel, request: Request) {
      const adapter = sender(channel);
      if (!adapter || (channel === 'sms' && !runtime.platform.config.modules.sms.enabled)) {
        return { kind: 'unavailable' as const };
      }
      const capabilities = await adapter.capabilities();
      if (!capabilities.configured || (channel === 'email'
        && (capabilities.provider === 'rer' || (runtime.platform.config.mailProvider && !runtime.platform.config.mailWebhookSecret)))) {
        return { kind: 'unavailable' as const };
      }
      const verified = await adapter.verifyWebhook(request);
      if(verified.provider==='sendgrid')await importSendgridAccountEvents(runtime.platform.database,verified.rawBody);
      const facts = await parseVerifiedWebhook(channel, verified);
      await importFacts(channel === 'email' ? verified.provider ?? 'resend' : 'mobile-message', facts, undefined, channel);
      return { kind: 'accepted' as const };
    },

    async followTrackedLink(token: string, request: Request) {
      // The redirect forwards for the life of the delivered message (RESULT-005);
      // only click recording ends, when the link's recording window closes.
      try {
        await runtime.platform.publicTokens.read(token, 'link');
      } catch {
        return { kind: 'not_found' as const };
      }
      const digest = await runtime.platform.publicTokens.digest(token);
      const link = await repository.trackedLink(digest);
      if (!link) return { kind: 'not_found' as const };
      const now = new Date();
      if (now.getTime() < link.recordsClicksUntil) {
        const userAgent = request.headers.get('User-Agent') ?? '';
        const automationReason = trackedRequestAutomation(request);
        const requestDigest = await sha256(`${digest}:${request.headers.get('CF-Ray') ?? crypto.randomUUID()}`);
        await repository.recordClick({
          recipientStepId: link.recipientStepId,
          destinationUrl: link.originalDestinationUrl,
          revisionLinkId: link.revisionLinkId,
          requestDigest,
          occurredAt: now,
          automated: Boolean(automationReason),
          automationReason: automationReason ?? undefined,
          userAgent,
        });
      }
      return { kind: 'redirect' as const, destinationUrl: link.destinationUrl };
    },
  };
}

export type DeliveryService = ReturnType<typeof createDeliveryService>;
