import { Link, useLoaderData } from '@tanstack/react-router';
import { useState } from 'react';

import { requestJson } from '@/core/app/client/lib/api';
import type { DecisionDesk } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { LoadState } from '@/core/app/client/ui/layout';
import { plainServiceText } from '@/core/app/client/ui/product-copy';

import { useCampaignCollection } from './data';
import { DeskAttention } from './desk-attention';
import { DeskSuggestions } from './desk-suggestions';
import { DeskWork } from './desk-work';
import { ProposalHistory } from './proposal-history';
import { SourceFreshness, type SourceCapabilities } from './source-freshness';

// The desk read also carries what each store source can supply; the shared type does not name it.
type DeskRead = Omit<DecisionDesk, 'sourceStatus'> & { sourceStatus: DecisionDesk['sourceStatus'] & { sourceCapabilities?: SourceCapabilities } };

export function DecisionDeskPage() {
  const desk = useResource<DeskRead>('/api/decision-desk');
  const campaigns = useCampaignCollection();
  const { modules } = useLoaderData({ from: '/app' });
  const [generationSuccess, setGenerationSuccess] = useState(false);
  const [generating, setGenerating] = useState(false), [generationNotice, setGenerationNotice] = useState('');
  const [chosenId, setChosenId] = useState<string>();
  const generate = async () => {setGenerating(true);setGenerationNotice('');setGenerationSuccess(false);try {const result = await requestJson<{kind:string;detail?:string;error?:string}>('/api/proposals/generate',{method:'POST',body:'{}'});setGenerationSuccess(result.data.kind==='proposed');setGenerationNotice(result.data.kind==='proposed'?'Suggestion ready. Review it before approving.':result.data.detail??'Generation failed. No substitute content was created; manual authoring remains available.');await desk.reload();} catch {setGenerationNotice('Generation could not be confirmed. Reload to inspect suggestions.');} finally {setGenerating(false);}};

  // The open suggestion is the one chosen, else the first in policy order.
  const data = desk.data;
  const selectedId = data?.proposals.some(entry => entry.proposal.id === chosenId) ? chosenId : data?.proposals[0]?.proposal.id;
  const showing = Boolean(selectedId);
  const sourceStatus = data?.sourceStatus;
  const capabilities = sourceStatus?.sourceCapabilities ?? [];

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
      {generationNotice?<p className={generationSuccess?'action-notice':'inline-error'} role={generationSuccess?'status':'alert'}>{plainServiceText(generationNotice)}</p>:null}
      <DeskAttention campaigns={campaigns.data?.campaigns} sources={sourceStatus?.sourceSyncs} capabilities={capabilities} store={modules.store} />
      <DeskWork data={campaigns.data} loading={campaigns.loading} />
      {data ? <>
        <DeskSuggestions desk={data} ai={modules.ai} selectedId={selectedId} onSelect={setChosenId} onDismiss={() => void desk.reload()} />
        <ProposalHistory decisions={data.recentDecisions ?? []} />
        {modules.store ? <SourceFreshness sources={data.sourceStatus.sourceSyncs} capabilities={capabilities} /> : null}
      </> : desk.loading ? <LoadState /> : (
        <p className="inline-error" role="alert">{modules.store ? 'Suggestions and store data could not load. Reload the page to try again.' : 'Suggestions could not load. Reload the page to try again.'}</p>
      )}
    </div>
  );
}
