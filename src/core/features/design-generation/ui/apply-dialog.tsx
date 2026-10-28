import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/core/app/client/ui/modal';
import { Field, ValidationForm } from '@/core/app/client/ui/validation-form';
import { safeEmailUrl } from '@/core/features/campaigns/email-html-policy';
import { parseLayerDoc } from '@/core/features/design-import/layerdoc';
import { planDesign } from '@/core/features/design-import/plan';
import { buildDesignEmail, designFailure, prepareDesign, type PendingDesign } from '@/core/features/design-import/ui/build-email';
import type { ImportSummary } from '@/core/features/design-import/ui/import-summary';
import type { DesignJobView } from '../model';

type Source = { layerDocText: string; candidate: Blob; buttonLabel?: string };

async function readSource(job: DesignJobView): Promise<Source> {
  const image = job.candidates.find(candidate => candidate.slot === job.chosenSlot)?.imageUrl;
  if (!job.layerDocUrl || !image) throw new Error('missing');
  const [layout, candidate] = await Promise.all([fetch(job.layerDocUrl), fetch(image)]);
  if (!layout.ok || !candidate.ok) throw new Error('missing');
  const layerDocText = await layout.text();
  return { layerDocText, candidate: await candidate.blob(), buttonLabel: planDesign(parseLayerDoc(layerDocText)).buttonLabel };
}

/** The last step of Design with 12ui (DESIGN-009, DESIGN-010), opened from a ready run's notice or as the continuation of "Use this
 * design" (see design-generation.tsx): it goes through the
 * same browser path as Import 12ui design (DESIGN-004), with the operator's button destination, and becomes an unsaved
 * edit of the email body. Closing it keeps the run, so the design can be used later without buying it again. */
export function ApplyDialog({ job, replacing, mediaOrigin, onClose, onApplied }: {
  job: DesignJobView; replacing: boolean; mediaOrigin: string; onClose: () => void; onApplied: (html: string, summary: ImportSummary) => void;
}) {
  const [source, setSource] = useState<Source>();
  const [destination, setDestination] = useState('');
  const [stage, setStage] = useState<'loading' | 'form' | 'confirm' | 'working'>('loading');
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState('');
  const pending = useRef<PendingDesign>(undefined);
  const submitButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let live = true;
    readSource(job).then(value => { if (live) { setSource(value); setStage('form'); } })
      .catch(problem => { if (live) { setStage('form'); setError(problem instanceof Error && problem.message !== 'missing' ? designFailure(problem) : 'Mango could not read the prepared design. Reload the page to try again.'); } });
    return () => { live = false; };
  }, [job.id, job.layerDocUrl]);
  useEffect(() => () => pending.current?.bitmap.close(), []);
  // Focus lands on the first thing to do: the destination field (autoFocus), or Build the email when there is no button.
  useEffect(() => { if (stage === 'form' && source && !source.buttonLabel) submitButton.current?.focus(); }, [stage, source]);

  const close = () => { if (stage !== 'working') onClose(); };
  const build = async () => {
    const design = pending.current;
    if (!design) return;
    setStage('working'); setError(undefined);
    try {
      const { html, summary } = await buildDesignEmail(design, mediaOrigin, setProgress);
      design.bitmap.close(); pending.current = undefined;
      onApplied(html, summary);
    } catch (problem) { setStage('form'); setError(`${designFailure(problem)} The email body was not changed.`); }
  };
  const submit = async () => {
    if (!source) return;
    setError(undefined);
    try {
      pending.current?.bitmap.close();
      pending.current = await prepareDesign({ layerDocText: source.layerDocText, candidate: source.candidate, destination, brief: job.brief });
      if (replacing) setStage('confirm'); else await build();
    } catch (problem) { setError(`${designFailure(problem)} The email body was not changed.`); }
  };

  const confirming = stage === 'confirm';
  return <Modal open onClose={close} role={confirming ? 'alertdialog' : 'dialog'} title={confirming ? 'Replace the email body?' : 'Use this design in the email'}
    description={confirming ? 'The design replaces the current body as an unsaved edit. Discard changes brings the saved body back until you save.'
      : 'Your browser crops the photos, hosts them on this deployment and builds the email. Nothing is saved, approved or sent until you do it.'}>
    {confirming ? <div className="detail-actions">
      <button type="button" className="secondary-action" onClick={() => setStage('form')}>Back</button>
      <button type="button" className="primary-action" autoFocus onClick={() => void build()}>Replace</button>
    </div> : <ValidationForm className="design-import-form" aria-label="Use this design in the email" aria-busy={stage !== 'form'} onValidSubmit={() => void submit()}>
      <fieldset className="design-import-form__fields" disabled={stage !== 'form' || !source}>
        {stage === 'loading' ? <p className="muted-copy" role="status">Reading the prepared design…</p> : null}
        {source?.buttonLabel ? <label>Where should “{source.buttonLabel}” go?<Field name="destination" label="Button destination" required validate={() => destination.trim() && !safeEmailUrl(destination.trim()) ? 'Enter an HTTPS address.' : undefined}>
          <input type="url" inputMode="url" placeholder="https://" aria-label="Button destination" autoFocus value={destination} onChange={event => setDestination(event.target.value)} /></Field></label> : null}
        {source && !source.buttonLabel ? <p className="muted-copy">This design has no button.</p> : null}
        <p className="muted-copy">Lines of the design that are not in your brief are highlighted for you to check.</p>
      </fieldset>
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
      {stage === 'working' ? <p className="muted-copy" role="status">{progress || 'Preparing images'}</p> : null}
      <div className="detail-actions">
        {/* Pressing Cancel keeps focus in the destination field, so an untouched field is not reported incomplete on the
            way out (and the button does not move under the pointer). */}
        <button type="button" className="secondary-action" onMouseDown={event => event.preventDefault()} onClick={close} disabled={stage === 'working'}>Cancel</button>
        <button type="submit" className="primary-action" ref={submitButton} disabled={stage !== 'form' || !source}>{stage === 'working' ? 'Building…' : 'Build the email'}</button>
      </div>
    </ValidationForm>}
  </Modal>;
}
