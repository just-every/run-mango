import { formatDateInTimeZone, formatUtc, timeRemaining } from '@/core/app/client/lib/format';
import type { Step } from '@/core/app/client/lib/types';
import type { CampaignResults } from '../result-model';
import { dispositionLabel } from './result-copy';

export function StepResults({steps,results,now,timezone}:{steps:Step[];results:CampaignResults;now:number;timezone:string}) {
  return <section className="panel" aria-labelledby="step-results-title">
    <h2 id="step-results-title">Every scheduled step</h2>
    <ol className="step-results">
      {results.steps.map(outcome => {
        const step = steps.find(step => step.id === outcome.stepId);
        if (!step) return null;
        const closed = Date.parse(step.sendByAt) <= now;
        return <li key={step.id} data-step-id={step.id}>
          <div className="step-result__head">
            <h3>Step {step.sequence} · {step.channel === 'sms' ? 'SMS' : 'Email'}</h3>
            <p className={`step-result-state status-pill status-pill--${outcome.state.toLowerCase()}`}>{outcome.state}</p>
          </div>
          <div className="step-result__timing">
            <div>
              <p><time dateTime={step.scheduledAt}>{formatDateInTimeZone(step.scheduledAt,timezone)}</time> <span>({timezone})</span></p>
              <p className="muted-copy">Resolved UTC: {formatUtc(step.scheduledAt)}</p>
              {outcome.state === 'Scheduled' ? <p className="step-result__countdown">{timeRemaining(step.scheduledAt,now)}</p> : null}
            </div>
            <div>
              <p>{closed ? 'Send window closed at ' : 'Send window closes at '}<time dateTime={step.sendByAt}>{formatDateInTimeZone(step.sendByAt,timezone)}</time></p>
              <p className="muted-copy">Resolved UTC deadline: {formatUtc(step.sendByAt)}</p>
            </div>
          </div>
          <div className="step-result__notes">
            {outcome.expiredQueuedCount > 0 ? <p>Queued records remain unsent: {outcome.expiredQueuedCount}. Their closed windows cannot dispatch them.</p> : null}
            {outcome.inFlightCount > 0 ? <p>{outcome.inFlightCount} queued recipient-steps have begun provider handoff and are awaiting confirmation. A closed window cannot recall them.</p> : null}
            {outcome.state === 'Sent' ? <p>Handed to the provider. Only the Delivered count confirms delivery.</p> : null}
            {outcome.failures.map(failure => <p key={`${failure.code}:${failure.detail}`}>Failure: {failure.detail} ({failure.code}) · {failure.count}</p>)}
            {outcome.state === 'Failed' && !outcome.failures.length ? <p>The campaign failed; no recipient failure cause was recorded.</p> : null}
            {outcome.state === 'Paused' ? <p>Dispatch is paused. Resolve the provider or source issue before remaining sends can resume.</p> : null}
          </div>
          <dl className="disposition-counts" aria-label={`Step ${step.sequence} recipient outcomes`}>
            {outcome.counts.filter(bucket => bucket.count > 0).map(bucket => <div key={`${bucket.disposition}:${bucket.reason}`} data-disposition={bucket.disposition} data-skip-reason={bucket.reason ?? undefined}>
              <dt>{dispositionLabel(bucket)}</dt><dd>{bucket.count}</dd>
            </div>)}
          </dl>
          {outcome.complainedCount || outcome.suppressedCount ? <div className="step-result__notes">
            {outcome.complainedCount ? <p>Complaints: {outcome.complainedCount}</p> : null}
            {outcome.suppressedCount ? <p>Suppressions: {outcome.suppressedCount}</p> : null}
          </div> : null}
        </li>;
      })}
    </ol>
  </section>;
}
