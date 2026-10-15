import type { Database } from '@/core/platform/db/client';
import { sha256 } from '@/core/platform/crypto';
import { recordExternalCost } from '@/core/features/insights/cost-recording';

/** Account only for native hosted mail. Delivery IDs are hashed; no address, link or message enters the ledger. */
export async function prepareAuthMailCost(database: Pick<Database, '$client'>, provider: 'rer' | 'resend' | 'sendgrid', deliveryId: string) {
  const now = new Date(), prefix = `auth-mail:${await sha256(`${provider}:${deliveryId}`)}:`;
  let key = `${prefix}${crypto.randomUUID()}`;
  if (provider === 'resend') {
    // Base forwards this delivery ID as Resend's 24-hour idempotency key. This reservation changes accounting only.
    const cutoff = now.getTime() - 86_400_000;
    await database.$client.prepare(`INSERT INTO external_cost_facts
      (id,provider,operation,model_or_channel,billable_units,units_known,unit_kind,outcome,occurred_at,created_at)
      SELECT ?,?,'auth-mail-handoff','email',0,0,'provider units','prepared',?,?
      WHERE NOT EXISTS (SELECT 1 FROM external_cost_facts WHERE provider=? AND operation='auth-mail-handoff'
        AND substr(id,1,?)=? AND occurred_at>?)`)
      .bind(key, provider, now.getTime(), now.getTime(), provider, prefix.length, prefix, cutoff).run();
    const reserved = await database.$client.prepare(`SELECT id FROM external_cost_facts WHERE provider=?
      AND operation='auth-mail-handoff' AND substr(id,1,?)=? AND occurred_at>? ORDER BY occurred_at DESC,id LIMIT 1`)
      .bind(provider, prefix.length, prefix, cutoff).first<{ id: string }>();
    if (!reserved) throw new Error('Auth mail cost reservation changed before sending.');
    key = reserved.id;
  } else {
    // SendGrid does not deduplicate delivery IDs: every actual invocation is a distinct attempt.
    await recordExternalCost(database, { key, provider, operation: 'auth-mail-handoff', modelOrChannel: 'email',
      billableUnits: null, outcome: 'prepared', occurredAt: now });
  }
  // Base's transport contract supplies no usage or per-message price. Do not infer either from acceptance.
  return (outcome: string) => recordExternalCost(database, { key, provider, operation: 'auth-mail-handoff',
    modelOrChannel: 'email', billableUnits: null, outcome, occurredAt: now });
}
