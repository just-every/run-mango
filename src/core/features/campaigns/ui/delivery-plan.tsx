import { formatDateInTimeZone, formatUtc, titleCase } from '@/core/app/client/lib/format';
import type { ProposalStep, Step } from '@/core/app/client/lib/types';

type DeliveryStep = Step | ProposalStep;

export function DeliveryPlan({ steps }: { steps: DeliveryStep[] }) {
  return (
    <section className="panel" aria-labelledby="delivery-plan-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Channel & timing</p>
          <h2 id="delivery-plan-title">Resolved delivery plan</h2>
        </div>
      </div>
      <div className="delivery-plan">
        {steps.length ? (
          steps.map((step) => (
            <div key={step.id}>
              <strong>{titleCase(step.channel)}</strong>
              <time dateTime={step.scheduledAt}>{formatDateInTimeZone(step.scheduledAt, step.timezone)}</time>
              <small>
                {step.timezone} · resolved UTC {formatUtc(step.scheduledAt)} · send by {formatDateInTimeZone(step.sendByAt,step.timezone)} (resolved UTC {formatUtc(step.sendByAt)})
              </small>
              {'whyThisTime' in step ? <p>{step.whyThisTime}</p> : null}
              {step.claimsUnavailable?<p role="alert">{step.claimsUnavailable}</p>:null}
            </div>
          ))
        ) : (
          <p className="muted-copy">No saved steps are available.</p>
        )}
      </div>
    </section>
  );
}
