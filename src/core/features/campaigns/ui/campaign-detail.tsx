import { Link, useParams } from '@tanstack/react-router';

import { formatDate } from '@/core/app/client/lib/format';
import type { CampaignDetail } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { LoadState, StatusPill } from '@/core/app/client/ui/layout';

import { ApprovalCheckList } from './approval-check-list';
import { AudienceSnapshot } from './audience-snapshot';
import { DeliveryPlan } from './delivery-plan';
import { RevisionPreviews } from './revision-previews';

export function CampaignDetailPage() {
  const { id } = useParams({ from: '/app/campaigns_/$id' });
  const { data, error, loading } = useResource<CampaignDetail>(`/api/campaigns/${id}`);
  if (loading) return <LoadState />;
  if (!data || !data.revision) return <LoadState error={error ?? 'This campaign has no saved revision.'} />;

  const hasResults = Boolean(data.results);
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
            <StatusPill value={data.campaign.state} />
            <p>
              Saved revision {data.revision.version} · updated {formatDate(data.revision.updatedAt)}
            </p>
          </div>
        </div>
        <div className="page-head__actions">
          <Link className={hasResults ? 'secondary-action' : 'primary-action'} to="/app/campaigns/$id/review" params={{ id }}>
            {data.campaign.state === 'draft' ? 'Review and approve' : 'Review saved revision'}
          </Link>
          {hasResults ? (
            <Link className="primary-action" to="/app/campaigns/$id/scheduled" params={{ id }}>
              View schedule and results
            </Link>
          ) : null}
        </div>
      </header>
      {data.campaign.state==='erasure-invalidated'?<section className="notice-warning" role="status"><h2>Review required after contact erasure</h2><p>This saved revision was redacted. Its historical approval no longer authorizes sending. Create and review a new draft before scheduling another campaign.</p><Link to="/app/campaigns" className="button button--secondary">Create new draft</Link></section>:null}
      {data.uncertainDeliveries?.length ? <section role="status" className="notice-warning uncertain-deliveries">
        <h2>Uncertain · operator review required</h2>
        <p>These messages may have been accepted. Mango will never automatically retry them. Review receiver mail, provider message IDs, and signed events before deciding what to do.</p>
        <ul>{data.uncertainDeliveries.map(message => <li key={message.id}>
          {message.destination} · {message.providerMessageId ?? 'Provider message ID unavailable'} · {message.detail}
        </li>)}</ul>
      </section> : null}
      <div className="two-column-detail">
        <AudienceSnapshot revision={data.revision} audience={data.audience} channelCounts={data.audienceChannelCounts} />
        <DeliveryPlan steps={data.steps} />
      </div>
      <RevisionPreviews revision={data.revision} links={data.links} />
      <ApprovalCheckList checks={data.checks} />
    </div>
  );
}
