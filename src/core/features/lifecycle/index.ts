import { resumeSmsServices } from '@/core/features/sms/service-delivery';
import {withErasureWriteFence} from '@/core/features/audience/erasure/write-fence';
import { acknowledgeHealthProbe } from '@/core/features/health/queue-probe';
import { createProposalRepository } from '@/core/features/proposals/repository';
import {continueErasure,pendingErasure} from '@/core/features/audience/erasure/maintenance';
import { advanceDesignJob, isDesignCommand } from '@/core/features/design-generation/advance';
import { sweepDesignJobs } from '@/core/features/design-generation/sweep';
import { createApprovalService } from './approval';
import { createDeliveryService } from './delivery';
import { createLifecycleRepository } from './repository';
import { registerLifecycleHttpRoutes } from './routes';
import type { Channel, LifecycleApp, LifecycleQueueBatch, LifecycleRuntime } from './types';

export * from './types';
export * from './schema';
export { createLifecycleRepository } from './repository';
export { resolveLocalInstant } from './schedule';
export { parseStructuredRules, productIdFromRules, productIdsFromRules, inclusionRuleSchema, exclusionRuleSchema } from './rules';
export type { InclusionRule, ExclusionRule } from './rules';

export function createLifecycleServices(runtime: LifecycleRuntime) {
  const repository = createLifecycleRepository(runtime.platform.database);
  const approval = createApprovalService(runtime, repository);
  const delivery = createDeliveryService(runtime, repository);
  return { repository, approval, delivery };
}

export function registerLifecycleRoutes(app: LifecycleApp, runtime: LifecycleRuntime) {
  const services = createLifecycleServices(runtime);
  registerLifecycleHttpRoutes(app, services.approval, services.delivery, services.repository);
  return services;
}

/** `only` limits a consumer to some command kinds; every other message is left for retry, as a copy running on a
 * computer does with everything but design runs. */
export async function consumeLifecycleQueue(batch: LifecycleQueueBatch, runtime: LifecycleRuntime, only?: readonly LifecycleQueueBatch['messages'][number]['body']['kind'][]) {
  for (const message of batch.messages) {
    if (acknowledgeHealthProbe(message)) continue;
    if (only && !only.includes(message.body.kind)) {message.retry(); continue;}
    try {
      if(message.body.kind==='contact.erase'){await continueErasure(runtime.platform,String(message.body.payload.reference??''));message.ack();continue;}
      if(await pendingErasure(runtime.platform.database.$client)){message.retry({delaySeconds:30});continue;}
      await withErasureWriteFence(runtime.platform.database.$client,async()=>{
      if (isDesignCommand(message.body)) {await advanceDesignJob(runtime.platform, message.body); message.ack(); return;}
      if (!['source.sync', 'campaign.dispatch', 'delivery.reconcile', 'provider.outage-probe'].includes(message.body.kind)) throw new Error('Unknown queue command.');
      if (message.body.kind === 'source.sync') {
        if (!runtime.synchronizeCommerce) throw new Error('Commerce synchronization is not composed.');
        const result = await runtime.synchronizeCommerce({...message.body.payload, runId: message.body.payload.runId ?? message.body.idempotencyKey});
        if (result && typeof result === 'object' && 'status' in result) {
          if (result.status === 'pending') {
            if (!('runId' in result) || typeof result.runId !== 'string' || !('pages' in result) || !Number.isInteger(result.pages) || Number(result.pages) < 1) throw new Error('Invalid sync continuation result.');
            // Transfer the saved remainder only after durable queue acceptance.
            // Successful chunks must not consume the failure retry allowance.
            await runtime.platform.jobs.enqueue({kind: 'source.sync', idempotencyKey: `source-sync:${result.runId}:page:${result.pages}`,
              payload: {...message.body.payload, runId: result.runId}});
            message.ack();
            return;
          }
          if (result.status === 'busy') {message.retry({delaySeconds: 30}); return}
        }
        if (!result || typeof result !== 'object' || !('status' in result) || !['completed', 'superseded'].includes(String(result.status))) throw new Error('Commerce synchronization returned no terminal outcome.');
        message.ack();
        return;
      }
      const { delivery } = createLifecycleServices(runtime);
      if (message.body.kind === 'campaign.dispatch') await delivery.dispatchStep(message.body.payload);
      if (message.body.kind === 'delivery.reconcile') {
        await delivery.reconcileRecipient(String(message.body.payload.recipientStepId ?? ''));
      }
      if (message.body.kind === 'provider.outage-probe') {
        await delivery.probeOutage(String(message.body.payload.channel ?? '') as Channel);
      }
      message.ack();
      });
    } catch {
      message.retry({ delaySeconds: 60 });
    }
  }
}

export async function runLifecycleCron(_event: unknown, runtime: LifecycleRuntime) {
  const { repository, delivery } = createLifecycleServices(runtime);
  const pending=await pendingErasure(runtime.platform.database.$client);if(pending){await continueErasure(runtime.platform,pending.reference);return 'blocked-erasure' as const;}
  return withErasureWriteFence(runtime.platform.database.$client,async()=>{
  const now = new Date();
  await repository.expireDueRecipients(now);
  await resumeSmsServices(runtime.platform);
  await createProposalRepository(runtime.platform.database).expireDue(now);
  if (runtime.platform.commerce) {
    const commerceCapabilities = runtime.platform.commerce.capabilities();
    for (const sourceType of commerceCapabilities.sourceTypes) {
      if (!commerceCapabilities.provider) continue;
      await runtime.platform.jobs.enqueue({kind: 'source.sync', idempotencyKey: `source-sync:${sourceType}:${Math.floor(now.getTime() / 3_600_000)}`, payload: {sourceType, provider: commerceCapabilities.provider}});
    }
  }
  const due = await repository.listDueSteps(now);
  for (const step of due) {
    await runtime.platform.jobs.enqueue({
      kind: 'campaign.dispatch',
      idempotencyKey: `dispatch:${step.id}:${step.scheduledAt.toISOString()}`,
      payload: {
        campaignId: step.campaignId,
        revisionId: step.revisionId,
        stepId: step.id,
        channel: step.channel,
      },
    });
  }
  await delivery.reconcileUnresolved();
  await delivery.probeOutage('email');
  if (runtime.platform.sms) await delivery.probeOutage('sms');
  await repository.completeCampaigns(new Date());
  await sweepDesignJobs(runtime.platform, now.getTime());
  return 'completed' as const;
  });
}



export async function moveContactDeliveryFacts(runtime: LifecycleRuntime, mergedContactId: string, survivorContactId: string) {
  await createLifecycleRepository(runtime.platform.database).moveContactDeliveryFacts(mergedContactId, survivorContactId, new Date());
}
