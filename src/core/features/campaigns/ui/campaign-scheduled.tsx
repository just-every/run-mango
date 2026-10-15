import {CommerceResults} from '@/core/features/insights/ui/commerce-results';
import { SchedulerReadiness } from './scheduler-readiness';
import { CampaignCosts } from '@/core/features/insights/ui/cost-totals';
import { productConfig } from '@/ext/config';
import { Link, useLoaderData, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import type { CampaignDetail } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { LoadState, StatusPill } from '@/core/app/client/ui/layout';
import { Modal } from '@/core/app/client/ui/modal';
import { AudienceSnapshot } from './audience-snapshot';
import { StepResults } from './step-results';
import { overallResult } from './result-copy';
import { ScheduledEnvelopeArt } from './scheduled-envelope-art';

export function CampaignScheduledPage() {
  const { id } = useParams({ from: '/app/campaigns_/$id_/scheduled' });
  const { modules } = useLoaderData({ from: '/app' });
  const { data, error, loading, reload } = useResource<CampaignDetail>(`/api/campaigns/${id}`);
  const [notice, setNotice] = useState<{message:string;error:boolean}>();
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [now,setNow] = useState(Date.now);
  useEffect(() => {const timer = setInterval(() => {setNow(Date.now()); void reload();}, 20_000);return () => clearInterval(timer);},[reload]);
  if (loading && !data) return <LoadState />;
  if (!data?.revision) return <LoadState error={error ?? 'This campaign has no saved revision.'} />;
  if (!data.results) return <div className="page-flow scheduled-page">
    <header className="page-head page-head--actions">
      <div className="page-head__text"><h1>{data.revision.name}</h1><p className="page-head__lead">This revision has not been approved. Its draft steps are not scheduled to send.</p></div>
      <div className="page-head__actions"><Link className="primary-action" to="/app/campaigns/$id/review" params={{id}}>Review and approve this draft</Link></div>
    </header>
    <AudienceSnapshot revision={data.revision} audience={data.audience} channelCounts={data.audienceChannelCounts} />
  </div>;
  const results = data.results;
  const cancel = async () => {
    setCancelling(true);
    try {
      const response = await requestJson<{ status?: string; error?: string }>(`/api/campaigns/${id}/cancel`, { method: 'POST' });
      if (response.status < 300 && response.data.status === 'cancelled') {
        setNotice({message:'Campaign cancelled. Messages already handed to a provider cannot be recalled.',error:false});
        setConfirmCancel(false);
        await reload();
      } else setNotice({message:response.data.error === 'campaign_not_cancellable' ? 'This campaign can no longer be cancelled.' : 'Cancellation was not saved.',error:true});
    } catch {setNotice({message:'Cancellation could not be confirmed. Reload to check the saved status before retrying.',error:true});}
    finally {setCancelling(false);}
  };
  const waiting = data.campaign.state === 'scheduled' || data.campaign.state === 'dispatching';
  return <div className="page-flow scheduled-page">
    <header className="page-head scheduled-head">
      <div className="page-head__text">
        <Link className="back-link" to="/app/campaigns/$id" params={{ id }}>← Back to campaign</Link>
        <p className="eyebrow">Campaign schedule</p><h1>{data.revision.name}</h1>
        <p className="page-head__meta scheduled-head__state">State: <StatusPill value={data.campaign.state} /></p>
        <p className="overall-result">{overallResult(results,data.steps,productConfig.storeTimezone)}</p>
        <p className="scheduled-head__recall">Messages already handed to a provider cannot be recalled.</p>
      </div>
      {waiting ? <ScheduledEnvelopeArt /> : null}
    </header>
    {data.campaign.state === 'scheduled' ? <p className="action-notice" role="status">Campaign approved and scheduled.</p> : null}
    {notice ? <p className={notice.error ? 'inline-error' : 'action-notice'} role={notice.error ? 'alert' : 'status'}>{notice.message}</p> : null}
    {error ? <p className="inline-error" role="alert">Results could not be refreshed. The last saved results remain below.</p> : null}
    <div className="scheduled-layout">
      <div className="scheduled-layout__main">
        {data.scheduler ? <SchedulerReadiness scheduler={data.scheduler} expired={data.steps.length>0 && data.steps.every(step=>Date.parse(step.sendByAt)<=Math.max(now,Date.parse(results.asOf)))} /> : null}
        <StepResults awaitingFirstTick={data.scheduler?.state==='not-observed'} timezone={productConfig.storeTimezone} steps={data.steps} results={results} now={Math.max(now,Date.parse(results.asOf))} />
        {results.cancellable ? <section className="panel cancellation-panel">
          <h2>Cancel remaining sends</h2>
          <p>Cancellation stops queued recipient-steps that have not begun handoff. It cannot recall messages already handed to a provider. Unknown handoffs remain visible for confirmation.</p>
          <button className="danger-action--line" type="button" onClick={() => setConfirmCancel(true)} disabled={cancelling}>Cancel campaign</button>
        </section> : <p className="notice-note">No remaining sends can be stopped. Provider outcomes may still arrive.</p>}
      </div>
      <div className="scheduled-layout__side">
        <AudienceSnapshot revision={data.revision} audience={data.audience} channelCounts={data.audienceChannelCounts} />
      </div>
    </div>
    {modules.store ? <CommerceResults campaignId={id} /> : null}
    <CampaignCosts campaignId={id} />
    <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel this campaign?" description="Recipient-steps not yet handed to a provider will be stopped. Messages already handed to a provider cannot be recalled.">
      <div className="detail-actions"><button className="secondary-action" type="button" disabled={cancelling} onClick={() => setConfirmCancel(false)}>Keep campaign</button><button className="danger-action" type="button" disabled={cancelling} onClick={() => void cancel()}>{cancelling ? 'Cancelling…' : 'Confirm cancellation'}</button></div>
    </Modal>
  </div>;
}
