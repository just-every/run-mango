import type {CampaignAttribution} from '../campaign-attribution';
import {useDateFormatter} from '@/core/app/client/lib/use-date-formatter';

export function CampaignAttributionSummary({attribution,version}:{attribution?:CampaignAttribution;version:number}) {
  const formatDate=useDateFormatter();
  if(!attribution?.campaignAuthor&&!attribution?.revisionApprover&&!attribution?.agentAuthorization&&!attribution?.agentAuthor)return null;
  return <section className="notice-note" aria-label="Campaign attribution">
    {attribution.agentAuthor?<p>Campaign prepared by {attribution.agentAuthor.label}.</p>:null}
    {attribution.campaignAuthor?<p>Campaign created by {attribution.campaignAuthor.operatorName??attribution.campaignAuthor.operatorId} on {formatDate(new Date(attribution.campaignAuthor.occurredAt).toISOString())}.</p>:null}
    {attribution.agentAuthorization?<p>Revision {version} prepared and authorized by {attribution.agentAuthorization.label}.
      {attribution.agentAuthorization.approvers.length ? ' Approved by '+attribution.agentAuthorization.approvers.map(person=>person.name).join(', ')+'.' : ' Company policy admitted this action.'}</p>:null}
    {attribution.revisionApprover?<p>Revision {version} approved by {attribution.revisionApprover.operatorName??attribution.revisionApprover.operatorId} on {formatDate(new Date(attribution.revisionApprover.occurredAt).toISOString())}.</p>:null}
  </section>;
}
