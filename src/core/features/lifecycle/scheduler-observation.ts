export type SchedulerObservation = {
  state: 'not-observed' | 'observed' | 'overdue';
  lastTickAt: string | null;
  scheduledFor: string | null;
  finishedAt: string | null;
  outcome: 'running' | 'completed' | 'failed' | 'blocked-restore' | 'blocked-erasure' | null;
};

type Row = {scheduled_at:number; entered_at:number; finished_at:number|null; outcome:SchedulerObservation['outcome']};

/** The latest actual entry wins, including when an older invocation finishes later.
 * This is operational evidence, with no contact data, and is written outside erasure work. */
export function schedulerObservation(db:D1Database) {
  return {
    async enter(scheduledAt:number) {
      const runId=crypto.randomUUID(), enteredAt=Date.now();
      await db.prepare(`INSERT INTO scheduler_observation (id,run_id,scheduled_at,entered_at,outcome) VALUES (1,?,?,?,'running')
        ON CONFLICT(id) DO UPDATE SET run_id=excluded.run_id,scheduled_at=excluded.scheduled_at,
        entered_at=excluded.entered_at,finished_at=NULL,outcome='running'
        WHERE excluded.entered_at >= scheduler_observation.entered_at`).bind(runId,scheduledAt,enteredAt).run();
      return runId;
    },
    async finish(runId:string,outcome:NonNullable<SchedulerObservation['outcome']>) {
      await db.prepare(`UPDATE scheduler_observation SET finished_at=MAX(entered_at,?),outcome=? WHERE id=1 AND run_id=? AND outcome='running'`)
        .bind(Date.now(),outcome,runId).run();
    },
    async read(now=new Date()):Promise<SchedulerObservation> {
      const row=await db.prepare('SELECT scheduled_at,entered_at,finished_at,outcome FROM scheduler_observation WHERE id=1').first<Row>();
      const iso=(value:number|null)=>value===null?null:new Date(value).toISOString();
      return row ? {state:now.getTime()-row.entered_at>15*60_000?'overdue':'observed',lastTickAt:iso(row.entered_at),
        scheduledFor:iso(row.scheduled_at),finishedAt:iso(row.finished_at),outcome:row.outcome}
        : {state:'not-observed',lastTickAt:null,scheduledFor:null,finishedAt:null,outcome:null};
    },
  };
}
