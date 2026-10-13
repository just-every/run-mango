import type { DesignFailureCode, DesignJobState, DesignWaitCode } from './model';

/** D1 records of design runs (migration 0040). Every transition names the states it may leave, so a replayed queue
 * message or a second tab can never move a run backwards. */
export type DesignJob = {
  id: string; campaignId: string; state: DesignJobState; provider: string; brief: string; candidateCount: number;
  providerRunId: string | null; chosenSlot: string | null; providerLayoutId: string | null; layerdocSha256: string | null;
  errorCode: DesignFailureCode | null; attempts: number; deadlineAt: number; createdBy: string; createdAt: number; updatedAt: number;
  /** Why the run is waiting on 12ui, and when its next request goes out (migration 0041). */
  waitCode: DesignWaitCode | null; retryAt: number | null;
  /** How many times the operator asked for a layout again after a failed layout step (migration 0042); part of the
   * layout's idempotency and cost keys, so each new try is one new purchase and replays of a try buy nothing. */
  layoutRound: number;
};
export type DesignCandidate = { jobId: string; slot: string; state: 'succeeded' | 'failed'; sha256: string | null; bytes: number | null; width: number | null; height: number | null };

const jobColumns = `id, campaign_id AS campaignId, state, provider, brief, candidate_count AS candidateCount, provider_run_id AS providerRunId,
  chosen_slot AS chosenSlot, provider_layout_id AS providerLayoutId, layerdoc_sha256 AS layerdocSha256, error_code AS errorCode, attempts,
  deadline_at AS deadlineAt, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt, wait_code AS waitCode, retry_at AS retryAt, layout_round AS layoutRound`;
const list = (states: readonly DesignJobState[]) => states.map(state => `'${state}'`).join(',');

/** Each design run's evidence in R2, beside the campaign images. */
export const designCandidateKey = (jobId: string, slot: string) => `design-jobs/${jobId}/candidate-${slot}.png`;
export const designLayoutKey = (jobId: string) => `design-jobs/${jobId}/layout.layerdoc.json`;

export function createDesignRepository(db: D1Database) {
  const columns: Record<string, string> = { state: 'state', providerRunId: 'provider_run_id', chosenSlot: 'chosen_slot', providerLayoutId: 'provider_layout_id',
    layerdocSha256: 'layerdoc_sha256', errorCode: 'error_code', attempts: 'attempts', deadlineAt: 'deadline_at', waitCode: 'wait_code', retryAt: 'retry_at', layoutRound: 'layout_round' };
  const update = async (id: string, from: readonly DesignJobState[], fields: Partial<Pick<DesignJob, 'state' | 'providerRunId' | 'chosenSlot' | 'providerLayoutId' | 'layerdocSha256' | 'errorCode' | 'attempts' | 'deadlineAt' | 'waitCode' | 'retryAt' | 'layoutRound'>>, now: number) => {
    const entries = Object.entries(fields);
    const updated = await db.prepare(`UPDATE design_jobs SET ${entries.map(([name]) => `${columns[name]} = ?, `).join('')}updated_at = ?
      WHERE id = ? AND state IN (${list(from)})`).bind(...entries.map(([, value]) => value ?? null), now, id).run();
    return updated.meta.changes === 1;
  };
  return {
    update,
    async create(job: Pick<DesignJob, 'id' | 'campaignId' | 'provider' | 'brief' | 'candidateCount' | 'deadlineAt' | 'createdBy' | 'createdAt'>) {
      // At most one run waits on the service per campaign, so a double click never buys twice.
      const inserted = await db.prepare(`INSERT INTO design_jobs (id, campaign_id, state, provider, brief, candidate_count, deadline_at, created_by, created_at, updated_at)
        SELECT ?, ?, 'drafting', ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM design_jobs WHERE campaign_id = ? AND state IN ('drafting','preparing'))`)
        .bind(job.id, job.campaignId, job.provider, job.brief, job.candidateCount, job.deadlineAt, job.createdBy, job.createdAt, job.createdAt, job.campaignId).run();
      // Earlier runs keep their designs on offer: a new run never sets paid designs aside.
      return inserted.meta.changes === 1;
    },
    get: (id: string) => db.prepare(`SELECT ${jobColumns} FROM design_jobs WHERE id = ?`).bind(id).first<DesignJob>(),
    /** Earlier runs of a draft whose paid designs are still on offer (DESIGN-002): designs landed, and the run is neither
     * used nor discarded. A failed run counts: its designs stay usable after a failed layout step or a later slot's failure. */
    async onOffer(campaignId: string, exceptId: string) {
      return (await db.prepare(`SELECT ${jobColumns} FROM design_jobs WHERE campaign_id = ? AND id <> ? AND state IN ('choosing','preparing','ready','failed')
        AND EXISTS (SELECT 1 FROM design_candidates WHERE job_id = design_jobs.id AND state = 'succeeded') ORDER BY created_at DESC, id DESC LIMIT 10`)
        .bind(campaignId, exceptId).all<DesignJob>()).results;
    },
    latest: (campaignId: string) => db.prepare(`SELECT ${jobColumns} FROM design_jobs WHERE campaign_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`).bind(campaignId).first<DesignJob>(),
    async candidates(jobId: string) {
      return (await db.prepare('SELECT job_id AS jobId, slot, state, sha256, bytes, width, height FROM design_candidates WHERE job_id = ? ORDER BY slot')
        .bind(jobId).all<DesignCandidate>()).results;
    },
    async recordCandidate(candidate: DesignCandidate, now: number) {
      await db.prepare(`INSERT INTO design_candidates (job_id, slot, state, sha256, bytes, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(job_id, slot) DO NOTHING`).bind(candidate.jobId, candidate.slot, candidate.state, candidate.sha256, candidate.bytes, candidate.width, candidate.height, now).run();
    },
    fail: (id: string, code: DesignFailureCode, now: number) => update(id, ['drafting', 'preparing'], { state: 'failed', errorCode: code, waitCode: null, retryAt: null }, now),
    /** Runs still waiting on the service after their deadline fail visibly; `campaignId` limits the sweep to one draft. */
    async failStale(now: number, campaignId?: string) {
      await db.prepare(`UPDATE design_jobs SET state = 'failed', error_code = 'provider_timeout', wait_code = NULL, retry_at = NULL, updated_at = ?
        WHERE state IN ('drafting','preparing') AND deadline_at < ?${campaignId ? ' AND campaign_id = ?' : ''}`)
        .bind(...[now, now, ...campaignId ? [campaignId] : []]).run();
    },
    /** Runs whose queue message has gone quiet: nothing has touched them for `quietMs`, and none is waiting for 12ui's next allowance. */
    async quiet(now: number, quietMs: number) {
      return (await db.prepare(`SELECT ${jobColumns} FROM design_jobs WHERE state IN ('drafting','preparing') AND deadline_at >= ? AND updated_at < ?
        AND (retry_at IS NULL OR retry_at <= ?) LIMIT 50`).bind(now, now - quietMs, now).all<DesignJob>()).results;
    },
    /** RESULT-004: one cost fact per paid request, keyed so a replayed request is recorded once. */
    async recordCost(fact: { key: string; campaignId: string; provider: string; operation: 'design-draft' | 'design-layout'; tier: string; units: number }, now: number) {
      await db.prepare(`INSERT INTO external_cost_facts (id, campaign_id, provider, operation, model_or_channel, billable_units, reported_cost_micros, currency, occurred_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?) ON CONFLICT(id) DO NOTHING`).bind(fact.key, fact.campaignId, fact.provider, fact.operation, fact.tier, fact.units, now, now).run();
    },
    async campaignState(campaignId: string) {
      return (await db.prepare('SELECT state FROM campaigns WHERE id = ?').bind(campaignId).first<{ state: string }>())?.state;
    },
  };
}
export type DesignRepository = ReturnType<typeof createDesignRepository>;
