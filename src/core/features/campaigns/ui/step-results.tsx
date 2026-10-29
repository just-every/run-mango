import { timeRemaining } from '@/core/app/client/lib/format';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import type { Step } from '@/core/app/client/lib/types';
import type { CampaignResults } from '../result-model';
import { dispositionLabel } from './result-copy';

export function StepResults({steps,results,now,awaitingFirstTick=false}:{steps:Step[];results:CampaignResults;now:number;awaitingFirstTick?:boolean}) {
  const formatDate = useDateFormatter();
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
              <p><time dateTime={step.scheduledAt}>{formatDate(step.scheduledAt)}</time></p>
              {outcome.state === 'Scheduled' && !(awaitingFirstTick && Date.parse(step.scheduledAt)<=now) ? <p className="step-result__countdown">{timeRemaining(step.scheduledAt,now)}</p> : null}
            </div>
            <div>
              <p>{closed ? 'Send window closed at ' : 'Send window closes at '}<time dateTime={step.sendByAt}>{formatDate(step.sendByAt)}</time></p>
            </div>
          </div>
          <div className="step-result__notes">
            {outcome.estimatedCompletionAt?<p>Estimated time to finish handing messages to the provider: <time dateTime={outcome.estimatedCompletionAt}>{formatDate(outcome.estimatedCompletionAt)}</time>. Delivery awaits provider confirmation.</p>:null}
            {outcome.pauses?.map(p=><p key={p.reason} data-pause-reason={p.reason} data-pause-state={p.resumedAt?'recovered':'paused'}>{p.reason==='operator-pause' ? p.resumedAt ? 'Resumed by an operator.' : 'Paused by an operator. Use Resume campaign to continue remaining sends.' : <>{p.resumedAt?'Recovered':'Paused'}: {p.reason}. {p.detail}</>} {p.reason!=='operator-pause'&&p.nextProbeAt&&!p.resumedAt?`Next authenticated reachability probe: ${formatDate(p.nextProbeAt)}.`:''} {p.reason==='provider-outage'?'Reachability recovery does not clear source, sender or provider compliance restrictions.':''}</p>)}
            {outcome.outageNotices?.map(n=><p key={`${n.state}:${n.code}`}>Operator outage notices: {n.count} {n.state==='handoff-unknown'?'with unconfirmed acceptance; no duplicate notice will be sent':n.state==='pending'?'pending a reachable provider and shared send allowance':n.state==='failed'?'failed':n.state==='outcome-unconfirmed'?'with outcome unconfirmed after the lookup window':n.state}. {n.code?`Provider status: ${n.code}.`:''}</p>)}
            {outcome.expiredQueuedCount > 0 ? <p>Queued records remain unsent: {outcome.expiredQueuedCount}. Their closed windows cannot dispatch them.</p> : null}
            {outcome.inFlightCount > 0 ? <p>{outcome.inFlightCount} queued messages are with the provider and awaiting confirmation. A closed window cannot recall them.</p> : null}
            {outcome.state === 'Sent' ? <p>Handed to the provider. Only the Delivered count confirms delivery.</p> : null}
            {outcome.failures.map(failure => <p key={`${failure.code}:${failure.detail}`}>Failure: {failure.detail} ({failure.code}) · {failure.count}</p>)}
            {outcome.state === 'Failed' && !outcome.failures.length ? <p>The campaign failed; no recipient failure cause was recorded.</p> : null}
            {outcome.state === 'Paused' ? <p>Dispatch is paused. Resume an operator hold above, or resolve the provider or source hold before remaining sends continue.</p> : null}
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
