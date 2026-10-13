import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';

import { formatDate } from '@/core/app/client/lib/format';
import type { ProposalEntry } from '@/core/app/client/lib/types';
import { Paper } from '@/core/features/site/paper/Paper';
import { summarizeAudienceRules } from '../audience-summary';

import { AudienceSnapshot } from './audience-snapshot';
import { DeliveryPlan } from './delivery-plan';

export function ProposalDetail({ entry }: { entry: ProposalEntry }) {
  const { proposal } = entry;
  const navigate = useNavigate();
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const adopt = async () => {
    setBusy(true);setError('');
    try { const response=await requestJson<{campaignId?:string;detail?:string}>(`/api/proposals/${proposal.id}/adopt`,{method:'POST',body:'{}'});
      if (response.status<300&&response.data.campaignId) await navigate({to:'/app/campaigns/$id/review',params:{id:response.data.campaignId}});
      else setError(response.data.detail??'This suggestion could not be opened.');
    } catch {setError('This suggestion could not be opened.');} finally {setBusy(false);}
  };
  return (
    <section className="proposal-layout" aria-labelledby="proposal-title">
      {/* The letter you are about to approve: the one drawn paper sheet on the desk. */}
      <article className="proposal-focus">
        <Paper w={640} h={560} seed={23} className="app-sheet">
          <p className="eyebrow">{proposal.state === 'proposed' ? 'Proposed campaign' : proposal.state.replaceAll('-', ' ')}</p>
          <h2 id="proposal-title">{proposal.title}</h2>
          <div className="proposal-summary">
            <strong>Proposal reason</strong>
            <p>{proposal.summary}</p>
          </div>
          <div className="evidence-note">
            <strong>Evidence</strong>
            <p>{proposal.evidence}</p>
          </div>
          <div className="rule-block">
            <span>Audience rule</span>
            <p>{summarizeAudienceRules(proposal.inclusionRuleJson, proposal.exclusionRulesJson)}</p>
            <small>Source data as of {formatDate(proposal.sourceDataAsOf)}</small>
          </div>
          <div className="proposal-focus__actions">
            <button type="button" className="primary-action" disabled={busy || (!proposal.campaignId && (proposal.state!=='proposed' || Date.parse(proposal.sendByAt)<=Date.now()))} onClick={()=>void adopt()}>{busy?'Opening…':'Use this'}</button>
            <p className="quiet-caption">Nothing is scheduled until you approve a saved revision.</p>
          </div>
          {error?<p className="inline-error" role="alert">{error}</p>:null}
        </Paper>
      </article>
      <div className="proposal-evidence">
        <AudienceSnapshot
          audience={entry.audience}
          revision={proposal}
          channelCounts={entry.audienceChannelCounts}
          exclusions={entry.exclusions}
        />
        <DeliveryPlan steps={entry.steps} />
      </div>
    </section>
  );
}
