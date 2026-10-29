import {CatalogCounts} from './catalog-counts';
import { CampaignAttributionSummary } from './campaign-attribution';
import { DuplicateCampaign, SaveCampaignTemplate } from './campaign-reuse';
import { ActionMenu } from '@/core/app/client/ui/action-menu';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import {requestJson} from '@/core/app/client/lib/api';
import {useState} from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';

import type { CampaignDetail } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { LoadState } from '@/core/app/client/ui/layout';
import { CampaignStatusPill } from './campaign-status-pill';

import { ApprovalCheckList } from './approval-check-list';
import { AudienceSnapshot, savedAudienceExclusions } from './audience-snapshot';
import { DeliveryPlan } from './delivery-plan';
import { RevisionPreviews } from './revision-previews';

export function CampaignDetailPage() {
  const formatDate = useDateFormatter();
  const navigate=useNavigate();
  const [editError,setEditError]=useState<string>();
  const { id } = useParams({ from: '/app/campaigns_/$id' });
  const { data, error, loading } = useResource<CampaignDetail>(`/api/campaigns/${id}`);
  if (loading) return <LoadState />;
  if (!data || !data.revision) return <LoadState error={error ?? 'This campaign has no saved revision.'} />;

  const hasResults = Boolean(data.results);
  const edit=async()=>{
    try {const response=await requestJson<{campaignId:string;detail?:string}>(`/api/campaigns/${id}/edit-schedule`,{method:'POST'});
      if(response.status!==201)throw new Error(response.data.detail ?? 'The editable copy could not be confirmed. Reload before trying again.');await navigate({to:'/app/campaigns/$id/review',params:{id:response.data.campaignId}});
    }catch(error){setEditError(error instanceof Error?error.message:'The editable copy could not be confirmed. Reload before trying again.');}
  };
  return (
    <div className="page-flow campaign-detail-page">
      <header className="page-head page-head--actions">
        <div className="page-head__text">
          <Link className="back-link" to="/app/campaigns">
            ← Back to campaigns
          </Link>
          <p className="eyebrow">Campaign</p>
          <h1>{data.revision.name}</h1>
          <div className="page-head__meta campaign-head-meta">
            <CampaignStatusPill state={data.campaign.state} results={data.results} />
            <p>
              Saved revision {data.revision.version} · updated {formatDate(data.revision.updatedAt)}
            </p>
          </div>
        </div>
        <div className="page-head__actions">
          {hasResults?<button type="button" className="secondary-action" onClick={()=>void edit()}>{data.campaign.state==='scheduled'?'Edit replacement schedule':'Create a new campaign from this revision'}</button>:null}
          <Link className={hasResults ? 'secondary-action' : 'primary-action'} to="/app/campaigns/$id/review" params={{ id }}>
            {data.campaign.state === 'draft' ? 'Review and approve' : 'Review saved revision'}
          </Link>
          {hasResults ? (
            <Link className="primary-action" to="/app/campaigns/$id/scheduled" params={{ id }}>
              View schedule and results
            </Link>
          ) : null}
          <ActionMenu><DuplicateCampaign campaignId={id}/><SaveCampaignTemplate revisionId={data.revision.id} name={data.revision.name} disabled={false}/></ActionMenu>
        </div>
      </header>
      <CampaignAttributionSummary attribution={data.attribution} version={data.revision.version}/>
      {editError?<p role="alert">{editError}</p>:null}
      {data.campaign.state==='erasure-invalidated'?<section className="notice-warning" role="status"><h2>Review required after contact erasure</h2><p>This saved revision was redacted. Its historical approval no longer authorizes sending. Create and review a new draft before scheduling another campaign.</p><Link to="/app/campaigns" className="button button--secondary">Create new draft</Link></section>:null}
      {data.uncertainDeliveries?.length ? <section role="status" className="notice-warning uncertain-deliveries">
        <h2>Uncertain · operator review required</h2>
        <p>These messages may have been accepted. Mango will never automatically retry them. Review receiver mail, provider message IDs, and signed events before deciding what to do.</p>
        <ul>{data.uncertainDeliveries.map(message => <li key={message.id}>
          {message.destination} · {message.providerMessageId ?? 'Provider message ID unavailable'} · {message.detail}
        </li>)}</ul>
      </section> : null}
      <div className="two-column-detail">
        <AudienceSnapshot revision={data.revision} audience={data.audience} channelCounts={data.audienceChannelCounts} {...savedAudienceExclusions(data.audience)} />
        <DeliveryPlan steps={data.steps} />
      </div>
      <CatalogCounts summary={data.catalogSummary}/>
      <RevisionPreviews revision={data.revision} links={data.links} mediaOrigin={data.mediaOrigin} />
      <ApprovalCheckList checks={data.checks} />
    </div>
  );
}
