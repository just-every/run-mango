import type { Database } from '@/core/platform/db/client';
import type { CampaignRevisionSnapshot } from '@/core/features/lifecycle/types';
import { associationStatement, leaseGuard, leaseValues } from './repository';
import type { SenderLease } from './types';

// The complete original row is captured before reapproval checks. Its write
// token distinguishes authorization events even if their other values match.
export type ApprovalIdentity = {
  idempotency_key: string; campaign_id: string; revision_id: string; revision_digest: string;
  write_token: string; operator_id: string; approved_at: number; created_at: number;
};
const identityColumns = ['idempotency_key', 'campaign_id', 'revision_id', 'revision_digest',
  'write_token', 'operator_id', 'approved_at', 'created_at'] as const;
const recordedIdentity = identityColumns.map(column =>
  `json_extract(ae.detail_json, '$.approval.${column}') = ar.${column}`).join(' AND ');

export const senderFromGuard = `EXISTS (SELECT 1 FROM sender_verification_inspections chosen
  WHERE chosen.id = ? AND json_extract(chosen.result_json, '$.evidence.binding.from') = ?)`;

// Capture the selected inspection's time in the append-only authorization event,
// alongside its lease identity. Never reconstruct that choice from an association
// at dispatch. Expiry is intentionally not compared with the current clock here.
export const senderEvidenceDetail = `json_set(?, '$.senderEvidence.checkedAt',
  (SELECT checked_at FROM sender_verification_inspections WHERE id = ?))`;
const historicalEvidence = `si.ready = 1 AND si.observation_id IS NOT NULL
  AND si.expires_at > si.checked_at
  AND so.id = si.observation_id AND so.binding_digest = si.binding_digest
  AND so.configuration_digest = si.configuration_digest
  AND so.observed_at <= si.checked_at AND so.expires_at > si.checked_at
  AND json_extract(ae.detail_json, '$.approvedFrom') = av.sender_name || ' <' || av.from_email || '>'
  AND json_extract(si.result_json, '$.evidence.binding.from') = json_extract(ae.detail_json, '$.approvedFrom')
  AND json_extract(ae.detail_json, '$.senderEvidence.id') = si.id
  AND json_extract(ae.detail_json, '$.senderEvidence.stateId') = si.state_id
  AND json_extract(ae.detail_json, '$.senderEvidence.generation') = si.generation
  AND json_extract(ae.detail_json, '$.senderEvidence.bindingDigest') = si.binding_digest
  AND json_extract(ae.detail_json, '$.senderEvidence.configurationDigest') = si.configuration_digest
  AND json_extract(ae.detail_json, '$.senderEvidence.observationId') = si.observation_id
  AND json_extract(ae.detail_json, '$.senderEvidence.checkedAt') = si.checked_at
  AND si.checked_at <= ae.occurred_at AND ae.occurred_at = ae.created_at
  AND ae.created_at >= ar.approved_at AND sa.created_at = ae.created_at`;

export function approvalAuthorityGuard(campaign: string, revision: string, eventId?: string) {
  return `EXISTS (
    SELECT 1 FROM campaign_approval_requests ar
    JOIN campaign_revisions av ON av.id = ar.revision_id AND av.campaign_id = ar.campaign_id
    JOIN lifecycle_audit_entries ae ON ae.entity_type = 'campaign-revision' AND ae.entity_id = ar.revision_id
    JOIN sender_verification_associations sa ON sa.entity_id = ar.revision_id AND sa.kind = 'approval'
    JOIN sender_verification_inspections si ON si.id = sa.inspection_id
    JOIN sender_verification_observations so ON so.id = si.observation_id
    WHERE ar.campaign_id = ${campaign} AND ar.revision_id = ${revision}
      AND av.state = 'approved' AND av.content_digest = ar.revision_digest
      AND av.approved_at = ar.approved_at AND av.updated_at = ar.approved_at
      AND ((av.approved_by_operator_id = ar.operator_id AND ae.actor_type='operator')
        OR (av.approved_by_operator_id IS NULL AND av.agent_sponsor_id=ar.operator_id
          AND av.authorized_by_agent_id=ae.actor_id AND ae.actor_type='agent'))
      AND ae.actor_id IS NOT NULL AND ae.actor_id <> ''
      ${eventId ? `AND ae.id = ${eventId}` : ''}
      AND ${recordedIdentity} AND ${historicalEvidence}
      AND (
        (ae.action IN ('approved','authorized') AND ae.operation_key = 'approval:' || ar.idempotency_key
          AND (ae.actor_id = ar.operator_id OR ae.actor_id=av.authorized_by_agent_id) AND sa.attempt_key = ar.idempotency_key
          AND json_extract(ae.detail_json, '$.revisionDigest') = ar.revision_digest)
        OR (ae.action = 'sender-reapproved' AND sa.attempt_key = ae.operation_key
          AND json_extract(ae.detail_json, '$.campaignId') = ar.campaign_id
          AND json_extract(ae.detail_json, '$.approvalKey') = ar.idempotency_key
          AND json_extract(ae.detail_json, '$.revisionDigest') = ar.revision_digest)
      )
  )`;
}

export function createApprovalAuthorityRepository(database: Database) {
  const client = database.$client;
  return {
    readApprovalIdentity(campaignId: string, revisionId: string) {
      return client.prepare(`SELECT ${identityColumns.join(',')} FROM campaign_approval_requests
        WHERE campaign_id = ? AND revision_id = ?`).bind(campaignId, revisionId).first<ApprovalIdentity>();
    },

    async hasPendingEmail(campaignId: string, revisionId: string) {
      return Boolean(await client.prepare(`SELECT 1 FROM recipient_steps WHERE campaign_id = ? AND revision_id = ?
        AND channel = 'email' AND transport_disposition = 'queued' AND send_by_at > ? LIMIT 1`)
        .bind(campaignId, revisionId, Date.now()).first());
    },

    async hasSenderApprovalAuthority(campaignId: string, revisionId: string) {
      return Boolean(await client.prepare(`SELECT 1 AS valid WHERE ${approvalAuthorityGuard('?', '?')}`)
        .bind(campaignId, revisionId).first());
    },

    async reapproveSender(input: {
      snapshot: CampaignRevisionSnapshot; approval: ApprovalIdentity; senderLease: SenderLease;
      operatorId: string; idempotencyKey: string;
    }) {
      const { snapshot, approval, senderLease, operatorId, idempotencyKey } = input;
      const revisionDigest = approval.revision_digest;
      const approvedFrom = `${snapshot.revision.senderName} <${snapshot.revision.fromEmail}>`;
      const operationKey = `sender-reapproval:${idempotencyKey}`;
      const id = crypto.randomUUID(), now = Date.now();
      // Preserve all original approval, audience and provider bytes. The read
      // identity is compared, never replaced by a later SELECT of its key.
      const guard = `EXISTS (SELECT 1 FROM campaign_approval_requests ar
        JOIN campaign_revisions r ON r.id = ar.revision_id AND r.campaign_id = ar.campaign_id
        JOIN campaigns c ON c.id = r.campaign_id AND c.active_revision_id = r.id
        WHERE ar.campaign_id = ? AND ar.revision_id = ?
          AND ${identityColumns.map(column => `ar.${column} = ?`).join(' AND ')}
          AND r.state = 'approved' AND r.content_digest = ar.revision_digest AND r.updated_at = ?
          AND r.approved_at = ar.approved_at AND r.updated_at = ar.approved_at AND r.approved_by_operator_id = ar.operator_id
          AND r.sender_name || ' <' || r.from_email || '>' = ?
          AND c.updated_at = ? AND c.state IN ('scheduled', 'dispatching', 'paused')
          AND EXISTS (SELECT 1 FROM recipient_steps pending WHERE pending.campaign_id = c.id
            AND pending.revision_id = r.id AND pending.channel = 'email'
            AND pending.transport_disposition = 'queued' AND pending.send_by_at > ?)
          AND ${leaseGuard} AND ${senderFromGuard})`;
      const values = [snapshot.campaign.id, snapshot.revision.id, ...identityColumns.map(column => approval[column]),
        snapshot.revision.updatedAt.getTime(), approvedFrom, snapshot.campaign.updatedAt.getTime(), now,
        ...leaseValues(senderLease, now), senderLease.id, approvedFrom];
      const detail = JSON.stringify({campaignId: snapshot.campaign.id, approvalKey: approval.idempotency_key,
        revisionDigest, approval, approvedFrom, senderEvidence: senderLease});
      const inserted = `EXISTS (SELECT 1 FROM lifecycle_audit_entries WHERE id = ? AND operation_key = ?)`;
      const statements = [client.prepare(`INSERT INTO lifecycle_audit_entries
        (id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
        SELECT ?,?,'campaign-revision',?,'sender-reapproved','operator',?,${senderEvidenceDetail},?,?
        WHERE ${guard} ON CONFLICT(operation_key) DO NOTHING`)
        .bind(id, operationKey, snapshot.revision.id, operatorId, detail, senderLease.id, now, now, ...values),
      associationStatement(client, senderLease, 'approval', snapshot.revision.id, operationKey, now, inserted, [id, operationKey])];
      statements.push(client.prepare(`SELECT ra.id FROM lifecycle_audit_entries ra
        WHERE ra.operation_key = ? AND ra.entity_id = ? AND ra.action = 'sender-reapproved'
          AND json_extract(ra.detail_json, '$.campaignId') = ?
          AND json_extract(ra.detail_json, '$.approvalKey') = ?
          AND json_extract(ra.detail_json, '$.revisionDigest') = ?
          AND EXISTS (SELECT 1 FROM sender_verification_associations sa WHERE sa.kind = 'approval'
            AND sa.entity_id = ra.entity_id AND sa.attempt_key = ra.operation_key)
          AND ${approvalAuthorityGuard('?', '?', 'ra.id')} AND ${guard}`)
        .bind(operationKey, snapshot.revision.id, snapshot.campaign.id, approval.idempotency_key, revisionDigest,
          snapshot.campaign.id, snapshot.revision.id, ...values));
      const results = await client.batch(statements);
      return results[2].results.length === 1 ? { kind: 'approved' as const, revisionDigest, idempotent: results[0].meta.changes === 0 }
        : { kind: 'conflict' as const };
    },
  };
}
