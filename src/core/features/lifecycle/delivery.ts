import {privateInboxFact} from './provider-inbox-privacy';
import { loadSenderSettings } from '@/core/features/settings/sender-persistence';
import { revisionMatchesSender } from '@/core/features/settings/sender-validation';
import { serializedFrom } from '@/core/features/sender-verification/identity';
import { unavailableInspection } from '@/core/features/sender-verification/service';
import { ProviderTransportError } from '@/core/shared/platform';

import { sha256 } from './digest';
import { parseDeliveryRequest, prepareDeliveryRequest, serializeDeliveryRequest } from './message-renderer';
import { marketingFrequencyWindowMs } from './policies';
import { isInsideSmsWindow, nextSmsWindow } from './schedule';
import { parseStructuredRules, productIdFromRules } from './rules';
import type { LifecycleRepository } from './repository';
import type {
  Channel,
  LifecycleRuntime,
  ProviderFact,
  QueueMessage,
} from './types';
import { parseVerifiedWebhook } from './webhook-facts';

const retrySeconds = [60, 180, 600, 1_200, 1_560];
const unavailableRecipientBatchSize = 100;

function automatedAgent(userAgent: string) {
  const patterns = [
    ['mailbox-security-scanner', /barracuda|mimecast|proofpoint|safelinks|messagelabs/i],
    ['known-bot', /bot\b|crawler|spider|preview|slurp/i],
  ] as const;
  return patterns.find(([, pattern]) => pattern.test(userAgent))?.[0];
}

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

  async function recheck(envelope: NonNullable<Awaited<ReturnType<typeof repository.getDeliveryEnvelope>>>, now: Date) {
    const rules = parseStructuredRules(envelope.inclusionRuleJson, envelope.exclusionRulesJson);
    return runtime.audience.recheckHandoffEligibility({
      contactId: envelope.recipient.contactId,
      channel: envelope.recipient.channel,
      sourceTypes: envelope.sourceTypes,
      productId: rules.ok ? productIdFromRules(rules.inclusion, rules.exclusions) : undefined,
      now,
      lastMarketingAt: await repository.lastMarketingAt(envelope.recipient.contactId, envelope.recipient.channel),
      frequencyWindowMs: marketingFrequencyWindowMs(envelope.recipient.channel),
    });
  }

  async function dispatchRecipient(recipientId: string, now: Date) {
    const beforeClaim = await repository.getDeliveryEnvelope(recipientId);
    if (!beforeClaim) return;
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
        if (eligibility.reason.includes('source-stale') || eligibility.reason.includes('source-refresh')) {
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
      const evidenceFresh = eligibility.contact.timeZone
        && eligibility.contact.timeZoneEvidenceAt
        && eligibility.contact.timeZoneEvidenceSource
        && now.getTime() - eligibility.contact.timeZoneEvidenceAt.getTime() <= 30 * 86_400_000;
      if (!evidenceFresh) {
        await repository.markSkipped(claimed.id, claimed.leaseToken, 'recipient-timezone-unknown-or-stale', now);
        return;
      }
      if (!eligibility.contact.country) {
        await repository.markSkipped(claimed.id, claimed.leaseToken, 'recipient-country-unknown', now);
        return;
      }
      if (!isInsideSmsWindow(now, eligibility.contact.timeZone!)) {
        const retryAt = nextSmsWindow(now, eligibility.contact.timeZone!);
        if (retryAt >= claimed.sendByAt) await repository.markSkipped(claimed.id, claimed.leaseToken, 'quiet-hours-deadline', now);
        else await repository.deferRecipient(claimed.id, claimed.leaseToken, retryAt, 'quiet-hours', now);
        return;
      }
    }
    const capabilities = await adapter.capabilities();
    if (!capabilities.configured || !capabilities.canSendMarketing) {
      await repository.deferRecipient(claimed.id, claimed.leaseToken,
        new Date(now.getTime() + runtime.platform.config.providerReconciliationIntervalMinutes * 60_000), 'provider-unavailable', now);
      await repository.recordProviderFailure(adapterName(claimed.channel), claimed.channel, capabilities.detail, now);
      return;
    }
    if (claimed.channel === 'sms') {
      const senderCheck = await adapter.validateSender(beforeClaim.revision.smsSender, eligibility.contact.country!);
      if (!senderCheck.ready) {
        await repository.markSkipped(claimed.id, claimed.leaseToken, 'sender-not-registered', now);
        return;
      }
    }
    const prepared = await prepareDeliveryRequest(runtime, beforeClaim, eligibility, now);
    // Persisted outbound JSON is authoritative on restart, including content.from.
    const request = claimed.outboundRequestJson ? parseDeliveryRequest(claimed.outboundRequestJson) : prepared.request;
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
    await repository.resumeChannel(claimed.campaignId, claimed.revisionId, claimed.channel, 'source-freshness', new Date());
    if (!await repository.markHandoffUnknown(claimed.id, claimed.leaseToken, new Date(), inspection?.lease, claimed.outboundRequestJson ?? serializeDeliveryRequest(request), capabilities.provider)) {
      await repository.deferRecipient(claimed.id, claimed.leaseToken,
        new Date(Date.now() + runtime.platform.config.providerReconciliationIntervalMinutes * 60_000),
        'approval-or-sender-authority-changed', new Date());
      return;
    }
    try {
      const handoff = await adapter.send(request);
      await repository.recordHandoff({
        id: claimed.id,
        leaseToken: claimed.leaseToken,
        provider: capabilities.provider ?? adapterName(claimed.channel),
        providerMessageId: handoff.providerMessageId,
        disposition: handoff.disposition,
        acceptedAt: handoff.providerAcceptedAt,
        now: new Date(),
      });
      await repository.recoverProvider(adapterName(claimed.channel), claimed.channel, new Date());
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Provider hand-off failed without a provider response.';
      if (error instanceof ProviderTransportError) {
        const delaySeconds = retrySeconds[claimed.attemptCount - 1];
        const retryAt = delaySeconds === undefined ? undefined : new Date(Date.now() + delaySeconds * 1_000);
        const canRetry = !error.failure.permanent && retryAt !== undefined && retryAt < claimed.sendByAt;
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
            idempotencyKey: `dispatch-retry:${claimed.id}:${claimed.attemptCount}`,
            payload: {
              campaignId: claimed.campaignId,
              revisionId: claimed.revisionId,
              stepId: claimed.stepId,
              channel: claimed.channel,
            },
          }, delaySeconds);
          await repository.recordProviderFailure(adapterName(claimed.channel), claimed.channel, detail, new Date());
        }
        return;
      }
      await repository.noteUnknownFailure(claimed.id, claimed.leaseToken, detail, new Date());
      await repository.recordProviderFailure(adapterName(claimed.channel), claimed.channel, detail, new Date());
    }
    await runtime.platform.jobs.enqueue({
      kind: 'delivery.reconcile',
      idempotencyKey: `reconcile:${claimed.id}`,
      payload: { recipientStepId: claimed.id },
    });
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
    const began = await repository.beginStep(stepId, revisionId, now, new Date(now.getTime() + 60_000));
    if (!began) return;
    await repository.skipExpiredForStep(stepId, now);
    const recipientIds = await repository.listDueRecipientIds(stepId, now, rate);
    for (const recipientId of recipientIds) await dispatchRecipient(recipientId, new Date());
    if (recipientIds.length === rate) {
      await runtime.platform.jobs.retry({
        kind: 'campaign.dispatch', idempotencyKey: `dispatch:${stepId}`, payload,
      }, 60);
    }
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
      await repository.recordProviderInboxFact(provider,persisted,new Date());
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
      if (fact.providerMessageId) await repository.bindProviderMessage(recipientStepId, fact.providerMessageId, provider, new Date());
      if (safetyFact && !suppliedDestination) await suppress(String(row.destination));
      await repository.recordProviderFact(recipientStepId, provider, persisted, new Date());
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
    if (!adapter) return;
    const result = await adapter.reconcile(parseDeliveryRequest(outboundRequestJson), {
      providerMessageId: recipient.providerMessageId,
      cursor: recipient.reconcileCursor,
    });
    await importFacts(recipient.provider ?? adapterName(recipient.channel), result.facts, recipient.id, recipient.channel);
    if (!result.exhausted) {
      await repository.saveReconciliationCursor(recipient.id, result.cursor, new Date());
      await runtime.platform.jobs.retry({
        kind: 'delivery.reconcile', idempotencyKey: `reconcile:${recipient.id}:${result.cursor ?? 'next'}`,
        payload: { recipientStepId: recipient.id },
      }, 1);
      return;
    }
    if ((await adapter.capabilities()).handoffPolicy !== 'single-attempt' && recipient.reconcileUntil && recipient.reconcileUntil <= new Date()) await repository.failUnconfirmed(recipient.id, new Date());
  }

  return {
    dispatchStep,
    reconcileRecipient,
    importFacts,

    async reconcileUnresolved() {
      const unresolved = await repository.listUnresolved(new Date());
      for (const recipient of unresolved) await reconcileRecipient(recipient.id);
    },

    async probeOutage(channel: Channel) {
      const adapter = sender(channel);
      if (!adapter) return;
      const health = await adapter.capabilities().then((value) => ({ available: value.configured && value.canSendMarketing, detail: value.detail }));
      if (health.available) await repository.recoverProvider(adapterName(channel), channel, new Date());
      else await repository.recordProviderFailure(adapterName(channel), channel, health.detail, new Date());
    },

    async handleWebhook(channel: Channel, request: Request) {
      const adapter = sender(channel);
      if (!adapter) throw new Error(unavailableModuleDetail(channel));
      const verified = await adapter.verifyWebhook(request);
      const facts = await parseVerifiedWebhook(channel, verified);
      await importFacts(channel === 'email' ? verified.provider ?? 'resend' : 'mobile-message', facts, undefined, channel);
    },

    async followTrackedLink(token: string, request: Request) {
      try {
        await runtime.platform.publicTokens.verify(token, 'link');
      } catch {
        return { kind: 'not_found' as const };
      }
      const digest = await runtime.platform.publicTokens.digest(token);
      const link = await repository.trackedLink(digest, new Date());
      if (!link) return { kind: 'not_found' as const };
      const userAgent = request.headers.get('User-Agent') ?? '';
      const automationReason = automatedAgent(userAgent);
      const requestDigest = await sha256(`${digest}:${request.headers.get('CF-Ray') ?? crypto.randomUUID()}`);
      await repository.recordClick({
        recipientStepId: link.recipientStepId,
        requestDigest,
        occurredAt: new Date(),
        automated: Boolean(automationReason),
        automationReason: automationReason ?? undefined,
        userAgent,
      });
      return { kind: 'redirect' as const, destinationUrl: link.destinationUrl };
    },
  };
}

export type DeliveryService = ReturnType<typeof createDeliveryService>;
