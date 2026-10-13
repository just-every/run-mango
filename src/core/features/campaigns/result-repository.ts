import type { Database } from '@/core/platform/db/client';
import { stepResultState, type CampaignResults, type DispositionCount } from './result-model';

type StepRow = { id: string; started_at: number | null; completed_at: number | null; send_by_at: number };
type CountRow = DispositionCount & { step_id: string };

export function createCampaignResultRepository(database: Database) {
  const client = database.$client;
  return {
    async results(campaignId: string, revisionId: string, campaignState: string, now = new Date()): Promise<CampaignResults> {
      // Every query is fenced by campaign AND active revision; older approvals never contribute.
      const [steps, buckets, facts, failures] = await Promise.all([
        client.prepare(`SELECT s.id, s.send_by_at, d.started_at, d.completed_at
          FROM campaign_steps s JOIN campaigns c ON c.active_revision_id = s.revision_id
          LEFT JOIN step_dispatches d ON d.step_id = s.id AND d.revision_id = s.revision_id
          WHERE c.id = ? AND s.revision_id = ? ORDER BY s.sequence`).bind(campaignId, revisionId).all<StepRow>(),
        client.prepare(`SELECT step_id, transport_disposition disposition, skip_reason reason, COUNT(*) count
          FROM recipient_steps WHERE campaign_id = ? AND revision_id = ?
          GROUP BY step_id, transport_disposition, skip_reason ORDER BY transport_disposition, skip_reason`)
          .bind(campaignId, revisionId).all<CountRow>(),
        client.prepare(`SELECT step_id,
          SUM(CASE WHEN transport_disposition = 'queued' AND handoff_started_at IS NULL AND send_by_at > ? THEN 1 ELSE 0 END) pending,
          SUM(CASE WHEN transport_disposition = 'queued' AND handoff_started_at IS NULL AND send_by_at <= ? THEN 1 ELSE 0 END) expired,
          SUM(CASE WHEN transport_disposition = 'queued' AND handoff_started_at IS NOT NULL THEN 1 ELSE 0 END) in_flight,
          SUM(CASE WHEN transport_disposition = 'queued' AND handoff_started_at IS NULL AND send_by_at > ? THEN 1 ELSE 0 END) stoppable,
          SUM(CASE WHEN complained_at IS NOT NULL THEN 1 ELSE 0 END) complained,
          SUM(CASE WHEN suppressed_at IS NOT NULL THEN 1 ELSE 0 END) suppressed
          FROM recipient_steps WHERE campaign_id = ? AND revision_id = ? GROUP BY step_id`)
          .bind(now.getTime(), now.getTime(), now.getTime(), campaignId, revisionId).all<{step_id:string;pending:number;expired:number;in_flight:number;stoppable:number;complained:number;suppressed:number}>(),
        client.prepare(`SELECT step_id, COALESCE(last_error_code, 'unrecorded-cause') code,
          COALESCE(last_error_detail, 'The failure cause was not recorded.') detail, COUNT(*) count
          FROM recipient_steps WHERE campaign_id = ? AND revision_id = ? AND transport_disposition = 'failed'
          GROUP BY step_id, last_error_code, last_error_detail ORDER BY last_error_code`)
          .bind(campaignId, revisionId).all<{step_id:string;code:string;detail:string;count:number}>(),
      ]);
      const projected = steps.results.map(step => {
        const counts = buckets.results.filter(row => row.step_id === step.id).map(({disposition, reason, count}) => ({disposition, reason, count}));
        const fact = facts.results.find(row => row.step_id === step.id);
        return { stepId: step.id,
          state: stepResultState({campaignState, startedAt:step.started_at, sendByAt:step.send_by_at, now:now.getTime(), counts, pendingBeforeDeadline:fact?.pending ?? 0, inFlightCount:fact?.in_flight ?? 0}),
          startedAt: step.started_at === null ? null : new Date(step.started_at).toISOString(),
          completedAt: step.completed_at === null ? null : new Date(step.completed_at).toISOString(),
          counts, failures: failures.results.filter(row => row.step_id === step.id).map(({code,detail,count}) => ({code,detail,count})),
          stoppableCount: fact?.stoppable ?? 0, expiredQueuedCount: fact?.expired ?? 0, inFlightCount: fact?.in_flight ?? 0, complainedCount: fact?.complained ?? 0, suppressedCount: fact?.suppressed ?? 0,
        };
      });
      return { asOf:now.toISOString(), steps:projected,
        cancellable:['scheduled','dispatching','paused'].includes(campaignState) && projected.some(step => step.stoppableCount > 0) };
    },
  };
}
