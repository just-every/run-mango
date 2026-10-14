import type { SchedulerObservation } from '@/core/features/lifecycle/scheduler-observation';
import { formatUtc } from '@/core/app/client/lib/format';

export function SchedulerReadiness({scheduler,expired}:{scheduler:SchedulerObservation;expired:boolean}) {
  return <section className="panel" aria-labelledby="scheduler-readiness-title" data-scheduler-state={scheduler.state} data-scheduler-outcome={scheduler.outcome ?? undefined}>
    <h2 id="scheduler-readiness-title">Sending schedule</h2>
    {expired ? <p>The send windows have expired. Unsent messages cannot be sent after their deadline.</p> : null}
    {scheduler.state==='not-observed'
      ? <p>Sending starts once Cloudflare activates the schedule, usually within an hour. Mango has not observed a scheduled tick yet.</p>
      : scheduler.state==='overdue'
        ? <p>A scheduled tick was observed, but the next tick is overdue. Check the Worker schedule in Cloudflare before relying on upcoming sends.</p>
        : <p>Cloudflare's schedule has been observed. Each due send still requires the approved revision and current eligibility checks.</p>}
    <p>Last actual scheduled tick: {scheduler.lastTickAt ? <time dateTime={scheduler.lastTickAt}>{formatUtc(scheduler.lastTickAt)}</time> : 'Not yet observed'}.</p>
    {scheduler.outcome==='running' ? <p>The latest tick entered Mango; its completion has not been recorded.</p> : null}
    {scheduler.outcome==='completed' ? <p>The latest tick completed its scheduling checks. Provider acceptance and delivery are reported separately below.</p> : null}
    {scheduler.outcome==='failed' ? <p className="inline-error">The latest tick failed. Check Worker logs; its work is not confirmed complete.</p> : null}
    {scheduler.outcome==='blocked-restore' ? <p>Restore maintenance blocked the latest tick. Sending remains paused during restore.</p> : null}
    {scheduler.outcome==='blocked-erasure' ? <p>Contact erasure blocked sending during the latest tick. Erasure must finish before sends resume.</p> : null}
  </section>;
}
