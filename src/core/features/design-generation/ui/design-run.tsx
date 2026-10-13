import { useRef } from 'react';
import { candidateSlots, designsOnOffer, layoutEstimate, type DesignJobView } from '../model';
import { Failure, ReadyNotice, slotName, Waiting } from './run-notices';

/** One design run beside the email editor (DESIGN-002). Every control here is a plain button: the run lives on the
 * server, so the panel looks the same after a reload, and nothing in it saves the draft or opens anything by itself.
 * `placed` is true while the chosen design is in the editor as an unsaved edit; the run stays open until the draft is
 * saved with it. `title` names the region: the latest run is "Design with 12ui", an earlier one is named by its time. */
export function DesignRun({ job, title, busy, placed, error, onUse, onApply, onDiscard }: {
  job: DesignJobView; title: string; busy: boolean; placed: boolean; error?: string;
  onUse: (slot: string) => void; onApply: () => void; onDiscard: () => void;
}) {
  const list = useRef<HTMLUListElement>(null);
  const landed = job.candidates.filter(candidate => candidate.state === 'succeeded');
  const offer = designsOnOffer(job);
  const pending = candidateSlots.slice(0, job.candidateCount).filter(slot => !job.candidates.some(candidate => candidate.slot === slot));
  const usable = job.state === 'choosing' || job.state === 'ready' || (job.state === 'failed' && offer.length > 0);
  const chosen = job.chosenSlot ? slotName(job.chosenSlot) : '';
  // "Choose a different design" moves focus (the operator asked) to the first other design's own button.
  const chooseAnother = () => list.current?.querySelector<HTMLButtonElement>('li:not([aria-current="true"]) button')?.focus();
  return <section className="design-run" aria-labelledby={`design-run-${job.id}`}>
    <div className="design-run__head">
      <h3 id={`design-run-${job.id}`}>{title}</h3>
      {job.state !== 'failed' || offer.length ? <button type="button" className="text-link" disabled={busy} onClick={onDiscard}>Discard designs</button> : null}
    </div>
    <Waiting job={job} />
    {job.state === 'drafting' && !job.waiting ? <p className="muted-copy" role="status">Generating {job.candidateCount} designs with 12ui. This usually takes under a minute; you can keep editing or leave this page.</p> : null}
    {job.state === 'choosing' ? <p className="muted-copy">Choose the design to build your email from. {layoutEstimate()}</p> : null}
    {job.state === 'preparing' && !job.waiting ? <p className="muted-copy" role="status">Preparing design {chosen} as an email layout. This usually takes one to two minutes; you can keep editing, and Mango tells you here when it is ready.</p> : null}
    {job.state === 'ready' ? <ReadyNotice job={job} placed={placed} busy={busy} onApply={onApply} /> : null}
    <Failure job={job} busy={busy} onRetry={() => job.chosenSlot && onUse(job.chosenSlot)} onChooseAnother={chooseAnother} onDismiss={onDiscard} />
    {landed.length || (job.state === 'drafting' && pending.length) ? <ul className="design-run__candidates" ref={list}>
      {landed.map(candidate => <li key={candidate.slot} aria-current={candidate.slot === job.chosenSlot ? 'true' : undefined}>
        <img src={candidate.imageUrl} alt={`Design ${slotName(candidate.slot)}`} width={candidate.width} height={candidate.height} loading="lazy" />
        <span className="muted-copy" id={`design-${job.id}-${candidate.slot}`}>Design {slotName(candidate.slot)}{candidate.slot === job.chosenSlot && job.state !== 'choosing' ? ' (chosen)' : ''}</span>
        <div className="design-run__candidate-actions">
          {usable ? <button type="button" className="secondary-action" disabled={busy} aria-describedby={`design-${job.id}-${candidate.slot}`} onClick={() => onUse(candidate.slot)}>Use this design</button> : null}
          <a className="text-link" href={candidate.imageUrl} target="_blank" rel="noopener" aria-describedby={`design-${job.id}-${candidate.slot}`}>Open full size</a>
        </div>
      </li>)}
      {job.state === 'drafting' ? pending.map(slot => <li key={slot} className="design-run__waiting"><span className="muted-copy">{job.waiting ? `Design ${slotName(slot)} waits for 12ui.` : `Design ${slotName(slot)} is being drawn…`}</span></li>) : null}
    </ul> : null}
    {job.candidates.filter(candidate => candidate.state === 'failed').map(candidate => <p key={candidate.slot} className="muted-copy">12ui could not draw design {slotName(candidate.slot)}.</p>)}
    {job.state === 'ready' && landed.length > 1 ? <p className="muted-copy">Another design needs a new layout: {layoutEstimate()}</p> : null}
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
  </section>;
}
