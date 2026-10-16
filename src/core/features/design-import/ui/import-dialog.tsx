import { useRef, useState } from 'react';
import { Modal } from '@/core/app/client/ui/modal';
import { Field, ValidationForm } from '@/core/app/client/ui/validation-form';
import { safeEmailUrl } from '@/core/features/campaigns/email-html-policy';
import { DesignImportError } from '../layerdoc';
import { buildDesignEmail, designFailure as failure, prepareDesign, type PendingDesign } from './build-email';
import type { ImportSummary } from './import-summary';

const maxLayerDocBytes = 2 * 1024 * 1024;

/** The import form. It never saves: success hands the compiled body to the editor as an unsaved edit,
 * and any failure leaves the body exactly as it was. */
export function ImportDialog({ open, initialBrief, replacing, mediaOrigin, onClose, onImported }: {
  open: boolean; initialBrief: string; replacing: boolean; mediaOrigin: string; onClose: () => void; onImported: (html: string, summary: ImportSummary) => void;
}) {
  const [brief, setBrief] = useState(initialBrief);
  const [destination, setDestination] = useState('');
  const [stage, setStage] = useState<'form' | 'confirm' | 'working'>('form');
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState('');
  const layerdoc = useRef<HTMLInputElement>(null), candidate = useRef<HTMLInputElement>(null), pending = useRef<PendingDesign>(undefined);

  const close = () => { if (stage === 'working') return; pending.current?.bitmap.close(); pending.current = undefined; setStage('form'); setError(undefined); onClose(); };
  const build = async () => {
    const job = pending.current;
    if (!job) return;
    setStage('working'); setError(undefined);
    try {
      const { html, summary } = await buildDesignEmail(job, mediaOrigin, setProgress);
      onImported(html, summary);
      job.bitmap.close(); pending.current = undefined; setStage('form'); onClose();
    } catch (problem) { setStage('form'); setError(`${failure(problem)} The email body was not changed.`); }
  };
  const submit = async () => {
    setError(undefined);
    const layerFile = layerdoc.current?.files?.[0], imageFile = candidate.current?.files?.[0];
    if (!layerFile || !imageFile) return;
    try {
      if (layerFile.size > maxLayerDocBytes) throw new DesignImportError('invalid_layout', 'The LayerDoc file is larger than 2 MB.');
      const prepared = await prepareDesign({ layerDocText: await layerFile.text(), candidate: imageFile, destination, brief });
      pending.current?.bitmap.close();
      pending.current = prepared;
      if (replacing) setStage('confirm'); else await build();
    } catch (problem) { setError(`${failure(problem)} The email body was not changed.`); }
  };

  const confirming = stage === 'confirm';
  return <Modal open={open} onClose={close} role={confirming ? 'alertdialog' : 'dialog'}
    title={confirming ? 'Replace the email body?' : 'Import a 12ui design'}
    description={confirming ? 'The imported design replaces the current body as an unsaved edit. Discard changes brings the saved body back until you save.' : 'Choose the LayerDoc and the PNG candidate it was converted from. Mango crops the photos, hosts them and builds the email in your browser; nothing is sent to 12ui.'}>
    {confirming ? <div className="detail-actions">
      <button type="button" className="secondary-action" onClick={() => setStage('form')}>Back</button>
      <button type="button" className="primary-action" autoFocus onClick={() => void build()}>Replace</button>
    </div> : <ValidationForm className="design-import-form" aria-label="Import a 12ui design" aria-busy={stage === 'working'} onValidSubmit={() => void submit()}>
      <p className="muted-copy">Optional: <a href="https://12ui.com" target="_blank" rel="noreferrer">12ui</a> is a separate AI design tool; <a href="/docs/first-newsletter#import-a-12ui-design" target="_blank" rel="noreferrer">follow these steps to get the PNG and LayerDoc layout file</a> with your own 12ui account.</p>
      <fieldset className="design-import-form__fields" disabled={stage === 'working'}>
        <label>LayerDoc (.layerdoc.json)<Field name="layerdoc" label="LayerDoc" required><input ref={layerdoc} type="file" accept=".json,application/json" /></Field></label>
        <label>Design image (PNG candidate)<Field name="candidate" label="Design image" required><input ref={candidate} type="file" accept="image/png" /></Field></label>
        <label>Button destination (HTTPS)<Field name="destination" label="Button destination" validate={() => destination.trim() && !safeEmailUrl(destination.trim()) ? 'Enter an HTTPS address.' : undefined}><input type="url" inputMode="url" placeholder="https://" value={destination} onChange={event => setDestination(event.target.value)} /></Field></label>
        <label>Brief<textarea value={brief} onChange={event => setBrief(event.target.value)} rows={4} aria-describedby="design-import-brief-note" /></label>
        <p className="muted-copy" id="design-import-brief-note">Lines of the design that are not in this brief are highlighted for you to check.</p>
      </fieldset>
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
      {stage === 'working' ? <p className="muted-copy" role="status">{progress || 'Preparing images'}</p> : null}
      <div className="detail-actions">
        <button type="button" className="secondary-action" onClick={close} disabled={stage === 'working'}>Cancel</button>
        <button type="submit" className="primary-action" disabled={stage === 'working'}>{stage === 'working' ? 'Importing…' : 'Import design'}</button>
      </div>
    </ValidationForm>}
  </Modal>;
}
