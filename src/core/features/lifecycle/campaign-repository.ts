import {reputationGuard} from './reputation-guard';
import {providerHoldGuard} from './provider-holds';
import { leaseGuard, leaseValues, associationStatement } from '@/core/features/sender-verification/repository';
import { createApprovalAuthorityRepository, senderEvidenceDetail, senderFromGuard } from '@/core/features/sender-verification/approval-authority';
import type { SenderLease } from '@/core/features/sender-verification/types';
import type { Database } from '@/core/platform/db/client';
import { ulid } from '@/core/shared/ids';

import type { CampaignRevisionSnapshot, Channel, FrozenCandidate, ProviderFact, PersonalisationUsage } from './types';

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
  blockedHosts?: Array<{host: string; links: string[]}>;
};

export function createCampaignLifecycleRepository(database: Database) {
  const client = database.$client;

  async function readRevisionSnapshot(campaignId: string, revisionId: string): Promise<CampaignRevisionSnapshot | undefined> {
    const [campaign, revision, steps, links] = await Promise.all([
      client.prepare('SELECT * FROM campaigns WHERE id = ?').bind(campaignId).first<Row>(),
      client.prepare('SELECT * FROM campaign_revisions WHERE id = ? AND campaign_id = ?').bind(revisionId, campaignId).first<Row>(),
      client.prepare('SELECT * FROM campaign_steps WHERE revision_id = ? ORDER BY sequence').bind(revisionId).all<Row>(),
      client.prepare('SELECT * FROM campaign_revision_links WHERE revision_id = ? ORDER BY sequence').bind(revisionId).all<Row>(),
    ]);
    if (!campaign || !revision) return undefined;
    return {
      campaign: {
        id: String(campaign.id),
        state: String(campaign.state),
        activeRevisionId: campaign.active_revision_id == null ? null : String(campaign.active_revision_id),
        updatedAt: timestamp(campaign.updated_at),
      },
      revision: revisionFromRow(revision),
      steps: steps.results.map((row) => ({
        id: String(row.id),
        channel: String(row.channel) as Channel,
        sequence: Number(row.sequence),
        timezone: String(row.timezone),
        scheduledAt: timestamp(row.scheduled_at),
        sendByAt: timestamp(row.send_by_at),
        whyThisTime: String(row.why_this_time),
      })),
      links: links.results.map((row) => ({
        id: String(row.id),
        label: String(row.label),
        destinationUrl: String(row.destination_url),
        sequence: Number(row.sequence),
      })),
    };
  }

  return {
    ...createApprovalAuthorityRepository(database),
    readRevisionSnapshot,

    async approvedRevision(campaignId: string, revisionId: string) {
      const row = await client.prepare(
        `SELECT revision_digest FROM campaign_approval_requests WHERE campaign_id = ? AND revision_id = ?`,
      ).bind(campaignId, revisionId).first<{ revision_digest: string }>();
      return row?.revision_digest;
    },

    async testSendHistory(campaignId: string) {
      return (await client.prepare(`SELECT a.actor_id,a.occurred_at,a.detail_json,o.display_name AS operator_name FROM lifecycle_audit_entries a
        JOIN campaign_revisions r ON r.id=a.entity_id LEFT JOIN operators o ON o.id=a.actor_id WHERE r.campaign_id=? AND a.action='test-send'
        ORDER BY a.occurred_at DESC,a.id DESC LIMIT 100`).bind(campaignId).all<{actor_id:string;occurred_at:number;detail_json:string;operator_name:string|null}>()).results
        .map(row=>({operatorId:row.actor_id,operatorName:row.operator_name??'Removed operator',occurredAt:new Date(row.occurred_at).toISOString(),...JSON.parse(row.detail_json)}));
    },

    async recordTestSend(
      revisionId: string,
      operatorId: string,
      channel: Channel,
      destinationDigest: string,
      revisionDigest: string,
      now: Date,
      destination?: string,
    ) {
      const operationKey = `test-send:${revisionId}:${channel}:${destinationDigest}:${revisionDigest}`;
      await client.prepare(
        `INSERT INTO lifecycle_audit_entries
         (id, operation_key, entity_type, entity_id, action, actor_type, actor_id, detail_json, occurred_at, created_at)
         VALUES (?, ?, 'campaign-revision', ?, 'test-send', 'operator', ?, ?, ?, ?)
         ON CONFLICT(operation_key) DO NOTHING`,
      ).bind(
        ulid(now.getTime()), operationKey, revisionId, operatorId,
        JSON.stringify({ channel, destination, destinationDigest, revisionDigest, test: true }), now.getTime(), now.getTime(),
      ).run();
    },

    async saveDraftReview(input: {
      snapshot: CampaignRevisionSnapshot; checks: ApprovalCheck[]; now: Date;
      audience?: {noHistoryCount?:number;dormancyIncludedCount?:number;openOnlyCount?:number;candidateCount: number; eligibleCount: number; exclusions: Array<{reason: string; count: number}>; channelCounts: Array<{channel: Channel; recipientStepCount: number; eligibleContactCount?: number; fallbackContactCount?: number}>};
    }) {
      const {snapshot, checks, now, audience} = input;
      const id = snapshot.revision.id, time = now.getTime();
      const guard = `EXISTS (SELECT 1 FROM campaign_revisions WHERE id = ? AND state = 'draft' AND updated_at = ?)`;
      const guardValues = () => [id, snapshot.revision.updatedAt.getTime()];
      const statements: D1PreparedStatement[] = [];
      statements.push(client.prepare(`DELETE FROM campaign_checks WHERE revision_id = ? AND ${guard}`).bind(id, ...guardValues()));
      for (const check of checks) statements.push(client.prepare(`INSERT INTO campaign_checks
        (id, revision_id, kind, status, detail, blocking, created_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE ${guard}`)
        .bind(ulid(time), id, check.kind, check.status, check.detail, check.blocking ? 1 : 0, time, time, ...guardValues()));
      statements.push(client.prepare(`DELETE FROM campaign_audience_channel_counts WHERE audience_id IN
        (SELECT id FROM campaign_audiences WHERE revision_id = ?) AND ${guard}`).bind(id, ...guardValues()));
      statements.push(client.prepare(`DELETE FROM campaign_audiences WHERE revision_id = ? AND ${guard}`).bind(id, ...guardValues()));
      if (audience) {
        const audienceId = ulid(time);
        statements.push(client.prepare(`INSERT INTO campaign_audiences
          (id, revision_id, as_of_at, candidate_count, excluded_count, eligible_count, exclusions, created_at, updated_at)
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${guard}`)
          .bind(audienceId, id, time, audience.candidateCount, audience.candidateCount - audience.eligibleCount,
            audience.eligibleCount, JSON.stringify(audience.exclusions), time, time, ...guardValues()));
        for (const count of audience.channelCounts) statements.push(client.prepare(`INSERT INTO campaign_audience_channel_counts
          (id, audience_id, channel, recipient_step_count, eligible_contact_count, fallback_contact_count, created_at, updated_at)
          SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE ${guard}`)
          .bind(ulid(time), audienceId, count.channel, count.recipientStepCount, count.eligibleContactCount ?? null, count.fallbackContactCount ?? null, time, time, ...guardValues()));
      }
      if(audience)statements.push(client.prepare(`UPDATE campaign_audiences SET dormancy_included_count=?,no_history_count=?,open_only_count=? WHERE revision_id=? AND ${guard}`).bind(audience.dormancyIncludedCount??0,audience.noHistoryCount??0,audience.openOnlyCount??0,id,...guardValues()));
      statements.push(client.prepare(`SELECT 1 AS saved WHERE ${guard}`).bind(...guardValues()));
      const result = await client.batch(statements);
      return result.at(-1)?.results.length === 1;
    },

    async saveChecks(revisionId: string, checks: ApprovalCheck[], now: Date) {
      const statements: D1PreparedStatement[] = [
        client.prepare('DELETE FROM campaign_checks WHERE revision_id = ?').bind(revisionId),
      ];
      for (const check of checks) {
        statements.push(
          client.prepare(
            `INSERT INTO campaign_checks
             (id, revision_id, kind, status, detail, blocking, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ).bind(
            ulid(now.getTime()),
            revisionId,
            check.kind,
            check.status,
            check.detail,
            check.blocking ? 1 : 0,
            now.getTime(),
            now.getTime(),
          ),
        );
      }
      await client.batch(statements);
    },

    async approve(input: {
      snapshot: CampaignRevisionSnapshot;
      revisionDigest: string;
      senderLease?: SenderLease;
      smsPolicy?:{digest:string;sender:string;json:string};
      openTracking: {enabled:boolean;generation:number};
      operatorId: string;
      idempotencyKey: string;
      candidates: FrozenCandidate[];
      audienceSummary?: {noHistoryCount?:number;dormancyIncludedCount?:number;openOnlyCount?:number;candidateCount: number; exclusions: Record<string, number>; personalisationUsage?: PersonalisationUsage[]};
      now: Date;
      reconciliationWindowMs: Partial<Record<Channel, number>>;
      sourceGeneration?:number;
      mailProvider?:string;
      reputationSince?:number;
    }) {
      const { snapshot, revisionDigest, operatorId, idempotencyKey, candidates, now } = input;
      const nowMs = now.getTime();
      const writeToken = crypto.randomUUID();
      const previousRevision = snapshot.campaign.activeRevisionId;
      const needsSender = snapshot.steps.some(step => step.channel === 'email');
      const needsSms = snapshot.steps.some(step => step.channel === 'sms');
      if (needsSender && !input.senderLease) return { kind: 'conflict' as const };
      if (needsSms && (!input.smsPolicy || input.smsPolicy.sender!==snapshot.revision.smsSender)) return {kind:'conflict' as const};
      const authorityTime = Date.now();
      const approvedFrom = `${snapshot.revision.senderName} <${snapshot.revision.fromEmail}>`;
      const senderGuard = needsSender ? `(${leaseGuard} AND ${senderFromGuard})` : '1';
      const senderValues = needsSender ? [...leaseValues(input.senderLease!, authorityTime), input.senderLease!.id, approvedFrom] : [];
      const approvalGuard = `EXISTS (
        SELECT 1 FROM campaign_approval_requests ar
        WHERE ar.idempotency_key = ? AND ar.campaign_id = ? AND ar.revision_id = ?
          AND ar.revision_digest = ? AND ar.write_token = ?
      )`;
      const approvalGuardValues = () => [
        idempotencyKey, snapshot.campaign.id, snapshot.revision.id, revisionDigest, writeToken,
      ] as const;
      const replaceGuard = `(
        c.state = 'draft' OR (
          c.state = 'scheduled' AND NOT EXISTS (
            SELECT 1 FROM step_dispatches d
            WHERE d.revision_id = c.active_revision_id AND d.started_at IS NOT NULL
          )
        )
      )`;
      const statements: D1PreparedStatement[] = [];

      statements.push(
        client.prepare(
          `INSERT INTO campaign_approval_requests
           (idempotency_key, campaign_id, revision_id, revision_digest, write_token, operator_id, approved_at, created_at)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?
           WHERE EXISTS (
             SELECT 1 FROM campaign_revisions r JOIN campaigns c ON c.id = r.campaign_id
             WHERE r.id = ? AND r.campaign_id = ? AND r.state = 'draft' AND r.updated_at = ?
               AND c.updated_at = ? AND ${replaceGuard} AND ${senderGuard}
               AND EXISTS(SELECT 1 FROM audience_source_authority WHERE id=1 AND generation=?)
               AND COALESCE((SELECT enabled FROM open_tracking_settings WHERE id=1),0)=?
               AND COALESCE((SELECT generation FROM open_tracking_settings WHERE id=1),0)=?
               AND ${needsSender?reputationGuard('r',input.reputationSince??nowMs-30*86400000):'1'}
               AND ${needsSender?providerHoldGuard(input.mailProvider??'resend','r'):'1'}
               AND ${needsSms?providerHoldGuard('mobile-message','r',"'sms'"):'1'}
               AND (c.proposal_id IS NULL OR EXISTS (SELECT 1 FROM proposals p WHERE p.id=c.proposal_id AND p.state='proposed' AND p.send_by_at>?))
           )
           ON CONFLICT(idempotency_key) DO NOTHING`,
        ).bind(
          idempotencyKey,
          snapshot.campaign.id,
          snapshot.revision.id,
          revisionDigest,
          writeToken,
          operatorId,
          nowMs,
          nowMs,
          snapshot.revision.id,
          snapshot.campaign.id,
          snapshot.revision.updatedAt.getTime(),
          snapshot.campaign.updatedAt.getTime(),
          ...senderValues,
          input.sourceGeneration??null,
          Number(input.openTracking.enabled),
          input.openTracking.generation,
          Math.max(nowMs,authorityTime),
        ),
      );
      if (needsSender) statements.push(associationStatement(client, input.senderLease!, 'approval', snapshot.revision.id,
        idempotencyKey, authorityTime, approvalGuard, [...approvalGuardValues()]));
      if (needsSms) statements.push(client.prepare(`INSERT INTO sms_approval_policies(revision_id,policy_digest,sender,policy_json)
        SELECT ?,?,?,? WHERE ${approvalGuard}
        ON CONFLICT(revision_id) DO UPDATE SET policy_digest=excluded.policy_digest,sender=excluded.sender,policy_json=excluded.policy_json`)
        .bind(snapshot.revision.id,input.smsPolicy!.digest,input.smsPolicy!.sender,input.smsPolicy!.json,...approvalGuardValues()));
      statements.push(
        client.prepare(
          `UPDATE campaign_revisions SET state = 'approved', content_digest = ?, approved_at = ?,
             approved_by_operator_id = ?, source_types_json = ?, updated_at = ?
           WHERE id = ? AND state = 'draft' AND updated_at = ?
             AND ${approvalGuard}`,
        ).bind(
          revisionDigest,
          nowMs,
          operatorId,
          snapshot.revision.sourceTypesJson,
          nowMs,
          snapshot.revision.id,
          snapshot.revision.updatedAt.getTime(),
          ...approvalGuardValues(),
        ),
      );
      statements.push(
        client.prepare(
          `UPDATE campaigns SET state = 'scheduled', active_revision_id = ?, cancelled_at = NULL, updated_at = ?
           WHERE id = ? AND EXISTS (
             SELECT 1 FROM campaign_approval_requests
             WHERE idempotency_key = ? AND campaign_id = ? AND revision_id = ? AND revision_digest = ? AND write_token = ?
           )`,
        ).bind(snapshot.revision.id, nowMs, snapshot.campaign.id, ...approvalGuardValues()),
      );
      if (input.audienceSummary) {
        // Persist the audience that was actually frozen, in the same guarded
        // transaction as approval. Draft snapshot invalidation must not erase
        // the operator's approved counts after a save/reload.
        const eligibleCount = candidates.length;
        statements.push(client.prepare(`INSERT INTO campaign_audiences
          (id, revision_id, as_of_at, candidate_count, excluded_count, eligible_count, exclusions, created_at, updated_at)
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${approvalGuard}
          ON CONFLICT(revision_id) DO UPDATE SET as_of_at = excluded.as_of_at,
          candidate_count = excluded.candidate_count, excluded_count = excluded.excluded_count,
          eligible_count = excluded.eligible_count, exclusions = excluded.exclusions, updated_at = excluded.updated_at`)
          .bind(ulid(nowMs), snapshot.revision.id, nowMs, input.audienceSummary.candidateCount,
            input.audienceSummary.candidateCount - eligibleCount, eligibleCount,
            JSON.stringify(input.audienceSummary.exclusions), nowMs, nowMs, ...approvalGuardValues()));
        statements.push(client.prepare(`DELETE FROM campaign_audience_channel_counts
          WHERE audience_id IN (SELECT id FROM campaign_audiences WHERE revision_id = ?) AND ${approvalGuard}`)
          .bind(snapshot.revision.id, ...approvalGuardValues()));
        for (const channel of new Set(snapshot.steps.map(step => step.channel))) {
          const count = snapshot.steps.filter(step => step.channel === channel).length * candidates.filter(candidate => candidate.channels[channel as Channel]).length;
          const usage = input.audienceSummary.personalisationUsage?.find(item => item.channel === channel);
          statements.push(client.prepare(`INSERT INTO campaign_audience_channel_counts
            (id, audience_id, channel, recipient_step_count, eligible_contact_count, fallback_contact_count, created_at, updated_at)
            SELECT ?, id, ?, ?, ?, ?, ?, ? FROM campaign_audiences WHERE revision_id = ? AND ${approvalGuard}`)
            .bind(ulid(nowMs), channel, count, usage?.eligibleContactCount ?? null, usage?.fallbackContactCount ?? null, nowMs, nowMs, snapshot.revision.id, ...approvalGuardValues()));
        }
      }
      statements.push(
        client.prepare(
          `UPDATE recipient_steps SET transport_disposition = 'skipped', skip_reason = 'schedule-replaced',
             terminal_at = ?, lease_token = NULL, lease_expires_at = NULL, updated_at = ?
           WHERE campaign_id = ? AND revision_id <> ? AND transport_disposition = 'queued'
             AND EXISTS (SELECT 1 FROM campaigns WHERE id = ? AND active_revision_id = ?)
             AND ${approvalGuard}`,
        ).bind(
          nowMs, nowMs, snapshot.campaign.id, snapshot.revision.id, snapshot.campaign.id, snapshot.revision.id,
          ...approvalGuardValues(),
        ),
      );
      statements.push(
        client.prepare(
          `UPDATE proposals SET state = 'approved', updated_at = ?
           WHERE id = (SELECT proposal_id FROM campaigns WHERE id = ? AND active_revision_id = ?)
             AND state = 'proposed'
             AND ${approvalGuard}`,
        ).bind(nowMs, snapshot.campaign.id, snapshot.revision.id, ...approvalGuardValues()),
      );
      statements.push(
        client.prepare(
          `INSERT INTO proposal_transitions
           (id, proposal_id, from_state, to_state, actor_id, reason, occurred_at, created_at)
           SELECT ?, c.proposal_id, 'proposed', 'approved', ?, ?, ?, ? FROM campaigns c
           WHERE c.id = ? AND c.active_revision_id = ? AND c.proposal_id IS NOT NULL
             AND changes() = 1 AND ${approvalGuard}
             AND NOT EXISTS (SELECT 1 FROM proposal_transitions WHERE proposal_id = c.proposal_id AND to_state = 'approved')`,
        ).bind(
          ulid(nowMs), operatorId, `approval:${snapshot.revision.id}`, nowMs, nowMs,
          snapshot.campaign.id, snapshot.revision.id, ...approvalGuardValues(),
        ),
      );

      if(input.audienceSummary)statements.push(client.prepare(`UPDATE campaign_audiences SET dormancy_included_count=?,no_history_count=?,open_only_count=? WHERE revision_id=? AND ${approvalGuard}`).bind(input.audienceSummary.dormancyIncludedCount??0,input.audienceSummary.noHistoryCount??0,input.audienceSummary.openOnlyCount??0,snapshot.revision.id,...approvalGuardValues()));
      for (const candidate of candidates) {
        const candidateId = ulid(nowMs);
        statements.push(
          client.prepare(
            `INSERT INTO campaign_revision_candidates
             (id, revision_id, contact_id, contact_identity_key, matched_at, created_at)
             SELECT ?, ?, ?, ?, ?, ?
             WHERE EXISTS (SELECT 1 FROM campaigns WHERE id = ? AND active_revision_id = ?)
               AND ${approvalGuard}
             ON CONFLICT(revision_id, contact_identity_key) DO NOTHING`,
          ).bind(
            candidateId, snapshot.revision.id, candidate.contactId, candidate.contactIdentityKey, nowMs, nowMs,
            snapshot.campaign.id, snapshot.revision.id, ...approvalGuardValues(),
          ),
        );
        for (const step of snapshot.steps) {
          const channel = candidate.channels[step.channel];
          if (!channel) continue;
          const recipientId = ulid(nowMs);
          const deliveryKey = `${snapshot.campaign.id}:${snapshot.revision.id}:${step.id}:${candidate.contactIdentityKey}`;
          const reconcileUntil = step.sendByAt.getTime() + (input.reconciliationWindowMs[step.channel] ?? 0);
          statements.push(
            client.prepare(
              `INSERT INTO recipient_steps
               (id, campaign_id, revision_id, step_id, contact_id, contact_identity_key, channel,
                destination, idempotency_key, transport_disposition, attempt_count, next_attempt_at,
                reconcile_until, send_by_at, created_at, updated_at)
               SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?, ?, ?, ?
               WHERE EXISTS (SELECT 1 FROM campaigns WHERE id = ? AND active_revision_id = ?)
                 AND ${approvalGuard}
               ON CONFLICT(revision_id, step_id, contact_identity_key) DO NOTHING`,
            ).bind(
              recipientId,
              snapshot.campaign.id,
              snapshot.revision.id,
              step.id,
              candidate.contactId,
              candidate.contactIdentityKey,
              step.channel,
              channel.destination,
              deliveryKey,
              step.scheduledAt.getTime(),
              reconcileUntil,
              step.sendByAt.getTime(),
              nowMs,
              nowMs,
              snapshot.campaign.id,
              snapshot.revision.id,
              ...approvalGuardValues(),
            ),
          );
        }
      }
      statements.push(
        client.prepare(
          `INSERT INTO campaign_state_transitions
           (id, campaign_id, from_state, to_state, actor_type, actor_id, reason, occurred_at, created_at)
           SELECT ?, ?, ?, 'scheduled', 'operator', ?, ?, ?, ?
           WHERE ${approvalGuard}
             AND NOT EXISTS (SELECT 1 FROM campaign_state_transitions WHERE campaign_id = ? AND reason = ?)
          `,
        ).bind(
          ulid(nowMs), snapshot.campaign.id, snapshot.campaign.state, operatorId,
          `approval:${snapshot.revision.id}`, nowMs, nowMs,
          ...approvalGuardValues(), snapshot.campaign.id, `approval:${snapshot.revision.id}`,
        ),
      );
      statements.push(
        client.prepare(
          `INSERT INTO lifecycle_audit_entries
           (id, operation_key, entity_type, entity_id, action, actor_type, actor_id, detail_json, occurred_at, created_at)
           SELECT ?, ?, 'campaign-revision', ?, 'approved', 'operator', ?, ${needsSender ? senderEvidenceDetail : '?'}, ?, ?
           WHERE ${approvalGuard}
           ON CONFLICT(operation_key) DO NOTHING`,
        ).bind(
          ulid(nowMs), `approval:${idempotencyKey}`, snapshot.revision.id, operatorId,
          JSON.stringify({ revisionDigest, previousRevision, dormancyPolicy:snapshot.revision.dormancyPolicyJson?JSON.parse(snapshot.revision.dormancyPolicyJson):undefined,
            approval: {idempotency_key: idempotencyKey, campaign_id: snapshot.campaign.id, revision_id: snapshot.revision.id,
              revision_digest: revisionDigest, write_token: writeToken, operator_id: operatorId, approved_at: nowMs, created_at: nowMs},
            ...(needsSender ? {approvedFrom, senderEvidence: input.senderLease} : {}),
          }), ...(needsSender ? [input.senderLease!.id] : []), authorityTime, authorityTime, ...approvalGuardValues(),
        ),
      );
      await client.batch(statements);
      const approval = await client.prepare(
        `SELECT * FROM campaign_approval_requests
         WHERE idempotency_key = ? AND campaign_id = ? AND revision_id = ? AND revision_digest = ?`,
      ).bind(idempotencyKey, snapshot.campaign.id, snapshot.revision.id, revisionDigest).first<Row>();
      return approval ? { kind: 'approved' as const, revisionDigest } : { kind: 'conflict' as const };
    },

  };
}
