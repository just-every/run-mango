import { RevisionPreviews } from './revision-previews';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';

import { formatDate } from '@/core/app/client/lib/format';
import type { ProposalEntry } from '@/core/app/client/lib/types';
import { Paper } from '@/core/features/site/paper/Paper';
import { summarizeAudienceRules } from '../audience-summary';

import { AudienceSnapshot } from './audience-snapshot';
import { DeliveryPlan } from './delivery-plan';

export function ProposalDetail({ entry, onDismiss }: { entry: ProposalEntry; onDismiss?:()=>void }) {
  const { proposal } = entry;
  const navigate = useNavigate();
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const adopt = async () => {
    setBusy(true);setError('');
    try { const response=await requestJson<{campaignId?:string;detail?:string}>(`/api/proposals/${proposal.id}/adopt`,{method:'POST',body:'{}'});
      if (response.status<300&&response.data.campaignId) await navigate({to:'/app/campaigns/$id/review',params:{id:response.data.campaignId}});
      else setError(response.data.detail??'This suggestion could not be opened.');
    } catch {setError('This suggestion could not be opened.');} finally {setBusy(false);}
  };
  const dismiss=async()=>{
    setBusy(true);setError('');
    try {const result=await requestJson(`/api/proposals/${proposal.id}/dismiss`,{method:'POST',body:JSON.stringify({reason})});
      if(result.status<300){setReason('');onDismiss?.();}else setError('This proposal is no longer available to dismiss.');
    }catch{setError('The dismissal could not be saved.');}finally{setBusy(false);}
  };
  return (
    <section className="proposal-layout" aria-labelledby="proposal-title">
      {/* The letter you are about to approve: the one drawn paper sheet on the desk. */}
      <article className="proposal-focus">
        <Paper w={640} h={560} seed={23} className="app-sheet">
          <p className="eyebrow">{proposal.state === 'proposed' ? 'Proposed campaign' : proposal.state.replaceAll('-', ' ')}</p>
          <h2 id="proposal-title">{proposal.title}</h2>
          {entry.claimsUnavailable?<p role="alert">{entry.claimsUnavailable}</p>:null}
          <div className="proposal-summary">
            <strong>Proposal reason</strong>
            <p>{proposal.summary}</p>
          </div>
          <div className="evidence-note">
            <strong>Evidence</strong>
            {entry.evidenceItems?.length?<ul>{entry.evidenceItems.map(item=><li key={item.key}><strong>{item.sourceType} · {item.sourceRecordId}</strong><pre>{JSON.stringify(item.observedValue,null,2)}</pre><small>{formatDate(item.occurredAt)}</small></li>)}</ul>:<p>{proposal.evidence||'No recorded observations are available.'}</p>}
            <p>Trigger events: {proposal.triggerEventsJson??'Not recorded'}</p>
            <p>Lookback: {proposal.lookbackStartAt?formatDate(proposal.lookbackStartAt):'Not recorded'} to {formatDate(proposal.sourceDataAsOf)}</p>
            <p>Send by {formatDate(proposal.sendByAt)}</p>
          </div>
          <div className="rule-block">
            <span>Audience rule</span>
            <p>{summarizeAudienceRules(proposal.inclusionRuleJson, proposal.exclusionRulesJson)}</p>
            <p>{entry.explanation}</p>
            <small>Source data as of {formatDate(proposal.sourceDataAsOf)}</small>
          </div>
          <div className="proposal-focus__actions">
            <button type="button" className="primary-action" disabled={busy || Boolean(entry.claimsUnavailable) || proposal.state!=='proposed' || Date.parse(proposal.sendByAt)<=Date.now()} onClick={()=>void adopt()}>{busy?'Opening…':'Use this'}</button>
            <p className="quiet-caption">Nothing is scheduled until you approve a saved revision.</p>
          </div>
          {proposal.state==='proposed'?<div><label>Dismissal reason<textarea value={reason} onChange={event=>setReason(event.target.value)} /></label><button type="button" className="secondary-action" disabled={busy||!reason.trim()||Date.parse(proposal.sendByAt)<=Date.now()} onClick={()=>void dismiss()}>Dismiss proposal</button></div>:null}
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
        <p>Timing method: AI suggests future instants within the send-by deadline for operator review. The cited observations explain its evidence; Mango does not estimate a best hour or timing uplift.</p>
        {entry.steps.map(step=><p key={step.id}>{step.channel} · {step.timezone} · Suggested timing evidence: {step.whyThisTime??'Not recorded'}</p>)}
        <section className="panel"><h3>Forecast and provenance</h3><p>{entry.forecast?.status==='available'?`${entry.forecast.currency} ${((entry.forecast.valueMinor??0)/100).toFixed(2)} expected revenue`:entry.forecast?.status==='insufficient'?'Insufficient deployment attribution history; no revenue range is shown.':'Forecast unavailable for this saved proposal.'}</p><p>{entry.forecast?.method}</p>{entry.forecast?.sampleSize!==undefined?<><p>{entry.forecast.campaignCount} campaigns · {entry.forecast.eventCount} store events · {entry.forecast.sampleSize} historical recipient-steps · {entry.forecast.proposedRecipientSteps} proposed recipient-steps</p><p>Campaigns: {entry.forecast.campaignIds?.join(', ')||'None'}</p><p>Store events: {entry.forecast.sourceEventIds?.join(', ')||'None'}</p><p>As of {entry.forecast.asOf&&formatDate(entry.forecast.asOf)}</p></>:null}</section>
        {entry.composition?.revision?<RevisionPreviews revision={entry.composition.revision} links={entry.composition.links} selectedChannels={entry.steps.map(step=>step.channel)}/>:null}
        <section className="panel"><h3>Proposal history</h3><ul>{entry.history?.map((event,index)=><li key={index}>{event.fromState} → {event.toState} · {event.actorId} · {formatDate(event.occurredAt)} · {event.reason}</li>)}</ul></section>
      </div>
    </section>
  );
}
