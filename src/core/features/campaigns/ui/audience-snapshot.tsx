import { summarizeAudienceRules } from '../audience-summary';
import { productConfig } from '@/ext/config';
import { Link } from '@tanstack/react-router';

import { formatDateInTimeZone, titleCase } from '@/core/app/client/lib/format';
import { KeepTogether } from '@/core/features/site/BodyText';
import type { Audience, CampaignAudience, AudienceChannelCount, Exclusion } from '@/core/app/client/lib/types';

type AudienceSnapshotProps = {
  audience?: Audience;
  revision?: {inclusionRuleJson: string; exclusionRulesJson: string;audienceMasked?:boolean};
  channelCounts: AudienceChannelCount[];
  exclusions?: Exclusion[];
  exclusionNotice?: string;
};

/** Campaign draft reviews save rows; approved snapshots save a reason map. Proposals supply their own rows. */
export function savedAudienceExclusions(audience: CampaignAudience | undefined): Pick<AudienceSnapshotProps,'exclusions'|'exclusionNotice'> {
  if (!audience) return {exclusions:[]};
  const saved: Array<{reason:string;count:number}> | Record<string,number> | string = JSON.parse(audience.exclusions);
  if (typeof saved === 'string') return {exclusions:[],exclusionNotice:saved};
  const rows = Array.isArray(saved) ? saved : Object.entries(saved).map(([reason,count]) => ({reason,count}));
  return {exclusions:rows.map(row => ({...row,id:row.reason}))};
}

export function AudienceSnapshot({ audience, revision, channelCounts, exclusions = [], exclusionNotice }: AudienceSnapshotProps) {
  if (!audience) {
    return (
      <section className="panel audience-snapshot" aria-labelledby="audience-snapshot-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Audience snapshot</p>
            <h2 id="audience-snapshot-title">No saved audience snapshot</h2>
          </div>
        </div>
        {revision ? <p aria-label="Saved audience rule">{revision.audienceMasked?'Audience conditions are restricted by your role.':summarizeAudienceRules(revision.inclusionRuleJson, revision.exclusionRulesJson)}</p> : null}
        <p className="muted-copy">The server has not saved audience and recipient-step counts for this composition.</p>
      </section>
    );
  }

  return (
    <section className="panel audience-snapshot" aria-labelledby="audience-snapshot-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Audience snapshot</p>
          <h2 id="audience-snapshot-title"><KeepTogether text={`Saved at ${formatDateInTimeZone(audience.asOfAt, productConfig.storeTimezone)} (${productConfig.storeTimezone})`} /></h2>
        </div>
        <Link className="text-link" to="/app/audience">
          View audience
        </Link>
      </div>
      {revision ? <p aria-label="Saved audience rule">{revision.audienceMasked?'Audience conditions are restricted by your role.':summarizeAudienceRules(revision.inclusionRuleJson, revision.exclusionRulesJson)}</p> : null}
      <dl className="metric-row">
        <div>
          <dt>Candidates</dt>
          <dd>{audience.candidateCount}</dd>
        </div>
        <div>
          <dt>Excluded</dt>
          <dd>{audience.excludedCount}</dd>
        </div>
        <div>
          <dt>Eligible contacts</dt>
          <dd>{audience.eligibleCount}</dd>
        </div>
      </dl>
      <div className="channel-counts" aria-label="Saved channel step counts">
        <p className="channel-counts__title">Saved channel step counts</p>
        {channelCounts.length ? (
          channelCounts.map((count) => (
            <p key={count.id}>
              <span>{count.channel === 'sms' ? 'SMS' : titleCase(count.channel)}</span>
              <strong>{count.recipientStepCount}</strong>
            </p>
          ))
        ) : (
          <p className="muted-copy">No recipient-step counts were saved with this audience snapshot.</p>
        )}
      </div>
      <div className="fallback-counts" aria-label="Personalisation fallback counts">
        {channelCounts.filter(count => count.eligibleContactCount != null && count.fallbackContactCount != null).map(count => (
          <p key={count.id}>{count.channel === 'sms' ? 'SMS' : titleCase(count.channel)}: <strong>{count.fallbackContactCount} of {count.eligibleContactCount}</strong> eligible {count.eligibleContactCount === 1 ? 'contact uses' : 'contacts use'} fallback text.</p>
        ))}
        {channelCounts.some(count => count.eligibleContactCount == null || count.fallbackContactCount == null) ? <p className="muted-copy">Fallback usage was not recorded for this snapshot.</p> : null}
      </div>
      <p>Included by this campaign’s inactivity choice: <strong>{audience.dormancyIncludedCount??0}</strong></p>
      <p>No-history among included contacts: <strong>{audience.noHistoryCount??0}</strong></p>
      {exclusionNotice ? <p className="notice-note">{exclusionNotice}</p> : null}
      {exclusions.length ? (
        <div className="exclusion-list" aria-label="Saved audience exclusions">
          <p className="channel-counts__title">Saved audience exclusions</p>
          {exclusions.map((exclusion) => (
            <p key={exclusion.id}>
              <span>{titleCase(exclusion.reason)}</span>
              <strong>{exclusion.count}</strong>{exclusion.reason==='dormant'?<small>Open-only: {audience.openOnlyCount??0}</small>:null}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
