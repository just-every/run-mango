import { TemplateLibrary } from './campaign-reuse';
import { useEffect, useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { requestJson } from '@/core/app/client/lib/api';
import { useResource } from '@/core/app/client/lib/use-resource';
import type { DecisionDesk } from '@/core/app/client/lib/types';

/** The campaign starters the page's "New campaign" button opens. Starters load with the page, so opening is instant. */
export function NewCampaign({ open, commerceEnabled, aiEnabled }: { open: boolean; commerceEnabled:boolean; aiEnabled:boolean }) {
  const [busy,setBusy]=useState(false), [error,setError]=useState('');
  const navigate=useNavigate();
  const router=useRouter();
  // Opening the starter chooser expresses intent to enter the editor. Fetch
  // its code while the operator chooses; data and authorization stay live.
  useEffect(() => {
    if (open) void router.loadRouteChunk(router.routesById['/app/campaigns_/$id_/review'])?.catch(() => {});
  }, [open, router]);
  const signals=useResource<{starters:{id:string;title:string;evidence:string;available:boolean;detail:string}[];detail:string}>('/api/campaign-starters');
  const suggestions=useResource<DecisionDesk>('/api/decision-desk');
  const create=async (proposalId?:string,starterSourceId?:string)=>{
    setBusy(true);setError('');
    try {
      const body = proposalId ? {} : starterSourceId ? { starterSourceId } : { mode: 'blank' };
      const response=await requestJson<{campaignId?:string;detail?:string}>(proposalId?`/api/proposals/${proposalId}/adopt`:'/api/campaigns',{method:'POST',body:JSON.stringify(body)});
      if(response.status<300&&response.data.campaignId) {
        // The document entry renders the fresh review directly. Keep the
        // starter disabled until it replaces this page, avoiding duplicate clicks.
        await navigate({to:'/app/campaigns/$id/review',params:{id:response.data.campaignId},reloadDocument:true});
        return;
      }
      setError(response.data.detail??'The draft could not be created. Try again.');
    } catch {setError('The draft could not be created. Try again.');}
    setBusy(false);
  };
  if (!open) return null;
  const current = suggestions.data?.proposals.filter(entry=>entry.proposal.state==='proposed'&&Date.parse(entry.proposal.sendByAt)>Date.now()) ?? [];
  return <section id="campaign-starters" className="panel new-campaign-panel" aria-label="Choose a campaign starter"><h2>Start a campaign</h2>
    <div className="starter-grid">
      <div className="starter-group"><h3>From scratch</h3><button type="button" className="secondary-action" disabled={busy} onClick={()=>void create()}>Blank newsletter</button><p className="muted-copy">Write your own email. No AI or store connection needed.</p></div>
      {commerceEnabled ? <div className="starter-group"><h3>From store signals</h3>
        {signals.data?.starters.length ? <ul className="starter-list">{signals.data.starters.map(source=><li key={source.id}><button type="button" className="secondary-action" disabled={busy||!source.available} onClick={()=>void create(undefined,source.id)}>{source.title}</button><p>{source.evidence}</p>{source.detail?<p>{source.detail}</p>:null}</li>)}</ul> : null}
        {signals.data?.detail?<p className="starter-note">{signals.data.detail}</p>:null}
      </div> : null}
      {commerceEnabled && aiEnabled ? <div className="starter-group"><h3>Saved suggestions</h3>
        {current.length ? <ul className="starter-list">{current.map(entry=><li key={entry.proposal.id}><button type="button" className="secondary-action" disabled={busy} onClick={()=>void create(entry.proposal.id)}>{entry.proposal.title}</button></li>)}</ul>
          : <p className="starter-note">No current store suggestions. Generate one from the Decision Desk when evidence and AI are configured.</p>}
      </div> : null}
    </div>
    <TemplateLibrary/>
    {error?<p className="inline-error" role="alert">{error}</p>:null}</section>;
}
