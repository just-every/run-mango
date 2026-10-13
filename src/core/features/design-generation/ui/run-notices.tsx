import { designFailureReasons, designsOnOffer, layoutEstimate, layoutFailureReasons, type DesignJobView } from '../model';
import { clockTime, relativeTime } from './relative-time';

export const slotName = (slot: string) => slot.toUpperCase();

function When({ at }: { at: number }) {
  const when = relativeTime(at);
  return when ? <time dateTime={new Date(at).toISOString()} title={clockTime(at)}>{when}</time> : null;
}

/** What Mango waits for while 12ui holds a run back, shown until 12ui answers again (so the panel never flips back to
 * ordinary progress while a retried request is still unanswered). A rate limit is a delay the operator waits on, so
 * it keeps role="alert", but it is calm: muted, with a relative time, never styled as a failure. */
export function Waiting({ job }: { job: DesignJobView }) {
  const { waiting } = job;
  if (!waiting) return null;
  const asking = relativeTime(waiting.retryAt) ? <>Mango asks again <When at={waiting.retryAt} /></> : <>Mango is asking again now</>;
  if (waiting.reason === 'provider_quota') return <p className="design-run__wait" role="alert">
    12ui asked Mango to wait: your 12ui account reached its rate limit. {asking}{relativeTime(job.deadlineAt) ? <>, and stops <When at={job.deadlineAt} /> if 12ui still refuses</> : null}.
    Your draft is unchanged and you can keep working.
  </p>;
  return <p className="design-run__wait" role="status">12ui has not answered. {asking}; your draft is unchanged.</p>;
}

/** The run's ready layout, waiting for the operator: a calm notice with the one action that opens the import path.
 * It never opens anything, or moves focus, by itself. */
export function ReadyNotice({ job, placed, busy, onApply }: { job: DesignJobView; placed: boolean; busy: boolean; onApply: () => void }) {
  const chosen = slotName(job.chosenSlot ?? '');
  if (placed) return <p className="muted-copy" role="status">Design {chosen} is in the email as an unsaved edit. Save the draft to keep it; until then
    these designs stay here, and Discard changes brings back the saved body.</p>;
  return <div className="action-notice design-run__ready" role="status">
    <p>Design {chosen} is ready as an email layout. Nothing changes in your draft until you use it.</p>
    <button type="button" className="primary-action" disabled={busy} onClick={onApply}>Use design {chosen} in the email</button>
  </div>;
}

/** A failed run in Mango's words. Designs that were drawn stay on offer: after a failed layout step the operator may
 * try the layout again or choose another design; nothing asks for a new brief that buys new designs. */
export function Failure({ job, busy, onRetry, onChooseAnother, onDismiss }: {
  job: DesignJobView; busy: boolean; onRetry: () => void; onChooseAnother: () => void; onDismiss: () => void;
}) {
  if (job.state !== 'failed') return null;
  const code = job.errorCode ?? 'provider_failed', offer = designsOnOffer(job);
  if (!offer.length) return <div className="inline-error design-run__failure" role="alert">
    <p>Design generation failed: {designFailureReasons[code]} Nothing was changed; your draft is as you left it.</p>
    <div className="detail-actions"><button type="button" className="secondary-action" disabled={busy} onClick={onDismiss}>Dismiss</button></div>
  </div>;
  if (!job.chosenSlot) return <div className="inline-error design-run__failure" role="alert">
    <p>12ui stopped before drawing every design: {designFailureReasons[code]} The designs it drew are kept below for you to use; your draft is as you left it.</p>
  </div>;
  return <>
    <div className="inline-error design-run__failure" role="alert">
      <p>The layout step for design {slotName(job.chosenSlot)} failed: {layoutFailureReasons[code]} Your designs are kept and your draft is as you left it.</p>
      <div className="detail-actions">
        <button type="button" className="secondary-action" disabled={busy} onClick={onRetry}>Try the layout again</button>
        {offer.length > 1 ? <button type="button" className="secondary-action" disabled={busy} onClick={onChooseAnother}>Choose a different design</button> : null}
      </div>
    </div>
    <p className="muted-copy">Each try is a new layout: {layoutEstimate()}</p>
  </>;
}
