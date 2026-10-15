import type { Database } from '@/core/platform/db/client';
import { ProviderTransportError, type DeliveryRequest, type ProviderHandoff, type SenderAdapter } from '@/core/shared/platform';
import { recordExternalCost } from './cost-recording';

export type HandoffCostContext = { provider: string; campaignId?: string; recipientStepId?: string; operation: 'provider-handoff' | 'test-handoff' | 'confirmation-handoff'; key: string; occurredAt?: Date };

/** Persist before the final authorization fence. An interruption leaves an explicitly uncertain attempt. */
export async function prepareHandoffCost(database: Database, sender: SenderAdapter, request: DeliveryRequest, context: HandoffCostContext) {
  await recordExternalCost(database, { ...context, modelOrChannel: sender.channel, billableUnits: null,
    outcome: 'prepared', occurredAt: context.occurredAt ?? request.handoffStartedAt });
}
/** The insert's NOT EXISTS predicate is atomic in D1, so concurrent idempotent test requests share one fact. */
export async function prepareTestHandoffCost(database: Database, sender: SenderAdapter, request: DeliveryRequest, context: HandoffCostContext, deduplicationWindowMs: number): Promise<HandoffCostContext> {
  const prefix = `${context.key}:attempt:`;
  const key = `${prefix}${crypto.randomUUID()}`;
  if (deduplicationWindowMs <= 0) {
    const attempt = {...context, key};
    await prepareHandoffCost(database, sender, request, attempt);
    return attempt;
  }
  const now = (context.occurredAt ?? request.handoffStartedAt).getTime();
  const cutoff = now - deduplicationWindowMs;
  const inserted = await database.$client.prepare(`INSERT INTO external_cost_facts
    (id,campaign_id,recipient_step_id,provider,operation,model_or_channel,billable_units,units_known,unit_kind,outcome,occurred_at,created_at)
    SELECT ?,?,?,?,?,?,0,0,'provider units','prepared',?,?
    WHERE NOT EXISTS (SELECT 1 FROM external_cost_facts WHERE provider=? AND operation='test-handoff'
      AND (id=? OR substr(id,1,?)=?) AND occurred_at>? AND outcome<>'not-sent')`)
    .bind(key,context.campaignId??null,context.recipientStepId??null,context.provider,context.operation,sender.channel,now,now,
      context.provider,context.key,prefix.length,prefix,cutoff).run();
  // Once another request shares a prepared reservation, cancellation cannot prove that no caller sent.
  if (!inserted.meta.changes) await database.$client.prepare(`UPDATE external_cost_facts SET outcome='prepared-shared'
    WHERE provider=? AND operation='test-handoff' AND (id=? OR substr(id,1,?)=?) AND occurred_at>? AND outcome='prepared'`)
    .bind(context.provider,context.key,prefix.length,prefix,cutoff).run();
  const reserved = await database.$client.prepare(`SELECT id FROM external_cost_facts WHERE provider=? AND operation='test-handoff'
    AND (id=? OR substr(id,1,?)=?) AND occurred_at>? AND outcome<>'not-sent' ORDER BY occurred_at DESC,id LIMIT 1`)
    .bind(context.provider,context.key,prefix.length,prefix,cutoff).first<{id:string}>();
  if (!reserved) throw new Error('The test handoff cost reservation changed before sending.');
  return {...context,key:reserved.id};
}
export async function cancelHandoffCost(database: Database, key: string) {
  await database.$client.prepare("UPDATE external_cost_facts SET outcome='not-sent' WHERE id=? AND outcome='prepared'").bind(key).run();
}
/** Call only after preserving the delivery receipt. Failure must never be interpreted as a transport failure. */
export async function settleHandoffCost(database: Database, sender: SenderAdapter, request: DeliveryRequest, context: HandoffCostContext, handoff: ProviderHandoff) {
  await recordExternalCost(database, { ...context, modelOrChannel: sender.channel,
    billableUnits: handoff.cost?.billableUnits ?? null, unitKind: handoff.cost?.unitKind,
    reportedCostMicros: handoff.cost?.reportedCostMicros, currency: handoff.cost?.currency,
    outcome: handoff.disposition === 'accepted' ? 'accepted' : 'unknown', occurredAt: context.occurredAt ?? request.handoffStartedAt });
}
/** Preserve the original transport result before recording its cost outcome. */
export async function settleHandoffFailure(database: Database, sender: SenderAdapter, request: DeliveryRequest, context: HandoffCostContext, error: unknown) {
  await recordExternalCost(database, { ...context, modelOrChannel: sender.channel, billableUnits: null,
    outcome: error instanceof ProviderTransportError ? 'rejected' : 'unknown', occurredAt: context.occurredAt ?? request.handoffStartedAt });
}
