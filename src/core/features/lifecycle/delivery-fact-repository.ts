import {outageRepository} from './provider-outages';
import {marketingOccurrenceSql} from './marketing-history';
import { recordExternalCost } from '@/core/features/insights/cost-recording';
import type { Database } from '@/core/platform/db/client';
import { ulid } from '@/core/shared/ids';

import type { Channel, ProviderFact } from './types';

type Row = Record<string, unknown>;

export function createDeliveryFactRepository(database: Database) {
  const client = database.$client;

  return {
    ...outageRepository(database),

    findRecipientByProviderMessage(providerMessageId: string, provider: string, channel: Channel) {
      return client.prepare('SELECT * FROM recipient_steps WHERE provider_message_id = ? AND provider = ? AND channel = ?').bind(providerMessageId, provider, channel).first<Row>();
    },

    findRecipientByMangoReference(reference: string) {
      return client.prepare('SELECT * FROM recipient_steps WHERE idempotency_key = ? OR id = ?').bind(reference, reference).first<Row>();
    },

    async bindProviderMessage(recipientStepId: string, providerMessageId: string, provider: string, now: Date) {
      await client.prepare(
        `UPDATE recipient_steps SET reconcile_cursor=CASE WHEN provider_message_id IS NULL THEN NULL ELSE reconcile_cursor END, provider_message_id = COALESCE(provider_message_id, ?), provider = COALESCE(provider, ?), updated_at = ?
         WHERE id = ?`,
      ).bind(providerMessageId, provider, now.getTime(), recipientStepId).run();
    },

    async recordProviderInboxFact(provider: string, fact: ProviderFact, now: Date,channel:Channel=provider==='mobile-message'?'sms':'email') {
      const insert=client.prepare(
        `INSERT INTO provider_fact_inbox
         (identity_key, provider, provider_message_id, mango_reference, kind, provider_occurred_at, payload_digest, detail_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(identity_key) DO NOTHING`,
      ).bind(
        fact.identity, provider, fact.providerMessageId ?? null,
        typeof fact.detail.mangoReference === 'string' ? fact.detail.mangoReference : null,
        fact.kind, fact.occurredAt.getTime(), fact.payloadDigest, JSON.stringify(fact.detail), now.getTime(),
      );
      await insert.run();
      const stored = await client.prepare('SELECT provider, provider_message_id, kind, provider_occurred_at, payload_digest, detail_json FROM provider_fact_inbox WHERE identity_key = ?').bind(fact.identity).first<Record<string, unknown>>();
      if (!stored || stored.provider !== provider || stored.provider_message_id !== (fact.providerMessageId ?? null)
        || stored.kind !== fact.kind || stored.provider_occurred_at !== fact.occurredAt.getTime() || stored.payload_digest !== fact.payloadDigest) throw new Error('Provider event identity was reused for different evidence.');
      // Derived normalization can gain fields across versions while the verified
      // provider bytes and identity remain immutable.
      if (stored.detail_json !== JSON.stringify(fact.detail)) await client.prepare('UPDATE provider_fact_inbox SET detail_json = ? WHERE identity_key = ? AND payload_digest = ?').bind(JSON.stringify(fact.detail), fact.identity, fact.payloadDigest).run();
    },

    async lastMarketingAt(contactId: string, channel: Channel) {
      const row = await client.prepare(
        `SELECT MAX(${marketingOccurrenceSql}) occurred_at FROM recipient_steps WHERE contact_id = ? AND channel = ?`,
      ).bind(contactId, channel).first<{ occurred_at: number | null }>();
      return row?.occurred_at == null ? undefined : new Date(row.occurred_at);
    },

    async pauseChannel(input: {
      campaignId: string;
      revisionId: string;
      channel: Channel;
      reason: string;
      detail: string;
      resumeCheckAt: Date;
      now: Date;
    }) {
      await client.prepare(
        `INSERT INTO campaign_channel_pauses
         (id, campaign_id, revision_id, channel, reason, detail, paused_at, resume_check_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(campaign_id, revision_id, channel, reason) DO UPDATE SET
           detail = excluded.detail, resume_check_at = excluded.resume_check_at, resumed_at = NULL, updated_at = excluded.updated_at`,
      ).bind(
        ulid(input.now.getTime()), input.campaignId, input.revisionId, input.channel, input.reason, input.detail,
        input.now.getTime(), input.resumeCheckAt.getTime(), input.now.getTime(), input.now.getTime(),
      ).run();
    },

    async resumeChannel(campaignId: string, revisionId: string, channel: Channel, reason: string, now: Date) {
      await client.prepare(
        `UPDATE campaign_channel_pauses SET resumed_at = ?, updated_at = ?
         WHERE campaign_id = ? AND revision_id = ? AND channel = ? AND reason = ? AND resumed_at IS NULL`,
      ).bind(now.getTime(), now.getTime(), campaignId, revisionId, channel, reason).run();
    },

    async moveContactDeliveryFacts(mergedContactId: string, survivorContactId: string, now: Date) {
      // Frozen candidates and queued recipient identities remain the approved snapshot.
      // Dispatch sees the merged identity and excludes it; completed history follows the survivor.
      await client.prepare(`UPDATE recipient_steps SET contact_id = ?, updated_at = ? WHERE contact_id = ? AND transport_disposition != 'queued'`)
        .bind(survivorContactId, now.getTime(), mergedContactId).run();
    },

    async reputation(sender: string, channel: Channel, since: Date) {
      const row = await client.prepare(
        `SELECT
           COUNT(DISTINCT CASE WHEN f.kind = 'delivered' THEN f.recipient_step_id END) delivered,
           COUNT(DISTINCT CASE WHEN f.kind = 'complained' THEN f.recipient_step_id END) complained,
           COUNT(DISTINCT CASE WHEN f.kind = 'bounced' AND json_extract(f.detail_json, '$.hard') = 1 THEN f.recipient_step_id END) hard_bounced,
           COUNT(DISTINCT CASE WHEN r.first_attempt_at >= ? THEN r.id END) attempted,
           COUNT(DISTINCT CASE WHEN r.transport_disposition = 'failed' THEN r.id END) failed
         FROM recipient_steps r
         JOIN campaign_revisions v ON v.id = r.revision_id
         LEFT JOIN delivery_facts f ON f.recipient_step_id = r.id AND f.provider_occurred_at >= ?
         WHERE r.channel = ? AND (CASE WHEN ? = 'email' THEN lower(substr(v.from_email,instr(v.from_email,'@')+1)) ELSE v.sms_sender END) = ?`,
      ).bind(since.getTime(),since.getTime(), channel, channel, channel==='email'?sender.toLowerCase().split('@').at(-1):sender).first<Row>();
      const delivered = Number(row?.delivered ?? 0);
      const complained = Number(row?.complained ?? 0);
      const hardBounced = Number(row?.hard_bounced ?? 0);
      const attempted = Number(row?.attempted ?? 0);
      return {
        delivered,
        complained,
        hardBounced,
        attempted,
        failed: Number(row?.failed ?? 0),
        complaintRate: delivered ? complained / delivered : null,
        hardBounceRate: attempted ? hardBounced / attempted : null,
      };
    },

    async recordProviderFact(recipientStepId: string, provider: string, fact: ProviderFact, now: Date) {
      const providerMessageId = fact.providerMessageId ?? '';
      const result = await client.prepare(
        `INSERT INTO delivery_facts
         (id, identity_key, recipient_step_id, provider, provider_event_id, provider_message_id, kind,
          provider_occurred_at, provider_version, payload_digest, detail_json, billable_units, reported_cost_micros, currency, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(identity_key) DO NOTHING`,
      ).bind(
        ulid(now.getTime()), fact.identity, recipientStepId, provider, fact.identity, providerMessageId,
        fact.kind, fact.occurredAt.getTime(), String(fact.detail.version ?? ''), fact.payloadDigest, JSON.stringify(fact.detail),
        typeof fact.detail.billableUnits === 'number' ? fact.detail.billableUnits : null,
        typeof fact.detail.reportedCostMicros === 'number' ? fact.detail.reportedCostMicros : null,
        typeof fact.detail.currency === 'string' ? fact.detail.currency : null,
        now.getTime(),
      ).run();
      const enrichCost = async () => {
        // A later event enriches the same logical handoff; different status events are not new purchases.
        const recipient = await client.prepare('SELECT campaign_id,channel,attempt_count FROM recipient_steps WHERE id=?').bind(recipientStepId).first<{campaign_id:string;channel:string;attempt_count:number}>();
        if (recipient && (['accepted','delivered','bounced','failed'].includes(fact.kind) || typeof fact.detail.billableUnits === 'number')) {
          const attemptKey = `handoff:${provider}:${recipientStepId}:${recipient.attempt_count}`;
          // Pre-upgrade facts used generated IDs. Enrich their existing purchase instead of buying a second accounting row.
          const existing = await client.prepare(`SELECT id FROM external_cost_facts WHERE id=? OR
            (recipient_step_id=? AND provider=? AND operation='provider-handoff' AND substr(id,1,8)<>'handoff:')
            ORDER BY (id=?) DESC,occurred_at DESC LIMIT 1`).bind(attemptKey,recipientStepId,provider,attemptKey).first<{id:string}>();
          const units = fact.detail.billableUnits;
          const price = fact.detail.reportedCostMicros, currency = fact.detail.currency;
          const validPrice = typeof price === 'number' && Number.isSafeInteger(price) && price >= 0 && typeof currency === 'string' && /^[A-Z]{3}$/.test(currency);
          await recordExternalCost(database, { key: existing?.id ?? attemptKey, campaignId: recipient.campaign_id,
            recipientStepId, provider, operation: 'provider-handoff', modelOrChannel: recipient.channel,
            billableUnits: typeof units === 'number' && Number.isSafeInteger(units) && units >= 0 ? units : null,
            unitKind: typeof fact.detail.unitKind === 'string' ? fact.detail.unitKind : 'provider units',
            reportedCostMicros: validPrice ? price : null, currency: validPrice ? currency : null,
            outcome: fact.kind === 'failed' ? 'failed' : 'accepted', occurredAt: fact.occurredAt });
        }
      };
      if (!result.meta.changes) { await enrichCost(); return false; }

      const occurred = fact.occurredAt.getTime();
      if (fact.kind === 'complained' || fact.kind === 'suppressed') {
        const column = fact.kind === 'complained' ? 'complained_at' : 'suppressed_at';
        await client.prepare(
          `UPDATE recipient_steps SET ${column} = CASE WHEN ${column} IS NULL OR ${column} < ? THEN ? ELSE ${column} END,
             updated_at = ? WHERE id = ?`,
        ).bind(occurred, occurred, now.getTime(), recipientStepId).run();
        await enrichCost();
        return true;
      }
      const columns: Record<string, { timestamp: string; disposition: string; terminal: boolean }> = {
        accepted: { timestamp: 'provider_accepted_at', disposition: 'accepted', terminal: false },
        delivered: { timestamp: 'delivered_at', disposition: 'delivered', terminal: true },
        bounced: { timestamp: 'bounced_at', disposition: 'bounced', terminal: true },
        failed: { timestamp: 'updated_at', disposition: 'failed', terminal: true },
      };
      const update = columns[fact.kind];
      if (!update) { await enrichCost(); return true; }
      const latestTransportAt = `(SELECT COALESCE(MAX(provider_occurred_at),0) FROM delivery_facts tf WHERE tf.recipient_step_id=recipient_steps.id AND tf.kind IN ('delivered','bounced','failed'))`;
      await client.prepare(
        `UPDATE recipient_steps SET
           ${update.timestamp} = CASE WHEN ${update.timestamp} IS NULL OR ${update.timestamp} < ? THEN ? ELSE ${update.timestamp} END,
           transport_disposition = CASE
             WHEN ? = 'accepted' AND transport_disposition IN ('queued', 'handoff-unknown', 'handed-off', 'accepted') THEN 'accepted'
             WHEN ? <> 'accepted' AND ? >= ${latestTransportAt} THEN ?
             ELSE transport_disposition
           END,
           terminal_at = CASE WHEN ? AND ? >= ${latestTransportAt} THEN ? ELSE terminal_at END,
           provider_message_id = CASE WHEN provider_message_id IS NULL OR provider_message_id = '' THEN ? ELSE provider_message_id END,
           updated_at = ? WHERE id = ?`,
      ).bind(
        occurred, occurred, update.disposition, update.disposition, occurred, update.disposition,
        update.terminal ? 1 : 0, occurred, occurred,
        providerMessageId, now.getTime(), recipientStepId,
      ).run();
      await enrichCost();
      return true;
    },

    async cancelCampaign(campaignId: string, actorId: string, now: Date) {
      const nowMs = now.getTime();
      const statements = [
        client.prepare(
          `UPDATE campaigns SET state = 'cancelled', cancelled_at = ?, updated_at = ?
           WHERE id = ? AND state IN ('scheduled', 'dispatching', 'paused')`,
        ).bind(nowMs, nowMs, campaignId),
        client.prepare(
          `UPDATE recipient_steps SET transport_disposition = 'skipped', skip_reason = 'campaign-cancelled', terminal_at = ?, updated_at = ?
           WHERE campaign_id = ? AND transport_disposition = 'queued' AND handoff_started_at IS NULL`,
        ).bind(nowMs, nowMs, campaignId),
        client.prepare(
          `UPDATE recipient_steps SET transport_disposition = 'handoff-unknown', lease_token = NULL, lease_expires_at = NULL, updated_at = ?
           WHERE campaign_id = ? AND transport_disposition = 'queued' AND handoff_started_at IS NOT NULL`,
        ).bind(nowMs, campaignId),
        client.prepare(
          `INSERT INTO lifecycle_audit_entries
           (id, operation_key, entity_type, entity_id, action, actor_type, actor_id, detail_json, occurred_at, created_at)
           VALUES (?, ?, 'campaign', ?, 'cancelled', 'operator', ?, '{}', ?, ?)
           ON CONFLICT(operation_key) DO NOTHING`,
        ).bind(ulid(nowMs), `cancel:${campaignId}:${nowMs}`, campaignId, actorId, nowMs, nowMs),
      ];
      const [campaign] = await client.batch(statements);
      return campaign.meta.changes === 1;
    },

    async completeCampaigns(now: Date) {
      // Sending is finished once every handoff has a known outcome. Provider
      // delivery facts can arrive later and still enrich a completed campaign.
      return client.prepare(
        `UPDATE campaigns SET state = 'completed', updated_at = ?
         WHERE state IN ('scheduled', 'dispatching', 'paused')
           AND EXISTS (SELECT 1 FROM recipient_steps r WHERE r.campaign_id = campaigns.id)
           AND NOT EXISTS (
             SELECT 1 FROM recipient_steps r WHERE r.campaign_id = campaigns.id
               AND r.transport_disposition IN ('queued', 'handoff-unknown')
           )`,
      ).bind(now.getTime()).run();
    },

  };
}
