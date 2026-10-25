import {liveCatalogValues} from '@/core/features/campaigns/catalog-values';
import {analyticsContext} from '@/core/features/settings/analytics-policy';
import { testDestination, testDestinationBlock, waitForTestSlot, testSendAccess } from './test-destinations';
import { utf8Bytes, emailByteLimit } from '@/core/features/campaigns/email-size';
import { smsPolicyAuthority, managedSmsText } from '@/core/features/sms/content';
import {ProviderDeferredError} from '@/core/shared/provider-deferred-error';
import { prepareTestHandoffCost, cancelHandoffCost, settleHandoffCost, settleHandoffFailure, type HandoffCostContext } from '@/core/features/insights/cost-handoff';
import { ProviderTransportError, type DeliveryRequest, type ProviderHandoff } from '@/core/shared/platform';
import { loadSenderSettings } from '@/core/features/settings/sender-persistence';
import { revisionMatchesSender } from '@/core/features/settings/sender-validation';
import { messageRendererVersion, renderMessageContent, invalidMessagePersonalisation } from '@/core/features/campaigns/message-content';
import { inspectEmailHtml } from '@/core/features/campaigns/email-html-policy';
import { digestJson, sha256 } from './digest';
import type { LifecycleRepository } from './repository';
import type { Channel, LifecycleRuntime } from './types';
import { reserveTestRequest, type TestSendReservation } from './test-send-allowance';

export function createTestSender(runtime: LifecycleRuntime, repository: LifecycleRepository) {
  const publicBaseUrl = runtime.platform.config.publicBaseUrl.toString().replace(/\/$/, '');
  async function sendOne(input: {
      campaignId: string;
      revisionId: string;
      operatorId: string;
      channel: Channel;
      to: string;
      typed?: boolean;
      now?: Date;
    }, allowance: TestSendReservation) {
      const now = input.now ?? new Date();
      let sender: typeof runtime.platform.mailer;
      let allowlist: string[];
      if (input.channel === 'email') {
        sender = runtime.platform.mailer;
        allowlist = runtime.platform.config.testEmailAllowlist;
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
      // These reads authorize no handoff. Consume failures in the original
      // order, and retain the separate fresh sender read after cost preparation.
      const [operatorsRead, snapshotRead, senderRead] = await Promise.allSettled([
        input.channel === 'email' ? runtime.platform.database.$client.prepare("SELECT email FROM oa_operators WHERE status = 'active'").all<{email: string}>() : undefined,
        repository.readRevisionSnapshot(input.campaignId, input.revisionId),
        input.channel === 'email' ? loadSenderSettings(runtime.platform) : undefined,
      ]);
      if (operatorsRead.status === 'rejected') throw operatorsRead.reason;
      // Active operators may always test-send to their own sign-in addresses.
      if (input.channel === 'email') allowlist = [...allowlist, ...operatorsRead.value!.results.map(row => row.email)].map(item => item.toLowerCase());
      const destination = testDestination(input.channel, input.to);
      if (!destination) return {kind:'blocked' as const,detail:'Enter a valid email address or E.164 phone number.'};
      const configured = allowlist.includes(destination);
      const blocked = await testDestinationBlock(runtime,input.channel,destination,input.operatorId,configured,input.typed);
      if (blocked) return {kind:'blocked' as const,detail:blocked};
      if (snapshotRead.status === 'rejected') throw snapshotRead.reason;
      const snapshot = snapshotRead.value;
      if (!snapshot) return { kind: 'not_found' as const };
      if (snapshot.revision.state !== 'draft') return { kind: 'blocked' as const, detail: 'Test sends use a saved draft revision.' };
      if (senderRead.status === 'rejected') throw senderRead.reason;
      if (input.channel === 'email' && !revisionMatchesSender(snapshot.revision, senderRead.value!)) {
        return {kind: 'blocked' as const, detail: 'Save sender settings and update this draft to the current business identity and postal address before sending.'};
      }
      const capabilities = await sender.capabilities();
      if (!capabilities.configured || !capabilities.canSendMarketing) return { kind: 'blocked' as const, detail: capabilities.detail };
      const issues = input.channel === 'email' ? inspectEmailHtml(snapshot.revision.emailBody).issues : [];
      issues.push(...invalidMessagePersonalisation(snapshot.revision));
      if (issues.length) return {kind: 'blocked' as const, detail: issues.join(' ')};
      const smsPolicy=input.channel==='sms'?await smsPolicyAuthority(runtime.platform.config):undefined;
      if(smsPolicy&&snapshot.revision.smsSender!==smsPolicy.sender)return {kind:'blocked' as const,detail:'SMS sender changed. Save and review the current programme sender.'};
      const marker = '[MANGO TEST — NOT A CAMPAIGN SEND]';
      const rendered = renderMessageContent(snapshot.revision, {catalog:await liveCatalogValues(runtime.platform,snapshot.revision.emailBody),analytics:analyticsContext(snapshot.revision), values: {displayName: 'Test recipient'}, unsubscribeUrl: 'https://preview.invalid/unsubscribe/test-example'});
      const content = input.channel === 'email'
        ? {subject: `${marker} ${rendered.subject}`, html: `<p><strong>${marker}</strong></p>${rendered.html}`, text: `${marker}\n\n${rendered.text}`, preheader: `${marker} ${rendered.preheader}`, test: true,
          from: {name: snapshot.revision.senderName, email: snapshot.revision.fromEmail}, replyTo: snapshot.revision.replyToEmail}
        : {text: managedSmsText(`${marker} ${rendered.sms}`,smsPolicy!.policy,smsPolicy!.sender), test: true};
      if(input.channel==='email' && ('html' in content) && (utf8Bytes(content.html ?? '')>emailByteLimit||utf8Bytes(content.text)>emailByteLimit)) return {kind:'blocked' as const,detail:`Email test exceeds the ${emailByteLimit}-byte per-part limit.`};
      const [revisionDigest, destinationDigest] = await Promise.all([
        digestJson({
          rendererVersion: messageRendererVersion,
          revision: snapshot.revision,
          steps: snapshot.steps,
          links: snapshot.links,
        }),
        sha256(destination),
      ]);
      const idempotencyKey = `test:${input.revisionId}:${input.channel}:${destinationDigest}:${revisionDigest}`;
      const request: DeliveryRequest = {
        ...(smsPolicy?{smsAuthority:{policyDigest:smsPolicy.digest,expiresAt:now.getTime()+15*60000}}:{}),
        recipientStepId: `test:${input.revisionId}`, idempotencyKey, to: destination,
        sender: input.channel === 'email' ? `${snapshot.revision.senderName} <${snapshot.revision.fromEmail}>` : snapshot.revision.smsSender,
        content, callbackUrl: `${publicBaseUrl}/webhooks/${input.channel === 'email' ? 'mail' : 'sms'}/status`, handoffStartedAt: now,
      };
      const costContext: HandoffCostContext = {key:`test-handoff:${idempotencyKey}`,provider:capabilities.provider ?? (input.channel==='email'?'mail.sender.v1':'sms.sender.v1'),operation:'test-handoff',campaignId:input.campaignId};
      await waitForTestSlot(runtime,input.channel);
      const cost=await prepareTestHandoffCost(runtime.platform.database,sender,request,costContext,capabilities.effectiveDeduplication?capabilities.deduplicationWindowMs:0);
      if (input.channel === 'email' && !revisionMatchesSender(snapshot.revision, await loadSenderSettings(runtime.platform))) {
        await cancelHandoffCost(runtime.platform.database,cost.key);
        return {kind: 'blocked' as const, detail: 'Sender settings changed during preparation. Save and review the current sender details before sending.'};
      }
      const destinationBlock = await testDestinationBlock(runtime,input.channel,destination,input.operatorId,configured,input.typed);
      const quotaBlock = destinationBlock ? undefined : await allowance.attempt(input.now ?? new Date());
      if (destinationBlock || quotaBlock) {
        await cancelHandoffCost(runtime.platform.database,cost.key);
        return {kind:'blocked' as const,detail:destinationBlock ?? quotaBlock!};
      }
      request.handoffStartedAt = input.now ?? new Date();
      let handoff: ProviderHandoff;
      try {handoff=await sender.send(request);} catch(error) {
        if(error instanceof ProviderDeferredError) {allowance.deferred();await cancelHandoffCost(runtime.platform.database,cost.key);return {kind:'blocked' as const,detail:`Send deferred by ${error.code}; available after ${error.retryAt.toISOString()}.`};}
        try { await settleHandoffFailure(runtime.platform.database,sender,request,cost,error); }
        catch { /* The durable prepared fact retains uncertainty; preserve the transport error. */ }
        if (error instanceof ProviderTransportError) return { kind: 'blocked' as const, detail: error.failure.detail };
        throw error;
      }
      await repository.recordTestSend(input.revisionId, input.operatorId, input.channel, destinationDigest, revisionDigest, now, destination);
      try { await settleHandoffCost(runtime.platform.database,sender,request,cost,handoff); }
      catch { /* Keep the recorded test send and original receipt; its prepared cost remains unpriced. */ }
      return { kind: 'sent' as const, disposition: handoff.disposition, providerMessageId: handoff.providerMessageId };
    }

  type Input = Parameters<typeof sendOne>[0];
  async function sendTests(input: Omit<Input, 'to'> & {to: string[]}) {
    const destinations = [...new Set(input.to.map(to => testDestination(input.channel, to) ?? to))];
    const results: Array<{to:string;disposition:ProviderHandoff['disposition'];providerMessageId?:string}> = [];
    const access=await testSendAccess(runtime,input.operatorId,input.now??new Date());
    for (const to of destinations) {
      if (!testDestination(input.channel,to)) return {kind:'blocked' as const,detail:'Enter a valid email address or E.164 phone number.',results};
      const block=await testDestinationBlock(runtime,input.channel,to,input.operatorId,access.destinations[input.channel].includes(to),input.typed);
      if(block) return {kind:'blocked' as const,detail:block,results};
    }
    const allowance = await reserveTestRequest(runtime, destinations.length, input.now ?? new Date());
    if (!allowance.accepted) return {kind:'blocked' as const, detail:allowance.detail, results};
    try {
      for (const to of destinations) {
        const result = await sendOne({...input,to}, allowance);
        if (result.kind !== 'sent') return {...result,results};
        results.push({to,disposition:result.disposition,providerMessageId:result.providerMessageId});
      }
      return {kind:'sent' as const,results};
    } finally {await allowance.finish();}
  }
  return {
    testSendAccess: (operatorId:string, now = new Date()) => testSendAccess(runtime,operatorId,now),
    sendTests,
    async sendTest(input:Input) {
      const result = await sendTests({...input,to:[input.to]});
      return result.kind === 'sent' ? {kind:'sent' as const,...result.results[0]} : result;
    },
  };
}
