import type { Database } from '@/core/platform/db/client';
import { ulid } from '@/core/shared/ids';

import type { CampaignRevisionSnapshot, Channel, FrozenCandidate, ProviderFact } from './types';

type Row = Record<string, unknown>;

function timestamp(value: unknown) {
  return new Date(Number(value));
}

function bool(value: unknown) {
  return Number(value) === 1;
}

function revisionFromRow(row: Row) {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    state: String(row.state),
    version: Number(row.version),
    name: String(row.name),
    audienceRule: String(row.audience_rule),
    inclusionRuleJson: String(row.inclusion_rule_json),
    exclusionRulesJson: String(row.exclusion_rules_json),
    sourceTypesJson: String(row.source_types_json),
    emailSubject: String(row.email_subject),
    emailBody: String(row.email_body),
    emailText: String(row.email_text),
    preheader: String(row.preheader),
    smsBody: String(row.sms_body),
    senderName: String(row.sender_name),
    fromEmail: String(row.from_email),
    replyToEmail: String(row.reply_to_email),
    smsSender: String(row.sms_sender),
    physicalAddress: String(row.physical_address),
    messageCategory: String(row.message_category),
    trackingEnabled: bool(row.tracking_enabled),
    updatedAt: timestamp(row.updated_at),
  };
}

function recipientFromRow(row: Row) {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    revisionId: String(row.revision_id),
    stepId: String(row.step_id),
    contactId: String(row.contact_id),
    contactIdentityKey: String(row.contact_identity_key),
    channel: String(row.channel) as Channel,
    destination: String(row.destination),
    idempotencyKey: String(row.idempotency_key),
    transportDisposition: String(row.transport_disposition),
    provider: row.provider == null ? undefined : String(row.provider),
    providerMessageId: row.provider_message_id == null ? undefined : String(row.provider_message_id),
    attemptCount: Number(row.attempt_count),
    sendByAt: timestamp(row.send_by_at),
    reconcileUntil: row.reconcile_until == null ? undefined : timestamp(row.reconcile_until),
    reconcileCursor: row.reconcile_cursor == null ? undefined : String(row.reconcile_cursor),
    handoffStartedAt: row.handoff_started_at == null ? undefined : timestamp(row.handoff_started_at),
    outboundRequestJson: row.outbound_request_json == null ? undefined : String(row.outbound_request_json),
    leaseToken: row.lease_token == null ? undefined : String(row.lease_token),
  };
}

export type ApprovalCheck = {
  kind: string;
  status: 'passed' | 'blocked' | 'advisory';
  detail: string;
  blocking: boolean;
};

export function createDeliveryFactRepository(database: Database) {
  const client = database.$client;

  return {
    async recordProviderFailure(adapter: string, channel: Channel, detail: string, now: Date) {
      const existing = await client.prepare(
        `SELECT * FROM provider_outages WHERE adapter = ? AND channel = ? AND state IN ('observing', 'paused')
         ORDER BY first_failure_at DESC LIMIT 1`,
      ).bind(adapter, channel).first<Row>();
      if (!existing) {
        await client.prepare(
          `INSERT INTO provider_outages
           (id, adapter, channel, state, first_failure_at, last_error, created_at, updated_at)
           VALUES (?, ?, ?, 'observing', ?, ?, ?, ?)`,
        ).bind(ulid(now.getTime()), adapter, channel, now.getTime(), detail, now.getTime(), now.getTime()).run();
        return { paused: false };
      }
      const shouldPause = String(existing.state) === 'paused' || now.getTime() - Number(existing.first_failure_at) >= 5 * 60_000;
      await client.prepare(
        `UPDATE provider_outages SET state = ?, paused_at = CASE WHEN ? THEN COALESCE(paused_at, ?) ELSE paused_at END,
           last_error = ?, updated_at = ? WHERE id = ?`,
      ).bind(shouldPause ? 'paused' : 'observing', shouldPause ? 1 : 0, now.getTime(), detail, now.getTime(), String(existing.id)).run();
      if (shouldPause) {
        await client.prepare(
          `UPDATE campaigns SET state = 'paused', updated_at = ? WHERE state = 'dispatching' AND EXISTS (
             SELECT 1 FROM recipient_steps r WHERE r.campaign_id = campaigns.id AND r.channel = ?
               AND r.transport_disposition IN ('queued', 'handoff-unknown', 'accepted', 'handed-off')
           )`,
        ).bind(now.getTime(), channel).run();
      }
      return { paused: shouldPause };
    },

    async channelOutage(adapter: string, channel: Channel) {
      const outage = await client.prepare(
        `SELECT * FROM provider_outages WHERE adapter = ? AND channel = ? AND state = 'paused' LIMIT 1`,
      ).bind(adapter, channel).first<Row>();
      return outage ? { id: String(outage.id), detail: String(outage.last_error) } : undefined;
    },

    async recoverProvider(adapter: string, channel: Channel, now: Date) {
      await client.batch([
        client.prepare(
          `UPDATE provider_outages SET state = 'recovered', recovered_at = ?, updated_at = ?
           WHERE adapter = ? AND channel = ? AND state IN ('observing', 'paused')`,
        ).bind(now.getTime(), now.getTime(), adapter, channel),
        client.prepare(
          `UPDATE campaigns SET state = 'dispatching', updated_at = ? WHERE state = 'paused' AND EXISTS (
             SELECT 1 FROM recipient_steps r WHERE r.campaign_id = campaigns.id AND r.channel = ?
               AND r.transport_disposition IN ('queued', 'handoff-unknown', 'accepted', 'handed-off')
           )`,
        ).bind(now.getTime(), channel),
      ]);
    },

    findRecipientByProviderMessage(providerMessageId: string, provider: string, channel: Channel) {
      return client.prepare('SELECT * FROM recipient_steps WHERE provider_message_id = ? AND provider = ? AND channel = ?').bind(providerMessageId, provider, channel).first<Row>();
    },

    findRecipientByMangoReference(reference: string) {
      return client.prepare('SELECT * FROM recipient_steps WHERE idempotency_key = ? OR id = ?').bind(reference, reference).first<Row>();
    },

    async bindProviderMessage(recipientStepId: string, providerMessageId: string, provider: string, now: Date) {
      await client.prepare(
        `UPDATE recipient_steps SET provider_message_id = COALESCE(provider_message_id, ?), provider = COALESCE(provider, ?), updated_at = ?
         WHERE id = ?`,
      ).bind(providerMessageId, provider, now.getTime(), recipientStepId).run();
    },

    async recordProviderInboxFact(provider: string, fact: ProviderFact, now: Date) {
      await client.prepare(
        `INSERT INTO provider_fact_inbox
         (identity_key, provider, provider_message_id, mango_reference, kind, provider_occurred_at, payload_digest, detail_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(identity_key) DO NOTHING`,
      ).bind(
        fact.identity, provider, fact.providerMessageId ?? null,
        typeof fact.detail.mangoReference === 'string' ? fact.detail.mangoReference : null,
        fact.kind, fact.occurredAt.getTime(), fact.payloadDigest, JSON.stringify(fact.detail), now.getTime(),
      ).run();
      const stored = await client.prepare('SELECT provider, provider_message_id, kind, provider_occurred_at, payload_digest, detail_json FROM provider_fact_inbox WHERE identity_key = ?').bind(fact.identity).first<Record<string, unknown>>();
      if (!stored || stored.provider !== provider || stored.provider_message_id !== (fact.providerMessageId ?? null)
        || stored.kind !== fact.kind || stored.provider_occurred_at !== fact.occurredAt.getTime() || stored.payload_digest !== fact.payloadDigest) throw new Error('Provider event identity was reused for different evidence.');
      // Derived normalization can gain fields across versions while the verified
      // provider bytes and identity remain immutable.
      if (stored.detail_json !== JSON.stringify(fact.detail)) await client.prepare('UPDATE provider_fact_inbox SET detail_json = ? WHERE identity_key = ? AND payload_digest = ?').bind(JSON.stringify(fact.detail), fact.identity, fact.payloadDigest).run();
    },

    async lastMarketingAt(contactId: string, channel: Channel) {
      const row = await client.prepare(
        `SELECT MAX(handed_off_at) handed_off_at FROM recipient_steps WHERE contact_id = ? AND channel = ? AND handed_off_at IS NOT NULL`,
      ).bind(contactId, channel).first<{ handed_off_at: number | null }>();
      return row?.handed_off_at == null ? undefined : new Date(row.handed_off_at);
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
           COUNT(DISTINCT CASE WHEN r.handed_off_at IS NOT NULL THEN r.id END) attempted,
           COUNT(DISTINCT CASE WHEN r.transport_disposition = 'failed' THEN r.id END) failed
         FROM recipient_steps r
         JOIN campaign_revisions v ON v.id = r.revision_id
         LEFT JOIN delivery_facts f ON f.recipient_step_id = r.id AND f.provider_occurred_at >= ?
         WHERE r.channel = ? AND (CASE WHEN ? = 'email' THEN v.from_email ELSE v.sms_sender END) = ?`,
      ).bind(since.getTime(), channel, channel, sender).first<Row>();
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
        complaintRate: delivered ? complained / delivered : 0,
        hardBounceRate: attempted ? hardBounced / attempted : 0,
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
      if (!result.meta.changes) return false;

      if (typeof fact.detail.billableUnits === 'number') {
        await client.prepare(
          `INSERT INTO external_cost_facts
           (id, campaign_id, recipient_step_id, provider, operation, model_or_channel, billable_units,
            reported_cost_micros, currency, occurred_at, created_at)
           SELECT ?, r.campaign_id, r.id, ?, 'provider-handoff', r.channel, ?, ?, ?, ?, ?
           FROM recipient_steps r WHERE r.id = ?`,
        ).bind(
          ulid(now.getTime()), provider, fact.detail.billableUnits,
          typeof fact.detail.reportedCostMicros === 'number' ? fact.detail.reportedCostMicros : null,
          typeof fact.detail.currency === 'string' ? fact.detail.currency : null,
          fact.occurredAt.getTime(), now.getTime(), recipientStepId,
        ).run();
      }

      const occurred = fact.occurredAt.getTime();
      if (fact.kind === 'complained' || fact.kind === 'suppressed') {
        const column = fact.kind === 'complained' ? 'complained_at' : 'suppressed_at';
        await client.prepare(
          `UPDATE recipient_steps SET ${column} = CASE WHEN ${column} IS NULL OR ${column} < ? THEN ? ELSE ${column} END,
             updated_at = ? WHERE id = ?`,
        ).bind(occurred, occurred, now.getTime(), recipientStepId).run();
        return true;
      }
      const columns: Record<string, { timestamp: string; disposition: string; terminal: boolean }> = {
        accepted: { timestamp: 'provider_accepted_at', disposition: 'accepted', terminal: false },
        delivered: { timestamp: 'delivered_at', disposition: 'delivered', terminal: true },
        bounced: { timestamp: 'bounced_at', disposition: 'bounced', terminal: true },
        failed: { timestamp: 'updated_at', disposition: 'failed', terminal: true },
      };
      const update = columns[fact.kind];
      if (!update) return true;
      const latestTransportAt = `MAX(COALESCE(provider_accepted_at, 0), COALESCE(delivered_at, 0), COALESCE(bounced_at, 0))`;
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
      return client.prepare(
        `UPDATE campaigns SET state = 'completed', updated_at = ?
         WHERE state IN ('scheduled', 'dispatching')
           AND EXISTS (SELECT 1 FROM recipient_steps r WHERE r.campaign_id = campaigns.id)
           AND NOT EXISTS (
             SELECT 1 FROM recipient_steps r WHERE r.campaign_id = campaigns.id
               AND r.transport_disposition IN ('queued', 'handoff-unknown', 'handed-off', 'accepted')
           )`,
      ).bind(now.getTime()).run();
    },

  };
}
