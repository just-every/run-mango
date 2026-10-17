import type { Database } from '@/core/platform/db/client';
import { ulid } from '@/core/shared/ids';

/** Operator holds are durable and separate from automatically recovered provider holds. */
export function createCampaignControls(database: Database) {
  const db = database.$client;
  return {
    async pause(campaignId: string, actorId: string, now: Date) {
      const time = now.getTime(), operation = ulid();
      const [audit] = await db.batch([
        db.prepare(`INSERT INTO lifecycle_audit_entries
          (id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
          SELECT ?,?,'campaign',id,'paused','operator',?,json_object('revisionId',active_revision_id),?,?
          FROM campaigns WHERE id=? AND state IN ('scheduled','dispatching')`)
          .bind(operation,operation,actorId,time,time,campaignId),
        db.prepare(`INSERT INTO campaign_channel_pauses
          (id,campaign_id,revision_id,channel,reason,detail,paused_at,resume_check_at,created_at,updated_at)
          SELECT c.id||':'||c.active_revision_id||':'||s.channel||':operator-pause',c.id,c.active_revision_id,s.channel,
            'operator-pause','Paused by an operator. Resume explicitly to continue remaining sends.',?,?,?,?
          FROM campaigns c JOIN campaign_steps s ON s.revision_id=c.active_revision_id
          WHERE c.id=? AND EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)
          GROUP BY s.channel
          ON CONFLICT(campaign_id,revision_id,channel,reason) DO UPDATE SET
            detail=excluded.detail,paused_at=excluded.paused_at,resumed_at=NULL,updated_at=excluded.updated_at`)
          .bind(time,time,time,time,campaignId,operation),
        db.prepare(`UPDATE campaigns SET state='paused',updated_at=? WHERE id=?
          AND EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)`)
          .bind(time,campaignId,operation),
        // A queued consumer may already be preparing a request. Revoke its
        // lease before acknowledging the pause; it cannot start a handoff or
        // leave a generic authority retry delaying the later operator resume.
        db.prepare(`UPDATE recipient_steps SET lease_token=NULL,lease_expires_at=NULL,updated_at=?
          WHERE campaign_id=? AND transport_disposition='queued' AND handoff_started_at IS NULL
          AND EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)`)
          .bind(time,campaignId,operation),
        db.prepare(`UPDATE step_dispatches SET estimated_completion_at=NULL,updated_at=?
          WHERE revision_id=(SELECT active_revision_id FROM campaigns WHERE id=?)
          AND EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)`)
          .bind(time,campaignId,operation),
      ]);
      if (audit.meta.changes) return true;
      return Boolean(await db.prepare(`SELECT 1 FROM campaigns c JOIN campaign_channel_pauses p
        ON p.campaign_id=c.id AND p.revision_id=c.active_revision_id
        WHERE c.id=? AND c.state='paused' AND p.reason='operator-pause' AND p.resumed_at IS NULL`)
        .bind(campaignId).first());
    },
    async resume(campaignId: string, actorId: string, now: Date) {
      const time = now.getTime(), operation = ulid();
      const [audit] = await db.batch([
        db.prepare(`INSERT INTO lifecycle_audit_entries
          (id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
          SELECT ?,?,'campaign',id,'resumed','operator',?,json_object('revisionId',active_revision_id),?,?
          FROM campaigns c WHERE id=? AND state='paused' AND EXISTS(
            SELECT 1 FROM campaign_channel_pauses p WHERE p.campaign_id=c.id AND p.revision_id=c.active_revision_id
            AND p.reason='operator-pause' AND p.resumed_at IS NULL)`)
          .bind(operation,operation,actorId,time,time,campaignId),
        db.prepare(`UPDATE campaign_channel_pauses SET resumed_at=?,updated_at=?
          WHERE campaign_id=? AND reason='operator-pause' AND resumed_at IS NULL
          AND EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)`)
          .bind(time,time,campaignId,operation),
        db.prepare(`UPDATE campaigns SET state=CASE WHEN EXISTS(
          SELECT 1 FROM step_dispatches d WHERE d.revision_id=campaigns.active_revision_id AND d.started_at IS NOT NULL
          ) THEN 'dispatching' ELSE 'scheduled' END,updated_at=?
          WHERE id=? AND EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)`)
          .bind(time,campaignId,operation),
      ]);
      return audit.meta.changes === 1;
    },
  };
}
