import {SavedReports} from './saved-reports';
import {OverviewDashboard} from './overview-dashboard';
import { ListGrowth } from './list-growth';
import { RetentionAnalytics } from './retention-report';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import {OpenEstimates} from './open-estimates';
import { CampaignPerformance } from './campaign-performance';
import { AttributionSettings } from './attribution-settings';
import { useState } from 'react';
import {SenderRates} from './sender-rates';
import { CostTotals } from './cost-totals';
import type { CostReport } from '../cost-report';
import { Link } from '@tanstack/react-router';

import { titleCase } from '@/core/app/client/lib/format';
import type { Insight } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { EmptyState } from '@/core/app/client/ui/empty-state';
import { LoadState } from '@/core/app/client/ui/layout';
import { Postmark } from '@/core/features/site/drawings/Postmark';
import { Paper } from '@/core/features/site/paper/Paper';

/** The empty state's drawing: a blank tally slip franked with a nought. Decorative; the heading beside it says what it means. */
function NothingPostmarked() {
  return (
    <div className="empty-art art insights-empty-art" aria-hidden="true">
      <div className="art-inner">
        <Paper w={150} h={110} seed={23} className="ie-slip"><span className="empty-art-lines"><i /><i /><i /></span></Paper>
        <Postmark label="0" className="ie-postmark" />
      </div>
    </div>
  );
}

export function InsightsPage() {
  const [settingsVersion, setSettingsVersion] = useState(0);
  const formatDate = useDateFormatter();
  const { data, error, loading } = useResource<{ results: Insight[]; note: string; costs: CostReport }>('/api/insights');
  if (loading) return <LoadState />;
  if (!data) return <LoadState error={error} />;
  return (
    <div className="page-flow insights-page">
      <header className="page-head">
        <div className="page-head__text">
          <h1>Insights</h1>
        </div>
      </header>
      <OverviewDashboard/>
      <SavedReports/>
      <OpenEstimates onSettingsChanged={() => setSettingsVersion(version => version + 1)} />
      <AttributionSettings onSettingsChanged={() => setSettingsVersion(version => version + 1)} />
      <CampaignPerformance settingsVersion={settingsVersion} />
      <CostTotals report={data.costs} />
      <SenderRates />
      <RetentionAnalytics />
      <ListGrowth />
      {data.results.length ? (
        <section className="panel data-table-panel" aria-labelledby="insights-results-title">
          <div className="section-heading"><div><p className="eyebrow">Recorded results</p><h2 id="insights-results-title">{data.results.length} observed event{data.results.length === 1 ? '' : 's'}</h2></div></div>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Recorded campaign outcomes">
            <table className="responsive-table insights-table" aria-label="Recorded campaign outcomes">
              <thead>
                <tr>
                  <th scope="col">Metric</th>
                  <th scope="col" className="num">Value</th>
                  <th scope="col">Observed</th>
                  <th scope="col">Source</th>
                  <th scope="col">Campaign</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((result) => (
                  <tr key={result.id}>
                    <th scope="row">{titleCase(result.metric)}</th>
                    <td className="num" data-label="Value">{result.value}</td>
                    <td data-label="Observed">{formatDate(result.observedAt)}</td>
                    <td data-label="Source">{result.source}</td>
                    <td data-label="Campaign">
                      <Link to="/app/campaigns/$id" params={{ id: result.campaignId }}>
                        View campaign
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <EmptyState id="insights-empty-title" title="There is nothing to graph yet." art={<NothingPostmarked />}>
          <p>Outcomes appear here after a campaign is handed to the provider and the provider reports back on it.</p>
        </EmptyState>
      )}
    </div>
  );
}
