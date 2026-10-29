import { CampaignExport } from './campaign-export';
import { ActionMenu } from '@/core/app/client/ui/action-menu';
import { FilterFold } from '@/core/app/client/ui/filter-fold';
import {Can, usePermissions} from '@/core/features/auth/ui/permissions';
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
  const [started, setStarted] = useState<boolean>();
  const {can} = usePermissions();
  if (loading) return <LoadState />;
  if (!data) return <LoadState error={error} />;
  // With nothing drafted the starters are the page: they open at once, and there is no list to export.
  const empty = !data.total && can('draft.write');
  const starting = empty || (started ?? false);
  const change = (key:'state'|'channel',value:string) => void navigate({search:previous => ({...previous,[key]:value || undefined})});
  return <div className="page-flow campaigns-page">
    <header className="page-head page-head--actions">
      <div className="page-head__text"><h1>Campaigns</h1><p className="page-head__lead">Review drafts and follow approved campaigns.</p></div>
      {empty ? null : <div className="page-head__actions"><Can permission="draft.write"><button type="button" className="primary-action" aria-expanded={starting} aria-controls="campaign-starters" onClick={() => setStarted(!starting)}>New campaign</button></Can><ActionMenu><CampaignExport /></ActionMenu></div>}
    </header>
    {data.marketingConnectionRequired ? <aside className="panel" role="status"><h2>Connect a newsletter provider</h2><p>Newsletters need your own SendGrid or Resend connection. Add the optional marketing connection in RER Configure, then verify your business sender in Settings. Managed mail handles sign-in and subscription confirmations.</p></aside> : null}
    <Can permission="draft.write"><NewCampaign open={starting} commerceEnabled={data.commerceEnabled} aiEnabled={data.aiEnabled} /></Can>
    {empty ? null : <section className="campaigns-history" aria-label="Campaign history">
      {!data.total ? <EmptyState id="campaigns-empty-title" title="Nothing drafted yet" art={<CampaignsEmptyArt />}><p>No campaigns yet.</p></EmptyState> : <div className="panel campaign-list">
        <div className="campaign-list__bar">
          <FilterFold applied={[...(filters.state ? [{key:'state',label:`State: ${campaignStateLabel(filters.state as typeof campaignStates[number])}`}] : []),...(filters.channel ? [{key:'channel',label:`Channel: ${filters.channel === 'sms' ? 'SMS' : 'Email'}`}] : [])]} onRemove={key => change(key as 'state'|'channel','')}>{() => <div className="campaign-filters">
            <div className="campaign-filter"><label htmlFor="campaign-state-filter">State</label><select id="campaign-state-filter" value={filters.state ?? ''} onChange={event => change('state',event.target.value)}>
              <option value="">All states ({data.counts.allStates})</option>
              {campaignStates.map(state => <option key={state} value={state}>{campaignStateLabel(state)} ({data.counts.states[state]})</option>)}
            </select></div>
            <div className="campaign-filter"><label htmlFor="campaign-channel-filter">Channel</label><select id="campaign-channel-filter" value={filters.channel ?? ''} onChange={event => change('channel',event.target.value)}>
              <option value="">All channels ({data.counts.allChannels})</option><option value="email">Email ({data.counts.channels.email})</option>
              {data.smsEnabled ? <option value="sms">SMS ({data.counts.channels.sms})</option> : null}
            </select></div>
          </div>}</FilterFold>
          <p className="muted-copy campaign-list__count">{data.campaigns.length} saved campaign{data.campaigns.length === 1 ? '' : 's'}</p>
        </div>
        {!data.campaigns.length ? <div className="campaign-list__none"><p>No campaigns match these filters</p><Link className="text-link" to="/app/campaigns" search={{}}>Clear filters</Link></div> : null}
        <div className="campaign-list__rows">{data.campaigns.map(campaign => {
          const when = campaign.nextScheduledAt ? `Next: ${formatDateInTimeZone(campaign.nextScheduledAt,data.timezone)}` : `${campaign.lastOutcome ? `${dispositionLabel({disposition:campaign.lastOutcome,reason:campaign.lastSkipReason,count:1})}: ` : ''}${formatDateInTimeZone(campaign.lastOutcomeAt ?? campaign.updatedAt,data.timezone)}`;
          return <Link className="campaign-row" key={campaign.id} to={campaign.state === 'draft' ? '/app/campaigns/$id/review' : '/app/campaigns/$id'} params={{id:campaign.id}}>
            <strong><KeepTogether text={campaign.name ?? 'Untitled campaign'} /></strong>
            <p className="campaign-row__meta">{campaign.state === 'draft' ? null : <CampaignStatusPill state={campaign.state} lastOutcome={campaign.lastOutcome} />}<span title={data.timezone}>{[campaign.channels.map(channel => channel === 'sms' ? 'SMS' : 'Email').join(' · ') || 'No saved steps',when].join(' · ')}</span></p>
          </Link>;
        })}</div>
      </div>}
    </section>}
  </div>;
}
