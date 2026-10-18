import type {ComponentProps} from 'react';
import {Can} from '@/core/features/auth/ui/permissions';
import { useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';

function CampaignSendControlsContent({ campaignId, state, operatorPaused, reload }: {
  campaignId: string; state: string; operatorPaused: boolean; reload: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const action = operatorPaused ? 'resume' : 'pause';
  if (!operatorPaused && !['scheduled', 'dispatching'].includes(state)) return null;
  const apply = async () => {
    setBusy(true); setError('');
    try {
      const response = await requestJson<{status?: string}>(`/api/campaigns/${campaignId}/${action}`, {method: 'POST'});
      if (response.status >= 300) throw new Error('The campaign changed. Reload its saved status before trying again.');
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The change could not be confirmed. Reload the campaign.'); }
    finally { setBusy(false); }
  };
  return <section className="panel" aria-label="Pause and resume sending">
    <h2>{operatorPaused ? 'Sending paused by an operator' : 'Pause sending'}</h2>
    <p>{operatorPaused
      ? 'Remaining sends stay on hold until you resume. Consent, suppression, frequency protection and send-by deadlines are checked again. Other provider or source holds still apply.'
      : 'Put all remaining steps on hold. Messages whose handoff has already begun keep their provider outcomes. Pausing does not extend send-by deadlines.'}</p>
    <button type="button" className="secondary-action" disabled={busy} onClick={() => void apply()}>
      {busy ? 'Saving…' : operatorPaused ? 'Resume campaign' : 'Pause campaign'}
    </button>
    {error ? <p role="alert" className="inline-error">{error}</p> : null}
  </section>;
}

export function CampaignSendControls(props:ComponentProps<typeof CampaignSendControlsContent>) {return <Can permission="campaign.approve"><CampaignSendControlsContent {...props}/></Can>;}
