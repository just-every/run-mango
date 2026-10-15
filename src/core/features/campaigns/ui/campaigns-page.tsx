import { useState } from 'react';
import { CampaignsEmptyArt } from './campaigns-empty-art';
import { NewCampaign } from './new-campaign';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { formatDateInTimeZone } from '@/core/app/client/lib/format';
import { KeepTogether } from '@/core/features/site/BodyText';
import { EmptyState } from '@/core/app/client/ui/empty-state';
import { LoadState } from '@/core/app/client/ui/layout';
import { CampaignStatusPill } from './campaign-status-pill';
import { campaignStates, campaignStateLabel } from '../result-model';
import { useCampaignCollection } from './data';
import { dispositionLabel } from './result-copy';

export function CampaignsPage() {
  const filters = useSearch({from:'/app/campaigns'});
  const navigate = useNavigate({from:'/app/campaigns'});
  const { data, error, loading } = useCampaignCollection(filters);
  const [starting, setStarting] = useState(false);
  if (loading) return <LoadState />;
  if (!data) return <LoadState error={error} />;
  const change = (key:'state'|'channel',value:string) => void navigate({search:previous => ({...previous,[key]:value || undefined})});
  return <div className="page-flow campaigns-page">
    <header className="page-head page-head--actions">
      <div className="page-head__text"><h1>Campaigns</h1><p className="page-head__lead">Review drafts and follow approved campaigns.</p></div>
      <div className="page-head__actions"><button type="button" className="primary-action" aria-expanded={starting} aria-controls="campaign-starters" onClick={() => setStarting(!starting)}>New campaign</button></div>
    </header>
    {data.marketingConnectionRequired ? <aside className="panel" role="status"><h2>Connect a newsletter provider</h2><p>Newsletters need your own SendGrid or Resend connection. Add the optional marketing connection in RER Configure, then verify your business sender in Settings. Managed mail handles sign-in and subscription confirmations.</p></aside> : null}
    <NewCampaign open={starting} commerceEnabled={data.commerceEnabled} aiEnabled={data.aiEnabled} />
    <section className="campaigns-history" aria-label="Campaign history">
      {!data.total ? <EmptyState id="campaigns-empty-title" title="Nothing drafted yet" art={<CampaignsEmptyArt />}><p>No campaigns yet. Start with New campaign.</p></EmptyState> : <div className="panel campaign-list">
        <div className="campaign-filters">
          <div className="campaign-filter"><label htmlFor="campaign-state-filter">State</label><select id="campaign-state-filter" value={filters.state ?? ''} onChange={event => change('state',event.target.value)}>
            <option value="">All states ({data.counts.allStates})</option>
            {campaignStates.map(state => <option key={state} value={state}>{campaignStateLabel(state)} ({data.counts.states[state]})</option>)}
          </select></div>
          <div className="campaign-filter"><label htmlFor="campaign-channel-filter">Channel</label><select id="campaign-channel-filter" value={filters.channel ?? ''} onChange={event => change('channel',event.target.value)}>
            <option value="">All channels ({data.counts.allChannels})</option><option value="email">Email ({data.counts.channels.email})</option>
            {data.smsEnabled ? <option value="sms">SMS ({data.counts.channels.sms})</option> : null}
          </select></div>
        </div>
        <p className="muted-copy campaign-list__count">{data.campaigns.length} saved campaign{data.campaigns.length === 1 ? '' : 's'}</p>
        {!data.campaigns.length ? <div className="campaign-list__none"><p>No campaigns match these filters</p><Link className="text-link" to="/app/campaigns" search={{}}>Clear filters</Link></div> : null}
        <div className="campaign-list__rows">{data.campaigns.map(campaign => {
          return <Link className="campaign-row" key={campaign.id} to={campaign.state === 'draft' ? '/app/campaigns/$id/review' : '/app/campaigns/$id'} params={{id:campaign.id}}>
            <div className="campaign-row__content"><strong><KeepTogether text={campaign.name ?? 'Untitled campaign'} /></strong>
              <span>{campaign.channels.map(channel => channel === 'sms' ? 'SMS' : 'Email').join(' · ') || 'No saved steps'}</span>
              <p className="campaign-row__audience">{campaign.audienceSummary}</p>
            </div>
            <div className="campaign-row__meta"><CampaignStatusPill state={campaign.state} lastOutcome={campaign.lastOutcome} />
              <small><KeepTogether text={`${campaign.nextScheduledAt ? `Next: ${formatDateInTimeZone(campaign.nextScheduledAt,data.timezone)}` : `${campaign.lastOutcome ? dispositionLabel({disposition:campaign.lastOutcome,reason:campaign.lastSkipReason,count:1}) : campaignStateLabel(campaign.state)}: ${formatDateInTimeZone(campaign.lastOutcomeAt ?? campaign.updatedAt,data.timezone)}`} (${data.timezone})`} /></small>
            </div>
          </Link>;
        })}</div>
      </div>}
    </section>
  </div>;
}
