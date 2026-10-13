import { useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import { Modal } from '@/core/app/client/ui/modal';
import { Field, ValidationForm } from '@/core/app/client/ui/validation-form';
import { draftEstimate, maxBriefCharacters, maxCandidates, minCandidates, type DesignJobView } from '../model';

const refusals: Record<string, string> = {
  design_unavailable: 'Design generation is not configured on this deployment.',
  design_job_active: 'A design for this draft is still being made. Wait for it, or discard it first.',
  campaign_not_draft: 'Only a draft can be designed. This campaign is no longer a draft.',
};

/** Step 1 of Design with 12ui (DESIGN-002): the brief, prefilled from the draft and editable, the number of designs and
 * the estimate for this paid step. Generate designs starts a background run; nothing in the draft changes. `kept` is
 * the number of paid designs already on offer: the dialog says they stay reachable, since a new run never sets them aside. */
export function BriefDialog({ campaignId, initialBrief, kept, onClose, onStarted }: {
  campaignId: string; initialBrief: string; kept: number; onClose: () => void; onStarted: (job: DesignJobView) => void;
}) {
  const [brief, setBrief] = useState(initialBrief);
  const [count, setCount] = useState(minCandidates);
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const submit = async () => {
    setSending(true); setError(undefined);
    try {
      const response = await requestJson<{ job?: DesignJobView; error?: string; detail?: string }>(`/api/campaigns/${encodeURIComponent(campaignId)}/design-jobs`,
        { method: 'POST', body: JSON.stringify({ brief, candidates: count }) });
      if (response.status === 201 && response.data.job) { onStarted(response.data.job); return; }
      setError(refusals[response.data.error ?? ''] ?? response.data.detail ?? `Mango did not start the design (HTTP ${response.status}).`);
    } catch { setError('Mango could not be reached. Nothing was started.'); }
    finally { setSending(false); }
  };
  return <Modal open onClose={() => { if (!sending) onClose(); }} role="dialog" title="Design this email with 12ui"
    description="12ui draws designs from this brief on your own 12ui account. Mango sends only the brief: no contacts and no personalisation. You choose one design before anything is added to your draft.">
    <ValidationForm className="design-import-form" aria-label="Design this email with 12ui" aria-busy={sending} onValidSubmit={() => void submit()}>
      <fieldset className="design-import-form__fields" disabled={sending}>
        <label>Brief<Field name="brief" label="Brief" required validate={() => brief.length > maxBriefCharacters ? `Keep the brief under ${maxBriefCharacters} characters.` : undefined}>
          <textarea value={brief} onChange={event => setBrief(event.target.value)} rows={8} aria-describedby="design-brief-note" /></Field></label>
        <p className="muted-copy" id="design-brief-note">Starts as the draft's name, subject, preheader, sender and current text. Lines of the design that are not in this brief are highlighted for you to check.</p>
        <label>Designs<select value={count} onChange={event => setCount(Number(event.target.value))}>
          {Array.from({ length: maxCandidates - minCandidates + 1 }, (_, index) => minCandidates + index).map(value => <option key={value} value={value}>{value} designs</option>)}
        </select></label>
        <p className="design-estimate" role="note">Estimated cost: {draftEstimate(count)}</p>
        {kept ? <p className="design-kept">{kept === 1 ? 'The design you already have stays' : `The ${kept} designs you already have stay`} on offer: a new run
          does not set {kept === 1 ? 'it' : 'them'} aside, and you can return to {kept === 1 ? 'it' : 'them'} under Earlier designs.</p> : null}
      </fieldset>
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
      <div className="detail-actions">
        <button type="button" className="secondary-action" onClick={onClose} disabled={sending}>Cancel</button>
        <button type="submit" className="primary-action" disabled={sending}>{sending ? 'Starting…' : 'Generate designs'}</button>
      </div>
    </ValidationForm>
  </Modal>;
}
