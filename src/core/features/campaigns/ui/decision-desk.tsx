import {SendingConnectionAlert} from '@/core/features/sending/alert';
import {SignupRefusalAlert} from '@/core/features/audience/ui/signup-refusal-report';
import {SenderRenewalCard} from '@/core/features/sender-verification/ui/renewal-card';
import { capabilityName, capabilityNextStep, plainServiceText } from '@/core/app/client/ui/product-copy';
import { requestJson } from '@/core/app/client/lib/api';
import { Link, useLoaderData } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import type { DecisionDesk } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { EmptyState } from '@/core/app/client/ui/empty-state';
import { LoadState } from '@/core/app/client/ui/layout';
import { Envelope } from '@/core/features/site/drawings/Envelope';

import { ProposalDetail } from './proposal-detail';
import { ProposalHistory } from './proposal-history';
import { ProposalQueue } from './proposal-queue';
import { SourceFreshness } from './source-freshness';

function ProposalCapabilityState({ providers, suggestions }: { providers: DecisionDesk['sourceStatus']['providers']; suggestions: boolean }) {
  const unavailable = providers.filter((provider) => !provider.configured);
  const art = (
    <div className="empty-art art" aria-hidden="true">
      <div className="art-inner"><Envelope className="desk-empty__envelope" seed={41} cancelled={false} /></div>
    </div>
  );
  return (
    <EmptyState id="proposal-empty-title" title={suggestions ? 'No campaign suggestions yet' : 'Write your next letter'} className="desk-empty" art={art} action={<Link className="secondary-action" to="/app/campaigns">Review campaigns</Link>}>
      {!suggestions ? <p role="status">Write a campaign, preview it on desktop and mobile, then approve the exact saved version. Nothing sends until you do.</p> : unavailable.length ? (
        <>
          <p role="status">These connections need attention before suggestions are available.</p>
          <ul className="capability-list">
            {unavailable.map((provider) => (
              <li key={provider.id}>
                <strong>{capabilityName(provider.adapter)}</strong>
                <span>{plainServiceText(provider.detail)} {capabilityNextStep(provider.adapter)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p role="status">You can still review your saved campaigns.</p>
      )}
    </EmptyState>
  );
}

export function DecisionDeskPage() {
  const { data, error, loading, reload } = useResource<DecisionDesk>('/api/decision-desk');
  const [generationSuccess,setGenerationSuccess]=useState(false);
  const [generating,setGenerating]=useState(false),[generationNotice,setGenerationNotice]=useState('');
  const generate=async()=>{setGenerating(true);setGenerationNotice('');setGenerationSuccess(false);try {const result=await requestJson<{kind:string;detail?:string;error?:string}>('/api/proposals/generate',{method:'POST',body:'{}'});setGenerationSuccess(result.data.kind==='proposed');setGenerationNotice(result.data.kind==='proposed'?'Suggestion ready. Review it before approving.':result.data.detail??'Generation failed. No substitute content was created; manual authoring remains available.');await reload();} catch {setGenerationNotice('Generation could not be confirmed. Reload to inspect suggestions.');} finally {setGenerating(false);}};
  const [selectedId, setSelectedId] = useState<string>();
  const { modules } = useLoaderData({ from: '/app' });

  useEffect(() => {
    if (!data?.proposals.length) return;
    if (!data.proposals.some((entry) => entry.proposal.id === selectedId)) {
      setSelectedId(data.proposals[0].proposal.id);
    }
  }, [data, selectedId]);

  if (loading) return <LoadState />;
  if (!data) return <LoadState error={error} />;
  const entry = data.proposals.find((candidate) => candidate.proposal.id === selectedId);
  const showing = Boolean(entry && selectedId);

  return (
    <div className="desk-page page-flow">
      <header className="page-head desk-head">
        <div className="page-head__text">
          <h1>Decision Desk</h1>
          <h2 className="page-head__lead">Nothing sends until you approve it.</h2>
        </div>
        <div className="page-head__actions">
          {/* Sun once per view: while a suggestion is open, its "Use this" is the sun button and generating steps back. */}
          {modules.ai ? <button type="button" className={showing ? 'secondary-action' : 'primary-action'} disabled={generating} onClick={()=>void generate()}>{generating?'Generating…':'Generate suggestion'}</button> : null}
          <Link className={modules.ai ? 'secondary-action' : 'primary-action'} to="/app/campaigns">Write a campaign</Link>
        </div>
      </header>
      <SignupRefusalAlert />
      <SenderRenewalCard/><SendingConnectionAlert/>
      {generationNotice?<p className={generationSuccess?'action-notice':'inline-error'} role={generationSuccess?'status':'alert'}>{plainServiceText(generationNotice)}</p>:null}
      {entry && selectedId ? (
        <div className="decision-desk__proposals">
          <ProposalQueue proposals={data.proposals} selectedId={selectedId} onSelect={setSelectedId} />
          <ProposalDetail key={entry.proposal.id} entry={entry} onDismiss={()=>void reload()} />
        </div>
      ) : (
        <ProposalCapabilityState providers={data.sourceStatus.providers} suggestions={modules.ai} />
      )}
      <ProposalHistory decisions={data.recentDecisions??[]} />
      {modules.store ? <SourceFreshness sources={data.sourceStatus.sourceSyncs} /> : null}
    </div>
  );
}
