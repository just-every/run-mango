import {recipientHandoffGuard} from './recipient-handoff-guard';
import { leaseGuard, leaseValues, associationStatement } from '@/core/features/sender-verification/repository';
import type { SenderLease } from '@/core/features/sender-verification/types';
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
    dormancyPolicyJson: String(row.dormancy_policy_json),
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
    providerCredentialDigest:row.provider_credential_digest==null?undefined:String(row.provider_credential_digest),
    providerMessageId: row.provider_message_id == null ? undefined : String(row.provider_message_id),
    attemptCount: Number(row.attempt_count),
    firstAttemptAt:row.first_attempt_at==null?undefined:timestamp(row.first_attempt_at),
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

export function createRecipientLifecycleRepository(database: Database) {
  const client = database.$client;

  return {
    async beginStep(stepId: string, revisionId: string, now: Date, estimatedCompletionAt: Date) {
      const result = await client.prepare(
        `INSERT INTO step_dispatches
         (step_id, revision_id, state, started_at, estimated_completion_at, created_at, updated_at)
         SELECT ?, ?, 'dispatching', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM campaign_steps s JOIN campaigns c ON c.active_revision_id = s.revision_id
           WHERE s.id = ? AND s.revision_id = ? AND c.state IN ('scheduled', 'dispatching')
             AND s.scheduled_at <= ? AND s.send_by_at > ?
         )
         ON CONFLICT(step_id) DO NOTHING`,
      ).bind(stepId, revisionId, now.getTime(), estimatedCompletionAt.getTime(), now.getTime(), now.getTime(), stepId, revisionId, now.getTime(), now.getTime()).run();
      if (result.meta.changes) {
        await client.prepare(
          `UPDATE campaigns SET state = 'dispatching', updated_at = ?
           WHERE active_revision_id = ? AND state = 'scheduled'`,
        ).bind(now.getTime(), revisionId).run();
      }
      if (result.meta.changes === 1) return true;
      const existing = await client.prepare(
        `SELECT d.state FROM step_dispatches d JOIN campaigns c ON c.active_revision_id=d.revision_id
         WHERE d.step_id = ? AND d.revision_id = ? AND c.state IN ('scheduled','dispatching')`,
      ).bind(stepId, revisionId).first<{ state: string }>();
      return existing?.state === 'dispatching';
    },

    async completeStep(stepId: string, now: Date) {
      const pending = await client.prepare(
        `SELECT COUNT(*) count FROM recipient_steps WHERE step_id = ?
         AND transport_disposition IN ('queued', 'handoff-unknown')`,
      ).bind(stepId).first<{ count: number }>();
      if (Number(pending?.count ?? 0) > 0) return false;
      await client.prepare(
        `UPDATE step_dispatches SET state = 'completed', completed_at = ?, estimated_completion_at=NULL, updated_at = ? WHERE step_id = ?`,
      ).bind(now.getTime(), now.getTime(), stepId).run();
      return true;
    },

    async expireDueRecipients(now:Date) {
      await client.batch([
        client.prepare(`UPDATE recipient_steps SET transport_disposition='skipped',skip_reason='send-window-expired',
          terminal_at=?,next_attempt_at=NULL,lease_token=NULL,lease_expires_at=NULL,updated_at=?
          WHERE transport_disposition='queued' AND send_by_at<=?`).bind(now.getTime(),now.getTime(),now.getTime()),
        client.prepare(`UPDATE step_dispatches SET state='completed',completed_at=?,estimated_completion_at=NULL,updated_at=?
          WHERE state='dispatching' AND NOT EXISTS(SELECT 1 FROM recipient_steps r WHERE r.step_id=step_dispatches.step_id
            AND r.transport_disposition IN ('queued','handoff-unknown'))`).bind(now.getTime(),now.getTime()),
      ]);
    },

    async listDueSteps(now: Date) {
      const rows = await client.prepare(
        `SELECT s.*, c.id campaign_id FROM campaign_steps s
         JOIN campaigns c ON c.active_revision_id = s.revision_id
         WHERE c.state IN ('scheduled', 'dispatching') AND s.scheduled_at <= ? AND s.send_by_at > ?
           AND (
             NOT EXISTS (SELECT 1 FROM step_dispatches d WHERE d.step_id = s.id)
             OR EXISTS (
               SELECT 1 FROM step_dispatches d JOIN recipient_steps r ON r.step_id = d.step_id
               WHERE d.step_id = s.id AND d.state = 'dispatching' AND r.transport_disposition = 'queued'
                 AND (r.next_attempt_at IS NULL OR r.next_attempt_at <= ?)
             )
           )`,
      ).bind(now.getTime(), now.getTime(), now.getTime()).all<Row>();
      return rows.results.map((row) => ({
        id: String(row.id), revisionId: String(row.revision_id), campaignId: String(row.campaign_id),
        channel: String(row.channel) as Channel, scheduledAt: timestamp(row.scheduled_at), sendByAt: timestamp(row.send_by_at),
      }));
    },

    async listDueRecipientIds(stepId: string, now: Date, limit: number) {
      const rows = await client.prepare(
        `SELECT id FROM recipient_steps
         WHERE step_id = ? AND transport_disposition = 'queued' AND send_by_at > ?
           AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
           AND (lease_expires_at IS NULL OR lease_expires_at <= ?)
         ORDER BY created_at LIMIT ?`,
      ).bind(stepId, now.getTime(), now.getTime(), now.getTime(), limit).all<{ id: string }>();
      return rows.results.map((row) => row.id);
    },

    async claimRecipient(id: string, now: Date, leaseMs = 60_000) {
      const leaseToken = crypto.randomUUID();
      const row = await client.prepare(
        `UPDATE recipient_steps SET lease_token = ?, lease_expires_at = ?, updated_at = ?
         WHERE id = ? AND transport_disposition = 'queued' AND send_by_at > ?
           AND EXISTS(SELECT 1 FROM campaigns c WHERE c.id=recipient_steps.campaign_id
             AND c.active_revision_id=recipient_steps.revision_id AND c.state='dispatching')
           AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
           AND (lease_expires_at IS NULL OR lease_expires_at <= ?)
         RETURNING *`,
      ).bind(leaseToken, now.getTime() + leaseMs, now.getTime(), id, now.getTime(), now.getTime(), now.getTime()).first<Row>();
      return row ? recipientFromRow(row) : undefined;
    },

    async getDeliveryEnvelope(recipientStepId: string) {
      const [row, links] = await Promise.all([
        client.prepare(
          `SELECT r.*, v.name, v.email_subject, v.email_body, v.email_text, v.preheader, v.sms_body,
             v.sender_name, v.from_email, v.reply_to_email, v.sms_sender, v.physical_address,
             v.dormancy_policy_json, v.tracking_enabled, v.source_types_json, v.inclusion_rule_json, v.exclusion_rules_json, s.timezone
           FROM recipient_steps r
           JOIN campaign_revisions v ON v.id = r.revision_id
           JOIN campaign_steps s ON s.id = r.step_id
           WHERE r.id = ?`,
        ).bind(recipientStepId).first<Row>(),
        client.prepare(
          `SELECT l.* FROM campaign_revision_links l
           JOIN recipient_steps r ON r.revision_id = l.revision_id WHERE r.id = ? ORDER BY l.sequence`,
        ).bind(recipientStepId).all<Row>(),
      ]);
      if (!row) return undefined;
      return {
        recipient: recipientFromRow(row),
        timezone: String(row.timezone),
        sourceTypes: JSON.parse(String(row.source_types_json || '[]')) as string[],
        dormancyPolicyJson: String(row.dormancy_policy_json),
        inclusionRuleJson: String(row.inclusion_rule_json),
        exclusionRulesJson: String(row.exclusion_rules_json),
        revision: {
          name: String(row.name), emailSubject: String(row.email_subject), emailBody: String(row.email_body),
          emailText: String(row.email_text), preheader: String(row.preheader), smsBody: String(row.sms_body),
          senderName: String(row.sender_name), fromEmail: String(row.from_email), replyToEmail: String(row.reply_to_email),
          smsSender: String(row.sms_sender), physicalAddress: String(row.physical_address), trackingEnabled: bool(row.tracking_enabled),
        },
        links: links.results.map((link) => ({ label: String(link.label), destinationUrl: String(link.destination_url) })),
      };
    },

    async noteSenderApprovalRequired(id: string) {
      await client.prepare(`UPDATE recipient_steps SET last_error_code = 'sender-approval-required',
        last_error_detail = 'An operator must explicitly reapprove this saved revision with current sender evidence.'
        WHERE id = ? AND transport_disposition = 'queued'`).bind(id).run();
    },

    async markHandoffUnknown(id: string, leaseToken: string, now: Date, senderLease?: SenderLease, requestJson?: string, provider?: string, lookupWindowMs?:number, reputationSince=now.getTime()-30*86400000,destinationHash='',sourceGeneration?:number,providerCredentialDigest?:string) {
      const senderGuard = senderLease ? leaseGuard : '0';
      const statements = [client.prepare(
        `UPDATE recipient_steps SET transport_disposition = 'handoff-unknown', provider = COALESCE(?, provider), provider_credential_digest=?,
           handoff_started_at = ?, first_attempt_at=COALESCE(first_attempt_at,?), attempt_count=attempt_count+1,
           reconcile_until=CASE WHEN ?>0 THEN MIN(COALESCE(reconcile_until,?),?) ELSE reconcile_until END,
           last_error_code = CASE WHEN ? = 'sendgrid' THEN 'uncertain' ELSE last_error_code END, updated_at = ?
         WHERE ${recipientHandoffGuard(senderGuard, provider ?? 'unreported', reputationSince)}`,
      ).bind(provider ?? null, providerCredentialDigest??null, now.getTime(),now.getTime(),lookupWindowMs??0,now.getTime()+(lookupWindowMs??0),now.getTime()+(lookupWindowMs??0),provider ?? null, now.getTime(), id, leaseToken, now.getTime(), now.getTime(), requestJson ?? null, ...(senderLease ? leaseValues(senderLease, Date.now()) : []),sourceGeneration??null,destinationHash)];
      if (senderLease) statements.push(associationStatement(client, senderLease, 'handoff', id, leaseToken, now.getTime(),
        'changes() = 1', []));
      const results = await client.batch(statements);
      return results[0].meta.changes === 1;
    },

    async saveOutboundRequest(input: {
      id: string;
      leaseToken: string;
      requestJson: string;
      trackedLinks: Array<{ tokenDigest: string; destinationUrl: string; expiresAt: Date }>;
      now: Date;
    }) {
      const statements = input.trackedLinks.map((link) => client.prepare(
        `INSERT INTO tracked_links (token_digest, recipient_step_id, destination_url, expires_at, created_at, revision_link_id)
         VALUES (?, ?, ?, ?, ?, (SELECT MIN(l.id) FROM campaign_revision_links l
           JOIN recipient_steps r ON r.revision_id=l.revision_id
           WHERE r.id=? AND l.destination_url=? HAVING COUNT(*)=1)) ON CONFLICT(token_digest) DO NOTHING`,
      ).bind(link.tokenDigest, input.id, link.destinationUrl, link.expiresAt.getTime(), input.now.getTime(), input.id, link.destinationUrl));
      statements.push(client.prepare(
        `UPDATE recipient_steps SET outbound_request_json = COALESCE(outbound_request_json, ?), updated_at = ?
         WHERE id = ? AND lease_token = ? AND transport_disposition = 'queued'`,
      ).bind(input.requestJson, input.now.getTime(), input.id, input.leaseToken));
      const results = await client.batch(statements);
      return results.at(-1)?.meta.changes === 1;
    },

    /** A delivered link forwards for the life of its message; `expires_at` ends only its click recording. */
    async trackedLink(tokenDigest: string) {
      const row = await client.prepare(
        `SELECT * FROM tracked_links WHERE token_digest = ?`,
      ).bind(tokenDigest).first<Row>();
      return row ? {
        recipientStepId: String(row.recipient_step_id),
        destinationUrl: String(row.destination_url),
        revisionLinkId: row.revision_link_id == null ? undefined : String(row.revision_link_id),
        recordsClicksUntil: Number(row.expires_at),
      } : undefined;
    },

    async recordClick(input: {
      recipientStepId: string;
      requestDigest: string;
      occurredAt: Date;
      automated: boolean;
      automationReason?: string;
      userAgent?: string;
      destinationUrl?: string;
      revisionLinkId?: string;
    }) {
      await client.prepare(
        `INSERT INTO link_click_facts
         (id, recipient_step_id, request_digest, occurred_at, automated, automation_reason, user_agent, created_at, destination_url, revision_link_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(request_digest) DO NOTHING`,
      ).bind(
        ulid(input.occurredAt.getTime()), input.recipientStepId, input.requestDigest, input.occurredAt.getTime(), input.automated ? 1 : 0,
        input.automationReason ?? null, input.userAgent ?? null, input.occurredAt.getTime(), input.destinationUrl ?? null, input.revisionLinkId ?? null,
      ).run();
    },

    readRevisionById(revisionId: string) {
      return client.prepare('SELECT * FROM campaign_revisions WHERE id = ?').bind(revisionId).first<Row>();
    },

    async markSkipped(id: string, leaseToken: string, reason: string, now: Date) {
      await client.prepare(
        `UPDATE recipient_steps SET transport_disposition = 'skipped', skip_reason = ?, terminal_at = ?,
           lease_token = NULL, lease_expires_at = NULL, updated_at = ?
         WHERE id = ? AND lease_token = ? AND transport_disposition IN ('queued', 'handoff-unknown')`,
      ).bind(reason, now.getTime(), now.getTime(), id, leaseToken).run();
    },

    async deferRecipient(id: string, leaseToken: string, retryAt: Date, reason: string, now: Date) {
      const due=Number.isFinite(retryAt.getTime())?retryAt.getTime():Number.MAX_SAFE_INTEGER;
      const deadlineReason=['sms-quiet-window','quiet-hours-deadline'].includes(reason)?'quiet-hours-deadline':reason==='sms-frequency-window'?'frequency-window-deadline':'send-window-expired';
      await client.prepare(`UPDATE recipient_steps SET
        transport_disposition=CASE WHEN MAX(?,?)>=send_by_at THEN 'skipped' ELSE 'queued' END,
        next_attempt_at=CASE WHEN MAX(?,?)>=send_by_at THEN NULL ELSE ? END,
        skip_reason=CASE WHEN MAX(?,?)>=send_by_at THEN ? ELSE NULL END,
        terminal_at=CASE WHEN MAX(?,?)>=send_by_at THEN ? ELSE NULL END,
        last_error_code=?,lease_token=NULL,lease_expires_at=NULL,updated_at=?
        WHERE id=? AND lease_token=? AND transport_disposition IN ('queued','handoff-unknown')`)
        .bind(due,now.getTime(),due,now.getTime(),due,due,now.getTime(),deadlineReason,due,now.getTime(),now.getTime(),reason,now.getTime(),id,leaseToken).run();
    },

    async deferPacedRecipient(id:string,leaseToken:string,retryAt:Date,now:Date,code='provider-pacing') {
      const due=Number.isFinite(retryAt.getTime())?retryAt.getTime():Number.MAX_SAFE_INTEGER;
      const deadlineReason=['sms-quiet-window','quiet-hours-deadline'].includes(code)?'quiet-hours-deadline':code==='sms-frequency-window'?'frequency-window-deadline':'send-window-expired';
      await client.prepare(`UPDATE recipient_steps SET
        transport_disposition=CASE WHEN MAX(?,?)>=send_by_at THEN 'skipped' ELSE 'queued' END,
        next_attempt_at=CASE WHEN MAX(?,?)>=send_by_at THEN NULL ELSE ? END,
        skip_reason=CASE WHEN MAX(?,?)>=send_by_at THEN ? ELSE NULL END,
        terminal_at=CASE WHEN MAX(?,?)>=send_by_at THEN ? ELSE NULL END,
        attempt_count=MAX(0,attempt_count-1),first_attempt_at=CASE WHEN attempt_count=1 THEN NULL ELSE first_attempt_at END,
        handoff_started_at=NULL,lease_token=NULL,lease_expires_at=NULL,last_error_code=?,updated_at=?
        WHERE id=? AND lease_token=? AND transport_disposition='handoff-unknown'`)
        .bind(due,now.getTime(),due,now.getTime(),due,due,now.getTime(),deadlineReason,due,now.getTime(),now.getTime(),code,now.getTime(),id,leaseToken).run();
    },

    async recordHandoff(input: {
      id: string;
      leaseToken: string;
      provider: string;
      providerMessageId: string;
      disposition: 'accepted' | 'handoff-unknown';
      acceptedAt?: Date;
      actualSender?:string;
      now: Date;
    }) {
      await client.prepare(
        `UPDATE recipient_steps SET provider = ?, provider_message_id = ?, transport_disposition = ?, actual_sender=?,
           last_error_code = CASE WHEN ? = 'handoff-unknown' AND ? = 'sendgrid' THEN 'uncertain' ELSE NULL END,
           last_error_detail = CASE WHEN ? = 'handoff-unknown' AND ? = 'sendgrid' THEN 'Uncertain submission: operator review required. Never automatically retried.' ELSE NULL END,
           provider_accepted_at = ?, handed_off_at = CASE WHEN ? = 'accepted' THEN ? ELSE handed_off_at END,
           lease_token = NULL, lease_expires_at = NULL, updated_at = ?
         WHERE id = ? AND lease_token = ? AND transport_disposition = 'handoff-unknown'`,
      ).bind(
        input.provider, input.providerMessageId || null, input.disposition, input.actualSender??null,
        input.disposition, input.provider, input.disposition, input.provider,
        input.acceptedAt?.getTime() ?? null, input.disposition, input.now.getTime(), input.now.getTime(), input.id, input.leaseToken,
      ).run();
    },

    async recordTransportFailure(input: {
      id: string;
      leaseToken: string;
      code: string;
      detail: string;
      permanent: boolean;
      now: Date;
      retryAt?: Date;
    }) {
      await client.prepare(
        `UPDATE recipient_steps SET transport_disposition = CASE WHEN ? THEN 'failed' ELSE 'queued' END,
           terminal_at = CASE WHEN ? THEN ? ELSE NULL END, handoff_started_at=NULL, next_attempt_at = ?, last_error_code = ?,
           last_error_detail = ?, lease_token = NULL, lease_expires_at = NULL, updated_at = ?
         WHERE id = ? AND lease_token = ? AND transport_disposition IN ('queued', 'handoff-unknown')`,
      ).bind(
        input.permanent ? 1 : 0, input.permanent ? 1 : 0, input.now.getTime(), input.retryAt?.getTime() ?? null,
        input.code, input.detail, input.now.getTime(), input.id, input.leaseToken,
      ).run();
    },

    async noteUnknownFailure(id: string, leaseToken: string, detail: string, now: Date) {
      await client.prepare(
        `UPDATE recipient_steps SET last_error_code = CASE WHEN provider = 'sendgrid' THEN 'uncertain' ELSE 'handoff-unknown' END, last_error_detail = ?,
           lease_token = NULL, lease_expires_at = NULL, updated_at = ?
         WHERE id = ? AND lease_token = ? AND transport_disposition = 'handoff-unknown'`,
      ).bind(detail, now.getTime(), id, leaseToken).run();
    },

    async listUnresolved(now: Date, limit = 100) {
      const rows = await client.prepare(
        `SELECT * FROM recipient_steps
         WHERE transport_disposition IN ('handoff-unknown', 'handed-off', 'accepted')
         ORDER BY updated_at LIMIT ?`,
      ).bind(limit).all<Row>();
      return rows.results.map(recipientFromRow).map((item) => ({ ...item, expired: Boolean(item.reconcileUntil && item.reconcileUntil <= now) }));
    },

    async failUnconfirmed(id: string, now: Date) {
      await client.prepare(
        `UPDATE recipient_steps SET transport_disposition = 'failed', last_error_code = 'outcome-unconfirmed',
           last_error_detail = 'Provider lookup window expired without a confirmed outcome.', terminal_at = ?, updated_at = ?
         WHERE id = ? AND transport_disposition IN ('handoff-unknown', 'handed-off', 'accepted')`,
      ).bind(now.getTime(), now.getTime(), id).run();
    },

    async saveReconciliationCursor(id: string, cursor: string | undefined, now: Date) {
      await client.prepare(
        `UPDATE recipient_steps SET reconcile_cursor = ?, updated_at = ?
         WHERE id = ? AND transport_disposition IN ('handoff-unknown', 'handed-off', 'accepted')`,
      ).bind(cursor ?? null, now.getTime(), id).run();
    },

  };
}
